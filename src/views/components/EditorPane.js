/**
 * 파일: src/views/components/EditorPane.js
 * 기능: 코드 에디터 UI 컴포넌트
 * 책임: Document 모델 기반 텍스트 편집, 렌더링, 사용자 입력 처리
 * 수정: Document 메서드를 사용한 텍스트 편집으로 완전히 리팩토링
 */

import EventEmitter from '../../utils/EventEmitter.js';
import SyntaxRenderer from '../renderers/SyntaxRenderer.js';
import VirtualScroller from '../renderers/VirtualScroller.js';

export default class EditorPane extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container = window.document.getElementById(_containerId);
    this.document = null;
    this.is_rendering = false;
    this.change_listener = null;
    this.syntax_renderer = new SyntaxRenderer();
    this.virtual_scroller = null;
    this.use_virtual_scrolling = false;
    this.virtual_scrolling_threshold = 1000;

    // 자동완성 관련
    this.completion_panel_visible = false;
    this.completion_check_timeout = null;

    // 한글 입력 관련
    this.is_composing = false;

    // 검색 관련
    this.search_results = [];
    this.search_current_index = -1;

    // 실시간 렌더링
    this.render_debounce_timeout = null;

    // 프로그래밍 방식 업데이트 중 (input 이벤트 무시용)
    this.is_programmatic_change = false;

    this.#initialize();
  }

  #initialize() {
    this.container.innerHTML = `
      <div class="editor-pane">
        <div class="line-numbers"></div>
        <div class="editor-content-wrapper">
          <div class="editor-content" contenteditable="true" spellcheck="false"></div>
        </div>
      </div>
    `;

    this.line_numbers_el = this.container.querySelector('.line-numbers');
    this.content_wrapper_el = this.container.querySelector('.editor-content-wrapper');
    this.content_el = this.container.querySelector('.editor-content');

    this.#attachEvents();
  }

  #attachEvents() {
    // compositionstart (한글 입력 시작)
    this.content_el.addEventListener('compositionstart', () => {
      this.is_composing = true;
    });

    // compositionend (한글 입력 완료)
    this.content_el.addEventListener('compositionend', () => {
      this.is_composing = false;
      this.#syncDOMToDocument();
      this.checkCompletionTrigger();
    });

    // input 이벤트
    this.content_el.addEventListener('input', (_e) => {
      if (this.is_composing || this.is_programmatic_change) return;

      this.#syncDOMToDocument();
      this.checkCompletionTrigger();
    });

    // 붙여넣기
    this.content_el.addEventListener('paste', (_e) => {
      this.#handlePaste(_e);
    });

    // 키 다운
    this.content_el.addEventListener('keydown', (_e) => {
      this.#handleKeyDown(_e);
    });

    // 커서 이동 시
    this.content_el.addEventListener('click', () => {
      this.#syncCursorToDocument();
      this.#updateActiveLine();
      this.#checkHideCompletion();
    });

    this.content_el.addEventListener('keyup', (_e) => {
      this.#syncCursorToDocument();
      this.#updateActiveLine();
      this.#handleSelectionChange();

      // 방향키로 커서 이동 시 자동완성 닫기
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(_e.key)) {
        this.#checkHideCompletion();
      }
    });

    this.content_el.addEventListener('focus', () => {
      this.emit('focus');
    });

    this.content_el.addEventListener('mouseup', () => {
      this.#syncCursorToDocument();
      this.#handleSelectionChange();
    });
  }

  /**
   * 자동완성 패널 숨김 체크 - Document 커서 사용
   */
  #checkHideCompletion() {
    if (!this.completion_panel_visible || !this.document) return;

    // Document 커서 동기화
    this.#syncCursorToDocument();

    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) return;

    const beforeCursor = currentLine.substring(0, cursorPos.column);

    // 식별자나 'this.', 'obj.' 패턴이 없으면 패널 닫기
    const hasPattern = /[a-zA-Z_$][a-zA-Z0-9_$]*\.?[a-zA-Z0-9_$]*$/.test(beforeCursor);

    if (!hasPattern) {
      this.emit('completion-cancel');
    }
  }

  /**
   * DOM → Document 동기화
   * DOM의 내용을 Document 모델로 동기화
   */
  #syncDOMToDocument() {
    if (!this.document) return;

    const text = this.#extractText();
    const currentText = this.document.getText();

    if (text === currentText) return;

    // Document의 lines 배열 직접 업데이트
    this.document.content = text;
    this.document.lines = text.split('\n');
    this.document.is_dirty = true;

    // 변경 이벤트 발생
    this.emit('content-changed', {
      _document: this.document,
      _text: text,
    });
  }

  /**
   * 커서 위치 → Document 동기화
   */
  #syncCursorToDocument() {
    if (!this.document) return;

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    this.document.moveCursor(cursorPos.line, cursorPos.column);
  }

  /**
   * 선택 영역 → Document 동기화
   */
  #syncSelectionToDocument() {
    if (!this.document) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.document.clearSelection();
      return;
    }

    if (selection.isCollapsed) {
      this.document.clearSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    const startPos = this.#getPositionFromNode(range.startContainer, range.startOffset);
    const endPos = this.#getPositionFromNode(range.endContainer, range.endOffset);

    if (startPos && endPos) {
      this.document.setSelection(startPos.line, startPos.column, endPos.line, endPos.column);
    }
  }

  /**
   * DOM 노드에서 Document 위치 계산
   */
  #getPositionFromNode(_node, _offset) {
    let node = _node;

    // .code-line 요소 찾기
    while (node && node !== this.content_el) {
      if (node.parentNode === this.content_el && node.classList?.contains('code-line')) {
        break;
      }
      node = node.parentNode;
    }

    if (!node || !node.classList?.contains('code-line')) {
      return null;
    }

    const lineElements = Array.from(this.content_el.querySelectorAll('.code-line'));
    const lineIndex = lineElements.indexOf(node);

    if (lineIndex === -1) return null;

    const preRange = document.createRange();
    preRange.selectNodeContents(node);
    preRange.setEnd(_node, _offset);
    const column = preRange.toString().length;

    return { line: lineIndex, column: column };
  }

  /**
   * 자동완성 트리거 체크 - Document 커서 사용
   */
  checkCompletionTrigger() {
    if (!this.document) return;

    // Document의 커서 위치 동기화
    this.#syncCursorToDocument();

    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);

    if (!currentLine) {
      this.emit('completion-cancel');
      return;
    }

    const beforeCursor = currentLine.substring(0, cursorPos.column);

    // 'this.' 패턴
    const thisMatch = beforeCursor.match(/\bthis\.([a-zA-Z_#$][a-zA-Z0-9_$]*)?$/);

    // 'obj.' 패턴 (변수명.멤버명)
    const objMatch = beforeCursor.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_#$][a-zA-Z0-9_$]*)?$/);

    // 일반 식별자
    const prefixMatch = beforeCursor.match(/[a-zA-Z_#$][a-zA-Z0-9_$]*$/);

    let prefix = '';
    let contextType = 'normal'; // 'this', 'object', 'normal'
    let objectName = null;

    if (thisMatch) {
      prefix = thisMatch[1] || '';
      contextType = 'this';
    } else if (objMatch) {
      objectName = objMatch[1];
      prefix = objMatch[2] || '';
      contextType = 'object';
    } else if (prefixMatch) {
      prefix = prefixMatch[0];
      contextType = 'normal';
    }

    if (prefix.length >= 1 || contextType !== 'normal') {
      this.emit('trigger-completion', {
        line: cursorPos.line,
        column: cursorPos.column,
        prefix: prefix,
        contextType: contextType,
        objectName: objectName,
      });
    } else {
      this.emit('completion-cancel');
    }
  }

  /**
   * 특수 키 처리
   */
  #handleKeyDown(_e) {
    // 자동완성 패널이 보이는 경우
    if (this.completion_panel_visible) {
      if (_e.key === 'ArrowDown') {
        _e.preventDefault();
        _e.stopPropagation();
        this.emit('completion-next');
        return;
      } else if (_e.key === 'ArrowUp') {
        _e.preventDefault();
        _e.stopPropagation();
        this.emit('completion-previous');
        return;
      } else if (_e.key === 'Enter' || _e.key === 'Tab') {
        _e.preventDefault();
        _e.stopPropagation();
        this.emit('completion-confirm');
        return;
      } else if (_e.key === 'Escape') {
        _e.preventDefault();
        _e.stopPropagation();
        this.emit('completion-cancel');
        return;
      }
    }

    // Enter 키 처리 (들여쓰기 + 괄호)
    if (_e.key === 'Enter' && !this.completion_panel_visible) {
      _e.preventDefault();
      this.#syncCursorToDocument();
      this.#handleEnterKey();
      return;
    }

    // Tab 키 처리 - Document 메서드 사용
    if (_e.key === 'Tab' && !this.completion_panel_visible) {
      _e.preventDefault();
      this.#syncCursorToDocument();
      this.#insertTextAtCursor('  ');
      return;
    }

    // 자동 따옴표 닫기
    if (['"', "'", '`'].includes(_e.key) && !this.completion_panel_visible) {
      _e.preventDefault();
      this.#syncCursorToDocument();
      if (this.#shouldSkipClosingQuote(_e.key)) {
        this.#skipClosingQuote();
        return;
      }
      this.#handleAutoCloseQuote(_e.key);
      return;
    }

    // 자동 괄호 닫기
    if (['(', '{', '['].includes(_e.key) && !this.completion_panel_visible) {
      _e.preventDefault();
      this.#syncCursorToDocument();
      this.#handleAutoCloseBracket(_e.key);
      return;
    }

    // 닫는 괄호 입력 시 건너뛰기
    if ([')', '}', ']'].includes(_e.key) && !this.completion_panel_visible) {
      this.#syncCursorToDocument();
      if (this.#shouldSkipClosingBracket(_e.key)) {
        _e.preventDefault();
        this.#skipClosingBracket();
        return;
      }
    }
  }

  /**
   * Enter 키 처리 - Document 메서드 사용
   */
  #handleEnterKey() {
    if (!this.document) return;

    // Document에서 커서 위치 가져오기
    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);

    if (currentLine === null || currentLine === undefined) {
      this.#insertTextAtCursor('\n');
      return;
    }

    // 현재 들여쓰기 계산
    const indentMatch = currentLine.match(/^(\s*)/);
    const currentIndent = indentMatch ? indentMatch[1] : '';

    // 커서 앞뒤 문자 확인
    const beforeCursor = currentLine.substring(0, cursorPos.column);
    const afterCursor = currentLine.substring(cursorPos.column);

    const beforeTrimmed = beforeCursor.trim();
    const afterTrimmed = afterCursor.trim();

    // 괄호 사이에서 Enter (예: { | })
    const isBetweenBrackets =
      (beforeTrimmed.endsWith('{') && afterTrimmed.startsWith('}')) ||
      (beforeTrimmed.endsWith('(') && afterTrimmed.startsWith(')')) ||
      (beforeTrimmed.endsWith('[') && afterTrimmed.startsWith(']'));

    if (isBetweenBrackets) {
      // 괄호 사이: 두 줄 추가 + 추가 들여쓰기
      const newIndent = currentIndent + '  ';
      const textToInsert = '\n' + newIndent + '\n' + currentIndent;

      this.#insertTextAtCursor(textToInsert);

      // 중간 줄로 커서 이동 (새 들여쓰기 끝)
      setTimeout(() => {
        this.document.moveCursor(cursorPos.line + 1, newIndent.length);
        this.#syncCursorFromDocument();
      }, 0);

      return;
    }

    // 괄호 열기 직후 Enter
    if (beforeTrimmed.endsWith('{') || beforeTrimmed.endsWith('(') || beforeTrimmed.endsWith('[')) {
      const newIndent = currentIndent + '  ';
      this.#insertTextAtCursor('\n' + newIndent);
      return;
    }

    // 일반 Enter: 현재 들여쓰기 유지
    this.#insertTextAtCursor('\n' + currentIndent);
  }

  /**
   * 커서 위치에 텍스트 삽입 (Document 메서드 사용)
   */
  #insertTextAtCursor(_text) {
    if (!this.document) return;
    const cursor = this.document.cursor;
    this.document.insertText(cursor.line, cursor.column, _text);

    // Document → DOM 동기화
    this.#render();

    // 커서 위치 DOM에 반영
    this.#syncCursorFromDocument();
  }

  /**
   * Document 커서 → DOM 동기화
   */
  #syncCursorFromDocument() {
    if (!this.document) return;

    const cursor = this.document.cursor;
    this.#setDOMCursor(cursor.line, cursor.column);
  }

  /**
   * DOM 커서 설정
   */
  #setDOMCursor(_line, _column) {
    try {
      const codeLines = this.content_el.querySelectorAll('.code-line');
      if (_line < 0 || _line >= codeLines.length) return;

      const targetLine = codeLines[_line];
      if (!targetLine) return;

      // 모든 텍스트 노드를 찾아서 위치 계산
      const textNodes = [];
      const collectTextNodes = (_node) => {
        if (_node.nodeType === Node.TEXT_NODE) {
          textNodes.push(_node);
        } else if (_node.nodeType === Node.ELEMENT_NODE) {
          for (let child of _node.childNodes) {
            collectTextNodes(child);
          }
        }
      };
      collectTextNodes(targetLine);

      // 텍스트 노드가 없으면 생성
      if (textNodes.length === 0) {
        const textNode = window.document.createTextNode('');
        targetLine.appendChild(textNode);
        textNodes.push(textNode);
      }

      // 컬럼 위치에 맞는 텍스트 노드 찾기
      let currentOffset = 0;
      let targetNode = textNodes[0];
      let nodeOffset = 0;

      for (const node of textNodes) {
        const nodeLength = node.textContent.length;
        if (currentOffset + nodeLength >= _column) {
          targetNode = node;
          nodeOffset = _column - currentOffset;
          break;
        }
        currentOffset += nodeLength;
      }

      // 마지막 노드를 넘어가면 마지막 노드의 끝으로 설정
      if (currentOffset < _column) {
        targetNode = textNodes[textNodes.length - 1];
        nodeOffset = targetNode.textContent.length;
      }

      // 커서 위치 설정
      const range = window.document.createRange();
      const selection = window.getSelection();

      const safeOffset = Math.min(nodeOffset, targetNode.textContent.length);
      range.setStart(targetNode, safeOffset);
      range.setEnd(targetNode, safeOffset);

      selection.removeAllRanges();
      selection.addRange(range);

      // 활성 라인 업데이트
      this.#updateActiveLine();
    } catch (e) {
      console.error('Error setting DOM cursor:', e);
    }
  }

  /**
   * 자동 따옴표 닫기 - Document 메서드 사용
   */
  #handleAutoCloseQuote(_openQuote) {
    if (!this.document) return;

    const closeQuote = { '"': '"', "'": "'", '`': '`' }[_openQuote];
    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);

    if (currentLine === null || currentLine === undefined) {
      this.#insertTextAtCursor(_openQuote);
      return;
    }

    const afterCursor = currentLine.substring(cursorPos.column);

    // 다음 문자가 따옴표나 공백이면 자동 닫기
    if (!afterCursor || /^[\s"'`]/.test(afterCursor)) {
      const textToInsert = _openQuote + closeQuote;
      this.document.insertText(cursorPos.line, cursorPos.column, textToInsert);

      // Document → DOM 동기화
      this.#render();

      // 커서를 따옴표 사이로 이동
      this.document.moveCursor(cursorPos.line, cursorPos.column + 1);
      this.#syncCursorFromDocument();
    } else {
      this.#insertTextAtCursor(_openQuote);
    }
  }

  /**
   * 닫는 따옴표 건너뛰기 체크
   */
  #shouldSkipClosingQuote(_closeQuote) {
    if (!this.document) return false;

    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);
    if (currentLine === null || currentLine === undefined) return false;

    const afterCursor = currentLine.substring(cursorPos.column);

    // 다음 문자가 동일한 닫는 따옴표면 건너뛰기
    return afterCursor.startsWith(_closeQuote);
  }

  /**
   * 닫는 따옴표 건너뛰기 - Document 메서드 사용
   */
  #skipClosingQuote() {
    if (!this.document) return;

    const cursorPos = this.document.cursor;
    this.document.moveCursor(cursorPos.line, cursorPos.column + 1);
    this.#syncCursorFromDocument();
  }

  /**
   * 자동 괄호 닫기 - Document 메서드 사용
   */
  #handleAutoCloseBracket(_openBracket) {
    if (!this.document) return;

    const closeBracket = { '(': ')', '{': '}', '[': ']' }[_openBracket];
    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);

    if (currentLine === null || currentLine === undefined) {
      this.#insertTextAtCursor(_openBracket);
      return;
    }

    const afterCursor = currentLine.substring(cursorPos.column);

    // 다음 문자가 닫는 괄호나 공백이면 자동 닫기
    if (!afterCursor || /^[\s\)\}\]]/.test(afterCursor)) {
      const textToInsert = _openBracket + closeBracket;
      this.document.insertText(cursorPos.line, cursorPos.column, textToInsert);

      // Document → DOM 동기화
      this.#render();

      // 커서를 괄호 사이로 이동
      this.document.moveCursor(cursorPos.line, cursorPos.column + 1);
      this.#syncCursorFromDocument();
    } else {
      this.#insertTextAtCursor(_openBracket);
    }
  }

  /**
   * 닫는 괄호 건너뛰기 체크
   */
  #shouldSkipClosingBracket(_closeBracket) {
    if (!this.document) return false;

    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);
    if (currentLine === null || currentLine === undefined) return false;

    const afterCursor = currentLine.substring(cursorPos.column);

    // 다음 문자가 동일한 닫는 괄호면 건너뛰기
    return afterCursor.startsWith(_closeBracket);
  }

  /**
   * 닫는 괄호 건너뛰기 - Document 메서드 사용
   */
  #skipClosingBracket() {
    if (!this.document) return;

    const cursorPos = this.document.cursor;
    this.document.moveCursor(cursorPos.line, cursorPos.column + 1);
    this.#syncCursorFromDocument();
  }

  /**
   * 붙여넣기 처리 - Document 메서드 사용
   */
  #handlePaste(_e) {
    _e.preventDefault();
    const text = _e.clipboardData.getData('text/plain');
    if (!text) return;

    this.#insertTextAtCursor(text);
  }

  /**
   * 선택 영역 변경 처리
   */
  #handleSelectionChange() {
    if (!this.document) return;

    // Document에 선택 영역 동기화
    this.#syncSelectionToDocument();

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    this.emit('cursor-moved', {
      hasSelection: !selection.isCollapsed,
    });
  }

  /**
   * 활성 줄 하이라이트 업데이트
   */
  #updateActiveLine() {
    const previousActive = this.content_el.querySelector('.code-line.active-line');
    if (previousActive) {
      previousActive.classList.remove('active-line');
    }

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    const codeLines = this.content_el.querySelectorAll('.code-line');
    if (cursorPos.line >= 0 && cursorPos.line < codeLines.length) {
      codeLines[cursorPos.line].classList.add('active-line');
    }
  }

  /**
   * 문서 설정
   */
  setDocument(_document) {
    this.document = _document;
    this.is_rendering = false;

    if (_document) {
      const lineCount = _document.getLineCount();
      this.use_virtual_scrolling = lineCount >= this.virtual_scrolling_threshold;

      if (this.use_virtual_scrolling && !this.virtual_scroller) {
        this.virtual_scroller = new VirtualScroller(this.content_wrapper_el, {
          line_height: 22.4,
          buffer_lines: 20,
        });

        this.content_wrapper_el.addEventListener('scroll', () => {
          if (!this.is_rendering) {
            this.#render();
          }
        });
      }

      this.#render();

      if (!this.change_listener) {
        this.change_listener = () => {
          if (!this.is_rendering) {
            this.#renderAllLines();
          }
        };
        _document.onChange(this.change_listener);
      }
    } else {
      this.#renderEmpty();
    }
  }

  /**
   * 빈 상태 렌더링
   */
  #renderEmpty() {
    this.content_el.innerHTML = '<div class="empty-editor">파일을 선택하세요</div>';
    this.line_numbers_el.innerHTML = '';
    this.content_el.contentEditable = 'false';
  }

  /**
   * 렌더링
   */
  #render() {
    if (!this.document) return;

    this.is_rendering = true;
    this.is_programmatic_change = true;

    if (this.use_virtual_scrolling) {
      this.#renderWithVirtualScrolling();
    } else {
      this.#renderAllLines();
    }

    this.is_rendering = false;

    // 다음 이벤트 루프에서 플래그 리셋
    setTimeout(() => {
      this.is_programmatic_change = false;
    }, 0);
  }

  /**
   * 전체 줄 렌더링
   */
  #renderAllLines() {
    this.#renderLineNumbers();
    this.#renderContent();
  }

  /**
   * Virtual Scrolling 렌더링
   */
  #renderWithVirtualScrolling() {
    const lineCount = this.document.getLineCount();
    this.virtual_scroller.setTotalLines(lineCount);

    const { start, end } = this.virtual_scroller.getVisibleRange();
    this.#renderLineNumbersVirtual(start, end);
    this.#renderContentVirtual(start, end);

    const totalHeight = this.virtual_scroller.getTotalHeight();
    this.content_el.style.height = `${totalHeight}px`;
    this.line_numbers_el.style.height = `${totalHeight}px`;
  }

  /**
   * 줄 번호 렌더링
   */
  #renderLineNumbers() {
    const lineCount = this.document.getLineCount();
    let html = '';

    for (let i = 0; i < lineCount; i++) {
      html += `<div class="line-number">${i + 1}</div>`;
    }

    this.line_numbers_el.innerHTML = html;
  }

  /**
   * 줄 번호 렌더링 (Virtual)
   */
  #renderLineNumbersVirtual(_start, _end) {
    let html = '';
    const topOffset = _start * 22.4;
    html += `<div style="height: ${topOffset}px;"></div>`;

    for (let i = _start; i < _end; i++) {
      html += `<div class="line-number">${i + 1}</div>`;
    }

    this.line_numbers_el.innerHTML = html;
  }

  /**
   * 텍스트 내용 렌더링
   */
  #renderContent() {
    const lines = this.document.lines;
    const language = this.#detectLanguage();
    let html = '';

    lines.forEach((_line, _lineIndex) => {
      const displayLine = _line || '\n';
      const highlightedHTML = this.syntax_renderer.renderLine(displayLine, language, {
        searchResults: this.search_results,
        currentIndex: this.search_current_index,
        lineIndex: _lineIndex,
      });
      html += `<div class="code-line">${highlightedHTML}</div>`;
    });

    this.content_el.innerHTML = html;
    this.content_el.contentEditable = 'true';

    this.#updateActiveLine();
  }

  /**
   * 텍스트 내용 렌더링 (Virtual)
   */
  #renderContentVirtual(_start, _end) {
    const lines = this.document.lines;
    const language = this.#detectLanguage();
    let html = '';

    const topOffset = _start * 22.4;
    html += `<div style="height: ${topOffset}px;"></div>`;

    for (let i = _start; i < _end; i++) {
      const line = lines[i] || '\n';
      const highlightedHTML = this.syntax_renderer.renderLine(line, language);
      html += `<div class="code-line">${highlightedHTML}</div>`;
    }

    this.content_el.innerHTML = html;
    this.content_el.contentEditable = 'true';
  }

  /**
   * 언어 감지
   */
  #detectLanguage() {
    if (!this.document || !this.document.file_node) {
      return 'plaintext';
    }

    const ext = this.document.file_node.getExtension();
    const langMap = {
      '.js': 'javascript',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
    };

    return langMap[ext] || 'plaintext';
  }

  /**
   * 텍스트 추출
   */
  #extractText() {
    const lines = [];
    const codeLines = this.content_el.querySelectorAll(':scope > .code-line');

    codeLines.forEach((_lineEl) => {
      let lineText = '';

      const extractTextFromNode = (_node) => {
        if (_node.nodeType === Node.TEXT_NODE) {
          lineText += _node.textContent;
        } else if (_node.nodeType === Node.ELEMENT_NODE) {
          if (_node.nodeName === 'BR') {
            return;
          }
          for (let child of _node.childNodes) {
            extractTextFromNode(child);
          }
        }
      };

      extractTextFromNode(_lineEl);
      lines.push(lineText);
    });

    return lines.join('\n');
  }

  /**
   * 자동완성 삽입 - Document 메서드 사용
   */
  insertCompletion(_completion) {
    if (!this.document) return;

    const cursorPos = this.document.cursor;
    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) return;

    const beforeCursor = currentLine.substring(0, cursorPos.column);

    // 'this.' 또는 'obj.' 패턴 확인
    const thisMatch = beforeCursor.match(/\bthis\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
    const objMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
    const prefixMatch = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    let prefix = '';
    let prefixStartCol = cursorPos.column;

    if (thisMatch) {
      prefix = thisMatch[1];
      prefixStartCol = cursorPos.column - prefix.length;
    } else if (objMatch) {
      prefix = objMatch[1];
      prefixStartCol = cursorPos.column - prefix.length;
    } else if (prefixMatch) {
      prefix = prefixMatch[0];
      prefixStartCol = cursorPos.column - prefix.length;
    }

    // 접두사 삭제 후 새 텍스트 삽입
    if (prefix.length > 0) {
      this.document.deleteText(cursorPos.line, prefixStartCol, cursorPos.line, cursorPos.column);
      this.document.insertText(cursorPos.line, prefixStartCol, _completion.insertText);
    } else {
      this.document.insertText(cursorPos.line, cursorPos.column, _completion.insertText);
    }

    // Document → DOM 동기화
    this.#render();

    // 커서를 삽입된 텍스트 끝으로 이동
    this.#syncCursorFromDocument();
  }

  getCursorPosition() {
    try {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);

      let node = range.startContainer;
      while (node && node !== this.content_el) {
        if (node.parentNode === this.content_el && node.classList?.contains('code-line')) {
          break;
        }
        node = node.parentNode;
      }

      if (!node || !node.classList?.contains('code-line')) {
        return null;
      }

      const lineElements = Array.from(this.content_el.querySelectorAll('.code-line'));
      const lineIndex = lineElements.indexOf(node);

      if (lineIndex === -1) return null;

      const preRange = range.cloneRange();
      preRange.selectNodeContents(node);
      preRange.setEnd(range.startContainer, range.startOffset);
      const column = preRange.toString().length;

      return { line: lineIndex, column: column };
    } catch (e) {
      return null;
    }
  }

  getCursorCoordinates() {
    try {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return { top: 0, left: 0 };

      const range = selection.getRangeAt(0);
      let rect = range.getBoundingClientRect();
      if (rect.top <= 0 && rect.left <= 0) {
        rect = range.startContainer.getBoundingClientRect();
      }

      return {
        top: rect.top,
        left: rect.left,
      };
    } catch (e) {
      return { top: 0, left: 0 };
    }
  }

  setCompletionPanelVisible(_visible) {
    this.completion_panel_visible = _visible;
  }

  // 검색 관련 메서드들 동일
  highlightSearchResults(_results, _currentIndex) {
    this.search_results = _results;
    this.search_current_index = _currentIndex;
    this.#render();

    if (_currentIndex >= 0 && _currentIndex < _results.length) {
      this.#scrollToSearchResult(_results[_currentIndex]);
    }
  }

  clearSearchHighlights() {
    this.search_results = [];
    this.search_current_index = -1;
    this.#render();
  }

  #scrollToSearchResult(_result) {
    const lineHeight = 22.4;
    const scrollTop = _result.line * lineHeight;
    this.content_wrapper_el.scrollTop = scrollTop - 100;
  }

  focus() {
    this.content_el.focus();
  }

  getDocument() {
    return this.document;
  }
}
