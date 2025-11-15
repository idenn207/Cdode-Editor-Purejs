/**
 * 파일: src/app.js
 * 기능: 애플리케이션 진입점
 * 책임: 전체 애플리케이션 초기화 및 컴포넌트 조립
 */

import EditorController from './controllers/EditorController.js';
import FileController from './controllers/FileController.js';
import TabController from './controllers/TabController.js';
import FileSystemService from './services/FileSystemService.js';
import EditorPane from './views/components/EditorPane.js';
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
    };
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

    this.controllers.editor.setEditorPane(this.views.editorPane);

    this.#connectEvents();

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

    this.controllers.tab.on('document-opened', (_document) => {
      console.log('Document 열림:', _document.file_node.name);
    });

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

  async #openFile(_fileNode) {
    await this.controllers.file.openFile(_fileNode);
  }

  async #loadStyles() {
    const styles = ['sidebar', 'tabbar', 'editor'];

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
