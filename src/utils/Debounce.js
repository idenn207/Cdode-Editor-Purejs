/**
 * 파일: src/utils/Debounce.js
 * 기능: 함수 실행 지연 유틸리티
 * 책임: 과도한 함수 호출 방지 (입력 최적화)
 */

/**
 * Debounce 함수
 * @param {Function} _func - 실행할 함수
 * @param {number} _delay - 지연 시간(ms)
 * @returns {Function} debounced 함수
 */
export function debounce(_func, _delay) {
  let timeoutId = null;

  return function debounced(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      _func.apply(this, args);
      timeoutId = null;
    }, _delay);
  };
}

/**
 * Throttle 함수
 * @param {Function} _func - 실행할 함수
 * @param {number} _limit - 최소 실행 간격(ms)
 * @returns {Function} throttled 함수
 */
export function throttle(_func, _limit) {
  let inThrottle = false;

  return function throttled(...args) {
    if (!inThrottle) {
      _func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, _limit);
    }
  };
}
