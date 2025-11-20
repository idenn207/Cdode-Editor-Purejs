/**
 * 파일: src/tests/unit/controllers/FileController.test.js
 * 기능: FileController 단위 테스트
 */

import FileController from '../../../controllers/FileController.js';
import FileNode from '../../../models/FileNode.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('FileController', () => {
  let controller;
  let mockFileSystem;
  let testFileNode;
  let testDirNode;

  runner.beforeEach(() => {
    // Mock FileSystemService
    mockFileSystem = {
      selectDirectory: runner.mock(async () => {}),
      readFile: runner.mock(async () => 'file content'),
      writeFile: runner.mock(async () => {}),
      createFile: runner.mock(async (_parent, _name, _content) => {
        return new FileNode(_name, false, _parent);
      }),
      deleteFile: runner.mock(async () => {}),
      renameFile: runner.mock(async () => {}),
      hasRootHandle: runner.mock(() => true),
      on: runner.mock(() => {}),
      root_node: new FileNode('root', true, null),
    };

    controller = new FileController(mockFileSystem);
    controller.initialize();

    // Test data
    testDirNode = new FileNode('testDir', true, null);
    testFileNode = new FileNode('test.js', false, testDirNode);
  });

  runner.afterEach(() => {
    controller.destroy();
  });

  // === 생성 및 초기화 ===

  runner.it('should create with file system service', () => {
    expect(controller).toBeDefined();
    expect(controller.getService('fileSystem')).toBe(mockFileSystem);
  });

  runner.it('should throw error if file system is null', () => {
    expect(() => new FileController(null)).toThrow();
  });

  runner.it('should initialize successfully', () => {
    expect(controller.is_initialized).toBe(true);
  });

  // === 디렉토리 선택 ===

  runner.it('should select directory', async () => {
    await controller.selectDirectory();
    expect(mockFileSystem.selectDirectory).toHaveBeenCalled();
  });

  runner.it('should handle directory selection error', async () => {
    mockFileSystem.selectDirectory = runner.mock(async () => {
      throw new Error('Access denied');
    });

    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.selectDirectory();

    expect(errorEmitted).toBeDefined();
    expect(errorEmitted.message).toContain('디렉토리 선택 실패');
  });

  // === 파일 열기 ===

  runner.it('should open file', async () => {
    let opened = null;
    controller.on('file-opened', (_data) => {
      opened = _data;
    });

    await controller.openFile(testFileNode);

    expect(mockFileSystem.readFile).toHaveBeenCalledWith(testFileNode);
    expect(opened).toBeDefined();
    expect(opened.node).toBe(testFileNode);
    expect(opened.content).toBe('file content');
  });

  runner.it('should throw error if file node is null', async () => {
    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.openFile(null);

    expect(errorEmitted).toBeDefined();
  });

  runner.it('should not open directory', async () => {
    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.openFile(testDirNode);

    expect(errorEmitted).toBeDefined();
    expect(errorEmitted.message).toContain('디렉토리는 열 수 없습니다');
  });

  runner.it('should handle read error', async () => {
    mockFileSystem.readFile = runner.mock(async () => {
      throw new Error('Read failed');
    });

    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.openFile(testFileNode);

    expect(errorEmitted).toBeDefined();
    expect(errorEmitted.message).toContain('파일 열기 실패');
  });

  // === 파일 저장 ===

  runner.it('should save file', async () => {
    let saved = null;
    controller.on('file-saved', (_node) => {
      saved = _node;
    });

    await controller.saveFile(testFileNode, 'new content');

    expect(mockFileSystem.writeFile).toHaveBeenCalledWith(testFileNode, 'new content');
    expect(saved).toBe(testFileNode);
  });

  runner.it('should throw error if parameters are invalid', async () => {
    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.saveFile(null, 'content');
    expect(errorEmitted).toBeDefined();
  });

  runner.it('should handle write error', async () => {
    mockFileSystem.writeFile = runner.mock(async () => {
      throw new Error('Write failed');
    });

    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.saveFile(testFileNode, 'content');

    expect(errorEmitted).toBeDefined();
    expect(errorEmitted.message).toContain('파일 저장 실패');
  });

  // === 파일 생성 ===

  runner.it('should create file', async () => {
    let created = null;
    controller.on('file-created', (_node) => {
      created = _node;
    });

    const newNode = await controller.createFile(testDirNode, 'new.js', 'content');

    expect(mockFileSystem.createFile).toHaveBeenCalledWith(testDirNode, 'new.js', 'content');
    expect(created).toBeDefined();
    expect(newNode).toBeDefined();
    expect(newNode.name).toBe('new.js');
  });

  runner.it('should throw error if parent is not directory', async () => {
    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.createFile(testFileNode, 'new.js', 'content');

    expect(errorEmitted).toBeDefined();
    expect(errorEmitted.message).toContain('부모 노드가 디렉토리가 아닙니다');
  });

  runner.it('should handle create error', async () => {
    mockFileSystem.createFile = runner.mock(async () => {
      throw new Error('Create failed');
    });

    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    const result = await controller.createFile(testDirNode, 'new.js', 'content');

    expect(errorEmitted).toBeDefined();
    expect(result).toBeNull();
  });

  // === 파일 삭제 ===

  runner.it('should delete file with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = global.window.confirm;
    global.window.confirm = runner.mock(() => true);

    let deleted = null;
    controller.on('file-deleted', (_node) => {
      deleted = _node;
    });

    await controller.deleteFile(testFileNode);

    expect(mockFileSystem.deleteFile).toHaveBeenCalledWith(testFileNode);
    expect(deleted).toBe(testFileNode);

    // Restore
    global.window.confirm = originalConfirm;
  });

  runner.it('should not delete if user cancels', async () => {
    const originalConfirm = global.window.confirm;
    global.window.confirm = runner.mock(() => false);

    await controller.deleteFile(testFileNode);

    expect(mockFileSystem.deleteFile).not.toHaveBeenCalled();

    global.window.confirm = originalConfirm;
  });

  // === 파일 이름 변경 ===

  runner.it('should rename file', async () => {
    let renamed = null;
    controller.on('file-renamed', (_data) => {
      renamed = _data;
    });

    await controller.renameFile(testFileNode, 'renamed.js');

    expect(mockFileSystem.renameFile).toHaveBeenCalledWith(testFileNode, 'renamed.js');
    expect(renamed).toBeDefined();
    expect(renamed.newName).toBe('renamed.js');
  });

  runner.it('should not rename if name is same', async () => {
    await controller.renameFile(testFileNode, 'test.js');
    expect(mockFileSystem.renameFile).not.toHaveBeenCalled();
  });

  // === Getters ===

  runner.it('should return root node', () => {
    expect(controller.getRootNode()).toBe(mockFileSystem.root_node);
  });

  runner.it('should return file system availability', () => {
    expect(controller.hasFileSystem()).toBe(true);
  });
});

export default runner;
