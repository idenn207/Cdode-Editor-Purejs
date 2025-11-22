/**
 * 파일: src/services/file/FileSystemService.js
 * 기능: 파일 시스템 접근
 * 책임: 로컬 파일 읽기/쓰기 (File System Access API 사용)
 */

import BaseService from '../../core/BaseService.js';
import FileNode, { FILE_NODE_TYPE_DIRECTORY, FILE_NODE_TYPE_FILE } from '../../models/FileNode.js';
import FileCacheService from './FileCacheService.js';

export default class FileSystemService extends BaseService {
  constructor() {
    super();
    this.root_handle = null;
    this.cache_service = new FileCacheService();
  }

  /**
   * 초기화
   */
  initialize() {
    super.initialize();
    this.cache_service.initialize();
  }

  /**
   * 디렉토리 선택 다이얼로그 열기
   * @returns {Promise<FileNode|null>}
   */
  async selectDirectory() {
    try {
      console.log('[FileSystemService] showDirectoryPicker 호출 시도');

      // File System Access API 지원 확인
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API가 지원되지 않는 브라우저입니다. Chrome/Edge를 사용해주세요.');
      }

      this.root_handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      console.log('[FileSystemService] 폴더 선택됨:', this.root_handle.name);

      const root_tree = await this.#buildFileTree(this.root_handle);
      console.log('[FileSystemService] 파일 트리 생성 완료:', root_tree);

      return root_tree;
    } catch (error) {
      if (error.name === 'AbortError') {
        // 사용자가 취소한 경우
        console.log('[FileSystemService] 사용자가 폴더 선택 취소');
        return null;
      }
      console.error('[FileSystemService] 에러 발생:', error);
      this.handleError(error, 'selectDirectory');
      throw error;
    }
  }

  /**
   * 파일 트리 구축 (재귀) (private)
   * @param {FileSystemDirectoryHandle} _dirHandle
   * @param {FileNode} _parent
   * @returns {Promise<FileNode>}
   */
  async #buildFileTree(_dirHandle, _parent = null) {
    this.validateRequired(_dirHandle, 'dirHandle');

    const node = new FileNode(_dirHandle.name, _parent ? `${_parent.getPath()}/${_dirHandle.name}` : _dirHandle.name, FILE_NODE_TYPE_DIRECTORY, _parent);

    try {
      for await (const entry of _dirHandle.values()) {
        // 숨김 파일/폴더 건너뛰기
        if (entry.name.startsWith('.')) continue;

        if (entry.kind === 'directory') {
          if (this.#shouldSkipDirectory(entry.name)) continue;

          const child_node = await this.#buildFileTree(entry, node);
          node.addChild(child_node);
        } else if (entry.kind === 'file') {
          if (this.#isSupportedFile(entry.name)) {
            const file_path = `${node.getPath()}/${entry.name}`;
            const file_node = new FileNode(entry.name, file_path, FILE_NODE_TYPE_FILE, node);
            file_node.handle = entry;
            node.addChild(file_node);
          }
        }
      }

      node.sortChildren();
      return node;
    } catch (error) {
      this.handleError(error, 'buildFileTree', { dirName: _dirHandle.name });
      return node;
    }
  }

  /**
   * 건너뛸 디렉토리 확인 (private)
   * @param {string} _name
   * @returns {boolean}
   */
  #shouldSkipDirectory(_name) {
    const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', '.vscode', '__pycache__', 'coverage'];
    return SKIP_DIRS.includes(_name);
  }

  /**
   * 지원되는 파일 확장자 확인 (private)
   * @param {string} _filename
   * @returns {boolean}
   */
  #isSupportedFile(_filename) {
    const SUPPORTED_EXTENSIONS = ['.js', '.html', '.css', '.md', '.json', '.txt'];
    return SUPPORTED_EXTENSIONS.some((_ext) => _filename.endsWith(_ext));
  }

  /**
   * 파일 읽기 (캐싱 적용)
   * @param {FileNode} _fileNode
   * @returns {Promise<string>}
   */
  async readFile(_fileNode) {
    this.validateRequired(_fileNode, 'fileNode');
    this.validateRequired(_fileNode.handle, 'fileNode.handle');

    try {
      // 캐시 확인
      const cached = this.cache_service.get(_fileNode.getPath());
      if (cached !== null) {
        return cached;
      }

      // 파일 읽기
      const file = await _fileNode.handle.getFile();
      const content = await file.text();

      // 캐시에 저장
      this.cache_service.set(_fileNode.getPath(), content);

      return content;
    } catch (error) {
      this.handleError(error, 'readFile', {
        fileName: _fileNode.getName(),
        path: _fileNode.getPath(),
      });
      throw error;
    }
  }

  /**
   * 파일 쓰기 (캐시 업데이트)
   * @param {FileNode} _fileNode
   * @param {string} _content
   * @returns {Promise<void>}
   */
  async writeFile(_fileNode, _content) {
    this.validateRequired(_fileNode, 'fileNode');
    this.validateRequired(_fileNode.handle, 'fileNode.handle');
    this.validateString(_content, 'content');

    try {
      const writable = await _fileNode.handle.createWritable();
      await writable.write(_content);
      await writable.close();

      // 캐시 업데이트
      this.cache_service.set(_fileNode.getPath(), _content);
    } catch (error) {
      this.handleError(error, 'writeFile', {
        fileName: _fileNode.getName(),
        path: _fileNode.getPath(),
      });
      throw error;
    }
  }

  /**
   * 파일 생성
   * @param {FileNode} _parentNode
   * @param {string} _fileName
   * @param {string} _content
   * @returns {Promise<FileNode>}
   */
  async createFile(_parentNode, _fileName, _content = '') {
    this.validateRequired(_parentNode, 'parentNode');
    this.validateString(_fileName, 'fileName');
    this.validateString(_content, 'content');

    if (!_parentNode.isDirectory()) {
      throw new Error('Parent node must be a directory');
    }

    try {
      // 부모 디렉토리의 handle 가져오기
      const parent_handle = await this.#getDirectoryHandle(_parentNode);

      // 새 파일 생성
      const file_handle = await parent_handle.getFileHandle(_fileName, { create: true });

      // 내용 쓰기
      const writable = await file_handle.createWritable();
      await writable.write(_content);
      await writable.close();

      // FileNode 생성
      const file_path = `${_parentNode.getPath()}/${_fileName}`;
      const file_node = new FileNode(_fileName, file_path, FILE_NODE_TYPE_FILE, _parentNode);
      file_node.handle = file_handle;

      // 부모에 추가
      _parentNode.addChild(file_node);
      _parentNode.sortChildren();

      // 캐시에 저장
      this.cache_service.set(file_path, _content);

      return file_node;
    } catch (error) {
      this.handleError(error, 'createFile', {
        fileName: _fileName,
        parentPath: _parentNode.getPath(),
      });
      throw error;
    }
  }

  /**
   * 파일 삭제
   * @param {FileNode} _fileNode
   * @returns {Promise<void>}
   */
  async deleteFile(_fileNode) {
    this.validateRequired(_fileNode, 'fileNode');

    const parent = _fileNode.getParent();
    if (!parent) {
      throw new Error('Cannot delete root node');
    }

    try {
      const parent_handle = await this.#getDirectoryHandle(parent);
      await parent_handle.removeEntry(_fileNode.getName());

      // 부모에서 제거
      parent.removeChild(_fileNode);

      // 캐시에서 제거
      this.cache_service.invalidate(_fileNode.getPath());
    } catch (error) {
      this.handleError(error, 'deleteFile', {
        fileName: _fileNode.getName(),
        path: _fileNode.getPath(),
      });
      throw error;
    }
  }

  /**
   * 파일 이름 변경
   * @param {FileNode} _fileNode
   * @param {string} _newName
   * @returns {Promise<void>}
   */
  async renameFile(_fileNode, _newName) {
    this.validateRequired(_fileNode, 'fileNode');
    this.validateString(_newName, 'newName');

    // File System Access API는 직접 rename을 지원하지 않으므로
    // 파일을 읽고, 새 이름으로 생성하고, 기존 파일을 삭제
    try {
      const content = await this.readFile(_fileNode);
      const parent = _fileNode.getParent();

      await this.createFile(parent, _newName, content);
      await this.deleteFile(_fileNode);
    } catch (error) {
      this.handleError(error, 'renameFile', {
        oldName: _fileNode.getName(),
        newName: _newName,
      });
      throw error;
    }
  }

  /**
   * 디렉토리 핸들 가져오기 (private)
   * @param {FileNode} _dirNode
   * @returns {Promise<FileSystemDirectoryHandle>}
   */
  async #getDirectoryHandle(_dirNode) {
    if (!_dirNode.isDirectory()) {
      throw new Error('Node must be a directory');
    }

    // 루트부터 경로 추적
    const path_parts = [];
    let current = _dirNode;

    while (current && !current.isRoot()) {
      path_parts.unshift(current.getName());
      current = current.getParent();
    }

    // root_handle에서 시작하여 경로 탐색
    let handle = this.root_handle;
    for (const part of path_parts) {
      handle = await handle.getDirectoryHandle(part);
    }

    return handle;
  }

  /**
   * 캐시 무효화
   * @param {string} _path
   */
  invalidateCache(_path = null) {
    if (_path) {
      return this.cache_service.invalidate(_path);
    } else {
      this.cache_service.clear();
      return true;
    }
  }

  /**
   * 캐시 통계 조회
   * @returns {Object}
   */
  getCacheStatistics() {
    return this.cache_service.getStatistics();
  }

  /**
   * 루트 핸들 가져오기
   * @returns {FileSystemDirectoryHandle|null}
   */
  getRootHandle() {
    return this.root_handle;
  }

  /**
   * 루트 핸들 존재 여부
   * @returns {boolean}
   */
  hasRootHandle() {
    return this.root_handle !== null;
  }

  /**
   * 서비스 종료
   */
  destroy() {
    this.cache_service.destroy();
    this.root_handle = null;
    super.destroy();
  }
}
