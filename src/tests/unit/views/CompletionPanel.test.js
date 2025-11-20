/**
 * 파일: src/tests/unit/views/CompletionPanel.test.js
 * 기능: CompletionPanel 단위 테스트
 */

import CompletionPanel from '../../../views/components/CompletionPanel.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('CompletionPanel', () => {
  let panel;
  let items;

  runner.beforeEach(() => {
    if (!window.document.getElementById('test-completion')) {
      const container = window.document.createElement('div');
      container.id = 'test-completion';
      window.document.body.appendChild(container);
    }

    panel = new CompletionPanel('test-completion');
    items = [
      { label: 'console', kind: 'variable', detail: 'Console object' },
      { label: 'const', kind: 'keyword', detail: 'Constant declaration' },
      { label: 'constructor', kind: 'method', detail: 'Constructor method' },
    ];
  });

  // 생명주기
  runner.it('should mount', () => {
    panel.mount();
    expect(panel.is_mounted).toBe(true);
  });

  // 표시/숨김
  runner.it('should show items', () => {
    panel.mount();
    panel.show(items, { x: 100, y: 200 });
    expect(panel.isVisible()).toBe(true);
    expect(panel.getItemCount()).toBe(3);
  });

  runner.it('should hide', () => {
    panel.mount();
    panel.show(items, { x: 0, y: 0 });
    panel.hide();
    expect(panel.isVisible()).toBe(false);
  });

  // 네비게이션
  runner.it('should select next/previous', () => {
    panel.mount();
    panel.show(items, { x: 0, y: 0 });
    panel.selectNext();
    expect(panel.getSelectedIndex()).toBe(1);
    panel.selectPrevious();
    expect(panel.getSelectedIndex()).toBe(0);
  });

  // 검증
  runner.it('should validate items', () => {
    panel.mount();
    expect(() => panel.show(null, { x: 0, y: 0 })).toThrow();
  });
});

runner.run();
