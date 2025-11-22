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
   * @param {string} _event - 이벤트 이름
   * @param {Function} _listener - 리스너 함수
   */
  on(_event, _listener) {
    if (!this._events[_event]) {
      this._events[_event] = [];
    }
    this._events[_event].push(_listener);
    return this;
  }

  /**
   * 일회성 이벤트 리스너 등록
   * @param {string} _event - 이벤트 이름
   * @param {Function} _listener - 리스너 함수
   */
  once(_event, _listener) {
    const onceWrapper = (..._args) => {
      _listener(..._args);
      this.off(_event, onceWrapper);
    };
    this.on(_event, onceWrapper);
    return this;
  }

  /**
   * 이벤트 리스너 제거
   * @param {string} _event - 이벤트 이름
   * @param {Function} _listenerToRemove - 제거할 리스너
   */
  off(_event, _listenerToRemove) {
    if (!this._events[_event]) return this;

    this._events[_event] = this._events[_event].filter((_listener) => _listener !== _listenerToRemove);
    return this;
  }

  /**
   * 이벤트 발행
   * @param {string} _event - 이벤트 이름
   * @param  {...any} _args - 이벤트 인자
   */
  emit(_event, ..._args) {
    if (!this._events[_event]) return this;

    this._events[_event].forEach((_listener) => {
      try {
        _listener(..._args);
      } catch (error) {
        console.error(`Error in event listener for "${_event}":`, error);
      }
    });
    return this;
  }

  /**
   * 모든 리스너 제거
   * @param {string} _event - 이벤트 이름 (선택적)
   */
  removeAllListeners(_event) {
    if (_event) {
      delete this._events[_event];
    } else {
      this._events = {};
    }
    return this;
  }

  /**
   * 리스너 수 확인
   * @param {string} _event - 이벤트 이름 (선택적)
   * @returns {number}
   */
  listenerCount(_event) {
    if (_event) {
      return this._events[_event] ? this._events[_event].length : 0;
    } else {
      return Object.values(this._events).reduce((_count, _listeners) => _count + _listeners.length, 0);
    }
  }

  /**
   * 이벤트 목록 가져오기
   * @returns {string[]}
   */
  eventNames() {
    return Object.keys(this._events);
  }

  /**
   * 특정 이벤트의 리스너 목록 가져오기
   * @param {string} _event - 이벤트 이름
   * @returns {Function[]}
   */
  listeners(_event) {
    return this._events[_event] ? [...this._events[_event]] : [];
  }
}
