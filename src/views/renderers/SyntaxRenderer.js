/**
 * 파일: src/views/renderers/SyntaxRenderer.js
 * 기능: 신택스 하이라이팅 렌더링
 * 책임: 토큰을 HTML로 변환하여 색상 적용
 *
 * 리팩토링 변경사항:
 * 1. BaseRenderer 상속 적용
 * 2. 캐싱 시스템 활용
 * 3. 검증 로직 추가
 * 4. 에러 처리 강화
 */

import BaseRenderer from '../../core/BaseRenderer.js';
import LanguageService from '../../services/language/LanguageService.js';
import ValidationUtils from '../../utils/ValidationUtils.js';

export default class SyntaxRenderer extends BaseRenderer {
  constructor() {
    super();
    this.language_service = new LanguageService();
    this.language_service.initialize();

    // 캐시 설정 (줄 단위 렌더링은 빈번하므로 큰 캐시 사용)
    this.setCacheSizeLimit(5000);
  }

  /**
   * 단일 줄 렌더링 (BaseRenderer.render 구현)
   * @param {object} _input - { code, language, options }
   * @returns {string} HTML 문자열
   */
  render(_input) {
    // 검증
    this.#validateInput(_input);

    const { code, language, options = {} } = _input;

    // 빈 줄 처리
    if (!code || code === '\n' || code.trim() === '') {
      return '<br>';
    }

    try {
      // 토큰 파싱
      const tokens = this.language_service.parse(code, language);

      // HTML 생성
      let html = '';
      let position = 0;

      tokens.forEach((_token) => {
        let tokenHtml = this.#escapeHtml(_token.value);

        // 검색 하이라이트 적용
        if (options.searchResults && options.lineIndex !== undefined) {
          tokenHtml = this.#applySearchHighlight(tokenHtml, _token, position, options);
        }

        html += `<span class="token-${_token.type}">${tokenHtml}</span>`;
        position += _token.value.length;
      });

      return html;
    } catch (_error) {
      console.error('[SyntaxRenderer] Render error:', _error);
      // 에러 발생 시 이스케이프된 원본 코드 반환
      return this.#escapeHtml(code);
    }
  }

  /**
   * 캐시를 사용한 줄 렌더링 (공개 API)
   * @param {string} _code - 코드 문자열
   * @param {string} _language - 언어 (javascript, html, css 등)
   * @param {object} _options - { searchResults, currentIndex, lineIndex }
   * @returns {string} HTML 문자열
   */
  renderLine(_code, _language, _options = {}) {
    // 검색 결과가 있으면 캐시 사용 안 함 (동적 하이라이트)
    if (_options.searchResults && _options.searchResults.length > 0) {
      return this.render({
        code: _code,
        language: _language,
        options: _options,
      });
    }

    // 캐시 키 생성: 언어-코드 해시
    const cacheKey = `${_language}-${this.#hashCode(_code)}`;

    return this.renderWithCache(cacheKey, {
      code: _code,
      language: _language,
      options: _options,
    });
  }

  /**
   * 여러 줄 렌더링
   * @param {string[]} _lines - 줄 배열
   * @param {string} _language - 언어
   * @param {object} _options - 렌더링 옵션
   * @returns {string[]} HTML 문자열 배열
   */
  renderLines(_lines, _language, _options = {}) {
    ValidationUtils.assertArray(_lines, 'Lines');
    ValidationUtils.assertNonEmptyString(_language, 'Language');

    return _lines.map((_line, _index) => {
      const lineOptions = { ..._options, lineIndex: _index };
      return this.renderLine(_line, _language, lineOptions);
    });
  }

  /**
   * 검색 하이라이트 적용 (private)
   */
  #applySearchHighlight(_tokenHtml, _token, _position, _options) {
    const { searchResults, currentIndex, lineIndex } = _options;

    // 현재 줄의 검색 결과 필터링
    const lineResults = searchResults.filter((_r) => _r.line === lineIndex);

    lineResults.forEach((_result) => {
      const resultStart = _result.column;
      const resultEnd = _result.column + _result.length;
      const tokenStart = _position;
      const tokenEnd = _position + _token.value.length;

      // 토큰 내에 검색 결과가 포함되어 있는지 확인
      if (resultStart < tokenEnd && resultEnd > tokenStart) {
        // 현재 선택된 결과인지 확인
        const isCurrent = currentIndex !== undefined && searchResults[currentIndex] === _result;

        const highlightClass = isCurrent ? 'search-highlight-current' : 'search-highlight';

        // 토큰 내에서 검색 결과 위치 계산
        const matchStart = Math.max(0, resultStart - tokenStart);
        const matchEnd = Math.min(_token.value.length, resultEnd - tokenStart);

        const beforeMatch = _token.value.substring(0, matchStart);
        const match = _token.value.substring(matchStart, matchEnd);
        const afterMatch = _token.value.substring(matchEnd);

        _tokenHtml = `${this.#escapeHtml(beforeMatch)}<span class="${highlightClass}">${this.#escapeHtml(match)}</span>${this.#escapeHtml(afterMatch)}`;
      }
    });

    return _tokenHtml;
  }

  /**
   * HTML 이스케이프 (private)
   */
  #escapeHtml(_text) {
    const div = window.document.createElement('div');
    div.textContent = _text;
    return div.innerHTML;
  }

  /**
   * 문자열 해시 생성 (캐시 키용) (private)
   */
  #hashCode(_str) {
    let hash = 0;
    for (let i = 0; i < _str.length; i++) {
      const char = _str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * 입력 검증 (private)
   */
  #validateInput(_input) {
    ValidationUtils.assertNonNull(_input, 'Input');
    ValidationUtils.assertObject(_input, 'Input');

    const { code, language } = _input;

    if (code !== null && code !== undefined) {
      ValidationUtils.assertString(code, 'Code');
    }

    ValidationUtils.assertNonEmptyString(language, 'Language');
  }

  /**
   * 지원 언어 목록 조회
   */
  getSupportedLanguages() {
    return this.language_service.getSupportedLanguages();
  }

  /**
   * 언어 지원 여부 확인
   */
  isLanguageSupported(_language) {
    ValidationUtils.assertNonEmptyString(_language, 'Language');
    return this.language_service.isLanguageSupported(_language);
  }

  /**
   * 렌더러 종료
   */
  destroy() {
    this.language_service.destroy();
    super.clearCache();
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      ...super.getDebugInfo(),
      supported_languages: this.getSupportedLanguages(),
      language_service_initialized: this.language_service.is_initialized,
    };
  }
}
