/**
 * 파일: src/views/components/TabBar.js
 * 기능: 탭 바 UI
 * 책임: 열린 파일 탭 렌더링 및 사용자 인터랙션
 */

import EventEmitter from '../../utils/EventEmitter.js';

export default class TabBar extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container = window.document.getElementById(_containerId);
    this.tabs = [];
    this.active_tab = null;

    this.#initialize();
  }

  #initialize() {
    this.container.innerHTML = '';
  }

  /**
   * 탭 추가
   */
  addTab(_document) {
    // 이미 존재하는 탭인지 확인
    const existing = this.tabs.find((tab) => tab.document === _document);
    if (existing) {
      this.setActiveTab(_document);
      return;
    }

    // 새 탭 생성
    const tab = {
      document: _document,
      element: null,
    };

    this.tabs.push(tab);
    this.#renderTabs();
    this.setActiveTab(_document);
  }

  /**
   * 탭 제거
   */
  removeTab(_document) {
    const index = this.tabs.findIndex((tab) => tab.document === _document);
    if (index === -1) return;

    // 활성 탭이 제거되는 경우 다른 탭 활성화
    const wasActive = this.active_tab === _document;

    this.tabs.splice(index, 1);

    if (wasActive && this.tabs.length > 0) {
      // 이전 탭 활성화 (없으면 다음 탭)
      const newIndex = Math.min(index, this.tabs.length - 1);
      this.setActiveTab(this.tabs[newIndex].document);
    } else if (this.tabs.length === 0) {
      this.active_tab = null;
      this.emit('no-tabs');
    }

    this.#renderTabs();
  }

  /**
   * 활성 탭 설정
   */
  setActiveTab(_document) {
    // 이미 활성화된 탭이면 스킵 (무한 루프 방지)
    if (this.active_tab === _document) {
      return;
    }

    this.active_tab = _document;
    this.#renderTabs();
    this.emit('tab-activated', _document);
  }

  /**
   * 탭 렌더링
   */
  #renderTabs() {
    this.container.innerHTML = '';

    this.tabs.forEach((_tab) => {
      const tabElement = this.#createTabElement(_tab.document);
      _tab.element = tabElement;
      this.container.appendChild(tabElement);
    });
  }

  /**
   * 탭 엘리먼트 생성
   */
  #createTabElement(_document) {
    const div = window.document.createElement('div');
    div.className = 'tab';

    if (_document === this.active_tab) {
      div.classList.add('active');
    }

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
   * 파일 아이콘 반환
   */
  #getFileIcon(_fileNode) {
    const ext = _fileNode.getExtension();
    const iconMap = {
      '.js': '📜',
      '.html': '🌐',
      '.css': '🎨',
      '.md': '📝',
    };

    return iconMap[ext] || '📄';
  }

  /**
   * 모든 탭 반환
   */
  getTabs() {
    return this.tabs.map((_tab) => _tab.document);
  }

  /**
   * 활성 탭 반환
   */
  getActiveTab() {
    return this.active_tab;
  }

  /**
   * 특정 문서 탭 존재 여부
   */
  hasTab(_document) {
    return this.tabs.some((_tab) => _tab.document === _document);
  }

  /**
   * 수정된 탭 갱신 (dirty 표시)
   */
  updateTab(_document) {
    this.#renderTabs();
  }
}
