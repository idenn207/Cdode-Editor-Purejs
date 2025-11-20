/**
 * 파일: src/views/components/Sidebar.js
 * 기능: 파일 탐색기 UI
 * 책임: 파일 트리 렌더링 및 사용자 인터랙션
 *
 * 리팩토링 변경사항:
 * 1. BaseComponent 상속 적용
 * 2. 생명주기 메서드 구현 (initialize, render)
 * 3. 상태 관리 개선 (root_node, selected_node)
 * 4. 이벤트 처리 개선
 * 5. 검증 로직 추가
 */

import BaseComponent from '../../core/BaseComponent.js';
import DOMUtils from '../../utils/DOMUtils.js';
import ValidationUtils from '../../utils/ValidationUtils.js';

export default class Sidebar extends BaseComponent {
  constructor(_containerId) {
    super(_containerId);

    // 상태
    this.root_node = null;
    this.selected_node = null;

    // DOM 요소 참조
    this.header_el = null;
    this.tree_container_el = null;
    this.open_folder_btn = null;
  }

  /**
   * 초기화 (BaseComponent.initialize 구현)
   */
  initialize() {
    this.#createDOM();
    this.#attachEvents();
  }

  /**
   * DOM 구조 생성 (private)
   */
  #createDOM() {
    this.container.innerHTML = `
      <div class="sidebar-header">
        <span class="sidebar-title">EXPLORER</span>
        <button id="OpenFolderBtn" class="icon-button" title="Open Folder">
          📁
        </button>
      </div>
      <div id="FileTree" class="file-tree"></div>
    `;

    // 요소 참조 저장
    this.header_el = this.container.querySelector('.sidebar-header');
    this.tree_container_el = this.container.querySelector('#FileTree');
    this.open_folder_btn = this.container.querySelector('#OpenFolderBtn');
  }

  /**
   * 이벤트 연결 (private)
   */
  #attachEvents() {
    // 폴더 열기 버튼
    this.open_folder_btn.addEventListener('click', () => {
      this.emit('request-open-folder');
    });

    // 파일 트리 클릭 이벤트 위임
    this.tree_container_el.addEventListener('click', (_e) => {
      this.#handleTreeClick(_e);
    });
  }

  /**
   * 렌더링 (BaseComponent.render 구현)
   */
  render(_rootNode = null) {
    // 루트 노드 업데이트
    if (_rootNode !== null) {
      this.#validateRootNode(_rootNode);
      this.root_node = _rootNode;
    }

    // 렌더링
    if (!this.root_node) {
      this.#renderEmptyState();
      return;
    }

    this.#renderTree();
    this.emit('rendered', { root_node: this.root_node });
  }

  /**
   * 빈 상태 렌더링 (private)
   */
  #renderEmptyState() {
    this.tree_container_el.innerHTML = `
      <div class="empty-state">
        <p>No folder opened</p>
        <p class="hint">Click 📁 to open a folder</p>
      </div>
    `;
  }

  /**
   * 파일 트리 렌더링 (private)
   */
  #renderTree() {
    this.tree_container_el.innerHTML = '';
    this.#renderNode(this.root_node, this.tree_container_el, 0);
  }

  /**
   * 노드 재귀 렌더링 (private)
   */
  #renderNode(_node, _container, _depth) {
    const nodeElement = DOMUtils.createElement('div', {
      className: 'file-tree-node',
      attributes: {
        'data-path': _node.getFullPath(),
      },
      styles: {
        paddingLeft: `${_depth * 16 + 8}px`,
      },
    });

    // 선택 상태 반영
    if (this.selected_node && this.selected_node.getFullPath() === _node.getFullPath()) {
      nodeElement.classList.add('selected');
    }

    // 아이콘 + 이름
    const icon = this.#getNodeIcon(_node);
    const chevron = _node.isDirectory() ? `<span class="chevron ${_node.expanded ? 'expanded' : ''}">${_node.expanded ? '▼' : '▶'}</span>` : '';

    nodeElement.innerHTML = `
      ${chevron}
      <span class="node-icon">${icon}</span>
      <span class="node-name">${_node.getName()}</span>
    `;

    _container.appendChild(nodeElement);

    // 디렉토리이고 확장된 경우 자식 렌더링
    if (_node.isDirectory() && _node.expanded) {
      const children = _node.getChildren();
      children.forEach((_child) => {
        this.#renderNode(_child, _container, _depth + 1);
      });
    }
  }

  /**
   * 노드 아이콘 반환 (private)
   */
  #getNodeIcon(_node) {
    if (_node.isDirectory()) {
      return _node.expanded ? '📂' : '📁';
    }

    // 파일 확장자별 아이콘
    const ext = _node.getExtension();
    const iconMap = {
      '.js': '📄',
      '.html': '🌐',
      '.css': '🎨',
      '.md': '📝',
      '.json': '⚙️',
      '.txt': '📄',
    };

    return iconMap[ext] || '📄';
  }

  /**
   * 트리 클릭 처리 (private)
   */
  #handleTreeClick(_e) {
    const nodeElement = _e.target.closest('.file-tree-node');
    if (!nodeElement) return;

    const path = nodeElement.dataset.path;
    const node = this.#findNodeByPath(path);

    if (!node) {
      console.warn(`Node not found: ${path}`);
      return;
    }

    // Chevron 클릭 (디렉토리 확장/축소)
    if (_e.target.classList.contains('chevron')) {
      this.#toggleDirectory(node);
      return;
    }

    // 파일 선택
    if (node.isFile()) {
      this.#selectFile(node);
    } else {
      // 디렉토리 클릭 시 확장/축소
      this.#toggleDirectory(node);
    }
  }

  /**
   * 디렉토리 확장/축소 (private)
   */
  #toggleDirectory(_node) {
    if (!_node.isDirectory()) return;

    _node.expanded = !_node.expanded;
    this.render();

    this.emit('directory-toggled', {
      node: _node,
      expanded: _node.expanded,
    });
  }

  /**
   * 파일 선택 (private)
   */
  #selectFile(_node) {
    if (!_node.isFile()) return;

    // 이전 선택 해제
    if (this.selected_node) {
      const prevElement = this.tree_container_el.querySelector(`[data-path="${this.selected_node.getFullPath()}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    }

    // 새 선택
    this.selected_node = _node;

    const nodeElement = this.tree_container_el.querySelector(`[data-path="${_node.getFullPath()}"]`);
    if (nodeElement) {
      nodeElement.classList.add('selected');
    }

    this.emit('file-selected', _node);
  }

  /**
   * 경로로 노드 찾기 (private)
   */
  #findNodeByPath(_path) {
    if (!this.root_node) return null;

    // 루트부터 순회
    const traverse = (_node) => {
      if (_node.getFullPath() === _path) {
        return _node;
      }

      if (_node.isDirectory()) {
        const children = _node.getChildren();
        for (const child of children) {
          const found = traverse(child);
          if (found) return found;
        }
      }

      return null;
    };

    return traverse(this.root_node);
  }

  /**
   * 루트 노드 검증 (private)
   */
  #validateRootNode(_node) {
    ValidationUtils.assertNonNull(_node, 'Root node');

    if (!_node.isDirectory || typeof _node.isDirectory !== 'function') {
      throw new Error('Root node must be a FileNode instance');
    }

    if (!_node.isDirectory()) {
      throw new Error('Root node must be a directory');
    }
  }

  /**
   * 선택된 파일 가져오기
   */
  getSelectedNode() {
    return this.selected_node;
  }

  /**
   * 선택 해제
   */
  clearSelection() {
    if (this.selected_node) {
      const nodeElement = this.tree_container_el.querySelector(`[data-path="${this.selected_node.getFullPath()}"]`);
      if (nodeElement) {
        nodeElement.classList.remove('selected');
      }
      this.selected_node = null;
    }
  }

  /**
   * 루트 노드 가져오기
   */
  getRootNode() {
    return this.root_node;
  }

  /**
   * 디렉토리 확장 (프로그래밍 방식)
   */
  expandDirectory(_path) {
    ValidationUtils.assertNonEmptyString(_path, 'Path');

    const node = this.#findNodeByPath(_path);
    if (!node || !node.isDirectory()) {
      console.warn(`Directory not found: ${_path}`);
      return false;
    }

    if (!node.expanded) {
      node.expanded = true;
      this.render();
    }

    return true;
  }

  /**
   * 디렉토리 축소 (프로그래밍 방식)
   */
  collapseDirectory(_path) {
    ValidationUtils.assertNonEmptyString(_path, 'Path');

    const node = this.#findNodeByPath(_path);
    if (!node || !node.isDirectory()) {
      console.warn(`Directory not found: ${_path}`);
      return false;
    }

    if (node.expanded) {
      node.expanded = false;
      this.render();
    }

    return true;
  }

  /**
   * 모든 디렉토리 확장
   */
  expandAll() {
    if (!this.root_node) return;

    const expandRecursive = (_node) => {
      if (_node.isDirectory()) {
        _node.expanded = true;
        _node.getChildren().forEach(expandRecursive);
      }
    };

    expandRecursive(this.root_node);
    this.render();
  }

  /**
   * 모든 디렉토리 축소
   */
  collapseAll() {
    if (!this.root_node) return;

    const collapseRecursive = (_node) => {
      if (_node.isDirectory()) {
        _node.expanded = false;
        _node.getChildren().forEach(collapseRecursive);
      }
    };

    collapseRecursive(this.root_node);
    this.render();
  }

  /**
   * 컴포넌트 파괴
   */
  destroy() {
    this.root_node = null;
    this.selected_node = null;
    this.header_el = null;
    this.tree_container_el = null;
    this.open_folder_btn = null;

    super.destroy();
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      component: this.constructor.name,
      is_mounted: this.is_mounted,
      has_root: !!this.root_node,
      has_selection: !!this.selected_node,
      selected_path: this.selected_node ? this.selected_node.getFullPath() : null,
    };
  }
}
