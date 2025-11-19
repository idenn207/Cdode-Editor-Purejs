/**
 * 파일: src/utils/DOMUtils.js
 * 기능: DOM 조작 유틸리티
 * 책임: 재사용 가능한 DOM 조작 함수 제공
 */

export default class DOMUtils {
  /**
   * 엘리먼트 생성
   */
  static createElement(_tag, _options = {}) {
    const element = document.createElement(_tag);

    // 클래스 추가
    if (_options.className) {
      element.className = _options.className;
    }

    // ID 추가
    if (_options.id) {
      element.id = _options.id;
    }

    // 속성 추가
    if (_options.attributes) {
      Object.entries(_options.attributes).forEach(([_key, _value]) => {
        element.setAttribute(_key, _value);
      });
    }

    // 스타일 추가
    if (_options.styles) {
      Object.entries(_options.styles).forEach(([_key, _value]) => {
        element.style[_key] = _value;
      });
    }

    // 텍스트 내용
    if (_options.textContent) {
      element.textContent = _options.textContent;
    }

    // HTML 내용
    if (_options.innerHTML) {
      element.innerHTML = _options.innerHTML;
    }

    // 자식 엘리먼트
    if (_options.children) {
      _options.children.forEach((_child) => {
        element.appendChild(_child);
      });
    }

    // 이벤트 리스너
    if (_options.events) {
      Object.entries(_options.events).forEach(([_event, _handler]) => {
        element.addEventListener(_event, _handler);
      });
    }

    return element;
  }

  /**
   * 엘리먼트 찾기 (안전)
   */
  static findElement(_selector, _parent = document) {
    const element = _parent.querySelector(_selector);
    if (!element) {
      console.warn(`Element not found: ${_selector}`);
    }
    return element;
  }

  /**
   * 엘리먼트 찾기 (필수)
   */
  static findElementRequired(_selector, _parent = document) {
    const element = _parent.querySelector(_selector);
    if (!element) {
      throw new Error(`Element not found: ${_selector}`);
    }
    return element;
  }

  /**
   * 여러 엘리먼트 찾기
   */
  static findElements(_selector, _parent = document) {
    return Array.from(_parent.querySelectorAll(_selector));
  }

  /**
   * 클래스 토글
   */
  static toggleClass(_element, _className, _force = null) {
    if (_force === null) {
      _element.classList.toggle(_className);
    } else {
      _element.classList.toggle(_className, _force);
    }
  }

  /**
   * 여러 클래스 추가
   */
  static addClasses(_element, ..._classNames) {
    _classNames.forEach((_className) => {
      _element.classList.add(_className);
    });
  }

  /**
   * 여러 클래스 제거
   */
  static removeClasses(_element, ..._classNames) {
    _classNames.forEach((_className) => {
      _element.classList.remove(_className);
    });
  }

  /**
   * 클래스 존재 확인
   */
  static hasClass(_element, _className) {
    return _element.classList.contains(_className);
  }

  /**
   * 엘리먼트 제거
   */
  static removeElement(_element) {
    if (_element && _element.parentNode) {
      _element.parentNode.removeChild(_element);
    }
  }

  /**
   * 모든 자식 제거
   */
  static removeAllChildren(_element) {
    while (_element.firstChild) {
      _element.removeChild(_element.firstChild);
    }
  }

  /**
   * HTML 이스케이프
   */
  static escapeHtml(_text) {
    const div = document.createElement('div');
    div.textContent = _text;
    return div.innerHTML;
  }

  /**
   * HTML 언이스케이프
   */
  static unescapeHtml(_html) {
    const div = document.createElement('div');
    div.innerHTML = _html;
    return div.textContent || '';
  }

  /**
   * 엘리먼트가 보이는지 확인
   */
  static isVisible(_element) {
    return _element.offsetWidth > 0 && _element.offsetHeight > 0;
  }

  /**
   * 엘리먼트를 화면에 스크롤
   */
  static scrollIntoView(_element, _options = {}) {
    const default_options = {
      block: 'nearest',
      behavior: 'smooth',
      ...options,
    };
    _element.scrollIntoView(default_options);
  }

  /**
   * 엘리먼트 위치 정보
   */
  static getPosition(_element) {
    const rect = _element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      right: rect.right + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * 엘리먼트 크기 정보
   */
  static getSize(_element) {
    return {
      width: _element.offsetWidth,
      height: _element.offsetHeight,
      client_width: _element.clientWidth,
      client_height: _element.clientHeight,
      scroll_width: _element.scrollWidth,
      scroll_height: _element.scrollHeight,
    };
  }

  /**
   * 데이터 속성 가져오기
   */
  static getData(_element, _key) {
    return _element.dataset[_key];
  }

  /**
   * 데이터 속성 설정
   */
  static setData(_element, _key, _value) {
    _element.dataset[_key] = _value;
  }

  /**
   * 이벤트 위임
   */
  static delegate(_parent, _selector, _event, _handler) {
    _parent.addEventListener(_event, (_e) => {
      const target = _e.target.closest(_selector);
      if (target) {
        _handler.call(target, _e);
      }
    });
  }

  /**
   * DocumentFragment 생성
   */
  static createFragment(_elements) {
    const fragment = document.createDocumentFragment();
    _elements.forEach((_element) => {
      fragment.appendChild(_element);
    });
    return fragment;
  }

  /**
   * 엘리먼트 복제
   */
  static cloneElement(_element, _deep = true) {
    return _element.cloneNode(_deep);
  }

  /**
   * 부모 엘리먼트 찾기
   */
  static findParent(_element, _selector) {
    let current = _element.parentElement;
    while (current) {
      if (current.matches(_selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * 다음 형제 엘리먼트 찾기
   */
  static findNextSibling(_element, _selector) {
    let sibling = _element.nextElementSibling;
    while (sibling) {
      if (sibling.matches(_selector)) {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  /**
   * 이전 형제 엘리먼트 찾기
   */
  static findPreviousSibling(_element, _selector) {
    let sibling = _element.previousElementSibling;
    while (sibling) {
      if (sibling.matches(_selector)) {
        return sibling;
      }
      sibling = sibling.previousElementSibling;
    }
    return null;
  }

  /**
   * 스타일 가져오기
   */
  static getComputedStyle(_element, _property) {
    const computed = window.getComputedStyle(_element);
    return _property ? computed.getPropertyValue(_property) : computed;
  }

  /**
   * 애니메이션 대기
   */
  static waitForAnimation(_element) {
    return new Promise((_resolve) => {
      const handler = () => {
        _element.removeEventListener('animationend', handler);
        _resolve();
      };
      _element.addEventListener('animationend', handler);
    });
  }

  /**
   * 트랜지션 대기
   */
  static waitForTransition(_element) {
    return new Promise((_resolve) => {
      const handler = () => {
        _element.removeEventListener('transitionend', handler);
        _resolve();
      };
      _element.addEventListener('transitionend', handler);
    });
  }
}
