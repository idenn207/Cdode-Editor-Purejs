/**
 * 파일: src/tests/unit/views/Sidebar.test.js
 * 기능: Sidebar 단위 테스트
 */

import FileNode from '../../../models/FileNode.js';
import Sidebar from '../../../views/components/Sidebar.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('Sidebar', () => {
  let sidebar;
  let rootNode;

  runner.beforeEach(() => {
    // DOM 환경 준비
    if (!window.document.getElementById('test-sidebar')) {
      const container = window.document.createElement('div');
      container.id = 'test-sidebar';
      window.document.body.appendChild(container);
    }

    sidebar = new Sidebar('test-sidebar');

    // 테스트용 파일 트리 생성
    rootNode = new FileNode('root', null, null, true);

    const folder1 = new FileNode('src', null, rootNode, true);
    const file1 = new FileNode('index.js', null, folder1, false);
    const file2 = new FileNode('app.js', null, folder1, false);

    const folder2 = new FileNode('tests', null, rootNode, true);
    const file3 = new FileNode('test.js', null, folder2, false);

    folder1.addChild(file1);
    folder1.addChild(file2);
    folder2.addChild(file3);
    rootNode.addChild(folder1);
    rootNode.addChild(folder2);
  });

  // 생명주기
  runner.it('should initialize and mount', () => {
    sidebar.mount();
    expect(sidebar.is_mounted).toBe(true);
    expect(sidebar.is_initialized).toBe(true);
  });

  runner.it('should have DOM structure after mount', () => {
    sidebar.mount();

    const header = sidebar.container.querySelector('.sidebar-header');
    const tree = sidebar.container.querySelector('.file-tree');
    const button = sidebar.container.querySelector('#OpenFolderBtn');

    expect(header).not.toBe(null);
    expect(tree).not.toBe(null);
    expect(button).not.toBe(null);
  });

  // 빈 상태 렌더링
  runner.it('should render empty state when no root node', () => {
    sidebar.mount();
    sidebar.render();

    const emptyState = sidebar.container.querySelector('.empty-state');
    expect(emptyState).not.toBe(null);
    expect(emptyState.textContent).toContain('No folder opened');
  });

  // 파일 트리 렌더링
  runner.it('should render file tree with root node', () => {
    sidebar.mount();
    sidebar.render(rootNode);

    const nodes = sidebar.container.querySelectorAll('.file-tree-node');
    expect(nodes.length).toBeGreaterThan(0);
  });

  runner.it('should render collapsed directories by default', () => {
    sidebar.mount();
    rootNode.expanded = false;
    sidebar.render(rootNode);

    const nodes = sidebar.container.querySelectorAll('.file-tree-node');
    // 루트만 표시 (자식은 축소됨)
    expect(nodes.length).toBe(1);
  });

  runner.it('should render expanded directories with children', () => {
    sidebar.mount();
    rootNode.expanded = true;
    sidebar.render(rootNode);

    const nodes = sidebar.container.querySelectorAll('.file-tree-node');
    // 루트 + 2개 폴더
    expect(nodes.length).toBeGreaterThanOrEqual(3);
  });

  runner.it('should render file icons', () => {
    sidebar.mount();
    rootNode.expanded = true;
    rootNode.getChildren()[0].expanded = true; // src 폴더 확장
    sidebar.render(rootNode);

    const icons = sidebar.container.querySelectorAll('.node-icon');
    expect(icons.length).toBeGreaterThan(0);
  });

  // 선택 기능
  runner.it('should select file on click', (done) => {
    sidebar.mount();
    rootNode.expanded = true;
    rootNode.getChildren()[0].expanded = true;
    sidebar.render(rootNode);

    sidebar.on('file-selected', (_node) => {
      expect(_node.getName()).toBe('index.js');
      expect(sidebar.getSelectedNode()).toBe(_node);
      done();
    });

    // index.js 클릭 시뮬레이션
    const fileNode = sidebar.container.querySelector('[data-path*="index.js"]');
    fileNode.click();
  });

  runner.it('should highlight selected file', () => {
    sidebar.mount();
    rootNode.expanded = true;
    rootNode.getChildren()[0].expanded = true;
    sidebar.render(rootNode);

    const fileNode = sidebar.container.querySelector('[data-path*="index.js"]');
    fileNode.click();

    expect(fileNode.classList.contains('selected')).toBe(true);
  });

  runner.it('should clear previous selection', () => {
    sidebar.mount();
    rootNode.expanded = true;
    rootNode.getChildren()[0].expanded = true;
    sidebar.render(rootNode);

    const file1 = sidebar.container.querySelector('[data-path*="index.js"]');
    const file2 = sidebar.container.querySelector('[data-path*="app.js"]');

    file1.click();
    expect(file1.classList.contains('selected')).toBe(true);

    file2.click();
    expect(file1.classList.contains('selected')).toBe(false);
    expect(file2.classList.contains('selected')).toBe(true);
  });

  runner.it('should clear selection programmatically', () => {
    sidebar.mount();
    rootNode.expanded = true;
    rootNode.getChildren()[0].expanded = true;
    sidebar.render(rootNode);

    const fileNode = sidebar.container.querySelector('[data-path*="index.js"]');
    fileNode.click();

    sidebar.clearSelection();
    expect(sidebar.getSelectedNode()).toBe(null);
    expect(fileNode.classList.contains('selected')).toBe(false);
  });

  // 디렉토리 확장/축소
  runner.it('should toggle directory on chevron click', (done) => {
    sidebar.mount();
    rootNode.expanded = true;
    sidebar.render(rootNode);

    sidebar.on('directory-toggled', (_data) => {
      expect(_data.node.getName()).toBe('src');
      done();
    });

    const chevron = sidebar.container.querySelector('.chevron');
    chevron.click();
  });

  runner.it('should expand directory programmatically', () => {
    sidebar.mount();
    rootNode.expanded = true;
    sidebar.render(rootNode);

    const srcNode = rootNode.getChildren()[0];
    const path = srcNode.getFullPath();

    srcNode.expanded = false;
    sidebar.render();

    const result = sidebar.expandDirectory(path);
    expect(result).toBe(true);
    expect(srcNode.expanded).toBe(true);
  });

  runner.it('should collapse directory programmatically', () => {
    sidebar.mount();
    rootNode.expanded = true;
    sidebar.render(rootNode);

    const srcNode = rootNode.getChildren()[0];
    const path = srcNode.getFullPath();

    srcNode.expanded = true;
    sidebar.render();

    const result = sidebar.collapseDirectory(path);
    expect(result).toBe(true);
    expect(srcNode.expanded).toBe(false);
  });

  runner.it('should expand all directories', () => {
    sidebar.mount();
    sidebar.render(rootNode);

    sidebar.expandAll();

    const traverse = (_node) => {
      if (_node.isDirectory()) {
        expect(_node.expanded).toBe(true);
        _node.getChildren().forEach(traverse);
      }
    };

    traverse(rootNode);
  });

  runner.it('should collapse all directories', () => {
    sidebar.mount();
    rootNode.expanded = true;
    rootNode.getChildren().forEach((_child) => {
      if (_child.isDirectory()) _child.expanded = true;
    });
    sidebar.render(rootNode);

    sidebar.collapseAll();

    const traverse = (_node) => {
      if (_node.isDirectory()) {
        expect(_node.expanded).toBe(false);
        _node.getChildren().forEach(traverse);
      }
    };

    traverse(rootNode);
  });

  // 이벤트
  runner.it('should emit request-open-folder on button click', (done) => {
    sidebar.mount();

    sidebar.on('request-open-folder', () => {
      done();
    });

    sidebar.open_folder_btn.click();
  });

  runner.it('should emit rendered event', (done) => {
    sidebar.mount();

    sidebar.on('rendered', (_data) => {
      expect(_data.root_node).toBe(rootNode);
      done();
    });

    sidebar.render(rootNode);
  });

  // 접근자
  runner.it('should return selected node', () => {
    sidebar.mount();
    rootNode.expanded = true;
    rootNode.getChildren()[0].expanded = true;
    sidebar.render(rootNode);

    const fileNode = sidebar.container.querySelector('[data-path*="index.js"]');
    fileNode.click();

    const selected = sidebar.getSelectedNode();
    expect(selected).not.toBe(null);
    expect(selected.getName()).toBe('index.js');
  });

  runner.it('should return root node', () => {
    sidebar.mount();
    sidebar.render(rootNode);

    const root = sidebar.getRootNode();
    expect(root).toBe(rootNode);
  });

  // 검증
  runner.it('should validate root node type', () => {
    sidebar.mount();

    expect(() => sidebar.render({})).toThrow();
    expect(() => sidebar.render('not a node')).toThrow();
  });

  runner.it('should validate root node is directory', () => {
    sidebar.mount();

    const fileNode = new FileNode('file.js', null, null, false);
    expect(() => sidebar.render(fileNode)).toThrow();
  });

  // 디버그 정보
  runner.it('should provide debug info', () => {
    sidebar.mount();
    sidebar.render(rootNode);

    const info = sidebar.getDebugInfo();
    expect(info.component).toBe('Sidebar');
    expect(info.is_mounted).toBe(true);
    expect(info.has_root).toBe(true);
  });

  // 파괴
  runner.it('should destroy cleanly', () => {
    sidebar.mount();
    sidebar.render(rootNode);

    sidebar.destroy();

    expect(sidebar.is_destroyed).toBe(true);
    expect(sidebar.root_node).toBe(null);
    expect(sidebar.selected_node).toBe(null);
  });
});

runner.run();
