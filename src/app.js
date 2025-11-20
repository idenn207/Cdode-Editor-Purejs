/**
 * src/app.js
 *
 * 메인 애플리케이션 엔트리 포인트
 *
 * 책임:
 * - 모든 서비스, 컨트롤러, 뷰 초기화
 * - 컴포넌트 간 이벤트 연결
 * - 전역 에러 처리
 * - 애플리케이션 생명주기 관리
 */

// Core
import BaseController from './core/BaseController.js';

// Models

// Services
import CompletionService from './services/editor/CompletionService.js';
import LinterService from './services/editor/LinterService.js';
import FileCacheService from './services/file/FileCacheService.js';
import FileSystemService from './services/file/FileSystemService.js';
import LanguageService from './services/language/LanguageService.js';
import SearchService from './services/search/SearchService.js';

// Views
import CompletionPanel from './views/components/CompletionPanel.js';
import EditorPane from './views/components/EditorPane.js';
import SearchPanel from './views/components/SearchPanel.js';
import Sidebar from './views/components/Sidebar.js';
import TabBar from './views/components/TabBar.js';
import SyntaxRenderer from './views/renderers/SyntaxRenderer.js';

// Controllers
import EditorController from './controllers/EditorController.js';
import FileController from './controllers/FileController.js';
import TabController from './controllers/TabController.js';

// Utils
import ValidationUtils from './utils/ValidationUtils.js';

/**
 * CodeEditor 메인 애플리케이션 클래스
 */
export default class CodeEditorApp extends BaseController {
  /**
   * 생성자
   */
  constructor() {
    super();

    // Services
    this.services = {
      file_system: null,
      file_cache: null,
      completion: null,
      linter: null,
      search: null,
      language: null,
    };

    // Views
    this.views = {
      sidebar: null,
      tab_bar: null,
      editor_pane: null,
      completion_panel: null,
      search_panel: null,
      syntax_renderer: null,
    };

    // Controllers
    this.controllers = {
      editor: null,
      file: null,
      tab: null,
    };

    // 상태
    this.is_initialized = false;
    this.is_running = false;
  }

  /**
   * 초기화
   */
  async initialize() {
    try {
      console.log('🚀 Initializing CodeEditor...');

      // 1. Services 초기화
      await this.#initializeServices();

      // 2. Views 초기화
      this.#initializeViews();

      // 3. Controllers 초기화
      this.#initializeControllers();

      // 4. 이벤트 연결
      this.#connectEvents();

      // 5. 전역 에러 핸들러
      this.#setupErrorHandlers();

      this.is_initialized = true;
      console.log('✅ CodeEditor initialized successfully');
    } catch (error) {
      this.handleError(error, 'initialize');
      throw error;
    }
  }

  /**
   * Services 초기화
   */
  async #initializeServices() {
    console.log('  📦 Initializing services...');

    // FileCacheService
    this.services.file_cache = new FileCacheService();
    this.services.file_cache.initialize();

    // FileSystemService
    this.services.file_system = new FileSystemService();
    this.services.file_system.initialize();

    // LanguageService
    this.services.language = new LanguageService();
    this.services.language.initialize();

    // CompletionService
    this.services.completion = new CompletionService(this.services.language);
    this.services.completion.initialize();

    // LinterService
    this.services.linter = new LinterService(this.services.language);
    this.services.linter.initialize();

    // SearchService
    this.services.search = new SearchService();
    this.services.search.initialize();

    console.log('  ✅ Services initialized');
  }

  /**
   * Views 초기화
   */
  #initializeViews() {
    console.log('  🎨 Initializing views...');

    // SyntaxRenderer
    this.views.syntax_renderer = new SyntaxRenderer(this.services.language);

    // Sidebar
    this.views.sidebar = new Sidebar('Sidebar');
    this.views.sidebar.mount();

    // TabBar
    this.views.tab_bar = new TabBar('TabBar');
    this.views.tab_bar.mount();

    // EditorPane
    this.views.editor_pane = new EditorPane('EditorPane', this.views.syntax_renderer, this.services.completion, this.services.search);
    this.views.editor_pane.mount();

    // CompletionPanel
    this.views.completion_panel = new CompletionPanel('CompletionPanel');
    this.views.completion_panel.mount();

    // SearchPanel
    this.views.search_panel = new SearchPanel('SearchPanel');
    this.views.search_panel.mount();

    console.log('  ✅ Views initialized');
  }

  /**
   * Controllers 초기화
   */
  #initializeControllers() {
    console.log('  🎮 Initializing controllers...');

    // TabController
    this.controllers.tab = new TabController();
    this.controllers.tab.initialize();

    // FileController
    this.controllers.file = new FileController(this.services.file_system);
    this.controllers.file.initialize();

    // EditorController
    this.controllers.editor = new EditorController(this.controllers.tab, this.services.file_system);
    this.controllers.editor.initialize();
    this.controllers.editor.setEditorPane(this.views.editor_pane);

    console.log('  ✅ Controllers initialized');
  }

  /**
   * 이벤트 연결
   */
  #connectEvents() {
    console.log('  🔗 Connecting events...');

    // ========================================
    // FileController → TabController
    // ========================================
    this.controllers.file.on('file-opened', (_event) => {
      const { file_node, content } = _event;
      this.controllers.tab.openDocument(file_node, content);
    });

    // ========================================
    // FileController → Sidebar
    // ========================================
    this.controllers.file.on('directory-selected', (_event) => {
      const { root_node } = _event;
      this.views.sidebar.setRootNode(root_node);
      this.views.sidebar.render();
    });

    // ========================================
    // Sidebar → FileController
    // ========================================
    this.views.sidebar.on('file-selected', (_event) => {
      const { file_node } = _event;
      this.controllers.file.openFile(file_node);
    });

    // ========================================
    // TabController → EditorController
    // ========================================
    this.controllers.tab.on('document-activated', (_event) => {
      const { document } = _event;
      this.controllers.editor.displayDocument(document);
    });

    this.controllers.tab.on('document-closed', (_event) => {
      this.views.editor_pane.clear();
    });

    // ========================================
    // TabController → TabBar
    // ========================================
    this.controllers.tab.on('document-opened', (_event) => {
      const { document } = _event;
      this.views.tab_bar.addTab(document);
    });

    this.controllers.tab.on('document-activated', (_event) => {
      const { document } = _event;
      this.views.tab_bar.setActiveTab(document);
    });

    this.controllers.tab.on('document-closed', (_event) => {
      const { document } = _event;
      this.views.tab_bar.removeTab(document);
    });

    this.controllers.tab.on('document-changed', (_event) => {
      const { document } = _event;
      this.views.tab_bar.updateTab(document);
    });

    // ========================================
    // TabBar → TabController
    // ========================================
    this.views.tab_bar.on('tab-clicked', (_event) => {
      const { document } = _event;
      this.controllers.tab.activateDocument(document);
    });

    this.views.tab_bar.on('tab-close-clicked', (_event) => {
      const { document } = _event;
      this.controllers.tab.closeDocument(document);
    });

    // ========================================
    // EditorPane → EditorController
    // ========================================
    this.views.editor_pane.on('content-changed', (_event) => {
      const document = this.controllers.tab.getActiveDocument();
      if (document) {
        document.setContent(_event.content);
      }
    });

    // ========================================
    // EditorController → FileController
    // ========================================
    this.controllers.editor.on('save-requested', (_event) => {
      const { document } = _event;
      this.controllers.file.saveFile(document.getFileNode(), document.getContent());
    });

    console.log('  ✅ Events connected');
  }

  /**
   * 전역 에러 핸들러 설정
   */
  #setupErrorHandlers() {
    // Unhandled Promise Rejection
    window.addEventListener('unhandledrejection', (_event) => {
      console.error('❌ Unhandled Promise Rejection:', _event.reason);
      this.handleError(_event.reason, 'unhandledrejection');
      _event.preventDefault();
    });

    // Global Error
    window.addEventListener('error', (_event) => {
      console.error('❌ Global Error:', _event.error);
      this.handleError(_event.error, 'global-error');
    });

    console.log('  ✅ Error handlers setup');
  }

  /**
   * 애플리케이션 시작
   */
  async start() {
    ValidationUtils.assertState(this.is_initialized, 'Application must be initialized before starting');

    ValidationUtils.assertState(!this.is_running, 'Application is already running');

    try {
      console.log('▶️  Starting CodeEditor...');

      // 디렉토리 선택 프롬프트
      await this.controllers.file.selectDirectory();

      this.is_running = true;
      console.log('✅ CodeEditor started');

      this.emit('started');
    } catch (error) {
      this.handleError(error, 'start');
      throw error;
    }
  }

  /**
   * 애플리케이션 정지
   */
  stop() {
    ValidationUtils.assertState(this.is_running, 'Application is not running');

    try {
      console.log('⏸️  Stopping CodeEditor...');

      // 모든 수정사항 저장 확인
      const dirtyDocs = this.controllers.tab.getDirtyDocuments();
      if (dirtyDocs.length > 0) {
        const confirmStop = window.confirm(`${dirtyDocs.length}개의 파일이 수정되었습니다. 저장하지 않고 종료하시겠습니까?`);
        if (!confirmStop) {
          return;
        }
      }

      this.is_running = false;
      console.log('✅ CodeEditor stopped');

      this.emit('stopped');
    } catch (error) {
      this.handleError(error, 'stop');
      throw error;
    }
  }

  /**
   * 애플리케이션 종료
   */
  destroy() {
    if (this.is_running) {
      this.stop();
    }

    console.log('🗑️  Destroying CodeEditor...');

    // Controllers 정리
    Object.values(this.controllers).forEach((_controller) => {
      if (_controller && _controller.destroy) {
        _controller.destroy();
      }
    });

    // Views 정리
    Object.values(this.views).forEach((_view) => {
      if (_view && _view.destroy) {
        _view.destroy();
      }
    });

    // Services 정리
    Object.values(this.services).forEach((_service) => {
      if (_service && _service.destroy) {
        _service.destroy();
      }
    });

    this.is_initialized = false;
    console.log('✅ CodeEditor destroyed');

    super.destroy();
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      is_initialized: this.is_initialized,
      is_running: this.is_running,
      services: Object.keys(this.services),
      views: Object.keys(this.views),
      controllers: Object.keys(this.controllers),
      active_document: this.controllers.tab?.getActiveDocument()?.getFileNode()?.getName(),
      document_count: this.controllers.tab?.getDocumentCount() || 0,
      dirty_count: this.controllers.tab?.getDirtyDocuments().length || 0,
    };
  }
}

/**
 * 애플리케이션 인스턴스 생성 및 시작
 */
async function main() {
  const app = new CodeEditorApp();

  try {
    await app.initialize();
    await app.start();

    // 전역 접근을 위해 window 객체에 추가
    window.codeEditorApp = app;

    console.log('🎉 CodeEditor is ready!');
    console.log('📊 Debug Info:', app.getDebugInfo());
  } catch (error) {
    console.error('❌ Failed to start CodeEditor:', error);
  }
}

// DOM 로드 완료 후 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
