/**
 * 파일: src/controllers/FileController.js
 * 기능: 파일 관련 로직 제어
 * 책임: 파일 열기/닫기, 디렉토리 로드 조율
 */

import EventEmitter from '../utils/EventEmitter.js';

export default class FileController extends EventEmitter {
  constructor(fileSystemService) {
    super();
    this.fileSystemService = fileSystemService;
    this.root_node = null;
  }

  /**
   * 디렉토리 선택 및 로드
   */
  async openDirectory() {
    try {
      const rootNode = await this.fileSystemService.selectDirectory();

      if (rootNode) {
        this.root_node = rootNode;
        this.emit('directory-opened', rootNode);
        return rootNode;
      }

      return null;
    } catch (error) {
      console.error('디렉토리 열기 실패:', error);
      this.emit('error', {
        message: '디렉토리를 열 수 없습니다.',
        error,
      });
      return null;
    }
  }

  /**
   * 파일 열기
   */
  async openFile(fileNode) {
    try {
      const content = await this.fileSystemService.readFile(fileNode);

      this.emit('file-opened', {
        node: fileNode,
        content: content,
        language: this.#detectLanguage(fileNode),
      });

      return content;
    } catch (error) {
      console.error('파일 열기 실패:', error);
      this.emit('error', {
        message: `파일을 열 수 없습니다: ${fileNode.name}`,
        error,
      });
      return null;
    }
  }

  /**
   * 파일 저장
   */
  async saveFile(fileNode, content) {
    try {
      await this.fileSystemService.writeFile(fileNode, content);
      this.emit('file-saved', { node: fileNode });
    } catch (error) {
      console.error('파일 저장 실패:', error);
      this.emit('error', {
        message: `파일을 저장할 수 없습니다: ${fileNode.name}`,
        error,
      });
    }
  }

  /**
   * 언어 감지
   */
  #detectLanguage(fileNode) {
    const ext = fileNode.getExtension();
    const langMap = {
      '.js': 'javascript',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
    };
    return langMap[ext] || 'plaintext';
  }

  /**
   * 루트 노드 반환
   */
  getRootNode() {
    return this.root_node;
  }
}
