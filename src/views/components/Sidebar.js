/**
 * 파일: src/views/components/Sidebar.js
 * 기능: 파일 탐색기 UI
 * 책임: 파일 트리 렌더링 및 사용자 인터랙션
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class Sidebar extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container = window.document.getElementById(_containerId);
    this.root_node = null;
    this.selected_node = null;

    this.#initialize();
  }

  #initialize() {
    this.container.innerHTML = `
      <div class="sidebar-header">
        <span class="sidebar-title">EXPLORER</span>
        <button id="OpenFolderBtn" class="icon-button" title="Open Folder">
          📁
        </button>
      </div>
      <div id="FileTree" class="file-tree"></div>
    `;

    this.#attachEvents();
  }

  #attachEvents() {
    const openBtn = window.document.getElementById('OpenFolderBtn');
    openBtn.addEventListener('click', () => {
      this.emit('request-open-folder');
    });
  }

  /**
   * 파일 트리 렌더링
   */
  render(_rootNode) {
    this.root_node = _rootNode;
    const treeContainer = window.document.getElementById('FileTree');

    if (!_rootNode) {
      treeContainer.innerHTML = '<div class="empty-state">No folder opened</div>';
      return;
    }

    treeContainer.innerHTML = '';
    this.#renderNode(_rootNode, treeContainer, 0);
  }

  /**
   * 노드 재귀 렌더링
   */
  #renderNode(_node, _container, _depth) {
    const nodeElement = window.document.createElement('div');
    nodeElement.className = 'file-tree-node';
    nodeElement.dataset.path = _node.getFullPath();
    nodeElement.style.paddingLeft = `${_depth * 16 + 8}px`;

    // 아이콘 + 이름
    const icon = this.#getNodeIcon(_node);
    const chevron = _node.isDirectory()
      ? `<span class="chevron ${_node.expanded ? 'expanded' : ''}">${_node.expanded ? '▼' : '▶'}</span>`
      : '<span class="chevron-spacer"></span>';

    nodeElement.innerHTML = `
      ${chevron}
      <span class="file-icon">${icon}</span>
      <span class="file-name">${_node.name}</span>
    `;

    // 클릭 이벤트
    nodeElement.addEventListener('click', (_e) => {
      _e.stopPropagation();
      this.#handleNodeClick(_node, nodeElement);
    });

    _container.appendChild(nodeElement);

    // 자식 노드 렌더링 (확장된 경우)
    if (_node.isDirectory() && _node.expanded) {
      _node.children.forEach((_child) => {
        this.#renderNode(_child, _container, _depth + 1);
      });
    }
  }

  /**
   * 노드 클릭 핸들러
   */
  #handleNodeClick(_node, _element) {
    // 이전 선택 해제
    if (this.selected_node) {
      const prevElement = this.container.querySelector(`[data-path="${this.selected_node.getFullPath()}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    }

    // 현재 노드 선택
    this.selected_node = _node;
    _element.classList.add('selected');

    if (_node.isDirectory()) {
      // 폴더 확장/축소
      _node.expanded = !_node.expanded;
      this.render(this.root_node);
    } else {
      // 파일 열기 이벤트
      this.emit('file-selected', _node);
    }
  }

  /**
   * 노드 아이콘 반환
   */
  #getNodeIcon(_node) {
    if (_node.isDirectory()) {
      return _node.expanded ? '📂' : '📁';
    }

    const ext = _node.getExtension();
    const iconMap = {
      '.js': '📜',
      '.html': '🌐',
      '.css': '🎨',
      '.md': '📝',
    };

    return iconMap[ext] || '📄';
  }

  /**
   * 선택된 노드 반환
   */
  getSelectedNode() {
    return this.selected_node;
  }
}
