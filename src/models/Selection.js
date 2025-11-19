/**
 * 파일: src/models/Selection.js
 * 기능: 텍스트 선택 영역 모델
 * 책임: 선택 영역 좌표, 범위 계산, 검증
 */

import BaseModel from '../core/BaseModel.js';
import ValidationUtils from '../utils/ValidationUtils.js';

export default class Selection extends BaseModel {
  constructor(_start, _end) {
    super();

    // 검증
    ValidationUtils.assertObject(_start, 'Start position');
    ValidationUtils.assertObject(_end, 'End position');

    this.#validatePosition(_start, 'Start position');
    this.#validatePosition(_end, 'End position');

    // BaseModel의 set 사용
    this.set('start', { ..._start });
    this.set('end', { ..._end });

    // 정규화 (start가 항상 end보다 앞에 오도록)
    this.#normalize();

    this.clearDirty();
  }

  /**
   * 위치 검증
   */
  #validatePosition(_position, _name) {
    ValidationUtils.assertProperty(_position, 'line', _name);
    ValidationUtils.assertProperty(_position, 'column', _name);
    ValidationUtils.assertInteger(_position.line, `${_name}.line`);
    ValidationUtils.assertInteger(_position.column, `${_name}.column`);

    if (_position.line < 0) {
      throw new Error(`${_name}.line must be >= 0`);
    }
    if (_position.column < 0) {
      throw new Error(`${_name}.column must be >= 0`);
    }
  }

  /**
   * 선택 영역 정규화 (start < end)
   */
  #normalize() {
    const start = this.get('start');
    const end = this.get('end');

    if (this.#comparePositions(start, end) > 0) {
      // start가 end보다 뒤에 있으면 교환
      this.set('start', end);
      this.set('end', start);
    }
  }

  /**
   * 위치 비교 (-1: a < b, 0: a == b, 1: a > b)
   */
  #comparePositions(_a, _b) {
    if (_a.line < _b.line) return -1;
    if (_a.line > _b.line) return 1;
    if (_a.column < _b.column) return -1;
    if (_a.column > _b.column) return 1;
    return 0;
  }

  /**
   * 시작 위치 가져오기
   */
  getStart() {
    return { ...this.get('start') };
  }

  /**
   * 끝 위치 가져오기
   */
  getEnd() {
    return { ...this.get('end') };
  }

  /**
   * 시작 위치 설정
   */
  setStart(_start) {
    this.#validatePosition(_start, 'Start position');
    this.set('start', { ..._start });
    this.#normalize();
    this.emit('start-changed', { start: this.getStart() });
  }

  /**
   * 끝 위치 설정
   */
  setEnd(_end) {
    this.#validatePosition(_end, 'End position');
    this.set('end', { ..._end });
    this.#normalize();
    this.emit('end-changed', { end: this.getEnd() });
  }

  /**
   * 선택 영역 설정
   */
  setRange(_start, _end) {
    this.#validatePosition(_start, 'Start position');
    this.#validatePosition(_end, 'End position');

    this.set('start', { ..._start });
    this.set('end', { ..._end });
    this.#normalize();

    this.emit('range-changed', {
      start: this.getStart(),
      end: this.getEnd(),
    });
  }

  /**
   * 빈 선택 영역 확인 (start == end)
   */
  isEmpty() {
    const start = this.get('start');
    const end = this.get('end');
    return this.#comparePositions(start, end) === 0;
  }

  /**
   * 단일 줄 선택 확인
   */
  isSingleLine() {
    const start = this.get('start');
    const end = this.get('end');
    return start.line === end.line;
  }

  /**
   * 선택된 줄 개수
   */
  getLineCount() {
    const start = this.get('start');
    const end = this.get('end');
    return end.line - start.line + 1;
  }

  /**
   * 특정 위치가 선택 영역 내부인지 확인
   */
  contains(_line, _column) {
    ValidationUtils.assertInteger(_line, 'Line');
    ValidationUtils.assertInteger(_column, 'Column');

    const position = { line: _line, column: _column };
    const start = this.get('start');
    const end = this.get('end');

    return this.#comparePositions(position, start) >= 0 && this.#comparePositions(position, end) <= 0;
  }

  /**
   * 특정 줄이 선택 영역과 겹치는지 확인
   */
  intersectsLine(_line) {
    ValidationUtils.assertInteger(_line, 'Line');

    const start = this.get('start');
    const end = this.get('end');

    return _line >= start.line && _line <= end.line;
  }

  /**
   * 다른 선택 영역과 겹치는지 확인
   */
  intersects(_other) {
    ValidationUtils.assertInstanceOf(_other, Selection, 'Other selection');

    const this_start = this.get('start');
    const this_end = this.get('end');
    const other_start = _other.get('start');
    const other_end = _other.get('end');

    return !(this.#comparePositions(this_end, other_start) < 0 || this.#comparePositions(this_start, other_end) > 0);
  }

  /**
   * 선택 영역 확장
   */
  expand(_line, _column) {
    ValidationUtils.assertInteger(_line, 'Line');
    ValidationUtils.assertInteger(_column, 'Column');

    const position = { line: _line, column: _column };
    const start = this.get('start');
    const end = this.get('end');

    if (this.#comparePositions(position, start) < 0) {
      this.setStart(position);
    } else if (this.#comparePositions(position, end) > 0) {
      this.setEnd(position);
    }
  }

  /**
   * 선택 영역 이동
   */
  move(_line_delta, _column_delta) {
    ValidationUtils.assertInteger(_line_delta, 'Line delta');
    ValidationUtils.assertInteger(_column_delta, 'Column delta');

    const start = this.get('start');
    const end = this.get('end');

    this.setRange(
      {
        line: start.line + _line_delta,
        column: start.column + _column_delta,
      },
      {
        line: end.line + _line_delta,
        column: end.column + _column_delta,
      }
    );
  }

  /**
   * 범위 정보
   */
  getRange() {
    return {
      start: this.getStart(),
      end: this.getEnd(),
      is_empty: this.isEmpty(),
      is_single_line: this.isSingleLine(),
      line_count: this.getLineCount(),
    };
  }

  /**
   * JSON 직렬화
   */
  toJSON() {
    return {
      start: this.getStart(),
      end: this.getEnd(),
    };
  }

  /**
   * JSON 역직렬화
   */
  fromJSON(_json) {
    ValidationUtils.assertObject(_json, 'JSON');
    ValidationUtils.assertProperty(_json, 'start', 'JSON');
    ValidationUtils.assertProperty(_json, 'end', 'JSON');

    this.setRange(_json.start, _json.end);
  }

  /**
   * 검증
   */
  validate() {
    try {
      const start = this.get('start');
      const end = this.get('end');

      this.#validatePosition(start, 'Start');
      this.#validatePosition(end, 'End');

      return true;
    } catch (error) {
      console.error('Selection validation failed:', error);
      return false;
    }
  }

  /**
   * 복제
   */
  clone() {
    return new Selection(this.getStart(), this.getEnd());
  }

  /**
   * 문자열 표현
   */
  toString() {
    const start = this.get('start');
    const end = this.get('end');
    return `Selection(${start.line}:${start.column} - ${end.line}:${end.column})`;
  }

  /**
   * 정적 팩토리 메서드 - 빈 선택
   */
  static empty(_line = 0, _column = 0) {
    return new Selection({ line: _line, column: _column }, { line: _line, column: _column });
  }

  /**
   * 정적 팩토리 메서드 - 줄 전체 선택
   */
  static wholeLine(_line, _line_length) {
    return new Selection({ line: _line, column: 0 }, { line: _line, column: _line_length });
  }

  /**
   * 정적 팩토리 메서드 - 단어 선택
   */
  static word(_line, _start_column, _end_column) {
    return new Selection({ line: _line, column: _start_column }, { line: _line, column: _end_column });
  }
}
