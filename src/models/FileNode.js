/**
 * 파일: src/models/FileNode.js
 * 기능: 파일/폴더 노드 모델
 * 책임: 파일 트리 구조 표현
 */

export const FILE_NODE_TYPE_FILE = 'file';
export const FILE_NODE_TYPE_DIRECTORY = 'directory';

export default class FileNode {
  constructor(name, path, type, parent = null) {
    this.name = name;
    this.path = path;
    this.type = type;
    this.parent = parent;
    this.children = [];
    this.expanded = false;
  }

  /**
   * 파일 여부 확인
   */
  isFile() {
    return this.type === FILE_NODE_TYPE_FILE;
  }

  /**
   * 디렉토리 여부 확인
   */
  isDirectory() {
    return this.type === FILE_NODE_TYPE_DIRECTORY;
  }

  /**
   * 자식 노드 추가
   */
  addChild(childNode) {
    childNode.parent = this;
    this.children.push(childNode);
  }

  /**
   * 확장자 추출
   */
  getExtension() {
    if (this.isDirectory()) return null;
    const lastDot = this.name.lastIndexOf('.');
    return lastDot !== -1 ? this.name.substring(lastDot) : '';
  }

  /**
   * 자식 노드 정렬 (폴더 우선, 이름순)
   */
  sortChildren() {
    this.children.sort((a, b) => {
      // 디렉토리가 파일보다 우선
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;

      // 같은 타입이면 이름순
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * 전체 경로 반환
   */
  getFullPath() {
    if (!this.parent) return this.path;
    return `${this.parent.getFullPath()}/${this.name}`;
  }

  /**
   * 깊이 계산
   */
  getDepth() {
    let depth = 0;
    let current = this.parent;
    while (current) {
      depth++;
      current = current.parent;
    }
    return depth;
  }
}
