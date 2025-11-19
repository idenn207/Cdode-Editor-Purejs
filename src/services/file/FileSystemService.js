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
    this.cache_service.initialize();
    this.is_initialized = true;
  }

  /**
   * 디렉토리 선택 다이얼로그 열기
   */
  async selectDirectory() {
    try {
      this.root_handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      const root_tree = await this.#buildFileTree(this.root_handle);
      return root_tree;
    } catch (error) {
      if (error.name === 'AbortError') {
        // 사용자가 취소한 경우
        return null;
      }
      this.handleError(error, 'selectDirectory');
      throw error;
    }
  }

  /**
   * 파일 트리 구축 (재귀) (private)
   */
  async #buildFileTree(_dirHandle, _parent = null) {
    this.validateRequired(_dirHandle, 'dirHandle');

    const node = new FileNode(_dirHandle.name, _parent ? `${_parent.path}/${_dirHandle.name}` : _dirHandle.name, FILE_NODE_TYPE_DIRECTORY, _parent);

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
            const file_path = `${node.path}/${entry.name}`;
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
   */
  #shouldSkipDirectory(_name) {
    const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', '.vscode', '__pycache__', 'coverage'];
    return SKIP_DIRS.includes(_name);
  }

  /**
   * 지원되는 파일 확장자 확인 (private)
   */
  #isSupportedFile(_filename) {
    const SUPPORTED_EXTENSIONS = ['.js', '.html', '.css', '.md', '.json', '.txt'];
    return SUPPORTED_EXTENSIONS.some((_ext) => _filename.endsWith(_ext));
  }

  /**
   * 파일 읽기 (캐싱 적용)
   */
  async readFile(_fileNode) {
    this.validateRequired(_fileNode, 'fileNode');
    this.validateRequired(_fileNode.handle, 'fileNode.handle');

    try {
      // 캐시 확인
      const cached = this.cache_service.get(_fileNode.path);
      if (cached !== null) {
        return cached;
      }

      // 파일 읽기
      const file = await _fileNode.handle.getFile();
      const content = await file.text();

      // 캐시에 저장
      this.cache_service.set(_fileNode.path, content);

      return content;
    } catch (error) {
      this.handleError(error, 'readFile', {
        fileName: _fileNode.name,
        path: _fileNode.path,
      });
      throw error;
    }
  }

  /**
   * 파일 쓰기 (캐시 업데이트)
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
      this.cache_service.set(_fileNode.path, _content);
    } catch (error) {
      this.handleError(error, 'writeFile', {
        fileName: _fileNode.name,
        path: _fileNode.path,
      });
      throw error;
    }
  }

  /**
   * 캐시 무효화
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
   */
  getCacheStatistics() {
    return this.cache_service.getStatistics();
  }

  /**
   * 루트 핸들 가져오기
   */
  getRootHandle() {
    return this.root_handle;
  }

  /**
   * 루트 핸들 존재 여부
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
    this.is_initialized = false;
    super.destroy();
  }
}
