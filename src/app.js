/**
 * 파일: src/app.js
 * 수정 내용: SearchPanel 및 KeyBindingManager 통합
 */

import EditorController from './controllers/EditorController.js';
import FileController from './controllers/FileController.js';
import TabController from './controllers/TabController.js';
import FileSystemService from './services/FileSystemService.js';
import KeyBindingManager from './utils/KeyBindingManager.js';
import CompletionPanel from './views/components/CompletionPanel.js';
import EditorPane from './views/components/EditorPane.js';
import SearchPanel from './views/components/SearchPanel.js';
import Sidebar from './views/components/Sidebar.js';
import TabBar from './views/components/TabBar.js';

class Application {
  constructor() {
    this.services = {
      fileSystem: null,
    };

    this.controllers = {
      file: null,
      tab: null,
      editor: null,
    };

    this.views = {
      sidebar: null,
      tabBar: null,
      editorPane: null,
      searchPanel: null,
    };

    this.keyBindings = null;
  }

  async initialize() {
    console.log('🚀 Web Code Editor 초기화 중...');

    this.services.fileSystem = new FileSystemService();

    this.controllers.file = new FileController(this.services.fileSystem);
    this.controllers.tab = new TabController();
    this.controllers.editor = new EditorController(this.controllers.tab, this.services.fileSystem);

    this.views.sidebar = new Sidebar('Sidebar');
    this.views.tabBar = new TabBar('TabBar');
    this.views.editorPane = new EditorPane('EditorContainer');
    this.views.searchPanel = new SearchPanel('EditorContainer');
    this.views.completionPanel = new CompletionPanel('EditorContainer');

    this.controllers.editor.setEditorPane(this.views.editorPane);
    this.controllers.editor.setSearchPanel(this.views.searchPanel);
    this.controllers.editor.setCompletionPanel(this.views.completionPanel);

    this.keyBindings = new KeyBindingManager();

    this.#connectEvents();
    this.#setupKeyBindings();

    await this.#loadStyles();

    console.log('✅ 초기화 완료');
  }

  #connectEvents() {
    // ===== Sidebar 이벤트 =====
    this.views.sidebar.on('request-open-folder', async () => {
      await this.controllers.file.openDirectory();
    });

    this.views.sidebar.on('file-selected', async (_fileNode) => {
      await this.#openFile(_fileNode);
    });

    // ===== FileController 이벤트 =====
    this.controllers.file.on('directory-opened', (_rootNode) => {
      this.views.sidebar.render(_rootNode);
    });

    this.controllers.file.on('file-opened', (_data) => {
      const { node, content } = _data;
      const doc = this.controllers.tab.openDocument(node, content);
      this.views.tabBar.addTab(doc);
    });

    this.controllers.file.on('error', (_error) => {
      console.error('오류 발생:', _error.message);
      alert(_error.message);
    });

    // ===== TabController 이벤트 =====
    this.controllers.tab.on('document-opened', (_document) => {});

    this.controllers.tab.on('document-activated', (_document) => {
      this.controllers.editor.displayDocument(_document);
    });

    this.controllers.tab.on('document-changed', (_document) => {
      this.views.tabBar.updateTab(_document);
    });

    this.controllers.tab.on('document-closed', (_document) => {
      this.views.tabBar.removeTab(_document);
    });

    // ===== TabBar 이벤트 =====
    this.views.tabBar.on('tab-activated', (_document) => {
      this.controllers.tab.activateDocument(_document);
    });

    this.views.tabBar.on('tab-close-requested', (_document) => {
      this.controllers.tab.closeDocument(_document);
    });

    this.views.tabBar.on('no-tabs', () => {
      this.controllers.editor.displayDocument(null);
    });

    // ===== EditorController 이벤트 =====
    this.controllers.editor.on('document-saved', (_document) => {
      console.log('저장됨:', _document.file_node.name);
      this.views.tabBar.updateTab(_document);
    });

    this.controllers.editor.on('status-message', (_message) => {
      console.log('상태:', _message);
    });

    this.controllers.editor.on('error', (_error) => {
      console.error('에디터 오류:', _error.message);
      alert(_error.message);
    });
  }

  /**
   * 키보드 단축키 설정
   */
  #setupKeyBindings() {
    // 검색
    this.keyBindings.register('ctrl+f', () => {
      this.controllers.editor.showSearch();
    });

    // 바꾸기
    this.keyBindings.register('ctrl+h', () => {
      this.controllers.editor.showReplace();
    });

    // 저장
    this.keyBindings.register('ctrl+s', () => {
      const doc = this.controllers.editor.getCurrentDocument();
      if (doc) {
        this.controllers.editor.saveDocument(doc);
      }
    });

    // 전체 저장
    this.keyBindings.register('ctrl+shift+s', () => {
      this.controllers.editor.saveAllDocuments();
    });

    // 탭 닫기 - Ctrl+W 제거 (브라우저와 충돌)
    // 탭바의 × 버튼을 사용하세요

    // 폴더 열기
    this.keyBindings.register('ctrl+o', () => {
      this.controllers.file.openDirectory();
    });

    // 자동완성
    this.keyBindings.register('ctrl+space', () => {
      this.controllers.editor.triggerCompletion();
    });

    // Undo
    this.keyBindings.register('ctrl+z', () => {
      this.views.editorPane.undo();
    });

    // Redo (Ctrl+Y)
    this.keyBindings.register('ctrl+y', () => {
      this.views.editorPane.redo();
    });

    // Redo (Ctrl+Shift+Z - alternative)
    this.keyBindings.register('ctrl+shift+z', () => {
      this.views.editorPane.redo();
    });

    console.log('⌨️ 키보드 단축키 등록 완료:', this.keyBindings.getBindings());
  }

  async #openFile(_fileNode) {
    await this.controllers.file.openFile(_fileNode);
  }

  async #loadStyles() {
    const styles = ['sidebar', 'tabbar', 'editor', 'syntax', 'search-panel', 'completion-panel'];

    for (const style of styles) {
      const link = window.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `src/styles/${style}.css`;
      window.document.head.appendChild(link);
    }
  }
}

window.document.addEventListener('DOMContentLoaded', async () => {
  const app = new Application();
  await app.initialize();

  window.app = app;
});
