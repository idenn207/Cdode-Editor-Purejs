/**
 * 파일: src/utils/ValidationUtils.js
 * 기능: 검증 유틸리티
 * 책임: 재사용 가능한 검증 함수 제공
 */

export default class ValidationUtils {
  /**
   * null/undefined 체크
   */
  static isNullOrUndefined(_value) {
    return _value === null || _value === undefined;
  }

  static notNullOrUndefined(_value, _name = 'Value') {
    if (this.isNullOrUndefined(_value)) {
      throw new Error(`${_name} cannot be null or undefined`);
    }
    return _value;
  }

  /**
   * assertNonNull - notNullOrUndefined의 alias
   */
  static assertNonNull(_value, _name = 'Value') {
    return this.notNullOrUndefined(_value, _name);
  }

  /**
   * 상태 검증
   */
  static assertState(_condition, _message = 'Invalid state') {
    if (!_condition) {
      throw new Error(_message);
    }
  }

  /**
   * 타입 체크
   */
  static isType(_value, _type) {
    return typeof _value === _type;
  }

  static assertType(_value, _type, _name = 'Value') {
    if (!this.isType(_value, _type)) {
      throw new Error(`${_name} must be of type ${_type}, got ${typeof _value}`);
    }
    return _value;
  }

  /**
   * 문자열 체크
   */
  static isString(_value) {
    return typeof _value === 'string';
  }

  static isEmptyString(_value) {
    return this.isString(_value) && _value.trim().length === 0;
  }

  static isNonEmptyString(_value) {
    return this.isString(_value) && _value.trim().length > 0;
  }

  static assertString(_value, _name = 'Value') {
    this.assertType(_value, 'string', _name);
    return _value;
  }

  static assertNonEmptyString(_value, _name = 'Value') {
    this.assertString(_value, _name);
    if (this.isEmptyString(_value)) {
      throw new Error(`${_name} cannot be empty`);
    }
    return _value;
  }

  /**
   * 숫자 체크
   */
  static isNumber(_value) {
    return typeof _value === 'number' && !isNaN(_value);
  }

  static isInteger(_value) {
    return Number.isInteger(_value);
  }

  static isPositive(_value) {
    return this.isNumber(_value) && _value > 0;
  }

  static isNegative(_value) {
    return this.isNumber(_value) && _value < 0;
  }

  static isInRange(_value, _min, _max) {
    return this.isNumber(_value) && _value >= _min && _value <= _max;
  }

  static assertNumber(_value, _name = 'Value') {
    if (!this.isNumber(_value)) {
      throw new Error(`${_name} must be a valid number`);
    }
    return _value;
  }

  static assertInteger(_value, _name = 'Value') {
    this.assertNumber(_value, _name);
    if (!this.isInteger(_value)) {
      throw new Error(`${_name} must be an integer`);
    }
    return _value;
  }

  static assertPositive(_value, _name = 'Value') {
    this.assertNumber(_value, _name);
    if (!this.isPositive(_value)) {
      throw new Error(`${_name} must be positive`);
    }
    return _value;
  }

  static assertNegative(_value, _name = 'Value') {
    this.assertNumber(_value, _name);
    if (!this.isNegative(_value)) {
      throw new Error(`${_name} must be negative`);
    }
    return _value;
  }

  static assertInRange(_value, _min, _max, _name = 'Value') {
    this.assertNumber(_value, _name);
    if (!this.isInRange(_value, _min, _max)) {
      throw new Error(`${_name} must be between ${_min} and ${_max}, got ${_value}`);
    }
    return _value;
  }

  /**
   * 불린 체크
   */
  static isBoolean(_value) {
    return typeof _value === 'boolean';
  }

  static assertBoolean(_value, _name = 'Value') {
    if (!this.isBoolean(_value)) {
      throw new Error(`${_name} must be a boolean`);
    }
    return _value;
  }

  /**
   * 함수 체크
   */
  static isFunction(_value) {
    return typeof _value === 'function';
  }

  static assertFunction(_value, _name = 'Value') {
    if (!this.isFunction(_value)) {
      throw new Error(`${_name} must be a function`);
    }
    return _value;
  }

  /**
   * 객체 체크
   */
  static isObject(_value) {
    return typeof _value === 'object' && _value !== null;
  }

  static isPlainObject(_value) {
    return this.isObject(_value) && _value.constructor === Object;
  }

  static assertObject(_value, _name = 'Value') {
    if (!this.isObject(_value)) {
      throw new Error(`${_name} must be an object`);
    }
    return _value;
  }

  static assertPlainObject(_value, _name = 'Value') {
    if (!this.isPlainObject(_value)) {
      throw new Error(`${_name} must be a plain object`);
    }
    return _value;
  }

  /**
   * 배열 체크
   */
  static isArray(_value) {
    return Array.isArray(_value);
  }

  static isEmpty(_value) {
    return this.isArray(_value) && _value.length === 0;
  }

  static isNonEmpty(_value) {
    return this.isArray(_value) && _value.length > 0;
  }

  static assertArray(_value, _name = 'Value') {
    if (!this.isArray(_value)) {
      throw new Error(`${_name} must be an array`);
    }
    return _value;
  }

  static assertNonEmptyArray(_value, _name = 'Value') {
    this.assertArray(_value, _name);
    if (this.isEmpty(_value)) {
      throw new Error(`${_name} cannot be empty`);
    }
    return _value;
  }

  /**
   * 인스턴스 체크
   */
  static isInstanceOf(_value, _class) {
    return _value instanceof _class;
  }

  static assertInstanceOf(_value, _class, _name = 'Value') {
    if (!this.isInstanceOf(_value, _class)) {
      throw new Error(`${_name} must be instance of ${_class.name}`);
    }
    return _value;
  }

  /**
   * Enum 체크
   */
  static isEnum(_value, _allowedValues) {
    return _allowedValues.includes(_value);
  }

  static assertEnum(_value, _allowedValues, _name = 'Value') {
    if (!this.isEnum(_value, _allowedValues)) {
      throw new Error(`${_name} must be one of: ${_allowedValues.join(', ')}, got ${_value}`);
    }
    return _value;
  }

  /**
   * 배열 요소 포함 체크
   */
  static contains(_array, _value) {
    return this.isArray(_array) && _array.includes(_value);
  }

  static assertContains(_array, _value, _name = 'Value') {
    if (!this.contains(_array, _value)) {
      throw new Error(`${_name} must be one of: ${_array.join(', ')}`);
    }
    return _value;
  }

  /**
   * 프로퍼티 존재 체크
   */
  static hasProperty(_object, _property) {
    return _property in _object;
  }

  static assertProperty(_object, _property, _name = 'Object') {
    if (!this.hasProperty(_object, _property)) {
      throw new Error(`${_name} must have property "${_property}"`);
    }
    return _object;
  }

  /**
   * 길이 체크
   */
  static hasLength(_value, _length) {
    return _value.length === _length;
  }

  static hasMinLength(_value, _min_length) {
    return _value.length >= _min_length;
  }

  static hasMaxLength(_value, _max_length) {
    return _value.length <= _max_length;
  }

  static assertLength(_value, _length, _name = 'Value') {
    if (!this.hasLength(_value, _length)) {
      throw new Error(`${_name} must have length ${_length}, got ${_value.length}`);
    }
    return _value;
  }

  static assertMinLength(_value, _min_length, _name = 'Value') {
    if (!this.hasMinLength(_value, _min_length)) {
      throw new Error(`${_name} must have minimum length ${_min_length}, got ${_value.length}`);
    }
    return _value;
  }

  static assertMaxLength(_value, _max_length, _name = 'Value') {
    if (!this.hasMaxLength(_value, _max_length)) {
      throw new Error(`${_name} must have maximum length ${_max_length}, got ${_value.length}`);
    }
    return _value;
  }

  /**
   * 커스텀 검증
   */
  static assert(_condition, _message = 'Assertion failed') {
    if (!_condition) {
      throw new Error(_message);
    }
  }

  /**
   * 여러 조건 검증 (AND)
   */
  static assertAll(_conditions, _messages = []) {
    _conditions.forEach((_condition, _index) => {
      const message = _messages[_index] || `Condition ${_index + 1} failed`;
      this.assert(_condition, message);
    });
  }

  /**
   * 여러 조건 검증 (OR)
   */
  static assertAny(_conditions, _message = 'All conditions failed') {
    const any_passed = _conditions.some((_condition) => _condition);
    this.assert(any_passed, _message);
  }

  /**
   * Safe 검증 (예외 대신 boolean 반환)
   */
  static safeValidate(_fn) {
    try {
      _fn();
      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * 패턴 검증
   */
  static matchesPattern(_value, _pattern) {
    return _pattern.test(_value);
  }

  static assertPattern(_value, _pattern, _name = 'Value') {
    if (!this.matchesPattern(_value, _pattern)) {
      throw new Error(`${_name} does not match required pattern`);
    }
    return _value;
  }

  /**
   * 이메일 검증
   */
  static isEmail(_value) {
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.isString(_value) && this.matchesPattern(_value, EMAIL_PATTERN);
  }

  static assertEmail(_value, _name = 'Email') {
    if (!this.isEmail(_value)) {
      throw new Error(`${_name} must be a valid email address`);
    }
    return _value;
  }

  /**
   * URL 검증
   */
  static isURL(_value) {
    try {
      new URL(_value);
      return true;
    } catch {
      return false;
    }
  }

  static assertURL(_value, _name = 'URL') {
    if (!this.isURL(_value)) {
      throw new Error(`${_name} must be a valid URL`);
    }
    return _value;
  }
}
