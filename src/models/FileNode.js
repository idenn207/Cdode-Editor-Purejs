/**
 * 파일: src/models/FileNode.js
 * 기능: 파일/폴더 노드 모델
 * 책임: 파일 트리 구조 표현
 */

export const FILE_NODE_TYPE_FILE = 'file';
export const FILE_NODE_TYPE_DIRECTORY = 'directory';

export default class FileNode {
  constructor(_name, _path, _type, _parent = null) {
    this.name = _name;
    this.path = _path;
    this.type = _type;
    this.parent = _parent;
    this.children = [];
    this.expanded = false;
  }

  isFile() {
    return this.type === FILE_NODE_TYPE_FILE;
  }

  isDirectory() {
    return this.type === FILE_NODE_TYPE_DIRECTORY;
  }

  addChild(_childNode) {
    _childNode.parent = this;
    this.children.push(_childNode);
  }

  getExtension() {
    if (this.isDirectory()) return null;
    const lastDot = this.name.lastIndexOf('.');
    return lastDot !== -1 ? this.name.substring(lastDot) : '';
  }

  sortChildren() {
    this.children.sort((_a, _b) => {
      if (_a.isDirectory() && _b.isFile()) return -1;
      if (_a.isFile() && _b.isDirectory()) return 1;
      return _a.name.localeCompare(_b.name);
    });
  }

  getFullPath() {
    if (!this.parent) return this.path;
    return `${this.parent.getFullPath()}/${this.name}`;
  }

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
