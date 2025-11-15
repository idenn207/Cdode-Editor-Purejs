/**
 * 파일: src/views/components/Sidebar.js
 * 기능: 파일 탐색기 UI
 * 책임: 파일 트리 렌더링 및 사용자 인터랙션
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class Sidebar extends EventEmitter {
  constructor(containerId) {
    super();
    this.container = document.getElementById(containerId);
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
    const openBtn = document.getElementById('OpenFolderBtn');
    openBtn.addEventListener('click', () => {
      this.emit('request-open-folder');
    });
  }

  /**
   * 파일 트리 렌더링
   */
  render(rootNode) {
    this.root_node = rootNode;
    const treeContainer = document.getElementById('FileTree');

    if (!rootNode) {
      treeContainer.innerHTML = '<div class="empty-state">No folder opened</div>';
      return;
    }

    treeContainer.innerHTML = '';
    this.#renderNode(rootNode, treeContainer, 0);
  }

  /**
   * 노드 재귀 렌더링
   */
  #renderNode(node, container, depth) {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'file-tree-node';
    nodeElement.dataset.path = node.getFullPath();
    nodeElement.style.paddingLeft = `${depth * 16 + 8}px`;

    // 아이콘 + 이름
    const icon = this.#getNodeIcon(node);
    const chevron = node.isDirectory()
      ? `<span class="chevron ${node.expanded ? 'expanded' : ''}">${node.expanded ? '▼' : '▶'}</span>`
      : '<span class="chevron-spacer"></span>';

    nodeElement.innerHTML = `
            ${chevron}
            <span class="file-icon">${icon}</span>
            <span class="file-name">${node.name}</span>
        `;

    // 클릭 이벤트
    nodeElement.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#handleNodeClick(node, nodeElement);
    });

    container.appendChild(nodeElement);

    // 자식 노드 렌더링 (확장된 경우)
    if (node.isDirectory() && node.expanded) {
      node.children.forEach((child) => {
        this.#renderNode(child, container, depth + 1);
      });
    }
  }

  /**
   * 노드 클릭 핸들러
   */
  #handleNodeClick(node, element) {
    // 이전 선택 해제
    if (this.selected_node) {
      const prevElement = this.container.querySelector(`[data-path="${this.selected_node.getFullPath()}"]`);
      if (prevElement) {
        prevElement.classList.remove('selected');
      }
    }

    // 현재 노드 선택
    this.selected_node = node;
    element.classList.add('selected');

    if (node.isDirectory()) {
      // 폴더 확장/축소
      node.expanded = !node.expanded;
      this.render(this.root_node);
    } else {
      // 파일 열기 이벤트
      this.emit('file-selected', node);
    }
  }

  /**
   * 노드 아이콘 반환
   */
  #getNodeIcon(node) {
    if (node.isDirectory()) {
      return node.expanded ? '📂' : '📁';
    }

    const ext = node.getExtension();
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

  /**
   * 특정 노드 선택
   */
  selectNode(node) {
    const element = this.container.querySelector(`[data-path="${node.getFullPath()}"]`);
    if (element) {
      this.#handleNodeClick(node, element);
    }
  }
}
