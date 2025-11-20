/**
 * 파일: src/views/components/SearchPanel.js
 * 기능: 검색/바꾸기 패널 UI
 * 책임: 검색 입력, 옵션 설정, 결과 표시
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

export default class SearchPanel extends BaseComponent {
  constructor(_containerId) {
    super(_containerId);

    // 상태
    this.mode = 'search'; // 'search' | 'replace'
    this.is_visible = false;

    // DOM 참조
    this.panel_el = null;
    this.search_input = null;
    this.replace_input = null;
    this.case_sensitive_checkbox = null;
    this.whole_word_checkbox = null;
    this.regex_checkbox = null;
    this.results_info = null;
    this.replace_row = null;
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
      className: 'search-panel',
      styles: {
        display: 'none',
      },
    });

    this.panel_el.innerHTML = `
      <div class="search-row">
        <input type="text" class="search-input" placeholder="Search" />
        <button class="icon-button prev-button" title="Previous">▲</button>
        <button class="icon-button next-button" title="Next">▼</button>
        <button class="icon-button close-button" title="Close">×</button>
      </div>
      <div class="replace-row" style="display: none;">
        <input type="text" class="replace-input" placeholder="Replace" />
        <button class="btn replace-one-button">Replace</button>
        <button class="btn replace-all-button">Replace All</button>
      </div>
      <div class="options-row">
        <label>
          <input type="checkbox" class="case-sensitive-checkbox" />
          Aa Match Case
        </label>
        <label>
          <input type="checkbox" class="whole-word-checkbox" />
          W Whole Word
        </label>
        <label>
          <input type="checkbox" class="regex-checkbox" />
          .* Regex
        </label>
        <div class="results-info"></div>
      </div>
    `;

    this.container.appendChild(this.panel_el);

    // 요소 참조 저장
    this.search_input = this.panel_el.querySelector('.search-input');
    this.replace_input = this.panel_el.querySelector('.replace-input');
    this.case_sensitive_checkbox = this.panel_el.querySelector('.case-sensitive-checkbox');
    this.whole_word_checkbox = this.panel_el.querySelector('.whole-word-checkbox');
    this.regex_checkbox = this.panel_el.querySelector('.regex-checkbox');
    this.results_info = this.panel_el.querySelector('.results-info');
    this.replace_row = this.panel_el.querySelector('.replace-row');
  }

  /**
   * 이벤트 연결 (private)
   */
  #attachEvents() {
    // 검색 입력
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
    const prevButton = this.panel_el.querySelector('.prev-button');
    const nextButton = this.panel_el.querySelector('.next-button');
    const closeButton = this.panel_el.querySelector('.close-button');
    const replaceOneButton = this.panel_el.querySelector('.replace-one-button');
    const replaceAllButton = this.panel_el.querySelector('.replace-all-button');

    prevButton.addEventListener('click', () => {
      this.#findPrevious();
    });

    nextButton.addEventListener('click', () => {
      this.#findNext();
    });

    closeButton.addEventListener('click', () => {
      this.hide();
    });

    replaceOneButton.addEventListener('click', () => {
      this.#replaceOne();
    });

    replaceAllButton.addEventListener('click', () => {
      this.#replaceAll();
    });
  }

  /**
   * 렌더링 (BaseComponent.render 구현)
   */
  render() {
    // SearchPanel은 상태 변경 시 개별 업데이트
    // 전체 재렌더링 불필요
  }

  /**
   * 패널 표시
   */
  show() {
    if (this.is_visible) return;

    this.panel_el.style.display = 'block';
    this.is_visible = true;

    this.search_input.focus();
    this.search_input.select();

    this.emit('shown');
  }

  /**
   * 패널 숨김
   */
  hide() {
    if (!this.is_visible) return;

    this.panel_el.style.display = 'none';
    this.is_visible = false;

    this.emit('close-requested');
    this.emit('hidden');
  }

  /**
   * 표시 여부
   */
  isVisible() {
    return this.is_visible;
  }

  /**
   * 모드 설정
   */
  setMode(_mode) {
    ValidationUtils.assertContains(['search', 'replace'], _mode, 'Mode');

    this.mode = _mode;

    if (_mode === 'replace') {
      this.replace_row.style.display = 'flex';
    } else {
      this.replace_row.style.display = 'none';
    }

    this.emit('mode-changed', { mode: _mode });
  }

  /**
   * 모드 가져오기
   */
  getMode() {
    return this.mode;
  }

  /**
   * 검색 옵션 가져오기
   */
  getOptions() {
    return {
      caseSensitive: this.case_sensitive_checkbox.checked,
      wholeWord: this.whole_word_checkbox.checked,
      regex: this.regex_checkbox.checked,
    };
  }

  /**
   * 검색어 가져오기
   */
  getQuery() {
    return this.search_input.value;
  }

  /**
   * 바꿀 텍스트 가져오기
   */
  getReplacement() {
    return this.replace_input.value;
  }

  /**
   * 검색 결과 정보 업데이트
   */
  updateResults(_results, _currentIndex) {
    ValidationUtils.assertArray(_results, 'Results');

    if (_results.length === 0) {
      this.results_info.textContent = 'No results';
    } else {
      this.results_info.textContent = `${_currentIndex + 1} of ${_results.length}`;
    }

    this.emit('results-updated', {
      total: _results.length,
      current: _currentIndex,
    });
  }

  /**
   * 포커스
   */
  focus() {
    this.search_input.focus();
    this.search_input.select();
  }

  /**
   * 검색어 변경 처리 (private)
   */
  #onSearchChanged() {
    const query = this.search_input.value;
    const options = this.getOptions();

    this.emit('search-changed', query, options);
  }

  /**
   * 다음 찾기 (private)
   */
  #findNext() {
    this.emit('find-next');
  }

  /**
   * 이전 찾기 (private)
   */
  #findPrevious() {
    this.emit('find-previous');
  }

  /**
   * 하나 바꾸기 (private)
   */
  #replaceOne() {
    const replacement = this.replace_input.value;
    this.emit('replace-one', replacement);
  }

  /**
   * 전체 바꾸기 (private)
   */
  #replaceAll() {
    const query = this.search_input.value;
    const replacement = this.replace_input.value;
    const options = this.getOptions();

    if (!query) {
      alert('검색어를 입력하세요.');
      return;
    }

    const confirmed = confirm(`"${query}"를 "${replacement}"로 모두 바꾸시겠습니까?`);
    if (!confirmed) return;

    this.emit('replace-all', query, replacement, options);
  }

  /**
   * 검색어 설정
   */
  setQuery(_query) {
    ValidationUtils.assertString(_query, 'Query');
    this.search_input.value = _query;
    this.#onSearchChanged();
  }

  /**
   * 옵션 설정
   */
  setOptions(_options) {
    ValidationUtils.assertObject(_options, 'Options');

    if (_options.caseSensitive !== undefined) {
      ValidationUtils.assertBoolean(_options.caseSensitive, 'caseSensitive');
      this.case_sensitive_checkbox.checked = _options.caseSensitive;
    }

    if (_options.wholeWord !== undefined) {
      ValidationUtils.assertBoolean(_options.wholeWord, 'wholeWord');
      this.whole_word_checkbox.checked = _options.wholeWord;
    }

    if (_options.regex !== undefined) {
      ValidationUtils.assertBoolean(_options.regex, 'regex');
      this.regex_checkbox.checked = _options.regex;
    }

    this.#onSearchChanged();
  }

  /**
   * 초기화
   */
  reset() {
    this.search_input.value = '';
    this.replace_input.value = '';
    this.case_sensitive_checkbox.checked = false;
    this.whole_word_checkbox.checked = false;
    this.regex_checkbox.checked = false;
    this.results_info.textContent = '';
  }

  /**
   * 컴포넌트 파괴
   */
  destroy() {
    this.mode = 'search';
    this.is_visible = false;
    this.panel_el = null;
    this.search_input = null;
    this.replace_input = null;

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
      mode: this.mode,
      query: this.search_input?.value || '',
      options: this.is_mounted ? this.getOptions() : null,
    };
  }
}
