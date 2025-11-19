/**
 * 파일: src/models/FileNode.js
 * 기능: 파일/폴더 노드 모델 (리팩토링 버전)
 * 책임: 파일 트리 구조 표현
 * 변경사항: BaseModel 상속, 이벤트 통일, 검증 강화
 */

import BaseModel from '../core/BaseModel.js';
import ValidationUtils from '../utils/ValidationUtils.js';

export const FILE_NODE_TYPE_FILE = 'file';
export const FILE_NODE_TYPE_DIRECTORY = 'directory';

export default class FileNode extends BaseModel {
  constructor(_name, _path, _type, _parent = null) {
    super();

    // 검증
    ValidationUtils.assertNonEmptyString(_name, 'Name');
    ValidationUtils.assertNonEmptyString(_path, 'Path');
    ValidationUtils.assertContains([FILE_NODE_TYPE_FILE, FILE_NODE_TYPE_DIRECTORY], _type, 'Type');

    // BaseModel의 set 사용
    this.set('name', _name);
    this.set('path', _path);
    this.set('type', _type);
    this.set('parent', _parent);
    this.set('children', []);
    this.set('expanded', false);
    this.set('metadata', {});

    // 초기 상태는 dirty가 아님
    this.clearDirty();
  }

  /**
   * 파일 타입 확인
   */
  isFile() {
    return this.get('type') === FILE_NODE_TYPE_FILE;
  }

  /**
   * 디렉토리 타입 확인
   */
  isDirectory() {
    return this.get('type') === FILE_NODE_TYPE_DIRECTORY;
  }

  /**
   * 이름 가져오기
   */
  getName() {
    return this.get('name');
  }

  /**
   * 이름 설정
   */
  setName(_name) {
    ValidationUtils.assertNonEmptyString(_name, 'Name');
    this.set('name', _name);
    this.emit('name-changed', { name: _name });
  }

  /**
   * 경로 가져오기
   */
  getPath() {
    return this.get('path');
  }

  /**
   * 타입 가져오기
   */
  getType() {
    return this.get('type');
  }

  /**
   * 부모 노드 가져오기
   */
  getParent() {
    return this.get('parent');
  }

  /**
   * 부모 노드 설정
   */
  setParent(_parent) {
    if (_parent !== null) {
      ValidationUtils.assertInstanceOf(_parent, FileNode, 'Parent');
    }
    this.set('parent', _parent);
    this.emit('parent-changed', { parent: _parent });
  }

  /**
   * 자식 노드 목록 가져오기
   */
  getChildren() {
    return [...this.get('children')];
  }

  /**
   * 자식 노드 추가
   */
  addChild(_child_node) {
    ValidationUtils.assertInstanceOf(_child_node, FileNode, 'Child node');

    if (!this.isDirectory()) {
      throw new Error('Cannot add child to a file node');
    }

    const children = this.get('children');

    // 중복 확인
    if (children.find((_c) => _c.getPath() === _child_node.getPath())) {
      throw new Error(`Child node already exists: ${_child_node.getPath()}`);
    }

    _child_node.setParent(this);
    children.push(_child_node);
    this.set('children', children);

    this.emit('child-added', { child: _child_node });
  }

  /**
   * 자식 노드 제거
   */
  removeChild(_child_node) {
    ValidationUtils.assertInstanceOf(_child_node, FileNode, 'Child node');

    const children = this.get('children');
    const index = children.indexOf(_child_node);

    if (index === -1) {
      throw new Error('Child node not found');
    }

    children.splice(index, 1);
    _child_node.setParent(null);
    this.set('children', children);

    this.emit('child-removed', { child: _child_node });
  }

  /**
   * 자식 노드 찾기 (이름)
   */
  findChild(_name) {
    ValidationUtils.assertString(_name, 'Name');
    const children = this.get('children');
    return children.find((_child) => _child.getName() === _name) || null;
  }

  /**
   * 자식 노드 찾기 (경로)
   */
  findChildByPath(_path) {
    ValidationUtils.assertString(_path, 'Path');
    const children = this.get('children');
    return children.find((_child) => _child.getPath() === _path) || null;
  }

  /**
   * 자식 노드 정렬
   */
  sortChildren() {
    if (!this.isDirectory()) return;

    const children = this.get('children');
    children.sort((_a, _b) => {
      // 디렉토리 우선
      if (_a.isDirectory() && _b.isFile()) return -1;
      if (_a.isFile() && _b.isDirectory()) return 1;

      // 이름 순
      return _a.getName().localeCompare(_b.getName());
    });

    this.set('children', children);
    this.emit('children-sorted');
  }

  /**
   * 확장 상태 가져오기
   */
  isExpanded() {
    return this.get('expanded');
  }

  /**
   * 확장 상태 설정
   */
  setExpanded(_expanded) {
    ValidationUtils.assertBoolean(_expanded, 'Expanded');

    if (!this.isDirectory()) {
      throw new Error('Cannot expand a file node');
    }

    this.set('expanded', _expanded);
    this.emit('expanded-changed', { expanded: _expanded });
  }

  /**
   * 토글 확장
   */
  toggleExpanded() {
    this.setExpanded(!this.isExpanded());
  }

  /**
   * 파일 확장자 가져오기
   */
  getExtension() {
    if (this.isDirectory()) return null;

    const name = this.getName();
    const last_dot = name.lastIndexOf('.');
    return last_dot !== -1 ? name.substring(last_dot) : '';
  }

  /**
   * 전체 경로 가져오기 (재귀)
   */
  getFullPath() {
    const parent = this.getParent();
    if (!parent) return this.getPath();

    return `${parent.getFullPath()}/${this.getName()}`;
  }

  /**
   * 깊이 계산
   */
  getDepth() {
    let depth = 0;
    let current = this.getParent();

    while (current) {
      depth++;
      current = current.getParent();
    }

    return depth;
  }

  /**
   * 루트 노드 확인
   */
  isRoot() {
    return this.getParent() === null;
  }

  /**
   * 자식 노드 개수
   */
  getChildCount() {
    return this.get('children').length;
  }

  /**
   * 자식 노드 존재 여부
   */
  hasChildren() {
    return this.getChildCount() > 0;
  }

  /**
   * 메타데이터 가져오기
   */
  getMetadata(_key) {
    const metadata = this.get('metadata');
    return _key ? metadata[_key] : { ...metadata };
  }

  /**
   * 메타데이터 설정
   */
  setMetadata(_key, _value) {
    ValidationUtils.assertString(_key, 'Key');
    const metadata = this.get('metadata');
    metadata[_key] = _value;
    this.set('metadata', metadata);
  }

  /**
   * 트리 순회 (깊이 우선)
   */
  traverse(_callback, _depth = 0) {
    ValidationUtils.assertFunction(_callback, 'Callback');

    _callback(this, _depth);

    if (this.isDirectory()) {
      const children = this.getChildren();
      children.forEach((_child) => {
        _child.traverse(_callback, _depth + 1);
      });
    }
  }

  /**
   * 트리 필터링
   */
  filter(_predicate) {
    ValidationUtils.assertFunction(_predicate, 'Predicate');

    const results = [];
    this.traverse((_node) => {
      if (_predicate(_node)) {
        results.push(_node);
      }
    });

    return results;
  }

  /**
   * 경로로 노드 찾기 (재귀)
   */
  findByPath(_path) {
    ValidationUtils.assertString(_path, 'Path');

    if (this.getPath() === _path) {
      return this;
    }

    if (this.isDirectory()) {
      const children = this.getChildren();
      for (const child of children) {
        const found = child.findByPath(_path);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * JSON 직렬화
   */
  toJSON() {
    return {
      name: this.getName(),
      path: this.getPath(),
      type: this.getType(),
      expanded: this.isExpanded(),
      metadata: this.getMetadata(),
      children: this.getChildren().map((_child) => _child.toJSON()),
    };
  }

  /**
   * JSON 역직렬화
   */
  fromJSON(_json) {
    ValidationUtils.assertObject(_json, 'JSON');

    if (_json.name) this.setName(_json.name);
    if (_json.expanded !== undefined) this.setExpanded(_json.expanded);
    if (_json.metadata) {
      Object.entries(_json.metadata).forEach(([_key, _value]) => {
        this.setMetadata(_key, _value);
      });
    }

    // 자식 노드는 별도로 재구성 필요
  }

  /**
   * 검증
   */
  validate() {
    try {
      ValidationUtils.assertNonEmptyString(this.getName(), 'Name');
      ValidationUtils.assertNonEmptyString(this.getPath(), 'Path');
      ValidationUtils.assertContains([FILE_NODE_TYPE_FILE, FILE_NODE_TYPE_DIRECTORY], this.getType(), 'Type');

      if (this.isFile() && this.hasChildren()) {
        throw new Error('File node cannot have children');
      }

      return true;
    } catch (error) {
      console.error('FileNode validation failed:', error);
      return false;
    }
  }

  /**
   * 복제 (얕은 복사)
   */
  clone() {
    const cloned = new FileNode(this.getName(), this.getPath(), this.getType(), this.getParent());

    cloned.setExpanded(this.isExpanded());

    const metadata = this.getMetadata();
    Object.entries(metadata).forEach(([_key, _value]) => {
      cloned.setMetadata(_key, _value);
    });

    return cloned;
  }

  /**
   * 트리 통계
   */
  getTreeStatistics() {
    let file_count = 0;
    let directory_count = 0;
    let total_depth = 0;
    let max_depth = 0;

    this.traverse((_node, _depth) => {
      if (_node.isFile()) {
        file_count++;
      } else {
        directory_count++;
      }
      total_depth += _depth;
      max_depth = Math.max(max_depth, _depth);
    });

    const total_nodes = file_count + directory_count;

    return {
      file_count,
      directory_count,
      total_nodes,
      max_depth,
      average_depth: total_nodes > 0 ? total_depth / total_nodes : 0,
    };
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      ...super.getDebugInfo(),
      name: this.getName(),
      path: this.getPath(),
      type: this.getType(),
      depth: this.getDepth(),
      child_count: this.getChildCount(),
      expanded: this.isExpanded(),
    };
  }
}
