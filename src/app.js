/**
 * 파일: src/app.js
 * 기능: 애플리케이션 진입점
 * 책임: 전체 애플리케이션 초기화 및 컴포넌트 조립
 */

import FileController from './controllers/FileController.js';
import FileSystemService from './services/FileSystemService.js';
import Sidebar from './views/components/Sidebar.js';

class Application {
  constructor() {
    this.services = {
      fileSystem: null,
    };

    this.controllers = {
      file: null,
    };

    this.views = {
      sidebar: null,
    };
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize() {
    console.log('🚀 Web Code Editor 초기화 중...');

    // Services 초기화
    this.services.fileSystem = new FileSystemService();

    // Controllers 초기화
    this.controllers.file = new FileController(this.services.fileSystem);

    // Views 초기화
    this.views.sidebar = new Sidebar('Sidebar');

    // 이벤트 연결
    this.#connectEvents();

    // 스타일 로드
    await this.#loadStyles();

    console.log('✅ 초기화 완료');
  }

  /**
   * 이벤트 연결
   */
  #connectEvents() {
    // Sidebar → FileController
    this.views.sidebar.on('request-open-folder', async () => {
      await this.controllers.file.openDirectory();
    });

    this.views.sidebar.on('file-selected', async (fileNode) => {
      await this.controllers.file.openFile(fileNode);
    });

    // FileController → Sidebar
    this.controllers.file.on('directory-opened', (rootNode) => {
      this.views.sidebar.render(rootNode);
    });

    this.controllers.file.on('file-opened', (data) => {
      console.log('파일 열림:', data.node.name);
      console.log('내용:', data.content.substring(0, 100) + '...');
      // Phase 2에서 EditorPane에 내용 표시
    });

    this.controllers.file.on('error', (error) => {
      console.error('오류 발생:', error.message);
      alert(error.message);
    });
  }

  /**
   * 추가 스타일 로드
   */
  async #loadStyles() {
    const styles = ['sidebar'];

    for (const style of styles) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `src/styles/${style}.css`;
      document.head.appendChild(link);
    }
  }
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', async () => {
  const app = new Application();
  await app.initialize();

  // 전역 접근 (디버깅용)
  window.app = app;
});
