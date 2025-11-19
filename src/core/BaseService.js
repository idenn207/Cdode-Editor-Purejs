/**
 * 파일: src/core/BaseService.js
 * 기능: 서비스 추상 베이스 클래스
 * 책임: 핵심 비즈니스 로직, 데이터 처리
 */

export default class BaseService {
  constructor() {
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
      throw new Error(`[${this.constructor.name}] ${_name} must be an instance of ${_class.name}`);
    }
    return _value;
  }

  /**
   * 상태 검증
   */
  validateInitialized() {
    if (!this.is_initialized) {
      throw new Error(`[${this.constructor.name}] Service is not initialized`);
    }
  }

  validateNotDestroyed() {
    if (this.is_destroyed) {
      throw new Error(`[${this.constructor.name}] Service has been destroyed`);
    }
  }

  /**
   * 에러 처리 헬퍼
   */
  createError(_message, _details = {}) {
    const error = new Error(`[${this.constructor.name}] ${_message}`);
    Object.assign(error, _details);
    return error;
  }

  handleError(_error, _context = 'Unknown') {
    console.error(`[${this.constructor.name}] Error in ${_context}:`, _error);
    throw _error;
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      is_initialized: this.is_initialized,
      is_destroyed: this.is_destroyed,
    };
  }
}
