/**
 * 파일: src/views/components/EditorPane.js
 * 기능: 코드 에디터 UI 컴포넌트
 * 책임: 텍스트 편집, 커서 관리, 신택스 하이라이팅
 *
 * 리팩토링 변경사항:
 * 1. BaseComponent 상속 적용
 * 2. 생명주기 메서드 구현 (initialize, render)
 * 3. 검증 로직 추가
 * 4. 상태 관리 개선
 *
 * 향후 분리 계획 (PHASE 5):
 * - TextEditor: 텍스트 편집 로직
 * - LineNumberGutter: 줄 번호 렌더링
 * - SearchHighlighter: 검색 하이라이트
 */

import BaseComponent from '../../core/BaseComponent.js';
import ValidationUtils from '../../utils/ValidationUtils.js';
import SyntaxRenderer from '../renderers/SyntaxRenderer.js';
import VirtualScroller from '../renderers/VirtualScroller.js';

export default class EditorPane extends BaseComponent {
  constructor(_containerId) {
    super(_containerId);

    // Document
    this.document = null;

    // 렌더링
    this.is_rendering = false;
    this.syntax_renderer = new SyntaxRenderer();

    // Virtual Scrolling
    this.virtual_scroller = null;
    this.use_virtual_scrolling = false;
    this.virtual_scrolling_threshold = 1000;

    // 입력 처리
    this.is_composing = false;
    this.change_listener = null;

    // 자동완성
    this.completion_panel_visible = false;
    this.completion_check_timeout = null;

    // 검색
    this.search_results = [];
    this.search_current_index = -1;

    // DOM 참조
    this.line_numbers_el = null;
    this.content_wrapper_el = null;
    this.content_el = null;
  }

  /**
   * 초기화 (BaseComponent.initialize 구현)
   */
  initialize() {
    this.#createDOM();
    this.#attachEvents();
  }

  /**
   * DOM 구조 생성 (private)
   */
  #createDOM() {
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
  }

  /**
   * 이벤트 연결 (private)
   */
  #attachEvents() {
    // 한글 입력 처리
    this.content_el.addEventListener('compositionstart', () => {
      this.is_composing = true;
    });

    this.content_el.addEventListener('compositionend', () => {
      this.is_composing = false;
      this.#updateDocumentImmediate();
      this.#scheduleCompletionCheck();
    });

    // 입력 이벤트
    this.content_el.addEventListener('input', () => {
      if (this.is_composing) return;
      this.#updateDocumentImmediate();
      this.#scheduleCompletionCheck();
    });

    // 붙여넣기
    this.content_el.addEventListener('paste', (_e) => {
      this.#handlePaste(_e);
    });

    // 키보드
    this.content_el.addEventListener('keydown', (_e) => {
      this.#handleKeyDown(_e);
    });

    // 클릭
    this.content_el.addEventListener('click', () => {
      this.#updateActiveLine();
    });

    // 스크롤 동기화
    this.content_wrapper_el.addEventListener('scroll', () => {
      this.line_numbers_el.scrollTop = this.content_wrapper_el.scrollTop;
    });
  }

  /**
   * 렌더링 (BaseComponent.render 구현)
   */
  render() {
    if (!this.document) {
      this.#renderEmpty();
      return;
    }

    // Virtual Scrolling 판단
    const lineCount = this.document.getLineCount();
    this.use_virtual_scrolling = lineCount > this.virtual_scrolling_threshold;

    if (this.use_virtual_scrolling && !this.virtual_scroller) {
      this.#initializeVirtualScroller();
    }

    // 커서 위치 저장
    const cursorPos = this.getCursorPosition();

    // 렌더링
    this.is_rendering = true;

    if (this.use_virtual_scrolling) {
      this.#renderWithVirtualScrolling();
    } else {
      this.#renderNormal();
    }

    this.is_rendering = false;

    // 커서 복원
    if (cursorPos) {
      this.setCursorPosition(cursorPos.line, cursorPos.column);
    }

    this.emit('rendered', { document: this.document });
  }

  /**
   * 빈 상태 렌더링 (private)
   */
  #renderEmpty() {
    this.line_numbers_el.innerHTML = '';
    this.content_el.innerHTML = '<div class="empty-editor">No file opened</div>';
    this.content_el.contentEditable = 'false';
  }

  /**
   * 일반 렌더링 (private)
   */
  #renderNormal() {
    const lines = this.document.lines;
    const language = this.#detectLanguage();

    // 줄 번호
    this.#renderLineNumbers(lines.length);

    // 내용
    let html = '';
    lines.forEach((_line) => {
      const highlightedHTML = this.syntax_renderer.renderLine(_line, language, {
        searchResults: this.search_results,
        currentIndex: this.search_current_index,
        lineIndex: lines.indexOf(_line),
      });
      html += `<div class="code-line">${highlightedHTML}</div>`;
    });

    this.content_el.innerHTML = html;
    this.content_el.contentEditable = 'true';
  }

  /**
   * Virtual Scrolling 렌더링 (private)
   */
  #renderWithVirtualScrolling() {
    if (!this.virtual_scroller) return;

    const { start, end } = this.virtual_scroller.getVisibleRange();
    const lines = this.document.lines;
    const language = this.#detectLanguage();

    // 줄 번호
    this.#renderLineNumbers(lines.length);

    // 내용
    const topOffset = start * 22.4; // 줄 높이
    let html = `<div style="height: ${topOffset}px;"></div>`;

    for (let i = start; i < end; i++) {
      const line = lines[i] || '\n';
      const highlightedHTML = this.syntax_renderer.renderLine(line, language);
      html += `<div class="code-line">${highlightedHTML}</div>`;
    }

    this.content_el.innerHTML = html;
    this.content_el.contentEditable = 'true';
  }

  /**
   * 줄 번호 렌더링 (private)
   */
  #renderLineNumbers(_count) {
    let html = '';
    for (let i = 0; i < _count; i++) {
      html += `<div class="line-number">${i + 1}</div>`;
    }
    this.line_numbers_el.innerHTML = html;
  }

  /**
   * Virtual Scroller 초기화 (private)
   */
  #initializeVirtualScroller() {
    this.virtual_scroller = new VirtualScroller({
      total_lines: this.document.getLineCount(),
      container_height: this.content_wrapper_el.clientHeight,
      line_height: 22.4,
      buffer_lines: 10,
    });

    this.content_wrapper_el.addEventListener('scroll', () => {
      if (this.virtual_scroller) {
        this.virtual_scroller.updateScrollTop(this.content_wrapper_el.scrollTop);
        this.render();
      }
    });
  }

  /**
   * 언어 감지 (private)
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
   * Document 설정
   */
  setDocument(_document) {
    this.#validateDocument(_document);

    // 기존 리스너 제거
    if (this.document && this.change_listener) {
      this.document.removeListener('change', this.change_listener);
    }

    this.document = _document;

    if (_document) {
      // 변경 리스너 등록
      this.change_listener = () => {
        if (!this.is_rendering) {
          this.render();
        }
      };
      _document.on('change', this.change_listener);

      this.render();
    } else {
      this.#renderEmpty();
    }

    this.emit('document-set', { document: _document });
  }

  /**
   * Document 가져오기
   */
  getDocument() {
    return this.document;
  }

  /**
   * Document 즉시 업데이트 (private)
   */
  #updateDocumentImmediate() {
    if (!this.document || this.is_rendering) return;

    const text = this.#extractText();
    const oldText = this.document.getText();

    if (text !== oldText) {
      this.document.content = text;
      this.document.lines = text.split('\n');
      this.document.setDirty(true);

      this.emit('content-changed', { document: this.document, text });
    }
  }

  /**
   * 텍스트 추출 (private)
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
          if (_node.nodeName === 'BR') return;
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
   * 키보드 처리 (private)
   */
  #handleKeyDown(_e) {
    // Tab
    if (_e.key === 'Tab') {
      _e.preventDefault();
      window.document.execCommand('insertText', false, '  ');
      return;
    }

    // Ctrl+S
    if (_e.ctrlKey && _e.key === 's') {
      _e.preventDefault();
      if (this.document) {
        this.emit('save-requested', this.document);
      }
      return;
    }

    // Ctrl+Space (자동완성)
    if (_e.ctrlKey && _e.key === ' ') {
      _e.preventDefault();
      this.#triggerCompletion();
      return;
    }

    // 자동완성 네비게이션
    if (this.completion_panel_visible) {
      if (_e.key === 'ArrowDown') {
        _e.preventDefault();
        this.emit('completion-next');
        return;
      }
      if (_e.key === 'ArrowUp') {
        _e.preventDefault();
        this.emit('completion-previous');
        return;
      }
      if (_e.key === 'Enter') {
        _e.preventDefault();
        this.emit('completion-confirm');
        return;
      }
      if (_e.key === 'Escape') {
        _e.preventDefault();
        this.emit('completion-cancel');
        return;
      }
    }
  }

  /**
   * 붙여넣기 처리 (private)
   */
  #handlePaste(_e) {
    _e.preventDefault();
    const text = _e.clipboardData.getData('text/plain');
    window.document.execCommand('insertText', false, text);
  }

  /**
   * 자동완성 트리거 (private)
   */
  #triggerCompletion() {
    const cursorPos = this.getCursorPosition();
    if (!cursorPos || !this.document) return;

    const line = this.document.getLine(cursorPos.line);
    const prefix = line.substring(0, cursorPos.column);

    this.emit('trigger-completion', { prefix, line, cursorPos });
  }

  /**
   * 자동완성 체크 스케줄 (private)
   */
  #scheduleCompletionCheck() {
    if (this.completion_check_timeout) {
      clearTimeout(this.completion_check_timeout);
    }

    this.completion_check_timeout = setTimeout(() => {
      this.#checkCompletionTrigger();
    }, 200);
  }

  /**
   * 자동완성 트리거 체크 (private)
   */
  #checkCompletionTrigger() {
    const cursorPos = this.getCursorPosition();
    if (!cursorPos || !this.document) return;

    const line = this.document.getLine(cursorPos.line);
    const beforeCursor = line.substring(0, cursorPos.column);

    // . 입력 시 자동 트리거
    if (beforeCursor.endsWith('.')) {
      this.#triggerCompletion();
    }
  }

  /**
   * 활성 줄 업데이트 (private)
   */
  #updateActiveLine() {
    // 현재는 비어있음 - 향후 활성 줄 하이라이트 구현
  }

  /**
   * 커서 위치 가져오기
   */
  getCursorPosition() {
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) return null;

      const range = selection.getRangeAt(0);
      const container = range.startContainer;
      const offset = range.startOffset;

      // .code-line 찾기
      let lineEl = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
      while (lineEl && !lineEl.classList.contains('code-line')) {
        lineEl = lineEl.parentElement;
      }

      if (!lineEl) return null;

      const codeLines = this.content_el.querySelectorAll('.code-line');
      const lineIndex = Array.from(codeLines).indexOf(lineEl);

      // 줄 내에서 오프셋 계산
      let column = 0;
      const walker = window.document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node === container) {
          column += offset;
          break;
        }
        column += node.textContent.length;
      }

      return { line: lineIndex, column };
    } catch (_error) {
      console.error('getCursorPosition error:', _error);
      return null;
    }
  }

  /**
   * 커서 위치 설정
   */
  setCursorPosition(_line, _column) {
    ValidationUtils.assertNumber(_line, 'Line');
    ValidationUtils.assertNumber(_column, 'Column');

    try {
      const codeLines = this.content_el.querySelectorAll('.code-line');
      if (_line < 0 || _line >= codeLines.length) return;

      const lineEl = codeLines[_line];
      const range = window.document.createRange();
      const selection = window.getSelection();

      // 텍스트 노드 찾기
      const walker = window.document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
      let currentOffset = 0;
      let targetNode = null;
      let targetOffset = 0;

      let node;
      while ((node = walker.nextNode())) {
        const nodeLength = node.textContent.length;
        if (currentOffset + nodeLength >= _column) {
          targetNode = node;
          targetOffset = _column - currentOffset;
          break;
        }
        currentOffset += nodeLength;
      }

      if (!targetNode) {
        // 줄 끝
        targetNode = walker.currentNode || lineEl;
        targetOffset = targetNode.textContent?.length || 0;
      }

      range.setStart(targetNode, targetOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_error) {
      console.error('setCursorPosition error:', _error);
    }
  }

  /**
   * 검색 하이라이트
   */
  highlightSearchResults(_results, _currentIndex) {
    ValidationUtils.assertArray(_results, 'Results');

    this.search_results = _results;
    this.search_current_index = _currentIndex;
    this.render();

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
    this.render();
  }

  /**
   * 검색 결과로 스크롤 (private)
   */
  #scrollToSearchResult(_result) {
    const lineHeight = 22.4;
    const scrollTop = _result.line * lineHeight;
    this.content_wrapper_el.scrollTop = scrollTop - 100;
  }

  /**
   * 자동완성 패널 표시 상태
   */
  setCompletionPanelVisible(_visible) {
    ValidationUtils.assertBoolean(_visible, 'Visible');
    this.completion_panel_visible = _visible;
  }

  /**
   * 자동완성 삽입
   */
  insertCompletion(_completion) {
    ValidationUtils.assertNonNull(_completion, 'Completion');

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    // 간단한 텍스트 삽입 (실제로는 더 복잡한 로직 필요)
    window.document.execCommand('insertText', false, _completion.label);
  }

  /**
   * 포커스
   */
  focus() {
    this.content_el.focus();
  }

  /**
   * Document 검증 (private)
   */
  #validateDocument(_document) {
    if (_document === null) return; // null 허용

    ValidationUtils.assertObject(_document, 'Document');

    if (!_document.getLineCount || typeof _document.getLineCount !== 'function') {
      throw new Error('Document must have getLineCount() method');
    }
  }

  /**
   * 컴포넌트 파괴
   */
  destroy() {
    // 리스너 제거
    if (this.document && this.change_listener) {
      this.document.removeListener('change', this.change_listener);
    }

    // 타임아웃 정리
    if (this.completion_check_timeout) {
      clearTimeout(this.completion_check_timeout);
    }

    // 렌더러 정리
    if (this.syntax_renderer) {
      this.syntax_renderer.destroy();
    }

    // 상태 초기화
    this.document = null;
    this.virtual_scroller = null;
    this.search_results = [];

    super.destroy();
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      component: this.constructor.name,
      is_mounted: this.is_mounted,
      has_document: !!this.document,
      use_virtual_scrolling: this.use_virtual_scrolling,
      search_results_count: this.search_results.length,
      completion_panel_visible: this.completion_panel_visible,
    };
  }
}
