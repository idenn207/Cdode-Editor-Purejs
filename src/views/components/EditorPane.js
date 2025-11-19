/**
 * 파일: src/views/components/EditorPane.js
 * 기능: 코드 에디터 UI 컴포넌트
 * 책임: 텍스트 편집, 커서 관리, 신택스 하이라이팅, 자동완성 트리거
 * 수정:
 * 1. 괄호 사이 Enter 시 커서 위치 정확히 수정
 * 2. 스크롤 시 line number 고정 (scrollTop 동기화)
 * 3. Enter로 새 줄 생성 시 자동 스크롤
 * 4. '{객체}.' 에서 Ctrl+Space로 멤버 목록 표시
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
      this.#updateDocumentImmediate();
      this.#scheduleCompletionCheck();
    });

    // input 이벤트
    this.content_el.addEventListener('input', (_e) => {
      if (this.is_composing) return;

      this.#updateDocumentImmediate();
      this.#scheduleCompletionCheck();
    });

    // 붙여넣기
    this.content_el.addEventListener('paste', (_e) => {
      this.#handlePaste(_e);
    });

    // 특수 키
    this.content_el.addEventListener('keydown', (_e) => {
      this.#handleKeyDown(_e);
    });

    // 클릭 시 활성 줄 업데이트
    this.content_el.addEventListener('click', () => {
      this.#updateActiveLine();
    });

    // 스크롤 시 line number 동기화 (수정 3)
    this.content_wrapper_el.addEventListener('scroll', () => {
      this.line_numbers_el.scrollTop = this.content_wrapper_el.scrollTop;
    });
  }

  /**
   * 즉시 Document 업데이트 (자동완성용)
   */
  #updateDocumentImmediate() {
    if (!this.document) return;

    const text = this.#extractText();
    this.document.setText(text);
  }

  /**
   * 자동완성 체크 스케줄링 (100ms debounce)
   */
  #scheduleCompletionCheck() {
    if (this.completion_check_timeout) {
      clearTimeout(this.completion_check_timeout);
    }

    this.completion_check_timeout = setTimeout(() => {
      this.#checkCompletionTrigger();
    }, 100);
  }

  /**
   * 자동완성 트리거 체크
   */
  #checkCompletionTrigger() {
    if (!this.document) return;

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) return;

    // 커서 앞 텍스트에서 접두사 추출
    const beforeCursor = currentLine.substring(0, cursorPos.column);

    // 빈 줄에서 커서 이동 시 자동완성 닫기
    if (beforeCursor.trim() === '') {
      this.emit('trigger-completion', {
        line: cursorPos.line,
        column: cursorPos.column,
        prefix: '',
        contextType: 'normal',
        objectName: null,
      });
      return;
    }

    // 'this.member' 패턴
    const thisMatch = beforeCursor.match(/\bthis\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);

    // 'obj.member' 패턴 (변수명.멤버명)
    const objMatch = beforeCursor.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);

    // 'obj.' 패턴 ('.' 바로 뒤, 수정 5)
    const dotMatch = beforeCursor.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.$/);

    // 일반 식별자
    const prefixMatch = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    let prefix = '';
    let contextType = 'normal'; // 'this', 'object', 'normal'
    let objectName = null;

    if (thisMatch) {
      prefix = thisMatch[1];
      contextType = 'this';
    } else if (dotMatch) {
      // '.' 입력 직후 (수정 5)
      objectName = dotMatch[1];
      prefix = '';
      contextType = 'object';
    } else if (objMatch) {
      objectName = objMatch[1];
      prefix = objMatch[2];
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
      this.#handleEnterKey();
      return;
    }

    // Tab 키 처리
    if (_e.key === 'Tab' && !this.completion_panel_visible) {
      _e.preventDefault();
      window.document.execCommand('insertText', false, '  ');
      return;
    }

    // 자동 괄호 닫기
    if (['(', '{', '['].includes(_e.key) && !this.completion_panel_visible) {
      _e.preventDefault();
      this.#handleAutoCloseBracket(_e.key);
      return;
    }

    // 닫는 괄호 입력 시 건너뛰기
    if ([')', '}', ']'].includes(_e.key) && !this.completion_panel_visible) {
      if (this.#shouldSkipClosingBracket(_e.key)) {
        _e.preventDefault();
        this.#skipClosingBracket();
        return;
      }
    }
  }

  /**
   * Enter 키 처리 (수정 1, 4)
   */
  #handleEnterKey() {
    const cursorPos = this.getCursorPosition();
    if (!cursorPos) {
      window.document.execCommand('insertText', false, '\n');
      return;
    }

    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) {
      window.document.execCommand('insertText', false, '\n');
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
      // 괄호 사이: 두 줄 추가 + 추가 들여쓰기 (수정 1)
      const newIndent = currentIndent + '  ';
      const insertText = '\n' + newIndent + '\n' + currentIndent;

      window.document.execCommand('insertText', false, insertText);

      // 커서를 중간 줄(들여쓰기가 있는 줄)의 끝으로 이동 (수정 1)
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          let node = range.startContainer;

          // 현재 line 찾기
          while (node && node !== this.content_el) {
            if (node.classList?.contains('code-line')) {
              break;
            }
            node = node.parentNode;
          }

          // 이전 line(들여쓰기가 있는 줄)의 끝으로 이동
          if (node && node.previousSibling && node.previousSibling.classList?.contains('code-line')) {
            const prevLine = node.previousSibling;
            const textNode = prevLine.firstChild || prevLine;

            if (textNode.nodeType === Node.TEXT_NODE) {
              const offset = textNode.textContent.length;
              range.setStart(textNode, offset);
              range.setEnd(textNode, offset);
              selection.removeAllRanges();
              selection.addRange(range);
            } else if (textNode.nodeType === Node.ELEMENT_NODE) {
              // ELEMENT인 경우 마지막 자식 찾기
              let lastChild = textNode;
              while (lastChild.lastChild) {
                lastChild = lastChild.lastChild;
              }
              if (lastChild.nodeType === Node.TEXT_NODE) {
                const offset = lastChild.textContent.length;
                range.setStart(lastChild, offset);
                range.setEnd(lastChild, offset);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }
        }
      }, 0);

      // 자동 스크롤 (수정 4)
      this.#scrollToCursor();
      return;
    }

    // 괄호 열기 직후 Enter
    if (beforeTrimmed.endsWith('{') || beforeTrimmed.endsWith('(') || beforeTrimmed.endsWith('[')) {
      const newIndent = currentIndent + '  ';
      window.document.execCommand('insertText', false, '\n' + newIndent);
      this.#scrollToCursor();
      return;
    }

    // 일반 Enter: 현재 들여쓰기 유지
    window.document.execCommand('insertText', false, '\n' + currentIndent);
    this.#scrollToCursor();
  }

  /**
   * 커서가 보이도록 스크롤 (수정 4)
   */
  #scrollToCursor() {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;

        // 현재 line 찾기
        while (node && node !== this.content_el) {
          if (node.classList?.contains('code-line')) {
            break;
          }
          node = node.parentNode;
        }

        if (node && node.classList?.contains('code-line')) {
          // 새 줄이 보이도록 스크롤
          node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }, 10);
  }

  /**
   * 자동 괄호 닫기
   */
  #handleAutoCloseBracket(_openBracket) {
    const closeBracket = { '(': ')', '{': '}', '[': ']' }[_openBracket];

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) {
      window.document.execCommand('insertText', false, _openBracket);
      return;
    }

    const currentLine = this.document.getLine(cursorPos.line);
    const afterCursor = currentLine.substring(cursorPos.column);

    // 다음 문자가 닫는 괄호나 공백이면 자동 닫기
    if (!afterCursor || /^[\s\)\}\]]/.test(afterCursor)) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // 열기 + 닫기 괄호 삽입
        const textNode = window.document.createTextNode(_openBracket + closeBracket);
        range.insertNode(textNode);

        // 커서를 괄호 사이로 이동
        range.setStart(textNode, 1);
        range.setEnd(textNode, 1);
        selection.removeAllRanges();
        selection.addRange(range);

        this.#updateDocumentImmediate();
      }
    } else {
      window.document.execCommand('insertText', false, _openBracket);
    }
  }

  /**
   * 닫는 괄호 건너뛰기 체크
   */
  #shouldSkipClosingBracket(_closeBracket) {
    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return false;

    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) return false;

    const afterCursor = currentLine.substring(cursorPos.column);

    // 다음 문자가 동일한 닫는 괄호면 건너뛰기
    return afterCursor.startsWith(_closeBracket);
  }

  /**
   * 닫는 괄호 건너뛰기
   */
  #skipClosingBracket() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // 한 문자 앞으로 이동
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE) {
      const newOffset = range.startOffset + 1;
      if (newOffset <= textNode.length) {
        range.setStart(textNode, newOffset);
        range.setEnd(textNode, newOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  /**
   * 붙여넣기 처리
   */
  #handlePaste(_e) {
    _e.preventDefault();
    const text = _e.clipboardData.getData('text/plain');
    if (!text) return;
    window.document.execCommand('insertText', false, text);
  }

  /**
   * 텍스트 추출 (DOM → 문자열)
   */
  #extractText() {
    const lines = this.content_el.querySelectorAll('.code-line');
    const textLines = [];

    lines.forEach((_line) => {
      let text = '';
      const walk = window.document.createTreeWalker(_line, NodeFilter.SHOW_TEXT, null, false);

      let node;
      while ((node = walk.nextNode())) {
        text += node.textContent;
      }

      textLines.push(text);
    });

    return textLines.join('\n');
  }

  /**
   * 렌더링
   */
  #render(_preserveCursor = true) {
    if (this.is_rendering || !this.document) return;

    this.is_rendering = true;

    const lineCount = this.document.getLineCount();

    // Virtual Scrolling 적용 여부
    if (lineCount > this.virtual_scrolling_threshold && !this.use_virtual_scrolling) {
      this.use_virtual_scrolling = true;
      this.virtual_scroller = new VirtualScroller(this.content_el, this.document, this.syntax_renderer);
      this.virtual_scroller.render();
    } else if (lineCount <= this.virtual_scrolling_threshold && this.use_virtual_scrolling) {
      this.use_virtual_scrolling = false;
      this.virtual_scroller = null;
    }

    if (this.use_virtual_scrolling) {
      this.virtual_scroller.render();
    } else {
      this.#renderNormal();
    }

    this.#renderLineNumbers();
    this.#updateActiveLine();

    this.is_rendering = false;
  }

  /**
   * 일반 렌더링
   */
  #renderNormal() {
    const lineCount = this.document.getLineCount();
    const fragment = window.document.createDocumentFragment();

    for (let i = 0; i < lineCount; i++) {
      const line = this.document.getLine(i);
      const lineDiv = window.document.createElement('div');
      lineDiv.className = 'code-line';

      const highlighted = this.syntax_renderer.render(line, this.document.language);
      lineDiv.innerHTML = highlighted || '<br>';

      fragment.appendChild(lineDiv);
    }

    this.content_el.innerHTML = '';
    this.content_el.appendChild(fragment);
  }

  /**
   * 라인 번호 렌더링
   */
  #renderLineNumbers() {
    const lineCount = this.document.getLineCount();
    const fragment = window.document.createDocumentFragment();

    for (let i = 1; i <= lineCount; i++) {
      const lineNumber = window.document.createElement('div');
      lineNumber.textContent = i;
      fragment.appendChild(lineNumber);
    }

    this.line_numbers_el.innerHTML = '';
    this.line_numbers_el.appendChild(fragment);
  }

  /**
   * 활성 줄 하이라이트
   */
  #updateActiveLine() {
    // 모든 줄에서 active-line 제거
    const allLines = this.content_el.querySelectorAll('.code-line');
    allLines.forEach((_line) => _line.classList.remove('active-line'));

    // 현재 커서 위치 줄에 active-line 추가
    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    const lineElements = Array.from(this.content_el.querySelectorAll('.code-line'));
    if (lineElements[cursorPos.line]) {
      lineElements[cursorPos.line].classList.add('active-line');
    }
  }

  /**
   * 커서 위치 가져오기 (줄, 열) - PUBLIC
   */
  getCursorPosition() {
    try {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);

      // 현재 줄 찾기
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

      // 줄 번호
      const lineElements = Array.from(this.content_el.querySelectorAll('.code-line'));
      const lineIndex = lineElements.indexOf(node);

      if (lineIndex === -1) return null;

      // 열 번호 (텍스트 오프셋)
      const preRange = range.cloneRange();
      preRange.selectNodeContents(node);
      preRange.setEnd(range.startContainer, range.startOffset);
      const column = preRange.toString().length;

      return { line: lineIndex, column: column };
    } catch (e) {
      console.error('커서 위치 가져오기 실패:', e);
      return null;
    }
  }

  /**
   * 커서 좌표 가져오기 (화면 픽셀 좌표)
   */
  getCursorCoordinates() {
    try {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return { x: 0, y: 0 };

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      return {
        x: rect.left,
        y: rect.top,
      };
    } catch (e) {
      console.error('커서 좌표 가져오기 실패:', e);
      return { x: 0, y: 0 };
    }
  }

  /**
   * 수동 자동완성 트리거 (Ctrl+Space) (수정 6)
   */
  triggerManualCompletion() {
    if (!this.document) return;

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.document.getLine(cursorPos.line);
    const beforeCursor = currentLine.substring(0, cursorPos.column);

    // contextType 파싱
    const thisMatch = beforeCursor.match(/\bthis\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
    const objMatch = beforeCursor.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
    const dotMatch = beforeCursor.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.$/); // '.' 바로 뒤 (수정 6)
    const prefixMatch = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    let prefix = '';
    let contextType = 'normal';
    let objectName = null;

    if (thisMatch) {
      prefix = thisMatch[1];
      contextType = 'this';
    } else if (dotMatch) {
      // '.' 바로 뒤에서 Ctrl+Space (수정 6)
      objectName = dotMatch[1];
      prefix = '';
      contextType = 'object';
    } else if (objMatch) {
      objectName = objMatch[1];
      prefix = objMatch[2];
      contextType = 'object';
    } else if (prefixMatch) {
      prefix = prefixMatch[0];
    }

    this.emit('trigger-completion', {
      line: cursorPos.line,
      column: cursorPos.column,
      prefix,
      contextType,
      objectName,
    });
  }

  /**
   * 자동완성 삽입
   */
  insertCompletion(_text, _prefix) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // prefix 길이만큼 뒤로 이동하여 삭제
    if (_prefix.length > 0) {
      range.setStart(range.startContainer, range.startOffset - _prefix.length);
      range.deleteContents();
    }

    // 새 텍스트 삽입
    const textNode = window.document.createTextNode(_text);
    range.insertNode(textNode);

    // 커서를 텍스트 끝으로 이동
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    this.#updateDocumentImmediate();
  }

  /**
   * 자동완성 패널 표시 여부 설정
   */
  setCompletionPanelVisible(_visible) {
    this.completion_panel_visible = _visible;
  }

  /**
   * Document 설정
   */
  setDocument(_document) {
    this.document = _document;

    if (this.change_listener) {
      this.change_listener.remove();
    }

    this.change_listener = this.document.onChange(() => {
      this.#render();
    });

    this.#render();
  }

  /**
   * 포커스
   */
  focus() {
    this.content_el.focus();
  }

  /**
   * 검색 결과 하이라이트
   */
  highlightSearchResults(_results, _currentIndex) {
    this.search_results = _results;
    this.search_current_index = _currentIndex;

    // 모든 하이라이트 제거
    const allHighlights = this.content_el.querySelectorAll('.search-highlight, .search-highlight-current');
    allHighlights.forEach((_el) => {
      const parent = _el.parentNode;
      parent.replaceChild(window.document.createTextNode(_el.textContent), _el);
      parent.normalize();
    });

    if (_results.length === 0) return;

    // 각 검색 결과에 하이라이트 추가
    const lineElements = Array.from(this.content_el.querySelectorAll('.code-line'));

    _results.forEach((_result, _index) => {
      const lineEl = lineElements[_result.line];
      if (!lineEl) return;

      const isCurrent = _index === _currentIndex;
      this.#highlightInLine(lineEl, _result.start, _result.end, isCurrent);
    });

    // 현재 결과로 스크롤
    if (_currentIndex >= 0 && _currentIndex < _results.length) {
      const currentResult = _results[_currentIndex];
      const lineEl = lineElements[currentResult.line];
      if (lineEl) {
        lineEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  /**
   * 줄 내에서 하이라이트 추가
   */
  #highlightInLine(_lineEl, _start, _end, _isCurrent) {
    const walk = window.document.createTreeWalker(_lineEl, NodeFilter.SHOW_TEXT, null, false);

    let currentOffset = 0;
    let node;
    const nodesToProcess = [];

    while ((node = walk.nextNode())) {
      const nodeLength = node.textContent.length;
      const nodeStart = currentOffset;
      const nodeEnd = currentOffset + nodeLength;

      if (nodeEnd > _start && nodeStart < _end) {
        nodesToProcess.push({
          node: node,
          nodeStart: nodeStart,
          nodeEnd: nodeEnd,
        });
      }

      currentOffset = nodeEnd;
    }

    nodesToProcess.forEach(({ node, nodeStart, nodeEnd }) => {
      const highlightStart = Math.max(0, _start - nodeStart);
      const highlightEnd = Math.min(node.textContent.length, _end - nodeStart);

      const beforeText = node.textContent.substring(0, highlightStart);
      const highlightText = node.textContent.substring(highlightStart, highlightEnd);
      const afterText = node.textContent.substring(highlightEnd);

      const fragment = window.document.createDocumentFragment();

      if (beforeText) {
        fragment.appendChild(window.document.createTextNode(beforeText));
      }

      const highlight = window.document.createElement('span');
      highlight.className = _isCurrent ? 'search-highlight-current' : 'search-highlight';
      highlight.textContent = highlightText;
      fragment.appendChild(highlight);

      if (afterText) {
        fragment.appendChild(window.document.createTextNode(afterText));
      }

      node.parentNode.replaceChild(fragment, node);
    });
  }

  /**
   * 검색 결과 제거
   */
  clearSearchHighlights() {
    this.search_results = [];
    this.search_current_index = -1;

    const allHighlights = this.content_el.querySelectorAll('.search-highlight, .search-highlight-current');
    allHighlights.forEach((_el) => {
      const parent = _el.parentNode;
      parent.replaceChild(window.document.createTextNode(_el.textContent), _el);
      parent.normalize();
    });
  }
}
