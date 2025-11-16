/**
 * 파일: src/utils/TokenParser.js
 * 기능: 소스코드 토큰 분석
 * 책임: 코드를 의미 단위로 분리
 */

// 토큰 타입
export const TOKEN_KEYWORD = 'keyword';
export const TOKEN_STRING = 'string';
export const TOKEN_COMMENT = 'comment';
export const TOKEN_NUMBER = 'number';
export const TOKEN_OPERATOR = 'operator';
export const TOKEN_IDENTIFIER = 'identifier';
export const TOKEN_PUNCTUATION = 'punctuation';
export const TOKEN_TAG = 'tag';
export const TOKEN_ATTRIBUTE = 'attribute';
export const TOKEN_TEXT = 'text';
export const TOKEN_FUNCTION = 'function';
export const TOKEN_CLASS = 'class';
export const TOKEN_PROPERTY = 'property';
export const TOKEN_METHOD = 'method';
export const TOKEN_CONSTANT = 'constant';

export default class TokenParser {
  /**
   * 정규식 매칭으로 토큰 생성
   */
  static tokenize(_code, _patterns) {
    const tokens = [];
    let remaining = _code;
    let position = 0;

    while (remaining.length > 0) {
      let matched = false;

      for (const pattern of _patterns) {
        const regex = new RegExp(`^${pattern.regex}`);
        const match = remaining.match(regex);

        if (match) {
          tokens.push({
            type: pattern.type,
            value: match[0],
            start: position,
            end: position + match[0].length,
          });

          position += match[0].length;
          remaining = remaining.substring(match[0].length);
          matched = true;
          break;
        }
      }

      // 매칭 안되면 한 글자씩 진행
      if (!matched) {
        tokens.push({
          type: TOKEN_TEXT,
          value: remaining[0],
          start: position,
          end: position + 1,
        });
        position++;
        remaining = remaining.substring(1);
      }
    }

    return tokens;
  }

  /**
   * 토큰 배열을 텍스트로 병합
   */
  static tokensToText(_tokens) {
    return _tokens.map((_t) => _t.value).join('');
  }
}
