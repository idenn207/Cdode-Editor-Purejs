/**
 * 파일: src/utils/EventEmitter.js
 * 기능: Observer 패턴 구현
 * 책임: 이벤트 발행/구독 시스템 제공
 */

export default class EventEmitter {
  constructor() {
    this._events = {};
  }

  on(_event, _listener) {
    if (!this._events[_event]) {
      this._events[_event] = [];
    }
    this._events[_event].push(_listener);
  }

  once(_event, _listener) {
    const onceWrapper = (..._args) => {
      _listener(..._args);
      this.off(_event, onceWrapper);
    };
    this.on(_event, onceWrapper);
  }

  off(_event, _listenerToRemove) {
    if (!this._events[_event]) return;

    this._events[_event] = this._events[_event].filter((_listener) => _listener !== _listenerToRemove);
  }

  emit(_event, ..._args) {
    if (!this._events[_event]) return;

    this._events[_event].forEach((_listener) => {
      _listener(..._args);
    });
  }

  removeAllListeners(_event) {
    if (_event) {
      delete this._events[_event];
    } else {
      this._events = {};
    }
  }
}
