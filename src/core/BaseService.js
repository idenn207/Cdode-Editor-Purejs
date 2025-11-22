/**
 * 파일: src/core/BaseService.js
 * 기능: 서비스 추상 베이스 클래스
 * 책임: 핵심 비즈니스 로직, 데이터 처리, 이벤트 발행
 */

import EventEmitter from '../utils/EventEmitter.js';

export default class BaseService extends EventEmitter {
  constructor() {
    super();
    this.is_initialized = false;
    this.is_destroyed = false;
  }

  /**
   * 서비스 초기화 (선택적 구현)
   */
  initialize() {
    if (this.is_initialized) {
      console.warn(`${this.constructor.name} is already initialized`);
      return;
    }
    this.is_initialized = true;
  }

  /**
   * 서비스 파괴 (리소스 해제)
   */
  destroy() {
    if (this.is_destroyed) return;

    // 이벤트 리스너 제거
    this.removeAllListeners();

    this.is_initialized = false;
    this.is_destroyed = true;
  }

  /**
   * 검증 헬퍼 메서드
   */
  validateNotNull(_value, _name) {
    if (_value === null || _value === undefined) {
      throw new Error(`[${this.constructor.name}] ${_name} cannot be null or undefined`);
    }
    return _value;
  }

  /**
   * validateRequired - validateNotNull의 alias
   */
  validateRequired(_value, _name) {
    return this.validateNotNull(_value, _name);
  }

  validateType(_value, _type, _name) {
    if (typeof _value !== _type) {
      throw new Error(`[${this.constructor.name}] ${_name} must be of type ${_type}, got ${typeof _value}`);
    }
    return _value;
  }

  validateArray(_value, _name) {
    if (!Array.isArray(_value)) {
      throw new Error(`[${this.constructor.name}] ${_name} must be an array`);
    }
    return _value;
  }

  validateString(_value, _name) {
    this.validateType(_value, 'string', _name);
    if (_value.trim().length === 0) {
      throw new Error(`[${this.constructor.name}] ${_name} cannot be empty`);
    }
    return _value;
  }

  validateNumber(_value, _name, _min = -Infinity, _max = Infinity) {
    this.validateType(_value, 'number', _name);
    if (_value < _min || _value > _max) {
      throw new Error(`[${this.constructor.name}] ${_name} must be between ${_min} and ${_max}, got ${_value}`);
    }
    return _value;
  }

  validateBoolean(_value, _name) {
    this.validateType(_value, 'boolean', _name);
    return _value;
  }

  validateFunction(_value, _name) {
    this.validateType(_value, 'function', _name);
    return _value;
  }

  validateObject(_value, _name) {
    if (typeof _value !== 'object' || _value === null) {
      throw new Error(`[${this.constructor.name}] ${_name} must be an object`);
    }
    return _value;
  }

  validateInstanceOf(_value, _class, _name) {
    if (!(_value instanceof _class)) {
      throw new Error(`[${this.constructor.name}] ${_name} must be instance of ${_class.name}`);
    }
    return _value;
  }

  validateEnum(_value, _allowedValues, _name) {
    if (!_allowedValues.includes(_value)) {
      throw new Error(`[${this.constructor.name}] ${_name} must be one of ${_allowedValues.join(', ')}, got ${_value}`);
    }
    return _value;
  }

  /**
   * 상태 검증
   */
  validateState(_condition, _message) {
    if (!_condition) {
      throw new Error(`[${this.constructor.name}] ${_message}`);
    }
  }

  /**
   * 에러 처리
   */
  handleError(_error, _context = 'Unknown') {
    console.error(`[${this.constructor.name}] Error in ${_context}:`, _error);
    this.emit('error', {
      service: this.constructor.name,
      context: _context,
      error: _error,
      message: _error.message || String(_error),
      timestamp: new Date().toISOString(),
    });
  }
}
