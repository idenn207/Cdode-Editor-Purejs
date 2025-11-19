/**
 * 파일: src/core/BaseModel.js
 * 기능: 모델 추상 베이스 클래스
 * 책임: 데이터 관리, 변경 감지, 직렬화
 */

import EventEmitter from '../utils/EventEmitter.js';

export default class BaseModel extends EventEmitter {
  constructor() {
    super();
    this._data = {};
    this._is_dirty = false;
  }

  /**
   * Abstract 메서드 - JSON 직렬화
   */
  toJSON() {
    throw new Error(`${this.constructor.name}.toJSON() must be implemented`);
  }

  /**
   * Abstract 메서드 - JSON 역직렬화
   */
  fromJSON(_json) {
    throw new Error(`${this.constructor.name}.fromJSON() must be implemented`);
  }

  /**
   * 데이터 가져오기
   */
  get(_key) {
    return this._data[_key];
  }

  /**
   * 데이터 설정
   */
  set(_key, _value) {
    const old_value = this._data[_key];

    // 값이 동일하면 아무것도 하지 않음
    if (old_value === _value) {
      return;
    }

    this._data[_key] = _value;
    this._is_dirty = true;

    // 이벤트 발행
    this.emit('change', {
      key: _key,
      old_value: old_value,
      new_value: _value,
    });

    this.emit(`change:${_key}`, {
      old_value: old_value,
      new_value: _value,
    });
  }

  /**
   * 여러 데이터 일괄 설정
   */
  setMultiple(_data) {
    Object.keys(_data).forEach((_key) => {
      this.set(_key, _data[_key]);
    });
  }

  /**
   * 데이터 존재 확인
   */
  has(_key) {
    return _key in this._data;
  }

  /**
   * 데이터 삭제
   */
  delete(_key) {
    if (!this.has(_key)) {
      return false;
    }

    const old_value = this._data[_key];
    delete this._data[_key];
    this._is_dirty = true;

    this.emit('delete', {
      key: _key,
      old_value: old_value,
    });

    return true;
  }

  /**
   * 모든 데이터 가져오기
   */
  getAll() {
    return { ...this._data };
  }

  /**
   * 데이터 초기화
   */
  reset() {
    const old_data = { ...this._data };
    this._data = {};
    this._is_dirty = false;

    this.emit('reset', { old_data });
  }

  /**
   * Dirty 상태 확인
   */
  isDirty() {
    return this._is_dirty;
  }

  /**
   * Dirty 상태 설정
   */
  setDirty(_dirty) {
    const old_dirty = this._is_dirty;
    this._is_dirty = _dirty;

    if (old_dirty !== _dirty) {
      this.emit('dirty-changed', { is_dirty: _dirty });
    }
  }

  /**
   * Dirty 상태 초기화
   */
  clearDirty() {
    this.setDirty(false);
  }

  /**
   * 데이터 복제
   */
  clone() {
    const cloned = new this.constructor();
    cloned._data = { ...this._data };
    cloned._is_dirty = this._is_dirty;
    return cloned;
  }

  /**
   * 데이터 비교
   */
  equals(_other) {
    if (!(_other instanceof BaseModel)) {
      return false;
    }

    const this_keys = Object.keys(this._data).sort();
    const other_keys = Object.keys(_other._data).sort();

    if (this_keys.length !== other_keys.length) {
      return false;
    }

    for (let i = 0; i < this_keys.length; i++) {
      if (this_keys[i] !== other_keys[i]) {
        return false;
      }

      if (this._data[this_keys[i]] !== _other._data[this_keys[i]]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 검증
   */
  validate() {
    // 하위 클래스에서 선택적 구현
    return true;
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      data: this.getAll(),
      is_dirty: this._is_dirty,
      keys_count: Object.keys(this._data).length,
    };
  }
}
