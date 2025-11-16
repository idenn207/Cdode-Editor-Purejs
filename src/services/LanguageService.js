/**
 * 파일: src/services/LanguageService.js
 * 수정: 제어 키워드 분리, 클래스명 우선순위 조정
 */

import TokenParser, {
  TOKEN_ATTRIBUTE,
  TOKEN_CLASS,
  TOKEN_COMMENT,
  TOKEN_FUNCTION,
  TOKEN_IDENTIFIER,
  TOKEN_KEYWORD,
  TOKEN_KEYWORD_CONTROL,
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
      // 주석 (여러 줄) - 개선된 패턴
      { regex: '/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/', type: TOKEN_COMMENT },
      // 주석 (한 줄)
      { regex: '//.*', type: TOKEN_COMMENT },

      // 문자열 (큰따옴표)
      { regex: '"(?:[^"\\\\]|\\\\.)*"', type: TOKEN_STRING },
      // 문자열 (작은따옴표)
      { regex: "'(?:[^'\\\\]|\\\\.)*'", type: TOKEN_STRING },
      // 템플릿 리터럴
      { regex: '`(?:[^`\\\\]|\\\\.)*`', type: TOKEN_STRING },
      // 숫자
      { regex: '\\b\\d+\\.?\\d*\\b', type: TOKEN_NUMBER },

      // 제어 키워드 (보라색)
      {
        regex: '\\b(import|export|default|continue|break|return|throw|yield|if|for)\\b',
        type: TOKEN_KEYWORD_CONTROL,
      },

      // 일반 키워드 (파란색)
      {
        regex:
          '\\b(const|let|var|function|class|if|else|for|while|async|await|try|catch|new|this|super|extends|static|get|set|typeof|instanceof|in|of|do|switch|case|finally|with|delete|void|null|undefined|true|false|constructor)\\b',
        type: TOKEN_KEYWORD,
      },

      // 클래스명 (PascalCase) - Lookbehind 제거
      // class 키워드 다음에 나오는 대문자 시작 식별자는 별도 처리 필요
      { regex: '\\b[A-Z][a-zA-Z0-9_]*\\b', type: TOKEN_CLASS },

      // 함수 선언/호출 (식별자 다음에 괄호)
      { regex: '\\b[a-z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_FUNCTION },

      // 메서드/프로퍼티 (점 다음)
      { regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_METHOD },
      { regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*', type: TOKEN_PROPERTY },

      // 연산자
      { regex: '[+\\-*/%=<>!&|^~?:]+', type: TOKEN_OPERATOR },
      // 구두점
      { regex: '[{}()\\[\\];,.]', type: TOKEN_PUNCTUATION },
      // 식별자 (일반 변수) - 소문자 시작
      { regex: '\\b[a-z_$][a-zA-Z0-9_$]*\\b', type: TOKEN_IDENTIFIER },
      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
    ];
    return TokenParser.tokenize(_code, patterns);
  }

  #parseHTML(_code) {
    const patterns = [
      { regex: '<!--[\\s\\S]*?-->', type: TOKEN_COMMENT },
      { regex: '</?[a-zA-Z][a-zA-Z0-9]*', type: TOKEN_TAG },
      { regex: '/?>', type: TOKEN_TAG },
      { regex: '\\b[a-zA-Z-]+(?==)', type: TOKEN_ATTRIBUTE },
      { regex: '"[^"]*"', type: TOKEN_STRING },
      { regex: "'[^']*'", type: TOKEN_STRING },
      { regex: '[=>]', type: TOKEN_OPERATOR },
      { regex: '\\s+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  #parseCSS(_code) {
    const patterns = [
      { regex: '/\\*[\\s\\S]*?\\*/', type: TOKEN_COMMENT },
      { regex: '[.#]?[a-zA-Z][a-zA-Z0-9-]*(?=\\s*[{,])', type: TOKEN_TAG },
      { regex: '\\b[a-zA-Z-]+(?=\\s*:)', type: TOKEN_ATTRIBUTE },
      { regex: '"[^"]*"', type: TOKEN_STRING },
      { regex: "'[^']*'", type: TOKEN_STRING },
      { regex: '\\b\\d+\\.?\\d*(px|em|rem|%|vh|vw)?\\b', type: TOKEN_NUMBER },
      { regex: '#[0-9a-fA-F]{3,6}\\b', type: TOKEN_NUMBER },
      {
        regex: '\\b(important|inherit|initial|none|auto|block|inline|flex|grid)\\b',
        type: TOKEN_KEYWORD,
      },
      { regex: '[{}:;,]', type: TOKEN_PUNCTUATION },
      { regex: '\\s+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  #parseMarkdown(_code) {
    const patterns = [
      { regex: '^#{1,6}\\s+.*', type: TOKEN_KEYWORD },
      { regex: '```[\\s\\S]*?```', type: TOKEN_STRING },
      { regex: '`[^`]+`', type: TOKEN_STRING },
      { regex: '\\*\\*[^*]+\\*\\*', type: TOKEN_KEYWORD },
      { regex: '\\*[^*]+\\*', type: TOKEN_ATTRIBUTE },
      { regex: '\\[[^\\]]+\\]\\([^)]+\\)', type: TOKEN_TAG },
      { regex: '\\s+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

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
