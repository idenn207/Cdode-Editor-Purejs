/**
 * 파일: src/services/FileSystemService.js
 * 기능: 파일 시스템 접근
 * 책임: 로컬 파일 읽기/쓰기 (File System Access API 사용)
 */

import FileNode, { FILE_NODE_TYPE_DIRECTORY, FILE_NODE_TYPE_FILE } from '../models/FileNode.js';

export default class FileSystemService {
  constructor() {
    this.root_handle = null;
    this.file_cache = new Map();
  }

  async selectDirectory() {
    try {
      this.root_handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      return await this.#buildFileTree(this.root_handle);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('사용자가 디렉토리 선택을 취소했습니다.');
        return null;
      }
      throw error;
    }
  }

  async #buildFileTree(_dirHandle, _parent = null) {
    const node = new FileNode(_dirHandle.name, _dirHandle.name, FILE_NODE_TYPE_DIRECTORY, _parent);

    try {
      for await (const entry of _dirHandle.values()) {
        if (entry.name.startsWith('.')) continue;

        if (entry.kind === 'directory') {
          if (this.#shouldSkipDirectory(entry.name)) continue;

          const childNode = await this.#buildFileTree(entry, node);
          node.addChild(childNode);
        } else if (entry.kind === 'file') {
          if (this.#isSupportedFile(entry.name)) {
            const fileNode = new FileNode(entry.name, entry.name, FILE_NODE_TYPE_FILE, node);
            fileNode.handle = entry;
            node.addChild(fileNode);
          }
        }
      }

      node.sortChildren();
      return node;
    } catch (error) {
      console.error(`디렉토리 읽기 오류: ${_dirHandle.name}`, error);
      return node;
    }
  }

  #shouldSkipDirectory(_name) {
    const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', '.vscode'];
    return SKIP_DIRS.includes(_name);
  }

  #isSupportedFile(_filename) {
    const SUPPORTED_EXTENSIONS = ['.js', '.html', '.css', '.md'];
    return SUPPORTED_EXTENSIONS.some((_ext) => _filename.endsWith(_ext));
  }

  async readFile(_fileNode) {
    try {
      const cached = this.file_cache.get(_fileNode.path);
      if (cached) return cached;

      const file = await _fileNode.handle.getFile();
      const content = await file.text();

      this.file_cache.set(_fileNode.path, content);

      return content;
    } catch (error) {
      console.error(`파일 읽기 오류: ${_fileNode.name}`, error);
      throw error;
    }
  }

  async writeFile(_fileNode, _content) {
    try {
      const writable = await _fileNode.handle.createWritable();
      await writable.write(_content);
      await writable.close();

      this.file_cache.set(_fileNode.path, _content);
    } catch (error) {
      console.error(`파일 쓰기 오류: ${_fileNode.name}`, error);
      throw error;
    }
  }

  invalidateCache(_path) {
    if (_path) {
      this.file_cache.delete(_path);
    } else {
      this.file_cache.clear();
    }
  }
}
