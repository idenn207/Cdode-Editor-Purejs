/**
 * 파일: src/views/components/CompletionPanel.js
 * 기능: 자동완성 패널 UI
 * 책임: 자동완성 제안 목록 표시
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class CompletionPanel extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container_id = _containerId;
    this.container = null;
    this.is_visible = false;
    this.completions = [];
    this.selected_index = 0;
  }

  /**
   * 컴포넌트 마운트
   */
  mount() {
    this.container = document.getElementById(this.container_id);
    if (!this.container) {
      console.warn(`Container #${this.container_id} not found`);
      return;
    }

    this.container.innerHTML = `
      <div class="completion-panel" style="display: none;">
        <div class="completion-list"></div>
      </div>
    `;

    this.panel = this.container.querySelector('.completion-panel');
    this.list = this.container.querySelector('.completion-list');
  }

  /**
   * 자동완성 목록 표시
   */
  show(_completions, _position) {
    if (!_completions || _completions.length === 0) {
      this.hide();
      return;
    }

    this.completions = _completions;
    this.selected_index = 0;
    this.render();

    if (this.panel) {
      this.panel.style.display = 'block';
      if (_position) {
        this.panel.style.left = `${_position.x}px`;
        this.panel.style.top = `${_position.y}px`;
      }
    }

    this.is_visible = true;
    this.emit('shown');
  }

  /**
   * 패널 숨김
   */
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
    this.is_visible = false;
    this.completions = [];
    this.emit('hidden');
  }

  /**
   * 렌더링
   */
  render() {
    if (!this.list) return;

    this.list.innerHTML = this.completions
      .map((_completion, _index) => {
        const selected = _index === this.selected_index ? 'selected' : '';
        return `
          <div class="completion-item ${selected}" data-index="${_index}">
            <span class="completion-label">${_completion.label}</span>
            ${_completion.detail ? `<span class="completion-detail">${_completion.detail}</span>` : ''}
          </div>
        `;
      })
      .join('');

    // 클릭 이벤트
    this.list.querySelectorAll('.completion-item').forEach((_item) => {
      _item.addEventListener('click', () => {
        const index = parseInt(_item.dataset.index);
        this.selectCompletion(index);
      });
    });
  }

  /**
   * 자동완성 선택
   */
  selectCompletion(_index) {
    if (_index >= 0 && _index < this.completions.length) {
      const completion = this.completions[_index];
      this.emit('completion:selected', completion);
      this.hide();
    }
  }

  /**
   * 다음 항목 선택
   */
  selectNext() {
    if (this.completions.length === 0) return;
    this.selected_index = (this.selected_index + 1) % this.completions.length;
    this.render();
  }

  /**
   * 이전 항목 선택
   */
  selectPrevious() {
    if (this.completions.length === 0) return;
    this.selected_index = (this.selected_index - 1 + this.completions.length) % this.completions.length;
    this.render();
  }

  /**
   * 현재 선택된 자동완성 적용
   */
  applySelected() {
    this.selectCompletion(this.selected_index);
  }

  /**
   * 표시 여부 확인
   */
  isVisible() {
    return this.is_visible;
  }

  /**
   * 컴포넌트 파괴
   */
  destroy() {
    this.hide();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.removeAllListeners();
  }
}
