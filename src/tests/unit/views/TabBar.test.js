/**
 * 파일: src/tests/unit/views/TabBar.test.js
 * 기능: TabBar 단위 테스트
 */

import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';
import TabBar from '../../../views/components/TabBar.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('TabBar', () => {
  let tabBar;
  let doc1, doc2, doc3;
  let file1, file2, file3;

  runner.beforeEach(() => {
    // DOM 환경 준비
    if (!window.document.getElementById('test-tabbar')) {
      const container = window.document.createElement('div');
      container.id = 'test-tabbar';
      window.document.body.appendChild(container);
    }

    tabBar = new TabBar('test-tabbar');

    // 테스트용 문서 생성
    file1 = new FileNode('test1.js', '/test1.js', null, false);
    file2 = new FileNode('test2.js', '/test2.js', null, false);
    file3 = new FileNode('test3.js', '/test3.js', null, false);

    doc1 = new Document(file1, 'content1');
    doc2 = new Document(file2, 'content2');
    doc3 = new Document(file3, 'content3');
  });

  // 생명주기
  runner.it('should initialize and mount', () => {
    tabBar.mount();
    expect(tabBar.is_mounted).toBe(true);
    expect(tabBar.is_initialized).toBe(true);
  });

  runner.it('should have empty state after mount', () => {
    tabBar.mount();
    tabBar.render();

    const empty = tabBar.container.querySelector('.tab-bar-empty');
    expect(empty).not.toBe(null);
  });

  // 탭 추가
  runner.it('should add tab', () => {
    tabBar.mount();
    tabBar.addTab(doc1);

    expect(tabBar.getTabCount()).toBe(1);
    expect(tabBar.hasTab(doc1)).toBe(true);
  });

  runner.it('should not add duplicate tabs', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc1);

    expect(tabBar.getTabCount()).toBe(1);
  });

  runner.it('should emit tab-added event', (done) => {
    tabBar.mount();

    tabBar.on('tab-added', (_data) => {
      expect(_data.document).toBe(doc1);
      expect(_data.path).toBe('/test1.js');
      done();
    });

    tabBar.addTab(doc1);
  });

  runner.it('should render tab after adding', () => {
    tabBar.mount();
    tabBar.addTab(doc1);

    const tabs = tabBar.container.querySelectorAll('.tab');
    expect(tabs.length).toBe(1);
    expect(tabs[0].textContent).toContain('test1.js');
  });

  // 탭 제거
  runner.it('should remove tab', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.removeTab(doc1);

    expect(tabBar.getTabCount()).toBe(0);
    expect(tabBar.hasTab(doc1)).toBe(false);
  });

  runner.it('should emit tab-removed event', (done) => {
    tabBar.mount();
    tabBar.addTab(doc1);

    tabBar.on('tab-removed', (_data) => {
      expect(_data.path).toBe('/test1.js');
      done();
    });

    tabBar.removeTab(doc1);
  });

  runner.it('should emit no-tabs when all tabs removed', (done) => {
    tabBar.mount();
    tabBar.addTab(doc1);

    tabBar.on('no-tabs', () => {
      done();
    });

    tabBar.removeTab(doc1);
  });

  runner.it('should activate next tab when active tab removed', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    tabBar.setActiveTab(doc2);
    tabBar.removeTab(doc2);

    const activeTab = tabBar.getActiveTab();
    expect(activeTab).not.toBe(null);
    expect(activeTab).toBe(doc3);
  });

  // 활성 탭
  runner.it('should set active tab', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);

    tabBar.setActiveTab(doc2);

    expect(tabBar.getActiveTab()).toBe(doc2);
  });

  runner.it('should emit tab-activated event', (done) => {
    tabBar.mount();
    tabBar.addTab(doc1);

    tabBar.on('tab-activated', (_doc) => {
      expect(_doc).toBe(doc1);
      done();
    });

    tabBar.setActiveTab(doc1);
  });

  runner.it('should not emit event if already active', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.setActiveTab(doc1);

    let eventCount = 0;
    tabBar.on('tab-activated', () => {
      eventCount++;
    });

    tabBar.setActiveTab(doc1);

    expect(eventCount).toBe(0);
  });

  runner.it('should highlight active tab', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);

    tabBar.setActiveTab(doc2);

    const tabs = tabBar.container.querySelectorAll('.tab');
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].classList.contains('active')).toBe(true);
  });

  // 탭 갱신
  runner.it('should update tab on document change', () => {
    tabBar.mount();
    tabBar.addTab(doc1);

    doc1.insertText('new text', 0, 0);

    const tab = tabBar.container.querySelector('.tab');
    expect(tab.textContent).toContain('●'); // dirty indicator
  });

  runner.it('should update dirty indicator', () => {
    tabBar.mount();
    tabBar.addTab(doc1);

    // Make dirty
    doc1.insertText('x', 0, 0);
    let tab = tabBar.container.querySelector('.tab');
    expect(tab.textContent).toContain('●');

    // Clear dirty
    doc1.clearDirty();
    tabBar.updateTab(doc1);
    tab = tabBar.container.querySelector('.tab');
    expect(tab.textContent).not.toContain('●');
  });

  // 접근자
  runner.it('should return all tabs', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    const tabs = tabBar.getTabs();
    expect(tabs).toBeArrayOfLength(3);
    expect(tabs).toContain(doc1);
    expect(tabs).toContain(doc2);
    expect(tabs).toContain(doc3);
  });

  runner.it('should return active tab', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.setActiveTab(doc2);

    expect(tabBar.getActiveTab()).toBe(doc2);
  });

  runner.it('should return null when no active tab', () => {
    tabBar.mount();
    expect(tabBar.getActiveTab()).toBe(null);
  });

  runner.it('should return tab count', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);

    expect(tabBar.getTabCount()).toBe(2);
  });

  runner.it('should return dirty tabs', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    doc1.insertText('x', 0, 0);
    doc3.insertText('y', 0, 0);

    const dirtyTabs = tabBar.getDirtyTabs();
    expect(dirtyTabs).toBeArrayOfLength(2);
    expect(dirtyTabs).toContain(doc1);
    expect(dirtyTabs).toContain(doc3);
  });

  // 다중 탭 조작
  runner.it('should close all tabs', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    tabBar.closeAll();

    expect(tabBar.getTabCount()).toBe(0);
  });

  runner.it('should emit all-tabs-closed event', (done) => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);

    tabBar.on('all-tabs-closed', () => {
      done();
    });

    tabBar.closeAll();
  });

  runner.it('should close other tabs', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    tabBar.closeOthers(doc2);

    expect(tabBar.getTabCount()).toBe(1);
    expect(tabBar.hasTab(doc2)).toBe(true);
    expect(tabBar.hasTab(doc1)).toBe(false);
    expect(tabBar.hasTab(doc3)).toBe(false);
  });

  runner.it('should close tabs to right', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    tabBar.closeToRight(doc1);

    expect(tabBar.getTabCount()).toBe(1);
    expect(tabBar.hasTab(doc1)).toBe(true);
  });

  runner.it('should close saved tabs', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    doc1.insertText('x', 0, 0); // dirty
    doc3.insertText('y', 0, 0); // dirty

    tabBar.closeSaved();

    expect(tabBar.getTabCount()).toBe(2);
    expect(tabBar.hasTab(doc1)).toBe(true);
    expect(tabBar.hasTab(doc2)).toBe(false);
    expect(tabBar.hasTab(doc3)).toBe(true);
  });

  // 탭 순서
  runner.it('should maintain tab order', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    const tabs = tabBar.getTabs();
    expect(tabs[0]).toBe(doc1);
    expect(tabs[1]).toBe(doc2);
    expect(tabs[2]).toBe(doc3);
  });

  runner.it('should move tab', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);
    tabBar.addTab(doc3);

    tabBar.moveTab(0, 2); // doc1을 맨 뒤로

    const tabs = tabBar.getTabs();
    expect(tabs[0]).toBe(doc2);
    expect(tabs[1]).toBe(doc3);
    expect(tabs[2]).toBe(doc1);
  });

  runner.it('should emit tab-moved event', (done) => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);

    tabBar.on('tab-moved', (_data) => {
      expect(_data.from).toBe(0);
      expect(_data.to).toBe(1);
      done();
    });

    tabBar.moveTab(0, 1);
  });

  // 이벤트
  runner.it('should emit tab-close-requested on close button click', (done) => {
    tabBar.mount();
    tabBar.addTab(doc1);

    tabBar.on('tab-close-requested', (_doc) => {
      expect(_doc).toBe(doc1);
      done();
    });

    const closeBtn = tabBar.container.querySelector('.tab-close');
    closeBtn.click();
  });

  runner.it('should emit rendered event', (done) => {
    tabBar.mount();

    tabBar.on('rendered', (_data) => {
      expect(_data.tab_count).toBe(0);
      done();
    });

    tabBar.render();
  });

  // 검증
  runner.it('should validate document parameter', () => {
    tabBar.mount();

    expect(() => tabBar.addTab(null)).toThrow();
    expect(() => tabBar.addTab({})).toThrow();
    expect(() => tabBar.addTab('not a doc')).toThrow();
  });

  runner.it('should validate move parameters', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);

    expect(() => tabBar.moveTab(-1, 0)).toThrow();
    expect(() => tabBar.moveTab(0, 5)).toThrow();
    expect(() => tabBar.moveTab('0', 1)).toThrow();
  });

  // 디버그 정보
  runner.it('should provide debug info', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    doc1.insertText('x', 0, 0);

    const info = tabBar.getDebugInfo();
    expect(info.component).toBe('TabBar');
    expect(info.is_mounted).toBe(true);
    expect(info.tab_count).toBe(1);
    expect(info.dirty_count).toBe(1);
  });

  // 파괴
  runner.it('should destroy cleanly', () => {
    tabBar.mount();
    tabBar.addTab(doc1);
    tabBar.addTab(doc2);

    tabBar.destroy();

    expect(tabBar.is_destroyed).toBe(true);
    expect(tabBar.getTabCount()).toBe(0);
  });
});

runner.run();
