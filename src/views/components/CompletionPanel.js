/**
 * 파일: src/views/components/CompletionPanel.js
 * 기능: 자동완성 UI
 * 책임: 자동완성 항목 표시 및 선택
 */

import {
  COMPLETION_KIND_CLASS,
  COMPLETION_KIND_FUNCTION,
  COMPLETION_KIND_KEYWORD,
  COMPLETION_KIND_SNIPPET,
  COMPLETION_KIND_VARIABLE,
} from '../../services/CompletionService.js';
import EventEmitter from '../../utils/EventEmitter.js';

export default class CompletionPanel extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container = window.document.getElementById(_containerId);
    this.items = [];
    this.selected_index = 0;
    this.is_visible = false;

    this.#initialize();
  }

  #initialize() {
    const panel = window.document.createElement('div');
    panel.className = 'completion-panel';
    panel.style.display = 'none';

    this.container.appendChild(panel);
    this.panel = panel;

    this.#attachEvents();
  }

  #attachEvents() {
    // 키보드 이벤트는 EditorPane에서 처리
    // (패널이 보일 때만 화살표/엔터 키 가로채기)
  }

  /**
   * 패널 표시
   */
  show(_items, _position) {
    if (!_items || _items.length === 0) {
      this.hide();
      return;
    }

    this.items = _items;
    this.selected_index = 0;
    this.is_visible = true;

    this.#renderItems();
    this.#positionPanel(_position);

    this.panel.style.display = 'block';
  }

  /**
   * 패널 숨김
   */
  hide() {
    this.panel.style.display = 'none';
    this.is_visible = false;
    this.items = [];
    this.selected_index = 0;
  }

  /**
   * 다음 항목 선택
   */
  selectNext() {
    if (this.items.length === 0) return;

    this.selected_index = (this.selected_index + 1) % this.items.length;
    this.#renderItems();
    this.#scrollToSelected();
  }

  /**
   * 이전 항목 선택
   */
  selectPrevious() {
    if (this.items.length === 0) return;

    this.selected_index = (this.selected_index - 1 + this.items.length) % this.items.length;
    this.#renderItems();
    this.#scrollToSelected();
  }

  /**
   * 현재 선택된 항목 반환
   */
  getCurrentItem() {
    if (this.selected_index < 0 || this.selected_index >= this.items.length) {
      return null;
    }
    return this.items[this.selected_index];
  }

  /**
   * 항목 렌더링
   */
  #renderItems() {
    let html = '';

    this.items.forEach((_item, _index) => {
      const isSelected = _index === this.selected_index;
      const icon = this.#getIcon(_item.kind);

      html += `
        <div class="completion-item ${isSelected ? 'selected' : ''}" data-index="${_index}">
          <span class="completion-icon">${icon}</span>
          <span class="completion-label">${this.#escapeHtml(_item.label)}</span>
          <span class="completion-detail">${this.#escapeHtml(_item.detail || '')}</span>
        </div>
      `;
    });

    this.panel.innerHTML = html;

    // 항목 클릭 이벤트
    this.panel.querySelectorAll('.completion-item').forEach((_el) => {
      _el.addEventListener('click', () => {
        const index = parseInt(_el.dataset.index);
        this.selected_index = index;
        this.#confirmSelection();
      });
    });
  }

  /**
   * 선택된 항목으로 스크롤
   */
  #scrollToSelected() {
    const selectedEl = this.panel.querySelector('.completion-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * 패널 위치 지정
   */
  #positionPanel(_position) {
    this.panel.style.top = `${_position.top + 20}px`;
    this.panel.style.left = `${_position.left}px`;
  }

  /**
   * 선택 확정
   */
  #confirmSelection() {
    const item = this.getCurrentItem();
    if (item) {
      this.emit('item-selected', item);
      this.hide();
    }
  }

  /**
   * Kind 아이콘 반환
   */
  #getIcon(_kind) {
    const icons = {
      [COMPLETION_KIND_KEYWORD]: 'K',
      [COMPLETION_KIND_VARIABLE]: 'v',
      [COMPLETION_KIND_FUNCTION]: 'ƒ',
      [COMPLETION_KIND_CLASS]: 'C',
      [COMPLETION_KIND_SNIPPET]: '◊',
    };
    return icons[_kind] || '•';
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
   * 가시성 확인
   */
  isVisible() {
    return this.is_visible;
  }

  /**
   * Enter 키 처리 (외부에서 호출)
   */
  handleEnter() {
    this.#confirmSelection();
  }

  /**
   * Escape 키 처리 (외부에서 호출)
   */
  handleEscape() {
    this.hide();
    this.emit('close-requested');
  }
}
