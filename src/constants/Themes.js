/**
 * 파일: src/constants/Themes.js
 * 수정: 클래스명 색상 변경
 */

export const VSCODE_DARK_THEME = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',

  // Syntax colors
  keyword: '#569cd6', // if, for, function (파란색)
  keyword_control: '#c586c0', // import, export, default, continue, break (보라색)
  string: '#ce9178', // "text" (주황색)
  number: '#b5cea8', // 123 (연두색)
  comment: '#6a9955', // // comment (녹색)
  function: '#dcdcaa', // functionName() (노란색)
  variable: '#9cdcfe', // variableName (하늘색)
  type: '#4ec9b0', // class, interface (청록색)
  class: '#4ec9b0', // ClassName (청록색)
  operator: '#d4d4d4', // +, -, = (회색)
  punctuation: '#d4d4d4', // { } ( ) ; (회색)

  // HTML specific
  tag: '#569cd6', // <div> (파란색)
  attribute: '#9cdcfe', // class="..." (하늘색)
  attribute_value: '#ce9178', // ="value" (주황색)

  // CSS specific
  selector: '#d7ba7d', // .class (갈색)
  property: '#9cdcfe', // color: (하늘색)
  value: '#ce9178', // red (주황색)

  // UI colors
  line_highlight: '#2a2a2a',
  selection: '#264f78',
  cursor: '#aeafad',
  error: '#f48771',
  warning: '#cca700',
  info: '#75beff',
};

export default VSCODE_DARK_THEME;
