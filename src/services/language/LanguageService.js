/**
 * 파일: src/services/language/LanguageService.js
 * 기능: 언어별 토큰 파싱
 * 책임: 각 언어에 맞는 토큰화 규칙 제공
 */

import { LANGUAGE_CSS, LANGUAGE_HTML, LANGUAGE_JAVASCRIPT, LANGUAGE_MARKDOWN } from '../../constants/Languages.js';
import BaseService from '../../core/BaseService.js';
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
} from '../../utils/TokenParser.js';

export default class LanguageService extends BaseService {
  constructor() {
    super();
    this.parsers = {
      [LANGUAGE_JAVASCRIPT]: null,
      [LANGUAGE_HTML]: null,
      [LANGUAGE_CSS]: null,
      [LANGUAGE_MARKDOWN]: null,
    };
  }

  /**
   * 초기화
   */
  initialize() {
    this.parsers[LANGUAGE_JAVASCRIPT] = this.#parseJavaScript.bind(this);
    this.parsers[LANGUAGE_HTML] = this.#parseHTML.bind(this);
    this.parsers[LANGUAGE_CSS] = this.#parseCSS.bind(this);
    this.parsers[LANGUAGE_MARKDOWN] = this.#parseMarkdown.bind(this);
    this.is_initialized = true;
  }

  /**
   * 코드 파싱
   */
  parse(_code, _language) {
    this.validateString(_code, 'code');
    this.validateNonEmptyString(_language, 'language');

    try {
      const parser = this.parsers[_language];
      if (!parser) {
        return this.#parsePlainText(_code);
      }
      return parser(_code);
    } catch (error) {
      this.handleError(error, 'parse', { language: _language });
      return this.#parsePlainText(_code);
    }
  }

  /**
   * JavaScript 파싱 (private)
   */
  #parseJavaScript(_code) {
    const patterns = [
      // 주석 (여러 줄)
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
          '\\b(const|let|var|function|class|else|while|async|await|try|catch|new|this|super|extends|static|get|set|typeof|instanceof|in|of|do|switch|case|finally|with|delete|void|null|undefined|true|false|constructor)\\b',
        type: TOKEN_KEYWORD,
      },

      // 클래스명 (PascalCase)
      { regex: '\\b[A-Z][a-zA-Z0-9_]*\\b', type: TOKEN_CLASS },

      // 함수 선언/호출 (식별자 다음에 괄호)
      { regex: '\\b[a-z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_FUNCTION },

      // 메서드 (점 다음에 괄호)
      { regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_METHOD },
      // 프로퍼티 (점 다음)
      { regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*', type: TOKEN_PROPERTY },

      // 연산자
      { regex: '[+\\-*/%=<>!&|^~?:]+', type: TOKEN_OPERATOR },
      // 구두점
      { regex: '[{}()\\[\\];,.]', type: TOKEN_PUNCTUATION },

      // 일반 식별자
      { regex: '\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b', type: TOKEN_IDENTIFIER },

      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
      // 기타
      { regex: '.', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * HTML 파싱 (private)
   */
  #parseHTML(_code) {
    const patterns = [
      // 주석
      { regex: '<!--[\\s\\S]*?-->', type: TOKEN_COMMENT },

      // 태그 시작/끝
      { regex: '</?[a-zA-Z][a-zA-Z0-9]*', type: TOKEN_TAG },
      { regex: '/?>', type: TOKEN_TAG },

      // 속성
      { regex: '\\b[a-zA-Z-]+(?==)', type: TOKEN_ATTRIBUTE },

      // 속성 값 (큰따옴표)
      { regex: '"[^"]*"', type: TOKEN_STRING },
      // 속성 값 (작은따옴표)
      { regex: "'[^']*'", type: TOKEN_STRING },

      // 연산자
      { regex: '=', type: TOKEN_OPERATOR },

      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
      // 텍스트
      { regex: '[^<>]+', type: TOKEN_TEXT },
      // 기타
      { regex: '.', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * CSS 파싱 (private)
   */
  #parseCSS(_code) {
    const patterns = [
      // 주석
      { regex: '/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/', type: TOKEN_COMMENT },

      // 선택자
      { regex: '[.#]?[a-zA-Z][a-zA-Z0-9-]*(?=[\\s{,])', type: TOKEN_TAG },

      // 프로퍼티
      { regex: '\\b[a-z-]+(?=\\s*:)', type: TOKEN_PROPERTY },

      // 숫자 (단위 포함)
      { regex: '\\b\\d+(\\.\\d+)?(px|em|rem|%|vh|vw)?\\b', type: TOKEN_NUMBER },

      // 문자열
      { regex: '"[^"]*"', type: TOKEN_STRING },
      { regex: "'[^']*'", type: TOKEN_STRING },

      // 색상 코드
      { regex: '#[0-9a-fA-F]{3,6}\\b', type: TOKEN_NUMBER },

      // 연산자
      { regex: '[:;,>+~*]', type: TOKEN_OPERATOR },
      // 구두점
      { regex: '[{}()]', type: TOKEN_PUNCTUATION },

      // 키워드
      {
        regex: '\\b(important|inherit|initial|unset|none|auto|solid|dashed|dotted)\\b',
        type: TOKEN_KEYWORD,
      },

      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
      // 기타
      { regex: '.', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * Markdown 파싱 (private)
   */
  #parseMarkdown(_code) {
    const patterns = [
      // 헤더
      { regex: '^#{1,6}\\s+.*$', type: TOKEN_KEYWORD },

      // 코드 블록
      { regex: '```[\\s\\S]*?```', type: TOKEN_COMMENT },
      // 인라인 코드
      { regex: '`[^`]+`', type: TOKEN_COMMENT },

      // 링크
      { regex: '\\[([^\\]]+)\\]\\(([^)]+)\\)', type: TOKEN_STRING },

      // 볼드
      { regex: '\\*\\*[^*]+\\*\\*', type: TOKEN_KEYWORD },
      { regex: '__[^_]+__', type: TOKEN_KEYWORD },

      // 이탤릭
      { regex: '\\*[^*]+\\*', type: TOKEN_PROPERTY },
      { regex: '_[^_]+_', type: TOKEN_PROPERTY },

      // 리스트
      { regex: '^\\s*[-*+]\\s+', type: TOKEN_OPERATOR },
      { regex: '^\\s*\\d+\\.\\s+', type: TOKEN_OPERATOR },

      // 공백
      { regex: '\\s+', type: TOKEN_TEXT },
      // 텍스트
      { regex: '.+', type: TOKEN_TEXT },
    ];

    return TokenParser.tokenize(_code, patterns);
  }

  /**
   * 일반 텍스트 파싱 (private)
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

  /**
   * 지원 언어 확인
   */
  isLanguageSupported(_language) {
    return this.parsers.hasOwnProperty(_language);
  }

  /**
   * 지원 언어 목록
   */
  getSupportedLanguages() {
    return Object.keys(this.parsers);
  }

  /**
   * 서비스 종료
   */
  destroy() {
    this.parsers = {};
    this.is_initialized = false;
    super.destroy();
  }
}
