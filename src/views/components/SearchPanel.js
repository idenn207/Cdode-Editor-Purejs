/**
 * 파일: src/views/components/SearchPanel.js
 * 기능: 검색/바꾸기 UI
 * 책임: 사용자 검색 인터페이스 제공
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class SearchPanel extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container = window.document.getElementById(_containerId);
    this.mode = 'search'; // 'search' | 'replace'
    this.is_visible = false;

    this.search_input = null;
    this.replace_input = null;
    this.case_sensitive_checkbox = null;
    this.whole_word_checkbox = null;
    this.regex_checkbox = null;
    this.results_info = null;

    this.current_results = [];
    this.current_index = -1;

    this.#initialize();
  }

  #initialize() {
    const panel = window.document.createElement('div');
    panel.className = 'search-panel';
    panel.style.display = 'none';

    panel.innerHTML = `
      <div class="search-row">
        <input type="text" class="search-input" placeholder="찾기..." />
        <button class="search-button" id="PrevButton" title="이전 (Shift+Enter)">◀</button>
        <button class="search-button" id="NextButton" title="다음 (Enter)">▶</button>
        <button class="search-button" id="CloseButton" title="닫기 (Escape)">✕</button>
      </div>
      <div class="replace-row" style="display: none;">
        <input type="text" class="replace-input" placeholder="바꾸기..." />
        <button class="search-button" id="ReplaceOneButton">바꾸기</button>
        <button class="search-button" id="ReplaceAllButton">전체 바꾸기</button>
      </div>
      <div class="options-row">
        <label>
          <input type="checkbox" id="CaseSensitiveCheckbox" />
          <span>Aa</span>
          <span class="option-tooltip">대소문자 구분</span>
        </label>
        <label>
          <input type="checkbox" id="WholeWordCheckbox" />
          <span>Ab</span>
          <span class="option-tooltip">단어 단위</span>
        </label>
        <label>
          <input type="checkbox" id="RegexCheckbox" />
          <span>.*</span>
          <span class="option-tooltip">정규식</span>
        </label>
      </div>
      <div class="results-info"></div>
    `;

    this.container.appendChild(panel);
    this.panel = panel;

    this.#cacheElements();
    this.#attachEvents();
  }

  #cacheElements() {
    this.search_input = this.panel.querySelector('.search-input');
    this.replace_input = this.panel.querySelector('.replace-input');
    this.replace_row = this.panel.querySelector('.replace-row');
    this.results_info = this.panel.querySelector('.results-info');

    this.case_sensitive_checkbox = this.panel.querySelector('#CaseSensitiveCheckbox');
    this.whole_word_checkbox = this.panel.querySelector('#WholeWordCheckbox');
    this.regex_checkbox = this.panel.querySelector('#RegexCheckbox');

    this.prev_button = this.panel.querySelector('#PrevButton');
    this.next_button = this.panel.querySelector('#NextButton');
    this.close_button = this.panel.querySelector('#CloseButton');
    this.replace_one_button = this.panel.querySelector('#ReplaceOneButton');
    this.replace_all_button = this.panel.querySelector('#ReplaceAllButton');
  }

  #attachEvents() {
    // 검색어 입력
    this.search_input.addEventListener('input', () => {
      this.#onSearchChanged();
    });

    this.search_input.addEventListener('keydown', (_e) => {
      if (_e.key === 'Enter') {
        _e.preventDefault();
        if (_e.shiftKey) {
          this.#findPrevious();
        } else {
          this.#findNext();
        }
      } else if (_e.key === 'Escape') {
        this.hide();
      }
    });

    // 옵션 체크박스
    this.case_sensitive_checkbox.addEventListener('change', () => {
      this.#onSearchChanged();
    });

    this.whole_word_checkbox.addEventListener('change', () => {
      this.#onSearchChanged();
    });

    this.regex_checkbox.addEventListener('change', () => {
      this.#onSearchChanged();
    });

    // 버튼
    this.prev_button.addEventListener('click', () => {
      this.#findPrevious();
    });

    this.next_button.addEventListener('click', () => {
      this.#findNext();
    });

    this.close_button.addEventListener('click', () => {
      this.hide();
    });

    this.replace_one_button.addEventListener('click', () => {
      this.#replaceOne();
    });

    this.replace_all_button.addEventListener('click', () => {
      this.#replaceAll();
    });
  }

  /**
   * 패널 표시
   */
  show() {
    this.panel.style.display = 'block';
    this.is_visible = true;
    this.search_input.focus();
    this.search_input.select();
  }

  /**
   * 패널 숨김
   */
  hide() {
    this.panel.style.display = 'none';
    this.is_visible = false;
    this.emit('close-requested');
  }

  /**
   * 모드 설정
   */
  setMode(_mode) {
    this.mode = _mode;

    if (_mode === 'replace') {
      this.replace_row.style.display = 'flex';
    } else {
      this.replace_row.style.display = 'none';
    }
  }

  /**
   * 검색어 변경
   */
  #onSearchChanged() {
    const query = this.search_input.value;
    const options = this.#getOptions();

    this.emit('search-changed', query, options);
  }

  /**
   * 옵션 반환
   */
  #getOptions() {
    return {
      caseSensitive: this.case_sensitive_checkbox.checked,
      wholeWord: this.whole_word_checkbox.checked,
      regex: this.regex_checkbox.checked,
    };
  }

  /**
   * 다음 찾기
   */
  #findNext() {
    this.emit('find-next');
  }

  /**
   * 이전 찾기
   */
  #findPrevious() {
    this.emit('find-previous');
  }

  /**
   * 하나 바꾸기
   */
  #replaceOne() {
    const replacement = this.replace_input.value;
    this.emit('replace-one', replacement);
  }

  /**
   * 전체 바꾸기
   */
  #replaceAll() {
    const query = this.search_input.value;
    const replacement = this.replace_input.value;
    const options = this.#getOptions();

    const confirmed = confirm(`모든 "${query}"를 "${replacement}"(으)로 바꾸시겠습니까?`);
    if (confirmed) {
      this.emit('replace-all', query, replacement, options);
    }
  }

  /**
   * 검색 결과 업데이트
   */
  updateResults(_results, _currentIndex) {
    this.current_results = _results;
    this.current_index = _currentIndex;

    if (_results.length === 0) {
      this.results_info.textContent = '결과 없음';
    } else {
      this.results_info.textContent = `${_currentIndex + 1} / ${_results.length}`;
    }
  }

  /**
   * 검색어 설정
   */
  setSearchQuery(_query) {
    this.search_input.value = _query;
  }

  /**
   * 포커스
   */
  focus() {
    this.search_input.focus();
    this.search_input.select();
  }

  /**
   * 가시성 확인
   */
  isVisible() {
    return this.is_visible;
  }
}
