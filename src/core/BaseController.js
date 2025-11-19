/**
 * 파일: src/core/BaseController.js
 * 기능: 컨트롤러 추상 베이스 클래스
 * 책임: 비즈니스 로직 관리, 이벤트 조정, 에러 처리
 */

import EventEmitter from '../utils/EventEmitter.js';

export default class BaseController extends EventEmitter {
  constructor() {
    super();

    this.is_initialized = false;
    this.is_destroyed = false;

    // 관리하는 서비스들
    this.services = new Map();

    // 관리하는 뷰들
    this.views = new Map();
  }

  /**
   * Abstract 메서드 - 하위 클래스에서 반드시 구현
   */
  initialize() {
    throw new Error(`${this.constructor.name}.initialize() must be implemented`);
  }

  /**
   * 컨트롤러 시작
   */
  start() {
    if (this.is_initialized) {
      console.warn(`${this.constructor.name} is already initialized`);
      return;
    }

    if (this.is_destroyed) {
      throw new Error(`${this.constructor.name} has been destroyed`);
    }

    this.initialize();
    this.is_initialized = true;
    this.emit('started');
  }

  /**
   * 컨트롤러 정지
   */
  stop() {
    if (!this.is_initialized) return;

    this.is_initialized = false;
    this.emit('stopped');
  }

  /**
   * 컨트롤러 파괴 (리소스 해제)
   */
  destroy() {
    if (this.is_destroyed) return;

    // 정지
    this.stop();

    // 이벤트 리스너 제거
    this.removeAllListeners();

    // 서비스/뷰 정리
    this.services.clear();
    this.views.clear();

    this.is_destroyed = true;
    this.emit('destroyed');
  }

  /**
   * 서비스 등록
   */
  registerService(_name, _service) {
    if (this.services.has(_name)) {
      console.warn(`Service ${_name} already registered in ${this.constructor.name}`);
      return;
    }
    this.services.set(_name, _service);
  }

  /**
   * 서비스 가져오기
   */
  getService(_name) {
    const service = this.services.get(_name);
    if (!service) {
      throw new Error(`Service ${_name} not found in ${this.constructor.name}`);
    }
    return service;
  }

  /**
   * 뷰 등록
   */
  registerView(_name, _view) {
    if (this.views.has(_name)) {
      console.warn(`View ${_name} already registered in ${this.constructor.name}`);
      return;
    }
    this.views.set(_name, _view);
  }

  /**
   * 뷰 가져오기
   */
  getView(_name) {
    const view = this.views.get(_name);
    if (!view) {
      throw new Error(`View ${_name} not found in ${this.constructor.name}`);
    }
    return view;
  }

  /**
   * 에러 처리 (공통)
   */
  handleError(_error, _context = 'Unknown') {
    const error_info = {
      controller: this.constructor.name,
      context: _context,
      error: _error,
      message: _error.message || String(_error),
      stack: _error.stack,
      timestamp: new Date().toISOString(),
    };

    console.error(`[${error_info.controller}] Error in ${_context}:`, _error);

    this.emit('error', error_info);

    return error_info;
  }

  /**
   * 검증 헬퍼
   */
  validateNotNull(_value, _name) {
    if (_value === null || _value === undefined) {
      const error = new Error(`${_name} cannot be null or undefined`);
      this.handleError(error, 'validation');
      throw error;
    }
  }

  validateType(_value, _type, _name) {
    if (typeof _value !== _type) {
      const error = new Error(`${_name} must be of type ${_type}, got ${typeof _value}`);
      this.handleError(error, 'validation');
      throw error;
    }
  }

  validateArray(_value, _name) {
    if (!Array.isArray(_value)) {
      const error = new Error(`${_name} must be an array`);
      this.handleError(error, 'validation');
      throw error;
    }
  }

  /**
   * 상태 검증
   */
  validateInitialized() {
    if (!this.is_initialized) {
      throw new Error(`${this.constructor.name} is not initialized`);
    }
  }

  validateNotDestroyed() {
    if (this.is_destroyed) {
      throw new Error(`${this.constructor.name} has been destroyed`);
    }
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      is_initialized: this.is_initialized,
      is_destroyed: this.is_destroyed,
      services: Array.from(this.services.keys()),
      views: Array.from(this.views.keys()),
      event_listeners: this.listenerCount(),
    };
  }
}
