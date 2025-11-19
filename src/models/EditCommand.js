/**
 * 파일: src/models/EditCommand.js
 * 기능: 편집 커맨드 베이스 클래스
 * 책임: 실행/되돌리기 인터페이스 정의
 */

export default class EditCommand {
  constructor(_document) {
    this.document = _document;
    this.timestamp = Date.now();
  }

  execute() {
    throw new Error('execute() must be implemented');
  }

  undo() {
    throw new Error('undo() must be implemented');
  }

  redo() {
    this.execute();
  }
}
