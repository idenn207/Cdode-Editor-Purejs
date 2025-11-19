/**
 * 파일: src/views/components/EditorPane.js
 * 수정 내용: VirtualScroller 통합 및 Debounce 적용
 */

import { debounce } from '../../utils/Debounce.js';
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
    this.use_virtual_scrolling = false; // 대용량 파일에만 사용
    this.virtual_scrolling_threshold = 1000; // 1000줄 이상

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
    // Debounce 적용된 입력 핸들러
    const debouncedInput = debounce((_e) => {
      this.#handleInput(_e);
    }, 150);

    this.content_el.addEventListener('input', debouncedInput);

    // 붙여넣기 이벤트
    this.content_el.addEventListener('paste', (_e) => {
      this.#handlePaste(_e);
    });

    // 키 다운 (특수 키는 즉시 처리)
    this.content_el.addEventListener('keydown', (_e) => {
      this.#handleKeyDown(_e);
    });

    this.content_el.addEventListener('focus', () => {
      this.emit('focus');
    });

    this.content_el.addEventListener('mouseup', () => {
      this.#handleSelectionChange();
    });

    this.content_el.addEventListener('keyup', () => {
      this.#handleSelectionChange();
    });

    // 자동완성 트리거 (타이핑)
    const debouncedCompletion = debounce(() => {
      this.#checkCompletionTrigger();
    }, 300);

    this.content_el.addEventListener('input', (_e) => {
      // 기존 input 핸들러
      const debouncedInput = debounce((_e) => {
        this.#handleInput(_e);
      }, 150);
      debouncedInput(_e);

      // 자동완성 트리거 체크
      debouncedCompletion();
    });

    // 키보드 이벤트 (자동완성 패널용)
    this.content_el.addEventListener('keydown', (_e) => {
      // 자동완성 패널이 보이는 경우
      if (this.completion_panel_visible) {
        if (_e.key === 'ArrowDown') {
          _e.preventDefault();
          this.emit('completion-next');
          return;
        } else if (_e.key === 'ArrowUp') {
          _e.preventDefault();
          this.emit('completion-previous');
          return;
        } else if (_e.key === 'Enter') {
          _e.preventDefault();
          this.emit('completion-confirm');
          return;
        } else if (_e.key === 'Escape') {
          _e.preventDefault();
          this.emit('completion-cancel');
          return;
        }
      }

      // 기존 키 핸들러
      this.#handleKeyDown(_e);
    });
  }

  /**
   * 문서 설정 및 렌더링
   */
  setDocument(_document) {
    this.document = _document;
    this.is_rendering = false;

    if (_document) {
      // Virtual Scrolling 필요 여부 판단
      const lineCount = _document.getLineCount();
      this.use_virtual_scrolling = lineCount >= this.virtual_scrolling_threshold;

      if (this.use_virtual_scrolling && !this.virtual_scroller) {
        this.virtual_scroller = new VirtualScroller(this.content_wrapper_el, {
          line_height: 22.4,
          buffer_lines: 20,
        });

        // 스크롤 시 재렌더링
        this.content_wrapper_el.addEventListener('scroll', () => {
          if (!this.is_rendering) {
            this.#render();
          }
        });
      }

      this.#render();

      // 문서 변경 감지 (중복 방지)
      if (!this.change_listener) {
        this.change_listener = () => {
          if (!this.is_rendering) {
            this.#render();
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
   * 텍스트 렌더링 (Virtual Scrolling 지원)
   */
  #render() {
    if (!this.document) return;

    this.is_rendering = true;

    if (this.use_virtual_scrolling) {
      this.#renderWithVirtualScrolling();
    } else {
      this.#renderAllLines();
    }

    this.is_rendering = false;
  }

  /**
   * 전체 줄 렌더링 (일반 모드)
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

    // 줄 번호 렌더링 (가시 범위만)
    this.#renderLineNumbersVirtual(start, end);

    // 텍스트 렌더링 (가시 범위만)
    this.#renderContentVirtual(start, end);

    // 전체 높이 설정 (스크롤바 위치 유지)
    const totalHeight = this.virtual_scroller.getTotalHeight();
    this.content_el.style.height = `${totalHeight}px`;
    this.line_numbers_el.style.height = `${totalHeight}px`;
  }

  /**
   * 줄 번호 렌더링 (전체)
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

    // 상단 오프셋
    const topOffset = _start * 22.4;
    html += `<div style="height: ${topOffset}px;"></div>`;

    // 가시 범위 줄 번호
    for (let i = _start; i < _end; i++) {
      html += `<div class="line-number">${i + 1}</div>`;
    }

    this.line_numbers_el.innerHTML = html;
  }

  /**
   * 텍스트 내용 렌더링 (전체)
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

    // 커서 위치 저장
    const cursorInfo = this.#saveCursor();

    // innerHTML 설정 전에 완전히 비우기
    this.content_el.innerHTML = '';
    this.content_el.innerHTML = html;
    this.content_el.contentEditable = 'true';

    // 커서 복원
    if (cursorInfo) {
      this.#restoreCursor(cursorInfo);
    }

    this.content_el.focus();
  }

  /**
   * 텍스트 내용 렌더링 (Virtual)
   */
  #renderContentVirtual(_start, _end) {
    const lines = this.document.lines;
    const language = this.#detectLanguage();
    let html = '';

    // 상단 오프셋
    const topOffset = _start * 22.4;
    html += `<div style="height: ${topOffset}px;"></div>`;

    // 가시 범위 줄
    for (let i = _start; i < _end; i++) {
      const line = lines[i] || '\n';
      const highlightedHTML = this.syntax_renderer.renderLine(line, language);
      html += `<div class="code-line">${highlightedHTML}</div>`;
    }

    this.content_el.innerHTML = html;
    this.content_el.contentEditable = 'true';
  }

  /**
   * 자동완성 트리거 체크
   */
  #checkCompletionTrigger() {
    if (!this.document) return;

    const cursorPos = this.#getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) return;

    // 커서 앞 텍스트에서 접두사 추출
    const beforeCursor = currentLine.substring(0, cursorPos.column);
    const prefixMatch = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
    const prefix = prefixMatch ? prefixMatch[0] : '';

    if (prefix.length >= 1) {
      this.emit('trigger-completion', {
        line: cursorPos.line,
        column: cursorPos.column,
        prefix: prefix,
      });
    }
  }

  /**
   * 커서 위치 가져오기 (줄, 열)
   */
  #getCursorPosition() {
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
      return null;
    }
  }

  /**
   * 커서 위치 저장 (개선)
   */
  #saveCursor() {
    try {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(this.content_el);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);

      return {
        offset: preSelectionRange.toString().length,
        isCollapsed: range.collapsed,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * 커서 위치 복원 (개선)
   */
  #restoreCursor(_cursorInfo) {
    if (!_cursorInfo) return;

    try {
      const selection = window.getSelection();
      const range = window.document.createRange();

      let charCount = 0;
      let found = false;

      const walkTextNodes = (_node) => {
        if (_node.nodeType === Node.TEXT_NODE) {
          const nextCharCount = charCount + _node.length;

          if (!found && _cursorInfo.offset >= charCount && _cursorInfo.offset <= nextCharCount) {
            range.setStart(_node, _cursorInfo.offset - charCount);
            range.setEnd(_node, _cursorInfo.offset - charCount);
            found = true;
            return;
          }

          charCount = nextCharCount;
        } else {
          for (let i = 0; i < _node.childNodes.length; i++) {
            walkTextNodes(_node.childNodes[i]);
            if (found) return;
          }
        }
      };

      walkTextNodes(this.content_el);

      if (found) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      // 복원 실패 시 무시
      console.warn('커서 복원 실패:', e);
    }
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
   * 입력 처리
   */
  #handleInput(_e) {
    if (!this.document) return;

    // const text = this.content_el.innerText;
    const text = this.#extractText();

    if (this.is_rendering) return;

    // 중복 업데이트 방지
    const currentText = this.document.getText();
    if (text === currentText) {
      return;
    }

    this.document.content = text;
    this.document.lines = text.split('\n');

    if (!this.document.is_dirty) {
      this.document.is_dirty = true;
      this.emit('content-changed', {
        document: this.document,
        text: text,
      });
    }
  }

  /**
   * 붙여넣기 처리
   */
  #handlePaste(_e) {
    _e.preventDefault();

    // 클립보드에서 순수 텍스트만 가져오기
    const text = _e.clipboardData.getData('text/plain');

    if (!text) return;

    // 순수 텍스트로 삽입
    window.document.execCommand('insertText', false, text);

    // Document 업데이트는 input 이벤트에서 자동 처리됨
  }

  /**
   * 특수 키 처리
   */
  #handleKeyDown(_e) {
    if (_e.key === 'Tab') {
      _e.preventDefault();
      window.document.execCommand('insertText', false, '  ');
      return;
    }
  }

  /**
   * 선택 영역 변경 처리
   */
  #handleSelectionChange() {
    if (!this.document) return;

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    this.emit('cursor-moved', {
      hasSelection: !selection.isCollapsed,
    });
  }

  /**
   * 정확한 텍스트 추출
   */
  #extractText() {
    const lines = [];

    // 최상위 .code-line만 선택 (중첩 방지)
    const codeLines = this.content_el.querySelectorAll(':scope > .code-line');
    // const codeLines = this.content_el.querySelectorAll('.code-line');

    codeLines.forEach((_lineEl) => {
      let lineText = '';

      // 텍스트 노드만 재귀 추출
      const extractTextFromNode = (_node) => {
        if (_node.nodeType === Node.TEXT_NODE) {
          lineText += _node.textContent;
        } else if (_node.nodeType === Node.ELEMENT_NODE) {
          // BR 태그는 무시
          if (_node.nodeName === 'BR') {
            return;
          }

          // 자식 노드 순회
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
   * 커서 화면 좌표 가져오기
   */
  getCursorCoordinates() {
    try {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return { top: 0, left: 0 };

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();

      return {
        top: rect.bottom - containerRect.top,
        left: rect.left - containerRect.left,
      };
    } catch (e) {
      return { top: 0, left: 0 };
    }
  }

  /**
   * 자동완성 삽입
   */
  insertCompletion(_completion) {
    if (!this.document) return;

    const cursorPos = this.#getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) return;

    // 접두사 찾기
    const beforeCursor = currentLine.substring(0, cursorPos.column);
    const prefixMatch = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
    const prefix = prefixMatch ? prefixMatch[0] : '';

    // 접두사 제거 위치
    const deleteStart = cursorPos.column - prefix.length;

    // 텍스트 삽입
    const newLine = currentLine.substring(0, deleteStart) + _completion.insertText + currentLine.substring(cursorPos.column);

    this.document.lines[cursorPos.line] = newLine;
    this.document.content = this.document.getText();
    this.document.is_dirty = true;

    // 재렌더링
    this.#render();

    // 커서 위치 조정 (삽입된 텍스트 끝으로)
    const newColumn = deleteStart + _completion.insertText.length;

    // 간단한 커서 위치 복원 (정확하지 않을 수 있음)
    this.content_el.focus();
  }

  /**
   * 자동완성 패널 가시성 설정
   */
  setCompletionPanelVisible(_visible) {
    this.completion_panel_visible = _visible;
  }

  /**
   * 검색 결과 하이라이트
   */
  highlightSearchResults(_results, _currentIndex) {
    this.search_results = _results;
    this.search_current_index = _currentIndex;

    // 렌더링 시 하이라이트 적용
    this.#render();

    // 현재 결과로 스크롤
    if (_currentIndex >= 0 && _currentIndex < _results.length) {
      this.#scrollToSearchResult(_results[_currentIndex]);
    }
  }

  /**
   * 검색 하이라이트 제거
   */
  clearSearchHighlights() {
    this.search_results = [];
    this.search_current_index = -1;
    this.#render();
  }

  /**
   * 검색 결과로 스크롤
   */
  #scrollToSearchResult(_result) {
    // 해당 줄로 스크롤
    const lineHeight = 22.4;
    const scrollTop = _result.line * lineHeight;

    this.content_wrapper_el.scrollTop = scrollTop - 100; // 상단 여백
  }

  /**
   * 포커스
   */
  focus() {
    this.content_el.focus();
  }

  /**
   * 현재 문서 반환
   */
  getDocument() {
    return this.document;
  }
}
