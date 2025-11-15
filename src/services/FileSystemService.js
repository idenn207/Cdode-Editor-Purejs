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

  /**
   * 디렉토리 선택 및 권한 요청
   */
  async selectDirectory() {
    try {
      // File System Access API 사용
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

  /**
   * 파일 트리 구조 생성
   */
  async #buildFileTree(dirHandle, parent = null) {
    const node = new FileNode(dirHandle.name, dirHandle.name, FILE_NODE_TYPE_DIRECTORY, parent);

    try {
      for await (const entry of dirHandle.values()) {
        // 숨김 파일 제외
        if (entry.name.startsWith('.')) continue;

        if (entry.kind === 'directory') {
          // node_modules, dist 등 제외
          if (this.#shouldSkipDirectory(entry.name)) continue;

          const childNode = await this.#buildFileTree(entry, node);
          node.addChild(childNode);
        } else if (entry.kind === 'file') {
          // 지원하는 확장자만 포함
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
      console.error(`디렉토리 읽기 오류: ${dirHandle.name}`, error);
      return node;
    }
  }

  /**
   * 제외할 디렉토리 확인
   */
  #shouldSkipDirectory(name) {
    const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', '.vscode'];
    return SKIP_DIRS.includes(name);
  }

  /**
   * 지원 파일 확인
   */
  #isSupportedFile(filename) {
    const SUPPORTED_EXTENSIONS = ['.js', '.html', '.css', '.md'];
    return SUPPORTED_EXTENSIONS.some((ext) => filename.endsWith(ext));
  }

  /**
   * 파일 내용 읽기
   */
  async readFile(fileNode) {
    try {
      // 캐시 확인
      const cached = this.file_cache.get(fileNode.path);
      if (cached) return cached;

      // 파일 읽기
      const file = await fileNode.handle.getFile();
      const content = await file.text();

      // 캐시 저장
      this.file_cache.set(fileNode.path, content);

      return content;
    } catch (error) {
      console.error(`파일 읽기 오류: ${fileNode.name}`, error);
      throw error;
    }
  }

  /**
   * 파일 쓰기
   */
  async writeFile(fileNode, content) {
    try {
      const writable = await fileNode.handle.createWritable();
      await writable.write(content);
      await writable.close();

      // 캐시 갱신
      this.file_cache.set(fileNode.path, content);
    } catch (error) {
      console.error(`파일 쓰기 오류: ${fileNode.name}`, error);
      throw error;
    }
  }

  /**
   * 캐시 무효화
   */
  invalidateCache(path) {
    if (path) {
      this.file_cache.delete(path);
    } else {
      this.file_cache.clear();
    }
  }

  /**
   * 파일 핸들로 노드 검색
   */
  async findNodeByPath(rootNode, targetPath) {
    if (rootNode.getFullPath() === targetPath) {
      return rootNode;
    }

    for (const child of rootNode.children) {
      if (child.isDirectory()) {
        const found = await this.findNodeByPath(child, targetPath);
        if (found) return found;
      } else if (child.getFullPath() === targetPath) {
        return child;
      }
    }

    return null;
  }
}
