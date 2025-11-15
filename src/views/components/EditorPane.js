/**
 * 파일: src/views/components/EditorPane.js
 * 기능: 텍스트 에디터 UI
 * 책임: 텍스트 렌더링, 키보드 입력 처리, 커서 표시
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class EditorPane extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container = window.document.getElementById(_containerId);
    this.document = null;
    this.is_rendering = false;
    this.change_listener = null;

    this.#initialize();
  }

  #initialize() {
    this.container.innerHTML = `
      <div class="editor-pane">
        <div class="line-numbers"></div>
        <div class="editor-content" contenteditable="true" spellcheck="false"></div>
      </div>
    `;

    this.line_numbers_el = this.container.querySelector('.line-numbers');
    this.content_el = this.container.querySelector('.editor-content');

    this.#attachEvents();
  }

  #attachEvents() {
    // 키보드 입력
    this.content_el.addEventListener('input', (_e) => {
      this.#handleInput(_e);
    });

    // 키 다운 (특수 키 처리)
    this.content_el.addEventListener('keydown', (_e) => {
      this.#handleKeyDown(_e);
    });

    // 포커스
    this.content_el.addEventListener('focus', () => {
      this.emit('focus');
    });

    // 선택 영역 변경
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
      this.#render();

      // 문서 변경 감지 (중복 방지)
      if (!this.change_listener) {
        this.change_listener = () => {
          // 렌더링 중이 아닐 때만 재렌더링
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
   * 텍스트 렌더링
   */
  #render() {
    if (!this.document) return;

    this.is_rendering = true; // 렌더링 시작

    // 줄 번호 렌더링
    this.#renderLineNumbers();

    // 텍스트 렌더링
    this.#renderContent();

    this.is_rendering = false; // 렌더링 완료
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
   * 텍스트 내용 렌더링
   */
  #renderContent() {
    const lines = this.document.lines;
    let html = '';

    lines.forEach((line, index) => {
      // 빈 줄도 높이 유지
      const displayLine = line || '\n';
      html += `<div class="code-line">${this.#escapeHtml(displayLine)}</div>`;
    });

    // 커서 위치 저장
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const cursorOffset = range ? range.startOffset : 0;

    this.content_el.innerHTML = html;

    // 커서 복원 (Phase 2에서는 간단하게)
    this.content_el.contentEditable = 'true';
    this.content_el.focus();
  }

  /**
   * HTML 이스케이프
   */
  #escapeHtml(_text) {
    const div = window.document.createElement('div');
    div.textContent = _text;
    return div.innerHTML;
  }

  /**
   * 입력 처리
   */
  #handleInput(_e) {
    if (!this.document) return;

    // contentEditable의 내용을 Document에 동기화
    const text = this.content_el.innerText;

    // 렌더링 중일 때는 동기화 스킵
    if (this.is_rendering) return;

    // Document 업데이트 (onChange 트리거하지 않도록)
    this.document.content = text;
    this.document.lines = text.split('\n');

    // dirty 플래그만 설정 (onChange 호출 없이)
    if (!this.document.is_dirty) {
      this.document.is_dirty = true;
      // TabBar 업데이트를 위한 이벤트만 발행
      this.emit('content-changed', {
        document: this.document,
        text: text,
      });
    }
  }

  /**
   * 특수 키 처리 (Tab, Enter 등)
   */
  #handleKeyDown(_e) {
    // Tab 키: 2칸 들여쓰기
    if (_e.key === 'Tab') {
      _e.preventDefault();
      window.document.execCommand('insertText', false, '  ');
      return;
    }

    // Ctrl+S: 저장
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

    const range = selection.getRangeAt(0);

    // 커서 위치 계산 (간단한 버전)
    const text = this.content_el.innerText;
    const cursorPos = this.#getTextOffset(range.startContainer, range.startOffset);

    this.emit('cursor-moved', {
      position: cursorPos,
      hasSelection: !selection.isCollapsed,
    });
  }

  /**
   * 텍스트 오프셋 계산
   */
  #getTextOffset(_node, _offset) {
    const text = this.content_el.innerText;
    // 간단한 구현 (정확한 계산은 Phase 3에서)
    return _offset;
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
