/**
 * 파일: src/services/search/SearchService.js
 * 기능: 텍스트 검색 및 바꾸기
 * 책임: 검색 알고리즘 및 정규식 처리
 */

import BaseService from '../../core/BaseService.js';

export default class SearchService extends BaseService {
  constructor() {
    super();
    this.last_search = null;
  }

  /**
   * 초기화
   */
  initialize() {
    this.is_initialized = true;
  }

  /**
   * 텍스트에서 쿼리 검색
   */
  search(_text, _query, _options = {}) {
    this.validateString(_text, 'text');
    this.validateNonEmptyString(_query, 'query');

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
      this.handleError(error, 'search');
      return [];
    }
  }

  /**
   * 일반 문자열 검색 (private)
   */
  #searchPlain(_text, _query, _options) {
    const results = [];
    const lines = _text.split('\n');

    let search_query = _query;
    if (!_options.caseSensitive) {
      search_query = search_query.toLowerCase();
    }

    lines.forEach((_line, _lineIndex) => {
      let search_line = _line;
      if (!_options.caseSensitive) {
        search_line = search_line.toLowerCase();
      }

      let column_index = 0;
      while (true) {
        const found_index = search_line.indexOf(search_query, column_index);
        if (found_index === -1) break;

        // 단어 단위 검색 확인
        if (_options.wholeWord) {
          const before = found_index > 0 ? _line[found_index - 1] : ' ';
          const after = found_index + _query.length < _line.length ? _line[found_index + _query.length] : ' ';

          if (this.#isWordBoundary(before) && this.#isWordBoundary(after)) {
            results.push({
              line: _lineIndex,
              column: found_index,
              length: _query.length,
              match: _line.substring(found_index, found_index + _query.length),
            });
          }
        } else {
          results.push({
            line: _lineIndex,
            column: found_index,
            length: _query.length,
            match: _line.substring(found_index, found_index + _query.length),
          });
        }

        column_index = found_index + 1;
      }
    });

    return results;
  }

  /**
   * 정규식 검색 (private)
   */
  #searchRegex(_text, _pattern, _options) {
    const results = [];
    const lines = _text.split('\n');

    // 정규식 플래그 설정
    let flags = 'g';
    if (!_options.caseSensitive) {
      flags += 'i';
    }

    const regex = new RegExp(_pattern, flags);

    lines.forEach((_line, _lineIndex) => {
      let match;
      regex.lastIndex = 0; // 각 줄마다 초기화

      while ((match = regex.exec(_line)) !== null) {
        // 단어 단위 검색 확인
        if (_options.wholeWord) {
          const before = match.index > 0 ? _line[match.index - 1] : ' ';
          const after = match.index + match[0].length < _line.length ? _line[match.index + match[0].length] : ' ';

          if (!this.#isWordBoundary(before) || !this.#isWordBoundary(after)) {
            continue;
          }
        }

        results.push({
          line: _lineIndex,
          column: match.index,
          length: match[0].length,
          match: match[0],
        });

        // 무한 루프 방지
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    });

    return results;
  }

  /**
   * 단어 경계 확인 (private)
   */
  #isWordBoundary(_char) {
    return /\W/.test(_char);
  }

  /**
   * 정규식 유효성 검증
   */
  validateRegex(_pattern) {
    this.validateNonEmptyString(_pattern, 'pattern');

    try {
      new RegExp(_pattern);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * 한 개 항목 바꾸기
   */
  replaceOne(_text, _result, _replacement) {
    this.validateString(_text, 'text');
    this.validateRequired(_result, 'result');
    this.validateString(_replacement, 'replacement');

    try {
      const lines = _text.split('\n');
      const line = lines[_result.line];

      if (!line) return _text;

      const before = line.substring(0, _result.column);
      const after = line.substring(_result.column + _result.length);
      lines[_result.line] = before + _replacement + after;

      return lines.join('\n');
    } catch (error) {
      this.handleError(error, 'replaceOne');
      return _text;
    }
  }

  /**
   * 전체 바꾸기
   */
  replace(_text, _query, _replacement, _options = {}) {
    this.validateString(_text, 'text');
    this.validateNonEmptyString(_query, 'query');
    this.validateString(_replacement, 'replacement');

    try {
      const search_results = this.search(_text, _query, _options);

      if (search_results.length === 0) {
        return {
          newText: _text,
          count: 0,
        };
      }

      // 뒤에서부터 바꾸기 (인덱스 변화 방지)
      const lines = _text.split('\n');
      const sorted_results = search_results.sort((a, b) => {
        if (b.line !== a.line) return b.line - a.line;
        return b.column - a.column;
      });

      for (const result of sorted_results) {
        const line = lines[result.line];
        const before = line.substring(0, result.column);
        const after = line.substring(result.column + result.length);
        lines[result.line] = before + _replacement + after;
      }

      return {
        newText: lines.join('\n'),
        count: search_results.length,
      };
    } catch (error) {
      this.handleError(error, 'replace');
      return {
        newText: _text,
        count: 0,
      };
    }
  }

  /**
   * 마지막 검색 정보 가져오기
   */
  getLastSearch() {
    return this.last_search;
  }

  /**
   * 마지막 검색 정보 초기화
   */
  clearLastSearch() {
    this.last_search = null;
  }

  /**
   * 서비스 종료
   */
  destroy() {
    this.last_search = null;
    this.is_initialized = false;
    super.destroy();
  }
}
