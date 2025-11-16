/**
 * 파일: src/utils/KeyBindingManager.js
 * 기능: 키보드 단축키 관리
 * 책임: 글로벌 키보드 이벤트 처리 및 단축키 매핑
 */

export default class KeyBindingManager {
  constructor() {
    this.bindings = new Map();
    this.#attachGlobalListener();
  }

  /**
   * 단축키 등록
   * @param {string} _key - 'ctrl+f', 'ctrl+shift+p' 등
   * @param {function} _callback - 실행할 함수
   */
  register(_key, _callback) {
    const normalizedKey = this.#normalizeKey(_key);
    this.bindings.set(normalizedKey, _callback);
  }

  /**
   * 단축키 해제
   */
  unregister(_key) {
    const normalizedKey = this.#normalizeKey(_key);
    this.bindings.delete(normalizedKey);
  }

  /**
   * 모든 단축키 해제
   */
  clear() {
    this.bindings.clear();
  }

  /**
   * 글로벌 키 이벤트 리스너
   */
  #attachGlobalListener() {
    window.document.addEventListener('keydown', (_e) => {
      this.#handleKeyDown(_e);
    });
  }

  /**
   * 키 다운 핸들러
   */
  #handleKeyDown(_e) {
    // 입력 요소에서는 단축키 무시
    const target = _e.target;
    const tagName = target.tagName.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea') {
      // input/textarea에서는 Ctrl 조합만 허용
      if (!_e.ctrlKey && !_e.metaKey) {
        return;
      }
    }

    const keyString = this.#getKeyString(_e);
    const callback = this.bindings.get(keyString);

    if (callback) {
      _e.preventDefault();
      callback(_e);
    }
  }

  /**
   * 이벤트에서 키 문자열 생성
   */
  #getKeyString(_e) {
    const parts = [];

    // 수정자 키 (순서 중요)
    if (_e.ctrlKey || _e.metaKey) parts.push('ctrl');
    if (_e.altKey) parts.push('alt');
    if (_e.shiftKey) parts.push('shift');

    // 메인 키
    let key = _e.key.toLowerCase();

    // 특수 키 매핑
    const specialKeys = {
      ' ': 'space',
      enter: 'enter',
      escape: 'escape',
      tab: 'tab',
      backspace: 'backspace',
      delete: 'delete',
      arrowup: 'up',
      arrowdown: 'down',
      arrowleft: 'left',
      arrowright: 'right',
    };

    if (specialKeys[key]) {
      key = specialKeys[key];
    }

    parts.push(key);

    return parts.join('+');
  }

  /**
   * 키 문자열 정규화
   */
  #normalizeKey(_key) {
    const parts = _key.toLowerCase().split('+');
    const modifiers = [];
    let mainKey = '';

    parts.forEach((_part) => {
      if (['ctrl', 'alt', 'shift'].includes(_part)) {
        modifiers.push(_part);
      } else {
        mainKey = _part;
      }
    });

    // 수정자 키 정렬
    modifiers.sort();

    return [...modifiers, mainKey].join('+');
  }

  /**
   * 등록된 단축키 목록 반환
   */
  getBindings() {
    return Array.from(this.bindings.keys());
  }
}
