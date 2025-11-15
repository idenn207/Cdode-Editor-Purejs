/**
 * 파일: src/utils/EventEmitter.js
 * 기능: Observer 패턴 구현
 * 책임: 이벤트 발행/구독 시스템 제공
 */

export default class EventEmitter {
  constructor() {
    this._events = {};
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} event - 이벤트 이름
   * @param {Function} listener - 콜백 함수
   */
  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
  }

  /**
   * 일회성 이벤트 리스너 등록
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event, listenerToRemove) {
    if (!this._events[event]) return;

    this._events[event] = this._events[event].filter((listener) => listener !== listenerToRemove);
  }

  /**
   * 이벤트 발행
   */
  emit(event, ...args) {
    if (!this._events[event]) return;

    this._events[event].forEach((listener) => {
      listener(...args);
    });
  }

  /**
   * 모든 리스너 제거
   */
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
  }
}
