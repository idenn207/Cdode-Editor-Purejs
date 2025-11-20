/**
 * 파일: src/views/renderers/VirtualScroller.js
 * 기능: 가상 스크롤링 계산
 * 책임: 표시할 줄 범위 계산, 스크롤 위치 관리
 *
 * 리팩토링 변경사항:
 * 1. 검증 로직 추가
 * 2. 상태 관리 개선
 * 3. 에러 처리 강화
 */

import ValidationUtils from '../../utils/ValidationUtils.js';

export default class VirtualScroller {
  constructor(_config) {
    this.#validateConfig(_config);

    // 설정
    this.total_lines = _config.total_lines;
    this.container_height = _config.container_height;
    this.line_height = _config.line_height;
    this.buffer_lines = _config.buffer_lines || 10;

    // 상태
    this.scroll_top = 0;
    this.visible_start = 0;
    this.visible_end = 0;

    this.#calculateVisibleRange();
  }

  /**
   * 설정 검증 (private)
   */
  #validateConfig(_config) {
    ValidationUtils.assertNonNull(_config, 'Config');
    ValidationUtils.assertObject(_config, 'Config');

    ValidationUtils.assertNumber(_config.total_lines, 'total_lines');
    ValidationUtils.assertNumber(_config.container_height, 'container_height');
    ValidationUtils.assertNumber(_config.line_height, 'line_height');

    if (_config.total_lines < 0) {
      throw new Error('total_lines must be >= 0');
    }

    if (_config.container_height <= 0) {
      throw new Error('container_height must be > 0');
    }

    if (_config.line_height <= 0) {
      throw new Error('line_height must be > 0');
    }

    if (_config.buffer_lines !== undefined) {
      ValidationUtils.assertNumber(_config.buffer_lines, 'buffer_lines');
      if (_config.buffer_lines < 0) {
        throw new Error('buffer_lines must be >= 0');
      }
    }
  }

  /**
   * 가시 범위 계산 (private)
   */
  #calculateVisibleRange() {
    // 스크롤 위치 기준 첫 번째 보이는 줄
    const first_visible = Math.floor(this.scroll_top / this.line_height);

    // 컨테이너에 보이는 줄 수
    const visible_count = Math.ceil(this.container_height / this.line_height);

    // 버퍼 포함 시작/끝
    this.visible_start = Math.max(0, first_visible - this.buffer_lines);
    this.visible_end = Math.min(this.total_lines, first_visible + visible_count + this.buffer_lines);
  }

  /**
   * 스크롤 위치 업데이트
   */
  updateScrollTop(_scrollTop) {
    ValidationUtils.assertNumber(_scrollTop, 'scrollTop');

    if (_scrollTop < 0) {
      throw new Error('scrollTop must be >= 0');
    }

    this.scroll_top = _scrollTop;
    this.#calculateVisibleRange();
  }

  /**
   * 전체 줄 수 업데이트
   */
  updateTotalLines(_totalLines) {
    ValidationUtils.assertNumber(_totalLines, 'totalLines');

    if (_totalLines < 0) {
      throw new Error('totalLines must be >= 0');
    }

    this.total_lines = _totalLines;
    this.#calculateVisibleRange();
  }

  /**
   * 컨테이너 높이 업데이트
   */
  updateContainerHeight(_height) {
    ValidationUtils.assertNumber(_height, 'height');

    if (_height <= 0) {
      throw new Error('height must be > 0');
    }

    this.container_height = _height;
    this.#calculateVisibleRange();
  }

  /**
   * 가시 범위 가져오기
   */
  getVisibleRange() {
    return {
      start: this.visible_start,
      end: this.visible_end,
    };
  }

  /**
   * 전체 콘텐츠 높이
   */
  getTotalHeight() {
    return this.total_lines * this.line_height;
  }

  /**
   * 줄 번호가 가시 범위 내에 있는지 확인
   */
  isLineVisible(_lineIndex) {
    ValidationUtils.assertNumber(_lineIndex, 'lineIndex');

    return _lineIndex >= this.visible_start && _lineIndex < this.visible_end;
  }

  /**
   * 특정 줄로 스크롤
   */
  scrollToLine(_lineIndex) {
    ValidationUtils.assertNumber(_lineIndex, 'lineIndex');
    ValidationUtils.assertInRange(_lineIndex, 0, this.total_lines - 1, 'lineIndex');

    // 줄을 중앙에 위치시킴
    const targetScrollTop = _lineIndex * this.line_height - this.container_height / 2;
    this.updateScrollTop(Math.max(0, targetScrollTop));

    return this.scroll_top;
  }

  /**
   * 버퍼 줄 수 설정
   */
  setBufferLines(_bufferLines) {
    ValidationUtils.assertNumber(_bufferLines, 'bufferLines');

    if (_bufferLines < 0) {
      throw new Error('bufferLines must be >= 0');
    }

    this.buffer_lines = _bufferLines;
    this.#calculateVisibleRange();
  }

  /**
   * 줄 높이 설정
   */
  setLineHeight(_lineHeight) {
    ValidationUtils.assertNumber(_lineHeight, 'lineHeight');

    if (_lineHeight <= 0) {
      throw new Error('lineHeight must be > 0');
    }

    this.line_height = _lineHeight;
    this.#calculateVisibleRange();
  }

  /**
   * 설정 가져오기
   */
  getConfig() {
    return {
      total_lines: this.total_lines,
      container_height: this.container_height,
      line_height: this.line_height,
      buffer_lines: this.buffer_lines,
    };
  }

  /**
   * 상태 가져오기
   */
  getState() {
    return {
      scroll_top: this.scroll_top,
      visible_start: this.visible_start,
      visible_end: this.visible_end,
      visible_count: this.visible_end - this.visible_start,
    };
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      ...this.getConfig(),
      ...this.getState(),
      total_height: this.getTotalHeight(),
    };
  }

  /**
   * 재계산 (설정 변경 후)
   */
  recalculate() {
    this.#calculateVisibleRange();
  }
}
