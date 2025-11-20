/**
 * 파일: src/tests/unit/views/VirtualScroller.test.js
 * 기능: VirtualScroller 단위 테스트
 */

import VirtualScroller from '../../../views/renderers/VirtualScroller.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('VirtualScroller', () => {
  let scroller;
  let config;

  runner.beforeEach(() => {
    config = {
      total_lines: 1000,
      container_height: 500,
      line_height: 20,
      buffer_lines: 5,
    };

    scroller = new VirtualScroller(config);
  });

  // 초기화
  runner.it('should initialize with config', () => {
    expect(scroller.total_lines).toBe(1000);
    expect(scroller.container_height).toBe(500);
    expect(scroller.line_height).toBe(20);
    expect(scroller.buffer_lines).toBe(5);
  });

  // 가시 범위
  runner.it('should calculate visible range', () => {
    const range = scroller.getVisibleRange();
    expect(range.start).toBe(0);
    expect(range.end).toBeGreaterThan(range.start);
  });

  // 스크롤 업데이트
  runner.it('should update scroll position', () => {
    scroller.updateScrollTop(200);
    const range = scroller.getVisibleRange();
    expect(range.start).toBeGreaterThan(0);
  });

  // 전체 높이
  runner.it('should calculate total height', () => {
    const height = scroller.getTotalHeight();
    expect(height).toBe(20000); // 1000 * 20
  });

  // 줄 가시성
  runner.it('should check line visibility', () => {
    expect(scroller.isLineVisible(0)).toBe(true);
    expect(scroller.isLineVisible(999)).toBe(false);
  });

  // 줄로 스크롤
  runner.it('should scroll to line', () => {
    const scrollTop = scroller.scrollToLine(50);
    expect(scrollTop).toBeGreaterThan(0);
  });

  // 동적 업데이트
  runner.it('should update total lines', () => {
    scroller.updateTotalLines(2000);
    expect(scroller.total_lines).toBe(2000);
  });

  runner.it('should update container height', () => {
    scroller.updateContainerHeight(600);
    expect(scroller.container_height).toBe(600);
  });

  // 검증
  runner.it('should validate config', () => {
    expect(() => new VirtualScroller({})).toThrow();
    expect(() => new VirtualScroller({ total_lines: -1, container_height: 500, line_height: 20 })).toThrow();
  });

  runner.it('should validate scroll position', () => {
    expect(() => scroller.updateScrollTop(-1)).toThrow();
  });

  // 디버그 정보
  runner.it('should provide debug info', () => {
    const info = scroller.getDebugInfo();
    expect(info.total_lines).toBe(1000);
    expect(info.scroll_top).toBe(0);
    expect(info.visible_start).toBeDefined();
  });
});

runner.run();
