/**
 * 파일: src/core/BaseComponent.js
 * 기능: UI 컴포넌트 추상 베이스 클래스
 * 책임: 컴포넌트 생명주기, 공통 기능 제공
 */

import EventEmitter from '../utils/EventEmitter.js';

export default class BaseComponent extends EventEmitter {
  constructor(_containerId) {
    super();

    this.container_id = _containerId;
    this.container = null;
    this.is_initialized = false;
    this.is_mounted = false;
    this.is_destroyed = false;

    // 자식 컴포넌트 관리
    this.children = new Map();
  }

  /**
   * Abstract 메서드 - 하위 클래스에서 반드시 구현
   */
  initialize() {
    throw new Error(`${this.constructor.name}.initialize() must be implemented`);
  }

  /**
   * Abstract 메서드 - 하위 클래스에서 반드시 구현
   */
  render() {
    throw new Error(`${this.constructor.name}.render() must be implemented`);
  }

  /**
   * 컴포넌트를 DOM에 마운트
   */
  mount() {
    if (this.is_mounted) {
      console.warn(`${this.constructor.name} is already mounted`);
      return;
    }

    if (this.is_destroyed) {
      throw new Error(`${this.constructor.name} has been destroyed`);
    }

    // 컨테이너 찾기
    this.container = window.document.getElementById(this.container_id);
    if (!this.container) {
      throw new Error(`Container not found: ${this.container_id}`);
    }

    // 초기화
    if (!this.is_initialized) {
      this.initialize();
      this.is_initialized = true;
    }

    // 렌더링
    this.render();
    this.is_mounted = true;

    this.emit('mounted');
  }

  /**
   * 컴포넌트를 DOM에서 언마운트
   */
  unmount() {
    if (!this.is_mounted) return;

    // 자식 컴포넌트 언마운트
    this.children.forEach((_child) => {
      if (_child.unmount) {
        _child.unmount();
      }
    });

    this.is_mounted = false;
    this.emit('unmounted');
  }

  /**
   * 컴포넌트 파괴 (리소스 해제)
   */
  destroy() {
    if (this.is_destroyed) return;

    // 언마운트
    this.unmount();

    // 자식 컴포넌트 파괴
    this.children.forEach((_child) => {
      if (_child.destroy) {
        _child.destroy();
      }
    });
    this.children.clear();

    // 이벤트 리스너 제거
    this.removeAllListeners();

    // 컨테이너 정리
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    this.is_destroyed = true;
    this.emit('destroyed');
  }

  /**
   * 컴포넌트 표시
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
      this.emit('shown');
    }
  }

  /**
   * 컴포넌트 숨김
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.emit('hidden');
    }
  }

  /**
   * 자식 컴포넌트 추가
   */
  addChild(_name, _component) {
    if (this.children.has(_name)) {
      console.warn(`Child component ${_name} already exists`);
      return;
    }
    this.children.set(_name, _component);
  }

  /**
   * 자식 컴포넌트 제거
   */
  removeChild(_name) {
    const child = this.children.get(_name);
    if (child) {
      if (child.destroy) {
        child.destroy();
      }
      this.children.delete(_name);
    }
  }

  /**
   * 자식 컴포넌트 가져오기
   */
  getChild(_name) {
    return this.children.get(_name);
  }

  /**
   * 컴포넌트 상태 검증
   */
  validateMounted() {
    if (!this.is_mounted) {
      throw new Error(`${this.constructor.name} is not mounted`);
    }
  }

  validateNotDestroyed() {
    if (this.is_destroyed) {
      throw new Error(`${this.constructor.name} has been destroyed`);
    }
  }

  /**
   * 디버그 정보 출력
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      container_id: this.container_id,
      is_initialized: this.is_initialized,
      is_mounted: this.is_mounted,
      is_destroyed: this.is_destroyed,
      children_count: this.children.size,
    };
  }
}
