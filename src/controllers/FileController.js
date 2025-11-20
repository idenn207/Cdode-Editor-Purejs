/**
 * 파일: src/controllers/FileController.js
 * 기능: 파일 작업 관리 (열기, 저장, 삭제 등)
 * 책임:
 * - FileSystemService와 상호작용
 * - 파일 작업 결과를 이벤트로 발행
 */

import BaseController from '../core/BaseController.js';
import ValidationUtils from '../utils/ValidationUtils.js';

export default class FileController extends BaseController {
  constructor(_fileSystemService) {
    super();

    ValidationUtils.assertNonNull(_fileSystemService, 'FileSystemService');

    this.registerService('fileSystem', _fileSystemService);
  }

  /**
   * 컨트롤러 초기화
   */
  initialize() {
    super.initialize();

    const fileSystem = this.getService('fileSystem');

    // FileSystemService 이벤트 구독
    fileSystem.on('directory-selected', (_rootNode) => {
      this.emit('directory-loaded', _rootNode);
    });
  }

  /**
   * 디렉토리 선택
   */
  async selectDirectory() {
    try {
      const fileSystem = this.getService('fileSystem');
      await fileSystem.selectDirectory();
    } catch (error) {
      this.handleError(error, 'selectDirectory');
      this.emit('error', {
        message: '디렉토리 선택 실패',
        error,
      });
    }
  }

  /**
   * 파일 열기
   * @param {FileNode} _fileNode - 열 파일 노드
   */
  async openFile(_fileNode) {
    try {
      ValidationUtils.assertNonNull(_fileNode, 'FileNode');

      if (_fileNode.is_directory) {
        throw new Error('디렉토리는 열 수 없습니다');
      }

      const fileSystem = this.getService('fileSystem');
      const content = await fileSystem.readFile(_fileNode);

      this.emit('file-opened', {
        node: _fileNode,
        content,
      });
    } catch (error) {
      this.handleError(error, 'openFile');
      this.emit('error', {
        message: `파일 열기 실패: ${_fileNode?.name || '알 수 없는 파일'}`,
        error,
      });
    }
  }

  /**
   * 파일 저장
   * @param {FileNode} _fileNode - 저장할 파일 노드
   * @param {string} _content - 파일 내용
   */
  async saveFile(_fileNode, _content) {
    try {
      ValidationUtils.assertNonNull(_fileNode, 'FileNode');
      ValidationUtils.assertString(_content, 'Content');

      const fileSystem = this.getService('fileSystem');
      await fileSystem.writeFile(_fileNode, _content);

      this.emit('file-saved', _fileNode);
    } catch (error) {
      this.handleError(error, 'saveFile');
      this.emit('error', {
        message: `파일 저장 실패: ${_fileNode?.name || '알 수 없는 파일'}`,
        error,
      });
    }
  }

  /**
   * 파일 생성
   * @param {FileNode} _parentNode - 부모 디렉토리 노드
   * @param {string} _fileName - 파일명
   * @param {string} _content - 초기 내용
   */
  async createFile(_parentNode, _fileName, _content = '') {
    try {
      ValidationUtils.assertNonNull(_parentNode, 'ParentNode');
      ValidationUtils.assertNonEmptyString(_fileName, 'FileName');
      ValidationUtils.assertString(_content, 'Content');

      if (!_parentNode.is_directory) {
        throw new Error('부모 노드가 디렉토리가 아닙니다');
      }

      const fileSystem = this.getService('fileSystem');
      const newFileNode = await fileSystem.createFile(_parentNode, _fileName, _content);

      this.emit('file-created', newFileNode);

      return newFileNode;
    } catch (error) {
      this.handleError(error, 'createFile');
      this.emit('error', {
        message: `파일 생성 실패: ${_fileName}`,
        error,
      });
      return null;
    }
  }

  /**
   * 파일 삭제
   * @param {FileNode} _fileNode - 삭제할 파일 노드
   */
  async deleteFile(_fileNode) {
    try {
      ValidationUtils.assertNonNull(_fileNode, 'FileNode');

      const confirmed = window.confirm(`"${_fileNode.name}"을(를) 정말 삭제하시겠습니까?`);

      if (!confirmed) {
        return;
      }

      const fileSystem = this.getService('fileSystem');
      await fileSystem.deleteFile(_fileNode);

      this.emit('file-deleted', _fileNode);
    } catch (error) {
      this.handleError(error, 'deleteFile');
      this.emit('error', {
        message: `파일 삭제 실패: ${_fileNode?.name || '알 수 없는 파일'}`,
        error,
      });
    }
  }

  /**
   * 파일 이름 변경
   * @param {FileNode} _fileNode - 이름을 변경할 파일 노드
   * @param {string} _newName - 새 이름
   */
  async renameFile(_fileNode, _newName) {
    try {
      ValidationUtils.assertNonNull(_fileNode, 'FileNode');
      ValidationUtils.assertNonEmptyString(_newName, 'NewName');

      if (_fileNode.name === _newName) {
        return;
      }

      const fileSystem = this.getService('fileSystem');
      await fileSystem.renameFile(_fileNode, _newName);

      this.emit('file-renamed', {
        node: _fileNode,
        oldName: _fileNode.name,
        newName: _newName,
      });
    } catch (error) {
      this.handleError(error, 'renameFile');
      this.emit('error', {
        message: `파일 이름 변경 실패: ${_fileNode?.name || '알 수 없는 파일'}`,
        error,
      });
    }
  }

  /**
   * 파일 시스템 루트 노드 가져오기
   * @returns {FileNode|null}
   */
  getRootNode() {
    const fileSystem = this.getService('fileSystem');
    return fileSystem.root_node || null;
  }

  /**
   * 파일 시스템 사용 가능 여부
   * @returns {boolean}
   */
  hasFileSystem() {
    const fileSystem = this.getService('fileSystem');
    return fileSystem.hasRootHandle();
  }
}
