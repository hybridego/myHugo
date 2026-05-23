# Datatype 사용 방법

이 블로그에는 `franktisellano/datatype`의 Datatype variable font가 적용되어 있다. Datatype은 텍스트 표현식을 OpenType ligature로 바꿔서 인라인 차트처럼 보여주는 폰트다. JavaScript, SVG, 이미지 없이 글 본문 안에서 작은 차트를 표현할 때 쓴다.

- Upstream: <https://github.com/franktisellano/datatype>
- 적용 버전: `v1.2.2`
- 폰트 파일: `static/fonts/datatype.woff2`
- 라이선스 파일: `static/fonts/OFL-Datatype.txt`
- CSS: `static/css/datatype.css`
- Hugo shortcode: `layouts/shortcodes/datatype.html`

## 기본 사용

Markdown 글에서 shortcode를 사용한다.

```markdown
매출 흐름 {{< datatype "{l:20,45,60,55,80,95}" >}} 은 개선 중입니다.
목표 달성률은 {{< datatype "{p:73}" >}} 입니다.
분기별 결과는 {{< datatype "{b:30,70,20,90}" >}} 입니다.
```

렌더링 시 실제로는 다음과 같은 HTML이 만들어진다.

```html
<span class="datatype-chart">{l:20,45,60,55,80,95}</span>
```

Markdown에서 HTML을 직접 써도 된다.

```markdown
매출 흐름 <span class="datatype-chart">{l:20,45,60,55,80,95}</span> 은 개선 중입니다.
```

## 차트 문법

Datatype은 세 가지 표현을 지원한다.

| 종류 | 문법 | 예시 | 설명 |
| --- | --- | --- | --- |
| Bar chart | `{b:값,값,...}` | `{b:15,45,80,30,60}` | 막대 차트 |
| Sparkline | `{l:값,값,...}` | `{l:10,40,25,70,50,90}` | 선형 미니 차트 |
| Pie chart | `{p:값}` | `{p:62}` | 퍼센트 원형 차트 |

값은 `0`부터 `100` 사이의 정수를 사용한다. Datatype 폰트는 소수점 ligature를 지원하지 않으므로 `11.8`처럼 소수값을 넣으면 차트 변환이 중간에서 깨진다. 소수 데이터는 반올림해서 `{b:12,15,19}`처럼 입력한다. Bar chart와 sparkline은 최대 20개 값까지 쓰는 것이 안전하다.

## 표에서 사용

Markdown table 안에서도 shortcode를 사용할 수 있다.

```markdown
| 종목 | 30일 흐름 | 변화율 |
| --- | --- | --- |
| AAPL | {{< datatype "{l:40,25,10,34,73,93,85,26}" >}} | -2.27% |
| NVDA | {{< datatype "{l:55,70,63,71,100,67,88,53}" >}} | -2.21% |
```

## 한글과 같이 쓸 때

Datatype은 차트 표현식에만 적용한다. 한글 문장 전체에 `datatype-chart` 클래스를 걸면 한글 글리프가 Datatype에 없어서 브라우저 fallback 폰트로 표시된다. 문장 전체가 아니라 `{l:...}`, `{b:...}`, `{p:...}` 부분만 감싸는 방식이 안전하다.

좋은 예:

```markdown
매출 흐름 {{< datatype "{l:20,45,60,55,80,95}" >}} 은 개선 중입니다.
```

피해야 할 예:

```html
<span class="datatype-chart">매출 흐름 {l:20,45,60,55,80,95} 은 개선 중입니다.</span>
```

## 표시 스타일

기본 스타일은 `datatype-chart` 클래스가 담당한다. 필요하면 HTML 직접 사용 시 보조 클래스를 추가할 수 있다.

```html
<span class="datatype-chart datatype-chart--compact">{l:20,45,60,55,80,95}</span>
<span class="datatype-chart datatype-chart--wide">{b:30,70,20,90}</span>
<span class="datatype-chart datatype-chart--heavy">{p:73}</span>
```

- `datatype-chart--compact`: 폭을 좁게 표시
- `datatype-chart--wide`: 폭을 넓게 표시
- `datatype-chart--heavy`: 선이나 막대를 굵게 표시

Shortcode는 기본 스타일만 지원한다. 보조 클래스가 필요하면 HTML 직접 사용 방식을 쓴다.

## 참고

- 이 기능은 OpenType ligature를 사용하는 폰트 기능이다. 복사한 텍스트는 여전히 `{l:...}` 같은 원본 표현식이다.
- 코드블록 안에서는 차트로 렌더링하지 않는다. 본문, 문장, 표 셀에서 사용한다.
- RSS 리더나 일부 외부 미리보기에서는 웹폰트가 로드되지 않아 원본 표현식으로 보일 수 있다.
