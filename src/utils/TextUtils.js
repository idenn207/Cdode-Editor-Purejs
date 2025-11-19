/**
 * 파일: src/utils/TextUtils.js
 * 기능: 텍스트 처리 유틸리티
 * 책임: 재사용 가능한 텍스트 조작 함수 제공
 */

export default class TextUtils {
  /**
   * 줄 분할
   */
  static splitLines(_text) {
    return _text.split('\n');
  }

  /**
   * 줄 결합
   */
  static joinLines(_lines) {
    return _lines.join('\n');
  }

  /**
   * 특정 줄 가져오기
   */
  static getLine(_text, _line_index) {
    const lines = this.splitLines(_text);
    return lines[_line_index] || '';
  }

  /**
   * 줄 개수
   */
  static getLineCount(_text) {
    return this.splitLines(_text).length;
  }

  /**
   * 줄 범위 추출
   */
  static getLineRange(_text, _start_line, _end_line) {
    const lines = this.splitLines(_text);
    return lines.slice(_start_line, _end_line + 1);
  }

  /**
   * 텍스트 범위 추출
   */
  static extractRange(_text, _start_line, _start_col, _end_line, _end_col) {
    const lines = this.splitLines(_text);

    if (_start_line === _end_line) {
      // 같은 줄
      return lines[_start_line].substring(_start_col, _end_col);
    }

    // 여러 줄
    const result = [];
    result.push(lines[_start_line].substring(_start_col));

    for (let i = _start_line + 1; i < _end_line; i++) {
      result.push(lines[i]);
    }

    result.push(lines[_end_line].substring(0, _end_col));

    return result.join('\n');
  }

  /**
   * 텍스트 삽입
   */
  static insert(_text, _line, _column, _insert_text) {
    const lines = this.splitLines(_text);
    const current_line = lines[_line] || '';

    const before = current_line.substring(0, _column);
    const after = current_line.substring(_column);

    const insert_lines = this.splitLines(_insert_text);

    if (insert_lines.length === 1) {
      // 단일 줄 삽입
      lines[_line] = before + _insert_text + after;
    } else {
      // 여러 줄 삽입
      lines[_line] = before + insert_lines[0];

      for (let i = 1; i < insert_lines.length - 1; i++) {
        lines.splice(_line + i, 0, insert_lines[i]);
      }

      const last_index = insert_lines.length - 1;
      lines.splice(_line + last_index, 0, insert_lines[last_index] + after);
    }

    return this.joinLines(lines);
  }

  /**
   * 텍스트 삭제
   */
  static delete(_text, _start_line, _start_col, _end_line, _end_col) {
    const lines = this.splitLines(_text);

    if (_start_line === _end_line) {
      // 같은 줄 삭제
      const line = lines[_start_line];
      lines[_start_line] = line.substring(0, _start_col) + line.substring(_end_col);
    } else {
      // 여러 줄 삭제
      const first_line = lines[_start_line].substring(0, _start_col);
      const last_line = lines[_end_line].substring(_end_col);

      lines.splice(_start_line, _end_line - _start_line + 1, first_line + last_line);
    }

    return this.joinLines(lines);
  }

  /**
   * 들여쓰기 감지
   */
  static getIndent(_text) {
    const match = _text.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * 들여쓰기 레벨 계산
   */
  static getIndentLevel(_text, _tab_size = 2) {
    const indent = this.getIndent(_text);
    return Math.floor(indent.length / _tab_size);
  }

  /**
   * 들여쓰기 추가
   */
  static addIndent(_text, _tab_size = 2) {
    const indent = ' '.repeat(_tab_size);
    return this.splitLines(_text)
      .map((_line) => (_line.trim() ? indent + _line : _line))
      .join('\n');
  }

  /**
   * 들여쓰기 제거
   */
  static removeIndent(_text, _tab_size = 2) {
    const indent = ' '.repeat(_tab_size);
    return this.splitLines(_text)
      .map((_line) => (_line.startsWith(indent) ? _line.substring(_tab_size) : _line))
      .join('\n');
  }

  /**
   * 공백 제거
   */
  static trim(_text) {
    return _text.trim();
  }

  static trimStart(_text) {
    return _text.trimStart();
  }

  static trimEnd(_text) {
    return _text.trimEnd();
  }

  /**
   * 각 줄의 공백 제거
   */
  static trimLines(_text) {
    return this.splitLines(_text)
      .map((_line) => _line.trim())
      .join('\n');
  }

  /**
   * 빈 줄 제거
   */
  static removeEmptyLines(_text) {
    return this.splitLines(_text)
      .filter((_line) => _line.trim().length > 0)
      .join('\n');
  }

  /**
   * 텍스트 검색
   */
  static findAll(_text, _search, _case_sensitive = false) {
    const results = [];
    const lines = this.splitLines(_text);

    lines.forEach((_line, _line_index) => {
      const search_text = _case_sensitive ? _line : _line.toLowerCase();
      const search_pattern = _case_sensitive ? _search : _search.toLowerCase();

      let start_index = 0;
      while (true) {
        const index = search_text.indexOf(search_pattern, start_index);
        if (index === -1) break;

        results.push({
          line: _line_index,
          start: index,
          end: index + _search.length,
          text: _line.substring(index, index + _search.length),
        });

        start_index = index + 1;
      }
    });

    return results;
  }

  /**
   * 정규식 검색
   */
  static findAllRegex(_text, _pattern, _flags = 'g') {
    const results = [];
    const lines = this.splitLines(_text);
    const regex = new RegExp(_pattern, _flags);

    lines.forEach((_line, _line_index) => {
      let match;
      while ((match = regex.exec(_line)) !== null) {
        results.push({
          line: _line_index,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          groups: match.slice(1),
        });
      }
    });

    return results;
  }

  /**
   * 텍스트 교체
   */
  static replace(_text, _search, _replace) {
    return _text.replace(_search, _replace);
  }

  static replaceAll(_text, _search, _replace) {
    return _text.replaceAll(_search, _replace);
  }

  /**
   * 단어 개수
   */
  static countWords(_text) {
    return _text
      .trim()
      .split(/\s+/)
      .filter((_word) => _word.length > 0).length;
  }

  /**
   * 문자 개수
   */
  static countCharacters(_text) {
    return _text.length;
  }

  /**
   * 공백 제외 문자 개수
   */
  static countCharactersWithoutSpaces(_text) {
    return _text.replace(/\s/g, '').length;
  }

  /**
   * 문자열 자르기 (안전)
   */
  static truncate(_text, _max_length, _suffix = '...') {
    if (_text.length <= _max_length) {
      return _text;
    }
    return _text.substring(0, _max_length - _suffix.length) + _suffix;
  }

  /**
   * 첫 글자 대문자
   */
  static capitalize(_text) {
    return _text.charAt(0).toUpperCase() + _text.slice(1);
  }

  /**
   * 각 단어 첫 글자 대문자
   */
  static capitalizeWords(_text) {
    return _text
      .split(/\s+/)
      .map((_word) => this.capitalize(_word))
      .join(' ');
  }

  /**
   * camelCase 변환
   */
  static toCamelCase(_text) {
    return _text.replace(/[-_\s]+(.)?/g, (_, _char) => (_char ? _char.toUpperCase() : '')).replace(/^[A-Z]/, (_char) => _char.toLowerCase());
  }

  /**
   * PascalCase 변환
   */
  static toPascalCase(_text) {
    const camel = this.toCamelCase(_text);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  /**
   * snake_case 변환
   */
  static toSnakeCase(_text) {
    return _text
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[-\s]+/g, '_');
  }

  /**
   * kebab-case 변환
   */
  static toKebabCase(_text) {
    return _text
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/[_\s]+/g, '-');
  }

  /**
   * 문자열 패딩
   */
  static padStart(_text, _length, _pad_string = ' ') {
    return _text.padStart(_length, _pad_string);
  }

  static padEnd(_text, _length, _pad_string = ' ') {
    return _text.padEnd(_length, _pad_string);
  }

  /**
   * 문자열 반복
   */
  static repeat(_text, _count) {
    return _text.repeat(_count);
  }

  /**
   * 역순
   */
  static reverse(_text) {
    return _text.split('').reverse().join('');
  }

  /**
   * 유니코드 정규화
   */
  static normalize(_text, _form = 'NFC') {
    return _text.normalize(_form);
  }
}
