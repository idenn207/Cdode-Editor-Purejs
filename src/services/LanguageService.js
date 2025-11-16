/**
 * 파일: src/services/LanguageService.js
 * 기능: 언어별 파싱 전략
 * 책임: 각 언어에 맞는 토큰화 규칙 제공
 */

import TokenParser, {
  TOKEN_ATTRIBUTE,
  TOKEN_CLASS,
  TOKEN_COMMENT,
  TOKEN_CONSTANT,
  TOKEN_FUNCTION,
  TOKEN_IDENTIFIER,
  TOKEN_KEYWORD,
  TOKEN_METHOD,
  TOKEN_NUMBER,
  TOKEN_OPERATOR,
  TOKEN_PROPERTY,
  TOKEN_PUNCTUATION,
  TOKEN_STRING,
  TOKEN_TAG,
  TOKEN_TEXT,
} from '../utils/TokenParser.js';

import { LANGUAGE_CSS, LANGUAGE_HTML, LANGUAGE_JAVASCRIPT, LANGUAGE_MARKDOWN } from '../constants/Languages.js';

export default class LanguageService {
  constructor() {
    this.parsers = {
      [LANGUAGE_JAVASCRIPT]: this.#parseJavaScript.bind(this),
      [LANGUAGE_HTML]: this.#parseHTML.bind(this),
      [LANGUAGE_CSS]: this.#parseCSS.bind(this),
      [LANGUAGE_MARKDOWN]: this.#parseMarkdown.bind(this),
    };
  }

  /**
   * 언어별 파싱
   */
  parse(_code, _language) {
    const parser = this.parsers[_language];
    if (!parser) {
      return this.#parsePlainText(_code);
    }
    return parser(_code);
  }

  /**
   * JavaScript 파싱
   */
  #parseJavaScript(_code) {
    const patterns = [
      // 주석 (한 줄)
      { regex: '//.*', type: TOKEN_COMMENT },
      // 주석 (여러 줄)
      { regex: '/\\*[\\s\\S]*?\\*/', type: TOKEN_COMMENT },
      // 문자열 (큰따옴표)
      { regex: '"(?:[^"\\\\]|\\\\.)*"', type: TOKEN_STRING },
      // 문자열 (작은따옴표)
      { regex: "'(?:[^'\\\\]|\\\\.)*'", type: TOKEN_STRING },
      // 템플릿 리터럴
      { regex: '`(?:[^`\\\\]|\\\\.)*`', type: TOKEN_STRING },
      // 숫자
      { regex: '\\b\\d+\\.?\\d*\\b', type: TOKEN_NUMBER },

      // 키워드
      {
        regex:
          '\\b(const|let|var|function|class|if|else|for|while|return|import|export|default|async|await|try|catch|new|this|super|extends|static|get|set|typeof|instanceof|in|of|break|continue|switch|case|throw|finally|do|yield|from|as|null|undefined|true|false|void|delete|with)\\b',
        type: TOKEN_KEYWORD,
      },

      // 클래스명 (class 키워드 다음 또는 extends 다음)
      { regex: '(?<=class\\s+)[A-Z][a-zA-Z0-9_]*', type: TOKEN_CLASS },
      { regex: '(?<=extends\\s+)[A-Z][a-zA-Z0-9_]*', type: TOKEN_CLASS },
      { regex: '(?<=new\\s+)[A-Z][a-zA-Z0-9_]*', type: TOKEN_CLASS },

      // 상수 (SCREAMING_SNAKE_CASE)
      { regex: '\\b[A-Z][A-Z0-9_]*\\b', type: TOKEN_CONSTANT },

      // 함수 선언/호출 (식별자 다음에 괄호)
      { regex: '\\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_FUNCTION },

      // 메서드/프로퍼티 (점 다음)
      { regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_METHOD },
      { regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*', type: TOKEN_PROPERTY },

      // 연산자
      { regex: '[+\\-*/%=<>!&|^~?:]+', type: TOKEN_OPERATOR },
      // 구두점
      { regex: '[{}()\\[\\];,.]', type: TOKEN_PUNCTUATION },
      // 식별자 (일반 변수)
      { regex: '\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b', type: TOKEN_IDENTIFIER },
      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * HTML 파싱
   */
  #parseHTML(_code) {
    const patterns = [
      // 주석
      { regex: '<!--[\\s\\S]*?-->', type: TOKEN_COMMENT },
      // 태그
      { regex: '</?[a-zA-Z][a-zA-Z0-9]*', type: TOKEN_TAG },
      { regex: '/?>', type: TOKEN_TAG },
      // 속성명
      { regex: '\\b[a-zA-Z-]+(?==)', type: TOKEN_ATTRIBUTE },
      // 속성값 (따옴표)
      { regex: '"[^"]*"', type: TOKEN_STRING },
      { regex: "'[^']*'", type: TOKEN_STRING },
      // 연산자
      { regex: '[=>]', type: TOKEN_OPERATOR },
      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * CSS 파싱
   */
  #parseCSS(_code) {
    const patterns = [
      // 주석
      { regex: '/\\*[\\s\\S]*?\\*/', type: TOKEN_COMMENT },
      // 선택자 (간단한 버전)
      { regex: '[.#]?[a-zA-Z][a-zA-Z0-9-]*(?=\\s*[{,])', type: TOKEN_TAG },
      // 속성명
      { regex: '\\b[a-zA-Z-]+(?=\\s*:)', type: TOKEN_ATTRIBUTE },
      // 속성값 (문자열)
      { regex: '"[^"]*"', type: TOKEN_STRING },
      { regex: "'[^']*'", type: TOKEN_STRING },
      // 숫자 (단위 포함)
      { regex: '\\b\\d+\\.?\\d*(px|em|rem|%|vh|vw)?\\b', type: TOKEN_NUMBER },
      // 색상 코드
      { regex: '#[0-9a-fA-F]{3,6}\\b', type: TOKEN_NUMBER },
      // 키워드
      {
        regex: '\\b(important|inherit|initial|none|auto|block|inline|flex|grid)\\b',
        type: TOKEN_KEYWORD,
      },
      // 구두점
      { regex: '[{}:;,]', type: TOKEN_PUNCTUATION },
      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * Markdown 파싱 (간단한 버전)
   */
  #parseMarkdown(_code) {
    const patterns = [
      // 헤더
      { regex: '^#{1,6}\\s+.*', type: TOKEN_KEYWORD },
      // 코드 블록
      { regex: '```[\\s\\S]*?```', type: TOKEN_STRING },
      // 인라인 코드
      { regex: '`[^`]+`', type: TOKEN_STRING },
      // 굵게
      { regex: '\\*\\*[^*]+\\*\\*', type: TOKEN_KEYWORD },
      // 기울임
      { regex: '\\*[^*]+\\*', type: TOKEN_ATTRIBUTE },
      // 링크
      { regex: '\\[[^\\]]+\\]\\([^)]+\\)', type: TOKEN_TAG },
      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * 일반 텍스트
   */
  #parsePlainText(_code) {
    return [
      {
        type: TOKEN_TEXT,
        value: _code,
        start: 0,
        end: _code.length,
      },
    ];
  }
}
