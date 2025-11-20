/**
 * 파일: src/tests/unit/views/SearchPanel.test.js
 * 기능: SearchPanel 단위 테스트
 */

import SearchPanel from '../../../views/components/SearchPanel.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('SearchPanel', () => {
  let panel;

  runner.beforeEach(() => {
    if (!window.document.getElementById('test-search')) {
      const container = window.document.createElement('div');
      container.id = 'test-search';
      window.document.body.appendChild(container);
    }

    panel = new SearchPanel('test-search');
  });

  runner.it('should mount', () => {
    panel.mount();
    expect(panel.is_mounted).toBe(true);
  });

  runner.it('should show/hide', () => {
    panel.mount();
    panel.show();
    expect(panel.isVisible()).toBe(true);
    panel.hide();
    expect(panel.isVisible()).toBe(false);
  });

  runner.it('should set mode', () => {
    panel.mount();
    panel.setMode('replace');
    expect(panel.getMode()).toBe('replace');
  });

  runner.it('should get/set options', () => {
    panel.mount();
    panel.setOptions({ caseSensitive: true });
    expect(panel.getOptions().caseSensitive).toBe(true);
  });

  runner.it('should update results', () => {
    panel.mount();
    panel.updateResults([{}, {}], 0);
    expect(panel.results_info.textContent).toContain('1 of 2');
  });
});

runner.run();
