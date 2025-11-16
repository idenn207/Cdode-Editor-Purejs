/**
 * 파일: src/views/renderers/VirtualScroller.js
 * 기능: Virtual Scrolling 구현
 * 책임: 보이는 영역의 줄만 렌더링하여 성능 최적화
 */

import { throttle } from '../../utils/Debounce.js';

export default class VirtualScroller {
  constructor(_containerElement, _options = {}) {
    this.container = _containerElement;
    this.line_height = _options.line_height || 22.4; // 14px * 1.6
    this.buffer_lines = _options.buffer_lines || 10; // 여유 줄 수
    this.total_lines = 0;
    this.visible_start = 0;
    this.visible_end = 0;
    this.viewport_height = 0;

    this.#initialize();
  }

  #initialize() {
    this.viewport_height = this.container.clientHeight;

    // 스크롤 이벤트 (throttle 적용)
    this.container.addEventListener(
      'scroll',
      throttle(() => {
        this.#updateVisibleRange();
      }, 16)
    ); // ~60fps

    // 리사이즈 이벤트
    window.addEventListener(
      'resize',
      throttle(() => {
        this.viewport_height = this.container.clientHeight;
        this.#updateVisibleRange();
      }, 100)
    );
  }

  /**
   * 전체 줄 수 설정
   */
  setTotalLines(_count) {
    this.total_lines = _count;
    this.#updateVisibleRange();
  }

  /**
   * 가시 범위 계산
   */
  #updateVisibleRange() {
    const scrollTop = this.container.scrollTop;

    // 시작 줄 (버퍼 포함)
    this.visible_start = Math.max(0, Math.floor(scrollTop / this.line_height) - this.buffer_lines);

    // 끝 줄 (버퍼 포함)
    const visibleLines = Math.ceil(this.viewport_height / this.line_height);
    this.visible_end = Math.min(this.total_lines, this.visible_start + visibleLines + this.buffer_lines * 2);

    return {
      start: this.visible_start,
      end: this.visible_end,
    };
  }

  /**
   * 현재 가시 범위 반환
   */
  getVisibleRange() {
    return {
      start: this.visible_start,
      end: this.visible_end,
    };
  }

  /**
   * 특정 줄이 가시 범위에 있는지 확인
   */
  isLineVisible(_lineNumber) {
    return _lineNumber >= this.visible_start && _lineNumber < this.visible_end;
  }

  /**
   * 전체 컨텐츠 높이 계산
   */
  getTotalHeight() {
    return this.total_lines * this.line_height;
  }

  /**
   * 특정 줄로 스크롤
   */
  scrollToLine(_lineNumber) {
    const scrollTop = _lineNumber * this.line_height;
    this.container.scrollTop = scrollTop;
  }
}
