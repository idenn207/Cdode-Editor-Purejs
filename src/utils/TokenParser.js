/**
 * 파일: src/utils/TokenParser.js
 * 수정: 제어 키워드 토큰 타입 추가
 */

// 토큰 타입
export const TOKEN_KEYWORD = 'keyword';
export const TOKEN_KEYWORD_CONTROL = 'keyword-control'; // 새로 추가
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

  static tokensToText(_tokens) {
    return _tokens.map((_t) => _t.value).join('');
  }
}
