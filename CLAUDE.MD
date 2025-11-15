# CodeEidtor Technical Document

## 기술 스택

- html 5
- css
- purejs (not Node.js)

## 프로젝트 구조

```plaintext
index.html
src/
├──app.js
├──controllers/
├──services/
└──views/
```

## 패러다임

- 객체(Class)형 프로그래밍

## 주요 원칙

1. 객체 지향 설계 원칙 (SOLID)

- SRP (단일 책임 원칙): 클래스는 하나의 책임만 가져야 합니다.
- OCP (개방-폐쇄 원칙): 클래스는 확장에는 열려 있고, 변경에는 닫혀 있어야 합니다.
- LSP (리스코프 치환 원칙): 자식 클래스는 부모 클래스의 인스턴스처럼 동작해야 합니다.
- ISP (인터페이스 분리 원칙): 클라이언트가 사용하지 않는 인터페이스에 의존하지 않아야 합니다.
- DIP (의존 역전 원칙): 추상화에 의존하고 구체적인 구현에 의존하지 않아야 합니다.

1. UX/UI 디자인 원칙

- 명확성: 사용자 인터페이스가 명확하고 이해하기 쉬워야 합니다.
- 일관성: 색 구성표, 글꼴, 버튼 스타일 등 디자인 요소가 일관성을 유지해야 합니다.
- 시각적 계층: 중요한 요소가 눈에 잘 띄도록 시각적 계층을 구축합니다.
- 피드백: 사용자에게 관련성 있는 피드백을 제공합니다.
- 접근성: 모든 사용자가 웹사이트를 쉽게 이용할 수 있도록 접근성을 고려해야 합니다.

## 디자인 패턴

- Observer Pattern
- Command Pattern
- Strategy Pattern
- Decorator Pattern
- Virtual DOM Pattern

## 코드 패턴

- Rope Data Structure
- Debounce/Throttle

## 코드 스타일

- 파일 최상단 파일경로, 기능, 책임 주석작성
- import/export 패턴 사용
- export default 구분만 사용
- 객체에서 요소 조회시 `fooObject.foo;` 패턴 사용
- enum 요소는 `const FRUIT = 'apple' | 'banana` 패턴으로 관리
- 초기화 패턴은 배열방식이 아닌 객체방식으로 관리

  ```javascript
  // 예시)

  // 잘못된 패턴
  const systems = [];

  systems.push(new FooSystem());
  systems.push(new BarSystem());

  // 옳은 패턴
  const systems = {
    foo: null,
    bar: null,
  };
  systems.foo = new FooSystem();
  systems.bar = new BarSystem();
  ```

## Convention

- Variable: camelCase
- Function: camelCase
- Class(js): PascalCase
- Field: snake_case
- Private Field: '\_' + snake_case
- Method: camelCase
- Private Method: '#' + camelCase
- Constant Variable: SCREAMING_SNAKE_CASE
- id: PascalCase
- name: camelCase
- class(html): kebab-case
