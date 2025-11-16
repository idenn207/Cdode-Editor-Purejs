/**
 * 파일: src/views/renderers/SyntaxRenderer.js
 * 기능: 신택스 하이라이팅 렌더링
 * 책임: 토큰을 HTML로 변환하여 색상 적용
 */

import LanguageService from '../../services/LanguageService.js';

export default class SyntaxRenderer {
  constructor() {
    this.language_service = new LanguageService();
  }

  /**
   * 코드를 신택스 하이라이팅된 HTML로 변환
   * @param {object} _options - { searchResults, currentIndex, lineIndex }
   */
  renderLine(_code, _language, _options = {}) {
    if (!_code || _code === '\n' || _code.trim() === '') {
      return '<br>';
    }

    const tokens = this.language_service.parse(_code, _language);

    let html = '';
    let position = 0;

    tokens.forEach((_token) => {
      let tokenHtml = this.#escapeHtml(_token.value);

      // 검색 하이라이트 적용
      if (_options.searchResults && _options.lineIndex !== undefined) {
        const lineResults = _options.searchResults.filter((_r) => _r.line === _options.lineIndex);

        lineResults.forEach((_result) => {
          if (position <= _result.column && _result.column < position + _token.value.length) {
            // 토큰 내에 검색 결과 포함
            const isCurrent = _options.currentIndex !== undefined && _options.searchResults[_options.currentIndex] === _result;

            const highlightClass = isCurrent ? 'search-highlight-current' : 'search-highlight';

            const beforeMatch = _token.value.substring(0, _result.column - position);
            const match = _token.value.substring(_result.column - position, _result.column - position + _result.length);
            const afterMatch = _token.value.substring(_result.column - position + _result.length);

            tokenHtml = `${this.#escapeHtml(beforeMatch)}<span class="${highlightClass}">${this.#escapeHtml(match)}</span>${this.#escapeHtml(afterMatch)}`;
          }
        });
      }

      html += `<span class="token-${_token.type}">${tokenHtml}</span>`;
      position += _token.value.length;
    });

    return html;
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
   * 여러 줄 렌더링
   */
  renderLines(_lines, _language) {
    return _lines.map((_line) => this.renderLine(_line, _language));
  }
}
