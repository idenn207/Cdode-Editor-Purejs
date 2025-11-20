/**
 * 파일: src/views/components/CompletionPanel.js
 * 기능: 자동완성 패널 UI
 * 책임: 자동완성 항목 표시, 선택, 키보드 네비게이션
 *
 * 리팩토링 변경사항:
 * 1. BaseComponent 상속 적용
 * 2. 생명주기 메서드 구현
 * 3. 검증 로직 추가
 * 4. 상태 관리 개선
 */

import BaseComponent from '../../core/BaseComponent.js';
import DOMUtils from '../../utils/DOMUtils.js';
import ValidationUtils from '../../utils/ValidationUtils.js';

export default class CompletionPanel extends BaseComponent {
  constructor(_containerId) {
    super(_containerId);

    // 상태
    this.items = [];
    this.selected_index = 0;
    this.is_visible = false;

    // DOM 참조
    this.panel_el = null;
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
    this.panel_el = DOMUtils.createElement('div', {
      className: 'completion-panel',
      styles: {
        display: 'none',
        position: 'absolute',
      },
    });

    this.container.appendChild(this.panel_el);
  }

  /**
   * 이벤트 연결 (private)
   */
  #attachEvents() {
    // 클릭 이벤트
    this.panel_el.addEventListener('click', (_e) => {
      const itemEl = _e.target.closest('.completion-item');
      if (!itemEl) return;

      const index = parseInt(itemEl.dataset.index, 10);
      if (isNaN(index) || index < 0 || index >= this.items.length) return;

      this.selected_index = index;
      this.handleEnter();
    });

    // 마우스 호버
    this.panel_el.addEventListener('mouseover', (_e) => {
      const itemEl = _e.target.closest('.completion-item');
      if (!itemEl) return;

      const index = parseInt(itemEl.dataset.index, 10);
      if (isNaN(index) || index < 0 || index >= this.items.length) return;

      this.selected_index = index;
      this.render();
    });
  }

  /**
   * 렌더링 (BaseComponent.render 구현)
   */
  render() {
    if (this.items.length === 0) {
      this.#renderEmpty();
      return;
    }

    this.panel_el.innerHTML = '';
    const fragment = window.document.createDocumentFragment();

    this.items.forEach((_item, _index) => {
      const itemEl = this.#createItemElement(_item, _index);
      fragment.appendChild(itemEl);
    });

    this.panel_el.appendChild(fragment);
    this.emit('rendered', { item_count: this.items.length });
  }

  /**
   * 빈 상태 렌더링 (private)
   */
  #renderEmpty() {
    this.panel_el.innerHTML = '<div class="completion-empty">No suggestions</div>';
  }

  /**
   * 항목 엘리먼트 생성 (private)
   */
  #createItemElement(_item, _index) {
    const itemEl = DOMUtils.createElement('div', {
      className: `completion-item ${_index === this.selected_index ? 'selected' : ''}`,
      attributes: {
        'data-index': _index.toString(),
      },
    });

    // 아이콘
    const iconEl = DOMUtils.createElement('div', {
      className: 'completion-icon',
      textContent: this.#getIcon(_item.kind),
    });
    itemEl.appendChild(iconEl);

    // 레이블
    const labelEl = DOMUtils.createElement('div', {
      className: 'completion-label',
      textContent: _item.label,
    });
    itemEl.appendChild(labelEl);

    // 상세 정보
    if (_item.detail) {
      const detailEl = DOMUtils.createElement('div', {
        className: 'completion-detail',
        textContent: _item.detail,
      });
      itemEl.appendChild(detailEl);
    }

    return itemEl;
  }

  /**
   * 아이콘 가져오기 (private)
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

  /**
   * 패널 표시
   */
  show(_items, _coords) {
    this.#validateItems(_items);
    this.#validateCoords(_coords);

    this.items = _items;
    this.selected_index = 0;
    this.is_visible = true;

    // 위치 설정
    this.panel_el.style.left = `${_coords.x}px`;
    this.panel_el.style.top = `${_coords.y + 20}px`; // 커서 아래 20px

    this.render();
    this.panel_el.style.display = 'block';

    this.emit('shown', { item_count: _items.length, coords: _coords });
  }

  /**
   * 패널 숨김
   */
  hide() {
    if (!this.is_visible) return;

    this.panel_el.style.display = 'none';
    this.is_visible = false;
    this.items = [];
    this.selected_index = 0;

    this.emit('hidden');
  }

  /**
   * 표시 여부
   */
  isVisible() {
    return this.is_visible;
  }

  /**
   * 다음 항목 선택
   */
  selectNext() {
    if (this.items.length === 0) return;

    this.selected_index = (this.selected_index + 1) % this.items.length;
    this.render();
    this.#scrollToSelected();

    this.emit('selection-changed', { index: this.selected_index });
  }

  /**
   * 이전 항목 선택
   */
  selectPrevious() {
    if (this.items.length === 0) return;

    this.selected_index = (this.selected_index - 1 + this.items.length) % this.items.length;
    this.render();
    this.#scrollToSelected();

    this.emit('selection-changed', { index: this.selected_index });
  }

  /**
   * 선택된 항목으로 스크롤 (private)
   */
  #scrollToSelected() {
    const selectedEl = this.panel_el.querySelector('.completion-item.selected');
    if (!selectedEl) return;

    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
   * Enter 키 처리
   */
  handleEnter() {
    const item = this.getSelectedItem();
    if (!item) return;

    this.emit('item-selected', item);
    this.hide();
  }

  /**
   * Escape 키 처리
   */
  handleEscape() {
    this.emit('close-requested');
    this.hide();
  }

  /**
   * 항목 개수
   */
  getItemCount() {
    return this.items.length;
  }

  /**
   * 선택된 인덱스
   */
  getSelectedIndex() {
    return this.selected_index;
  }

  /**
   * 인덱스로 선택
   */
  setSelectedIndex(_index) {
    ValidationUtils.assertNumber(_index, 'Index');
    ValidationUtils.assertInRange(_index, 0, this.items.length - 1, 'Index');

    this.selected_index = _index;
    this.render();
    this.#scrollToSelected();
  }

  /**
   * 항목 검증 (private)
   */
  #validateItems(_items) {
    ValidationUtils.assertArray(_items, 'Items');

    _items.forEach((_item, _index) => {
      if (!_item.label) {
        throw new Error(`Item at index ${_index} must have 'label' property`);
      }
      if (!_item.kind) {
        throw new Error(`Item at index ${_index} must have 'kind' property`);
      }
    });
  }

  /**
   * 좌표 검증 (private)
   */
  #validateCoords(_coords) {
    ValidationUtils.assertNonNull(_coords, 'Coords');
    ValidationUtils.assertObject(_coords, 'Coords');
    ValidationUtils.assertNumber(_coords.x, 'Coords.x');
    ValidationUtils.assertNumber(_coords.y, 'Coords.y');
  }

  /**
   * 컴포넌트 파괴
   */
  destroy() {
    this.items = [];
    this.selected_index = 0;
    this.is_visible = false;
    this.panel_el = null;

    super.destroy();
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      component: this.constructor.name,
      is_mounted: this.is_mounted,
      is_visible: this.is_visible,
      item_count: this.items.length,
      selected_index: this.selected_index,
    };
  }
}
