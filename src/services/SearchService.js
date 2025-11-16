/**
 * 파일: src/services/SearchService.js
 * 기능: 텍스트 검색 및 바꾸기
 * 책임: 검색 알고리즘 및 정규식 처리
 */

export default class SearchService {
  constructor() {
    this.last_search = null;
  }

  /**
   * 텍스트에서 쿼리 검색
   * @param {string} _text - 검색할 텍스트
   * @param {string} _query - 검색어
   * @param {object} _options - { caseSensitive, wholeWord, regex }
   * @returns {Array} - [{ line, column, length, match }]
   */
  search(_text, _query, _options = {}) {
    if (!_query) return [];

    const options = {
      caseSensitive: _options.caseSensitive || false,
      wholeWord: _options.wholeWord || false,
      regex: _options.regex || false,
    };

    this.last_search = { query: _query, options };

    try {
      if (options.regex) {
        return this.#searchRegex(_text, _query, options);
      } else {
        return this.#searchPlain(_text, _query, options);
      }
    } catch (error) {
      console.error('검색 오류:', error);
      return [];
    }
  }

  /**
   * 일반 문자열 검색
   */
  #searchPlain(_text, _query, _options) {
    const results = [];
    const lines = _text.split('\n');

    let searchQuery = _query;
    if (!_options.caseSensitive) {
      searchQuery = searchQuery.toLowerCase();
    }

    lines.forEach((_line, _lineIndex) => {
      let searchLine = _line;
      if (!_options.caseSensitive) {
        searchLine = searchLine.toLowerCase();
      }

      let columnIndex = 0;
      while (true) {
        const foundIndex = searchLine.indexOf(searchQuery, columnIndex);
        if (foundIndex === -1) break;

        // 단어 단위 검색 확인
        if (_options.wholeWord) {
          const before = foundIndex > 0 ? _line[foundIndex - 1] : ' ';
          const after = foundIndex + _query.length < _line.length ? _line[foundIndex + _query.length] : ' ';

          if (this.#isWordChar(before) || this.#isWordChar(after)) {
            columnIndex = foundIndex + 1;
            continue;
          }
        }

        results.push({
          line: _lineIndex,
          column: foundIndex,
          length: _query.length,
          match: _line.substring(foundIndex, foundIndex + _query.length),
        });

        columnIndex = foundIndex + 1;
      }
    });

    return results;
  }

  /**
   * 정규식 검색
   */
  #searchRegex(_text, _pattern, _options) {
    const results = [];
    const lines = _text.split('\n');

    let flags = 'g';
    if (!_options.caseSensitive) {
      flags += 'i';
    }

    const regex = new RegExp(_pattern, flags);

    lines.forEach((_line, _lineIndex) => {
      let match;
      while ((match = regex.exec(_line)) !== null) {
        results.push({
          line: _lineIndex,
          column: match.index,
          length: match[0].length,
          match: match[0],
        });
      }
    });

    return results;
  }

  /**
   * 바꾸기
   * @param {string} _text - 원본 텍스트
   * @param {string} _query - 검색어
   * @param {string} _replacement - 바꿀 문자열
   * @param {object} _options - 검색 옵션
   * @returns {object} - { newText, count }
   */
  replace(_text, _query, _replacement, _options = {}) {
    const results = this.search(_text, _query, _options);
    if (results.length === 0) {
      return { newText: _text, count: 0 };
    }

    const lines = _text.split('\n');
    let count = 0;

    // 뒤에서부터 바꾸기 (인덱스 유지)
    for (let i = results.length - 1; i >= 0; i--) {
      const result = results[i];
      const line = lines[result.line];

      lines[result.line] = line.substring(0, result.column) + _replacement + line.substring(result.column + result.length);

      count++;
    }

    return {
      newText: lines.join('\n'),
      count: count,
    };
  }

  /**
   * 하나만 바꾸기
   */
  replaceOne(_text, _result, _replacement) {
    const lines = _text.split('\n');
    const line = lines[_result.line];

    lines[_result.line] = line.substring(0, _result.column) + _replacement + line.substring(_result.column + _result.length);

    return lines.join('\n');
  }

  /**
   * 정규식 검증
   */
  validateRegex(_pattern) {
    try {
      new RegExp(_pattern);
      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * 단어 문자 확인
   */
  #isWordChar(_char) {
    return /[a-zA-Z0-9_]/.test(_char);
  }

  /**
   * 마지막 검색 정보 반환
   */
  getLastSearch() {
    return this.last_search;
  }
}
