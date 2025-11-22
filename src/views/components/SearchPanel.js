/**
 * 파일: src/views/components/SearchPanel.js
 * 기능: 검색/바꾸기 패널 UI
 * 책임: 검색 인터페이스 제공
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class SearchPanel extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container_id = _containerId;
    this.container = null;
    this.is_visible = false;
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
      <div class="search-panel" style="display: none;">
        <div class="search-header">
          <span>검색</span>
          <button class="close-btn">×</button>
        </div>
        <div class="search-inputs">
          <input type="text" class="search-input" placeholder="검색..." />
          <input type="text" class="replace-input" placeholder="바꾸기..." />
        </div>
        <div class="search-options">
          <label><input type="checkbox" class="case-sensitive" /> 대소문자 구분</label>
          <label><input type="checkbox" class="whole-word" /> 단어 단위</label>
          <label><input type="checkbox" class="regex" /> 정규식</label>
        </div>
        <div class="search-actions">
          <button class="find-next-btn">다음 찾기</button>
          <button class="find-prev-btn">이전 찾기</button>
          <button class="replace-btn">바꾸기</button>
          <button class="replace-all-btn">모두 바꾸기</button>
        </div>
        <div class="search-results"></div>
      </div>
    `;

    this.#setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  #setupEventListeners() {
    const panel = this.container.querySelector('.search-panel');
    if (!panel) return;

    // 닫기 버튼
    panel.querySelector('.close-btn').addEventListener('click', () => {
      this.hide();
    });

    // 검색 입력
    const searchInput = panel.querySelector('.search-input');
    searchInput.addEventListener('input', () => {
      this.emit('search:input', {
        query: searchInput.value,
        options: this.#getOptions(),
      });
    });

    // 버튼 이벤트
    panel.querySelector('.find-next-btn').addEventListener('click', () => {
      this.emit('search:next', {
        query: searchInput.value,
        options: this.#getOptions(),
      });
    });

    panel.querySelector('.find-prev-btn').addEventListener('click', () => {
      this.emit('search:previous', {
        query: searchInput.value,
        options: this.#getOptions(),
      });
    });

    panel.querySelector('.replace-btn').addEventListener('click', () => {
      this.emit('search:replace', {
        query: searchInput.value,
        replacement: panel.querySelector('.replace-input').value,
        options: this.#getOptions(),
      });
    });

    panel.querySelector('.replace-all-btn').addEventListener('click', () => {
      this.emit('search:replace:all', {
        query: searchInput.value,
        replacement: panel.querySelector('.replace-input').value,
        options: this.#getOptions(),
      });
    });
  }

  /**
   * 검색 옵션 가져오기
   */
  #getOptions() {
    const panel = this.container.querySelector('.search-panel');
    if (!panel) return {};

    return {
      case_sensitive: panel.querySelector('.case-sensitive').checked,
      whole_word: panel.querySelector('.whole-word').checked,
      regex: panel.querySelector('.regex').checked,
    };
  }

  /**
   * 패널 표시
   */
  show() {
    const panel = this.container.querySelector('.search-panel');
    if (panel) {
      panel.style.display = 'block';
      this.is_visible = true;

      // 검색 입력에 포커스
      const searchInput = panel.querySelector('.search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    this.emit('shown');
  }

  /**
   * 패널 숨김
   */
  hide() {
    const panel = this.container.querySelector('.search-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    this.is_visible = false;
    this.emit('hidden');
  }

  /**
   * 토글
   */
  toggle() {
    if (this.is_visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 검색 결과 표시
   */
  showResults(_results) {
    const resultsDiv = this.container.querySelector('.search-results');
    if (!resultsDiv) return;

    if (_results.length === 0) {
      resultsDiv.innerHTML = '<div class="no-results">결과 없음</div>';
    } else {
      resultsDiv.innerHTML = `<div class="result-count">${_results.length}개 결과</div>`;
    }
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
