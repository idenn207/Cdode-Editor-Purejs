/**
 * 파일: src/constants/Themes.js
 * 기능: VSCode 테마 색상 정의
 * 책임: 신택스 하이라이팅 색상 스키마
 */

export const VSCODE_DARK_THEME = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',

  // Syntax colors
  keyword: '#569cd6', // if, for, function
  string: '#ce9178', // "text"
  number: '#b5cea8', // 123
  comment: '#6a9955', // // comment
  function: '#dcdcaa', // functionName()
  variable: '#9cdcfe', // variableName
  type: '#4ec9b0', // class, interface
  operator: '#d4d4d4', // +, -, =
  punctuation: '#d4d4d4', // { } ( ) ;

  // HTML specific
  tag: '#569cd6', // <div>
  attribute: '#9cdcfe', // class="..."
  attribute_value: '#ce9178', // ="value"

  // CSS specific
  selector: '#d7ba7d', // .class
  property: '#9cdcfe', // color:
  value: '#ce9178', // red

  // UI colors
  line_highlight: '#2a2a2a',
  selection: '#264f78',
  cursor: '#aeafad',
  error: '#f48771',
  warning: '#cca700',
  info: '#75beff',
};

export default VSCODE_DARK_THEME;
