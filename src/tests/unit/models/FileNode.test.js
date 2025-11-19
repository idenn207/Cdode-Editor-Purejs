/**
 * 파일: src/tests/unit/models/FileNode.test.js
 * 기능: FileNode 모델 단위 테스트
 * 책임: FileNode의 모든 기능 검증
 */

import FileNode, { FILE_NODE_TYPE_DIRECTORY, FILE_NODE_TYPE_FILE } from '../../../models/FileNode.js';
import { TestRunner, createMock, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('FileNode Model', () => {
  let file_node;
  let dir_node;

  runner.beforeEach(() => {
    file_node = new FileNode('test.js', '/test.js', FILE_NODE_TYPE_FILE);
    dir_node = new FileNode('src', '/src', FILE_NODE_TYPE_DIRECTORY);
  });

  runner.it('should create a file node', () => {
    expect(file_node.isFile()).toBe(true);
    expect(file_node.isDirectory()).toBe(false);
    expect(file_node.getName()).toBe('test.js');
    expect(file_node.getPath()).toBe('/test.js');
  });

  runner.it('should create a directory node', () => {
    expect(dir_node.isDirectory()).toBe(true);
    expect(dir_node.isFile()).toBe(false);
  });

  runner.it('should get file extension', () => {
    expect(file_node.getExtension()).toBe('.js');
    expect(dir_node.getExtension()).toBeNull();
  });

  runner.it('should add child to directory', () => {
    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);

    dir_node.addChild(child);

    expect(dir_node.getChildCount()).toBe(1);
    expect(child.getParent()).toBe(dir_node);
  });

  runner.it('should not add child to file', () => {
    const child = new FileNode('child.js', '/child.js', FILE_NODE_TYPE_FILE);

    expect(() => {
      file_node.addChild(child);
    }).toThrow();
  });

  runner.it('should remove child', () => {
    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);

    dir_node.removeChild(child);

    expect(dir_node.getChildCount()).toBe(0);
    expect(child.getParent()).toBeNull();
  });

  runner.it('should find child by name', () => {
    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);

    const found = dir_node.findChild('child.js');

    expect(found).toBe(child);
  });

  runner.it('should sort children', () => {
    const file1 = new FileNode('b.js', '/src/b.js', FILE_NODE_TYPE_FILE);
    const file2 = new FileNode('a.js', '/src/a.js', FILE_NODE_TYPE_FILE);
    const subdir = new FileNode('lib', '/src/lib', FILE_NODE_TYPE_DIRECTORY);

    dir_node.addChild(file1);
    dir_node.addChild(file2);
    dir_node.addChild(subdir);

    dir_node.sortChildren();

    const children = dir_node.getChildren();
    expect(children[0]).toBe(subdir); // 디렉토리 먼저
    expect(children[1]).toBe(file2); // a.js
    expect(children[2]).toBe(file1); // b.js
  });

  runner.it('should manage expanded state', () => {
    expect(dir_node.isExpanded()).toBe(false);

    dir_node.setExpanded(true);
    expect(dir_node.isExpanded()).toBe(true);

    dir_node.toggleExpanded();
    expect(dir_node.isExpanded()).toBe(false);
  });

  runner.it('should calculate depth', () => {
    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);

    expect(dir_node.getDepth()).toBe(0);
    expect(child.getDepth()).toBe(1);
  });

  runner.it('should get full path', () => {
    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);

    expect(child.getFullPath()).toBe('/src/child.js');
  });

  runner.it('should check if root', () => {
    expect(dir_node.isRoot()).toBe(true);

    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);

    expect(child.isRoot()).toBe(false);
  });

  runner.it('should traverse tree', () => {
    const child1 = new FileNode('child1.js', '/src/child1.js', FILE_NODE_TYPE_FILE);
    const child2 = new FileNode('child2.js', '/src/child2.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child1);
    dir_node.addChild(child2);

    const visited = [];
    dir_node.traverse((_node) => {
      visited.push(_node.getName());
    });

    expect(visited).toContain('src');
    expect(visited).toContain('child1.js');
    expect(visited).toContain('child2.js');
  });

  runner.it('should filter nodes', () => {
    const jsFile = new FileNode('test.js', '/src/test.js', FILE_NODE_TYPE_FILE);
    const htmlFile = new FileNode('index.html', '/src/index.html', FILE_NODE_TYPE_FILE);
    dir_node.addChild(jsFile);
    dir_node.addChild(htmlFile);

    const jsFiles = dir_node.filter((_node) => _node.getExtension() === '.js');

    expect(jsFiles).toHaveLength(1);
    expect(jsFiles[0]).toBe(jsFile);
  });

  runner.it('should find by path', () => {
    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);

    const found = dir_node.findByPath('/src/child.js');

    expect(found).toBe(child);
  });

  runner.it('should manage metadata', () => {
    file_node.setMetadata('size', 1024);
    file_node.setMetadata('modified', '2025-01-01');

    expect(file_node.getMetadata('size')).toBe(1024);
    expect(file_node.getMetadata('modified')).toBe('2025-01-01');
  });

  runner.it('should serialize to JSON', () => {
    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);
    dir_node.setExpanded(true);

    const json = dir_node.toJSON();

    expect(json.name).toBe('src');
    expect(json.type).toBe(FILE_NODE_TYPE_DIRECTORY);
    expect(json.expanded).toBe(true);
    expect(json.children).toHaveLength(1);
  });

  runner.it('should validate correctly', () => {
    expect(file_node.validate()).toBe(true);
    expect(dir_node.validate()).toBe(true);
  });

  runner.it('should clone node', () => {
    file_node.setMetadata('size', 1024);
    const cloned = file_node.clone();

    expect(cloned.getName()).toBe(file_node.getName());
    expect(cloned.getMetadata('size')).toBe(1024);
    expect(cloned).not.toBe(file_node);
  });

  runner.it('should get tree statistics', () => {
    const child1 = new FileNode('child1.js', '/src/child1.js', FILE_NODE_TYPE_FILE);
    const subdir = new FileNode('lib', '/src/lib', FILE_NODE_TYPE_DIRECTORY);
    const child2 = new FileNode('child2.js', '/src/lib/child2.js', FILE_NODE_TYPE_FILE);

    dir_node.addChild(child1);
    dir_node.addChild(subdir);
    subdir.addChild(child2);

    const stats = dir_node.getTreeStatistics();

    expect(stats.file_count).toBe(2);
    expect(stats.directory_count).toBe(2);
    expect(stats.total_nodes).toBe(4);
    expect(stats.max_depth).toBe(2);
  });

  runner.it('should emit events on changes', () => {
    const mock = createMock();
    dir_node.on('child-added', mock);

    const child = new FileNode('child.js', '/src/child.js', FILE_NODE_TYPE_FILE);
    dir_node.addChild(child);

    expect(mock.callCount()).toBe(1);
  });
});

runner.run();
