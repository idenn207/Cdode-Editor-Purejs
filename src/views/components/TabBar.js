/**
 * 파일: src/views/components/TabBar.js
 * 기능: 탭 바 UI
 * 책임: 열린 파일 탭 렌더링 및 사용자 인터랙션
 *
 * 리팩토링 변경사항:
 * 1. BaseComponent 상속 적용
 * 2. 생명주기 메서드 구현 (initialize, render)
 * 3. 탭 상태 관리 개선 (Map 사용)
 * 4. 검증 로직 추가
 * 5. API 확장 (closeAll, closeOthers)
 */

import BaseComponent from '../../core/BaseComponent.js';
import DOMUtils from '../../utils/DOMUtils.js';
import ValidationUtils from '../../utils/ValidationUtils.js';

export default class TabBar extends BaseComponent {
  constructor(_containerId) {
    super(_containerId);

    // 상태: path -> { document, element }
    this.tabs = new Map();
    this.tab_order = []; // 탭 순서 (path 배열)
    this.active_tab_path = null;
  }

  /**
   * 초기화 (BaseComponent.initialize 구현)
   */
  initialize() {
    this.container.innerHTML = '';
    this.container.className = 'tab-bar';
  }

  /**
   * 렌더링 (BaseComponent.render 구현)
   */
  render() {
    this.container.innerHTML = '';

    if (this.tab_order.length === 0) {
      this.#renderEmptyState();
      return;
    }

    // 탭 순서대로 렌더링
    this.tab_order.forEach((_path) => {
      const tab = this.tabs.get(_path);
      if (tab) {
        const element = this.#createTabElement(tab.document);
        tab.element = element;
        this.container.appendChild(element);
      }
    });

    this.emit('rendered', {
      tab_count: this.tabs.size,
      active_path: this.active_tab_path,
    });
  }

  /**
   * 빈 상태 렌더링 (private)
   */
  #renderEmptyState() {
    const emptyDiv = DOMUtils.createElement('div', {
      className: 'tab-bar-empty',
      textContent: 'No files opened',
      styles: {
        padding: '8px 12px',
        color: 'var(--text-secondary)',
        fontSize: '13px',
      },
    });

    this.container.appendChild(emptyDiv);
  }

  /**
   * 탭 추가
   */
  addTab(_document) {
    this.#validateDocument(_document);

    const path = _document.getFilePath();

    // 이미 존재하는 탭인지 확인
    if (this.tabs.has(path)) {
      this.setActiveTab(_document);
      return;
    }

    // 새 탭 추가
    this.tabs.set(path, {
      document: _document,
      element: null,
    });

    this.tab_order.push(path);

    // Document 변경 리스너 등록
    _document.on('change', () => {
      this.updateTab(_document);
    });

    this.render();
    this.setActiveTab(_document);

    this.emit('tab-added', { document: _document, path });
  }

  /**
   * 탭 제거
   */
  removeTab(_document) {
    this.#validateDocument(_document);

    const path = _document.getFilePath();

    if (!this.tabs.has(path)) {
      console.warn(`Tab not found: ${path}`);
      return;
    }

    // 활성 탭이 제거되는 경우 다른 탭 활성화
    const wasActive = this.active_tab_path === path;

    // 탭 제거
    this.tabs.delete(path);
    const index = this.tab_order.indexOf(path);
    if (index !== -1) {
      this.tab_order.splice(index, 1);
    }

    // 이벤트 리스너 제거
    _document.removeAllListeners('change');

    // 활성 탭 전환
    if (wasActive && this.tab_order.length > 0) {
      // 이전 탭 활성화 (없으면 다음 탭)
      const newIndex = Math.min(index, this.tab_order.length - 1);
      const newPath = this.tab_order[newIndex];
      const newTab = this.tabs.get(newPath);

      if (newTab) {
        this.setActiveTab(newTab.document);
      }
    } else if (this.tab_order.length === 0) {
      this.active_tab_path = null;
      this.emit('no-tabs');
    }

    this.render();
    this.emit('tab-removed', { path });
  }

  /**
   * 활성 탭 설정
   */
  setActiveTab(_document) {
    this.#validateDocument(_document);

    const path = _document.getFilePath();

    if (!this.tabs.has(path)) {
      console.warn(`Tab not found: ${path}`);
      return;
    }

    // 이미 활성화된 탭이면 스킵 (무한 루프 방지)
    if (this.active_tab_path === path) {
      return;
    }

    this.active_tab_path = path;
    this.render();
    this.emit('tab-activated', _document);
  }

  /**
   * 탭 갱신 (dirty 표시 등)
   */
  updateTab(_document) {
    this.#validateDocument(_document);

    const path = _document.getFilePath();

    if (!this.tabs.has(path)) {
      console.warn(`Tab not found: ${path}`);
      return;
    }

    // 해당 탭만 다시 렌더링
    const tab = this.tabs.get(path);
    const newElement = this.#createTabElement(tab.document);

    if (tab.element && tab.element.parentNode) {
      tab.element.parentNode.replaceChild(newElement, tab.element);
      tab.element = newElement;
    }

    this.emit('tab-updated', { document: _document, path });
  }

  /**
   * 탭 엘리먼트 생성 (private)
   */
  #createTabElement(_document) {
    const path = _document.getFilePath();
    const isActive = this.active_tab_path === path;

    const div = DOMUtils.createElement('div', {
      className: `tab ${isActive ? 'active' : ''}`,
      attributes: {
        'data-path': path,
      },
    });

    // 수정 표시
    const dirtyIndicator = _document.isDirty() ? '● ' : '';

    // 파일 아이콘
    const icon = this.#getFileIcon(_document.file_node);

    div.innerHTML = `
      <span class="tab-icon">${icon}</span>
      <span class="tab-label">${dirtyIndicator}${_document.file_node.name}</span>
      <button class="tab-close" aria-label="Close">×</button>
    `;

    // 탭 클릭 - 활성화
    div.addEventListener('click', (_e) => {
      if (!_e.target.classList.contains('tab-close')) {
        this.setActiveTab(_document);
      }
    });

    // 닫기 버튼 클릭
    const closeBtn = div.querySelector('.tab-close');
    closeBtn.addEventListener('click', (_e) => {
      _e.stopPropagation();
      this.emit('tab-close-requested', _document);
    });

    return div;
  }

  /**
   * 파일 아이콘 반환 (private)
   */
  #getFileIcon(_fileNode) {
    const ext = _fileNode.getExtension();
    const iconMap = {
      '.js': '📜',
      '.html': '🌐',
      '.css': '🎨',
      '.md': '📝',
      '.json': '⚙️',
      '.txt': '📄',
    };

    return iconMap[ext] || '📄';
  }

  /**
   * Document 검증 (private)
   */
  #validateDocument(_document) {
    ValidationUtils.assertNonNull(_document, 'Document');

    if (!_document.getFilePath || typeof _document.getFilePath !== 'function') {
      throw new Error('Document must have getFilePath() method');
    }

    if (!_document.file_node) {
      throw new Error('Document must have file_node property');
    }
  }

  /**
   * 모든 탭 가져오기
   */
  getTabs() {
    return this.tab_order
      .map((_path) => {
        const tab = this.tabs.get(_path);
        return tab ? tab.document : null;
      })
      .filter((_doc) => _doc !== null);
  }

  /**
   * 활성 탭 가져오기
   */
  getActiveTab() {
    if (!this.active_tab_path) return null;

    const tab = this.tabs.get(this.active_tab_path);
    return tab ? tab.document : null;
  }

  /**
   * 탭 존재 여부 확인
   */
  hasTab(_document) {
    this.#validateDocument(_document);
    const path = _document.getFilePath();
    return this.tabs.has(path);
  }

  /**
   * 탭 개수
   */
  getTabCount() {
    return this.tabs.size;
  }

  /**
   * 수정된 탭 목록
   */
  getDirtyTabs() {
    return this.getTabs().filter((_doc) => _doc.isDirty());
  }

  /**
   * 모든 탭 닫기
   */
  closeAll() {
    const tabs = this.getTabs();

    tabs.forEach((_doc) => {
      this.removeTab(_doc);
    });

    this.emit('all-tabs-closed');
  }

  /**
   * 다른 탭들 닫기 (현재 탭 제외)
   */
  closeOthers(_document) {
    this.#validateDocument(_document);

    const currentPath = _document.getFilePath();
    const tabs = this.getTabs();

    tabs.forEach((_doc) => {
      if (_doc.getFilePath() !== currentPath) {
        this.removeTab(_doc);
      }
    });

    this.emit('others-closed', { document: _document });
  }

  /**
   * 오른쪽 탭들 닫기
   */
  closeToRight(_document) {
    this.#validateDocument(_document);

    const currentPath = _document.getFilePath();
    const currentIndex = this.tab_order.indexOf(currentPath);

    if (currentIndex === -1 || currentIndex === this.tab_order.length - 1) {
      return;
    }

    const pathsToClose = this.tab_order.slice(currentIndex + 1);

    pathsToClose.forEach((_path) => {
      const tab = this.tabs.get(_path);
      if (tab) {
        this.removeTab(tab.document);
      }
    });

    this.emit('tabs-closed-to-right', { document: _document });
  }

  /**
   * 저장된 탭들 닫기
   */
  closeSaved() {
    const tabs = this.getTabs();

    tabs.forEach((_doc) => {
      if (!_doc.isDirty()) {
        this.removeTab(_doc);
      }
    });

    this.emit('saved-tabs-closed');
  }

  /**
   * 탭 이동 (순서 변경)
   */
  moveTab(_fromIndex, _toIndex) {
    ValidationUtils.assertNumber(_fromIndex, 'From index');
    ValidationUtils.assertNumber(_toIndex, 'To index');
    ValidationUtils.assertInRange(_fromIndex, 0, this.tab_order.length - 1, 'From index');
    ValidationUtils.assertInRange(_toIndex, 0, this.tab_order.length - 1, 'To index');

    if (_fromIndex === _toIndex) return;

    const [path] = this.tab_order.splice(_fromIndex, 1);
    this.tab_order.splice(_toIndex, 0, path);

    this.render();
    this.emit('tab-moved', { from: _fromIndex, to: _toIndex, path });
  }

  /**
   * 컴포넌트 파괴
   */
  destroy() {
    // 모든 Document 이벤트 리스너 제거
    this.tabs.forEach((_tab) => {
      _tab.document.removeAllListeners('change');
    });

    this.tabs.clear();
    this.tab_order = [];
    this.active_tab_path = null;

    super.destroy();
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      component: this.constructor.name,
      is_mounted: this.is_mounted,
      tab_count: this.tabs.size,
      active_path: this.active_tab_path,
      dirty_count: this.getDirtyTabs().length,
      tab_order: [...this.tab_order],
    };
  }
}
