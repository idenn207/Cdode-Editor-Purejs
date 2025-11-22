/**
 * 파일: src/app.js
 * 기능: 메인 애플리케이션 엔트리 포인트
 * 수정: 폴더 선택을 사용자 액션(버튼 클릭) 후에 실행
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
    this.is_running = false;
    this.folder_selected = false;
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

      // 5. 에러 핸들러 설정
      this.#setupErrorHandlers();

      // 6. 폴더 선택 버튼 표시
      this.#showFolderSelectButton();

      super.initialize();
      console.log('✅ CodeEditor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      this.handleError(error, 'initialize');
      throw error;
    }
  }

  /**
   * Services 초기화
   */
  async #initializeServices() {
    console.log('  📦 Initializing services...');

    this.services.file_system = new FileSystemService();
    this.services.file_cache = new FileCacheService();
    this.services.completion = new CompletionService();
    this.services.linter = new LinterService();
    this.services.search = new SearchService();
    this.services.language = new LanguageService();

    console.log('  ✅ Services initialized');
  }

  /**
   * Views 초기화
   */
  #initializeViews() {
    console.log('  🎨 Initializing views...');

    this.views.sidebar = new Sidebar('Sidebar');
    this.views.tab_bar = new TabBar('TabBar');
    this.views.editor_pane = new EditorPane('EditorPane');
    this.views.completion_panel = new CompletionPanel('CompletionPanel');
    this.views.search_panel = new SearchPanel('SearchPanel');
    this.views.syntax_renderer = new SyntaxRenderer();

    // 뷰 마운트
    this.views.sidebar.mount();
    this.views.tab_bar.mount();
    this.views.editor_pane.mount();
    this.views.completion_panel.mount();
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

    // EditorController
    this.controllers.editor = new EditorController(this.controllers.tab, this.services.file_system);
    this.controllers.editor.initialize();
    this.controllers.editor.setEditorPane(this.views.editor_pane);

    // FileController
    this.controllers.file = new FileController(this.services.file_system);
    this.controllers.file.initialize();

    console.log('  ✅ Controllers initialized');
  }

  /**
   * 이벤트 연결
   */
  #connectEvents() {
    console.log('  🔗 Connecting events...');

    // FileController → Sidebar
    this.controllers.file.on('directory:loaded', (_rootNode) => {
      this.views.sidebar.render(_rootNode);
      this.folder_selected = true;
      this.#hideFolderSelectButton();
    });

    // Sidebar → FileController
    this.views.sidebar.on('file:selected', (_fileNode) => {
      this.controllers.file.openFile(_fileNode);
    });

    // FileController → TabController
    this.controllers.file.on('file:opened', (_event) => {
      const { node, content } = _event;
      this.controllers.tab.openDocument(node, content);
    });

    // TabController → TabBar
    this.controllers.tab.on('document:opened', (_document) => {
      this.views.tab_bar.addTab(_document);
    });

    this.controllers.tab.on('document:activated', (_document) => {
      this.views.tab_bar.activateTab(_document);
    });

    this.controllers.tab.on('document:closed', (_document) => {
      this.views.tab_bar.removeTab(_document);
    });

    this.controllers.tab.on('document:changed', (_document) => {
      this.views.tab_bar.updateTab(_document);
    });

    // TabBar → TabController
    this.views.tab_bar.on('tab:activated', (_document) => {
      this.controllers.tab.activateDocument(_document);
    });

    this.views.tab_bar.on('tab:closed', (_document) => {
      this.controllers.tab.closeDocument(_document);
    });

    // EditorController → FileController (저장)
    this.controllers.editor.on('request:save', (_event) => {
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
   * 폴더 선택 버튼 표시
   */
  #showFolderSelectButton() {
    // Sidebar 상단 폴더 열기 버튼
    const button = document.getElementById('OpenFolderBtn');
    if (button) {
      button.style.display = 'inline-flex';
      button.addEventListener('click', async () => {
        console.log('📁 Sidebar 폴더 열기 버튼 클릭');
        await this.#handleFolderSelect();
      });
    }

    // Empty State 폴더 열기 버튼
    const emptyButton = document.getElementById('EmptyOpenFolderBtn');
    if (emptyButton) {
      emptyButton.addEventListener('click', async () => {
        console.log('📁 Empty State 폴더 열기 버튼 클릭');
        await this.#handleFolderSelect();
      });
    }
  }

  /**
   * 폴더 선택 버튼 숨김
   */
  #hideFolderSelectButton() {
    // Empty State 숨김
    const emptySidebar = document.getElementById('EmptySidebar');
    if (emptySidebar) {
      emptySidebar.style.display = 'none';
    }
  }

  /**
   * 폴더 선택 처리
   */
  async #handleFolderSelect() {
    try {
      await this.controllers.file.selectDirectory();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('사용자가 폴더 선택을 취소했습니다.');
      } else {
        console.error('폴더 선택 중 오류:', error);
        alert('폴더를 열 수 없습니다: ' + error.message);
      }
    }
  }

  /**
   * 애플리케이션 시작
   */
  async start() {
    ValidationUtils.assertState(this.is_initialized, 'Application must be initialized before starting');
    ValidationUtils.assertState(!this.is_running, 'Application is already running');

    try {
      console.log('▶️  Starting CodeEditor...');
      this.is_running = true;
      console.log('✅ CodeEditor started (waiting for folder selection)');
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
        const confirmStop = window.confirm(`${dirtyDocs.length}개의 파일이 수정되었습니다. 정말 종료하시겠습니까?`);
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
   * 애플리케이션 파괴
   */
  destroy() {
    try {
      console.log('🗑️  Destroying CodeEditor...');

      // 정지
      if (this.is_running) {
        this.stop();
      }

      // Controllers 파괴
      Object.values(this.controllers).forEach((_controller) => {
        if (_controller && _controller.destroy) {
          _controller.destroy();
        }
      });

      // Views 파괴
      Object.values(this.views).forEach((_view) => {
        if (_view && _view.destroy) {
          _view.destroy();
        }
      });

      // Services 파괴
      Object.values(this.services).forEach((_service) => {
        if (_service && _service.destroy) {
          _service.destroy();
        }
      });

      super.destroy();
      console.log('✅ CodeEditor destroyed');
    } catch (error) {
      this.handleError(error, 'destroy');
      throw error;
    }
  }
}

/**
 * 메인 진입점
 */
async function main() {
  try {
    console.log('='.repeat(50));
    console.log('CodeEditor Application Starting...');
    console.log('='.repeat(50));

    const app = new CodeEditorApp();
    await app.initialize();
    await app.start();

    // 전역 변수로 노출 (디버깅용)
    window.codeEditor = app;

    console.log('='.repeat(50));
    console.log('CodeEditor Application Ready!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Failed to start application:', error);
    alert('애플리케이션을 시작할 수 없습니다. 콘솔을 확인하세요.');
  }
}

// DOM 준비 완료 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
