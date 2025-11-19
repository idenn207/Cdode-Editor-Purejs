/**
 * 파일: src/views/components/CompletionPanel.js
 * 기능: 자동완성 패널 UI
 * 책임: 자동완성 항목 표시, 선택, 키보드 네비게이션
 * 수정: 패널 위치를 커서 아래 기준 (0,0)으로 정렬
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class CompletionPanel extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container = window.document.getElementById(_containerId);
    this.items = [];
    this.selected_index = 0;
    this.panel_el = null;

    this.#initialize();
  }

  #initialize() {
    this.panel_el = window.document.createElement('div');
    this.panel_el.className = 'completion-panel';
    this.panel_el.style.display = 'none';
    this.container.appendChild(this.panel_el);

    this.#attachEvents();
  }

  #attachEvents() {
    // 클릭 이벤트
    this.panel_el.addEventListener('click', (_e) => {
      const itemEl = _e.target.closest('.completion-item');
      if (!itemEl) return;

      const index = parseInt(itemEl.dataset.index, 10);
      if (isNaN(index)) return;

      this.selected_index = index;
      this.emit('confirm');
    });
  }

  /**
   * 패널 표시 (수정 2: 커서 기준 위치)
   */
  show(_items, _coords) {
    this.items = _items;
    this.selected_index = 0;

    // 패널의 left-top을 커서 위치 기준으로 설정 (수정 2)
    // _coords.y는 커서의 top 위치이므로 줄 높이만큼 아래로 이동
    this.panel_el.style.left = `${_coords.x}px`;
    this.panel_el.style.top = `${_coords.y + 20}px`; // 커서 아래 20px (줄 높이)

    this.#render();
    this.panel_el.style.display = 'block';
  }

  /**
   * 패널 숨김
   */
  hide() {
    this.panel_el.style.display = 'none';
    this.items = [];
    this.selected_index = 0;
  }

  /**
   * 다음 항목 선택
   */
  selectNext() {
    if (this.items.length === 0) return;

    this.selected_index = (this.selected_index + 1) % this.items.length;
    this.#render();
    this.#scrollToSelected();
  }

  /**
   * 이전 항목 선택
   */
  selectPrevious() {
    if (this.items.length === 0) return;

    this.selected_index = (this.selected_index - 1 + this.items.length) % this.items.length;
    this.#render();
    this.#scrollToSelected();
  }

  /**
   * 현재 선택된 항목 가져오기
   */
  getSelectedItem() {
    if (this.selected_index < 0 || this.selected_index >= this.items.length) {
      return null;
    }
    return this.items[this.selected_index];
  }

  /**
   * 렌더링
   */
  #render() {
    if (this.items.length === 0) {
      this.panel_el.innerHTML = '<div class="completion-empty">No suggestions</div>';
      return;
    }

    const fragment = window.document.createDocumentFragment();

    this.items.forEach((_item, _index) => {
      const itemEl = window.document.createElement('div');
      itemEl.className = 'completion-item';
      itemEl.dataset.index = _index;

      if (_index === this.selected_index) {
        itemEl.classList.add('selected');
      }

      // 아이콘
      const iconEl = window.document.createElement('div');
      iconEl.className = 'completion-icon';
      iconEl.textContent = this.#getIcon(_item.kind);
      itemEl.appendChild(iconEl);

      // 레이블
      const labelEl = window.document.createElement('div');
      labelEl.className = 'completion-label';
      labelEl.textContent = _item.label;
      itemEl.appendChild(labelEl);

      // 상세 정보
      if (_item.detail) {
        const detailEl = window.document.createElement('div');
        detailEl.className = 'completion-detail';
        detailEl.textContent = _item.detail;
        itemEl.appendChild(detailEl);
      }

      fragment.appendChild(itemEl);
    });

    this.panel_el.innerHTML = '';
    this.panel_el.appendChild(fragment);
  }

  /**
   * 선택된 항목으로 스크롤
   */
  #scrollToSelected() {
    const selectedEl = this.panel_el.querySelector('.completion-item.selected');
    if (!selectedEl) return;

    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /**
   * 아이콘 가져오기
   */
  #getIcon(_kind) {
    const icons = {
      keyword: 'K',
      variable: 'V',
      function: 'F',
      class: 'C',
      method: 'M',
      property: 'P',
      snippet: 'S',
      constant: 'C',
    };

    return icons[_kind] || '?';
  }
}
