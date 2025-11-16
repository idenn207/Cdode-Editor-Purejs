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

    lines.forEach((_line) => {
      const displayLine = _line || '\n';
      const highlightedHTML = this.syntax_renderer.renderLine(displayLine, language);
      html += `<div class="code-line">${highlightedHTML}</div>`;
    });

    // 커서 위치 저장
    const cursorInfo = this.#saveCursor();

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
   * 특수 키 처리
   */
  #handleKeyDown(_e) {
    if (_e.key === 'Tab') {
      _e.preventDefault();
      window.document.execCommand('insertText', false, '  ');
      return;
    }

    if (_e.ctrlKey && _e.key === 's') {
      _e.preventDefault();
      this.emit('save-requested', this.document);
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
    const codeLines = this.content_el.querySelectorAll('.code-line');

    codeLines.forEach((_lineEl) => {
      let lineText = '';

      // 노드 순회하며 텍스트 추출
      const walkNodes = (_node) => {
        if (_node.nodeType === Node.TEXT_NODE) {
          lineText += _node.textContent;
        } else if (_node.nodeName === 'BR') {
          // BR 태그는 무시 (우리가 넣은 적 없음)
          return;
        } else {
          for (let child of _node.childNodes) {
            walkNodes(child);
          }
        }
      };

      walkNodes(_lineEl);

      lines.push(lineText);
    });

    return lines.join('\n');
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
