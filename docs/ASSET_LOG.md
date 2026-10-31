# 에셋 확정 기록

| 날짜 | 대상 | 상태 | 내용 |
|---|---|---|---|
| 2026-10-30 | 아트 스타일 | **확정** | 스타일 F (포근한 동화풍 픽셀, 200×356 기준 40색, 따뜻한 질감). 시안: `preview/styleboard/F.png` |
| 2026-10-30 | UI 레이아웃 | 선택 (A안) | A 클래식 풀필드. 확정 전 단계: 실제 플레이 화면에서 확인한다. 시안: `preview/ui/A_*.png` |
| 2026-10-30 | 버튼 · 팝업 프레임 | **확정** (A안 나무판자) | 사용자가 "확정"이라고 답함. 원본 시트와 잘라 낸 조각을 `assets/approved/frames/` 에 두고 게임에 적용한다. 시안: `preview/frames/A_kit.png`, `A_screen.png` |
| 2026-10-30 | 필드 배경 | **확정** (B안 맑은 봄날) | 사용자가 "B, B, A로 확정". 나중에 상점의 구장 · 배경으로 바꿀 수 있게 A(가을 석양), C(비 갠 저녁)는 후보로 보관 |
| 2026-10-30 | 골대 | **확정** (B안 흰색 골대) | A(나무), C(녹슨 금속)는 상점 골대 스킨 후보로 보관 |
| 2026-10-30 | 키퍼 | **확정** (A안 꼬마 키퍼) | B(콧수염 아저씨), C(통통한 마스코트)는 상점 키퍼 스킨 후보로 보관 |
| 2026-10-30 | 공 이미지 (22종 0단계) | **확정** | 22종 +0 기본 이미지(64×64, 28색)를 `assets/approved/balls/` 에 두고 적용했다 (시안 `preview/balls0.html`, 후보 원본은 `assets/candidates/balls/`). 모든 단계가 이 이미지를 쓰고 단계 효과(후광 · 고리 · 왕관)만 코드로 겹친다. **+20 이상 단계 이미지와 티어별 외형은 크레딧이 생기면 만든다.** |
| 2026-10-30 | 공 단계 효과 (22종 × +5 · +10 · +15 효과 겹치기) | **보류 · 방향 변경으로 확정하지 않음** (후보로만 보관) | 확정된 +0 공 위에 겹치는 종류별 효과 이미지 66장 (128px, 투명 PNG). 시안 `preview/tierfx.html`, 후보 `assets/candidates/balls/tiers/`. 확정되면 `node tools/approve_fx.mjs tiers` 로 `assets/approved/balls_fx/` 에 옮긴다. 사용자가 "본체 디자인 자체가 구간마다 바뀌는 방식"을 원해서 방향이 바뀌었다 (`docs/BALL_CONCEPTS.md`). |
| 2026-10-30 | 공 22종 구간 본체 (+5 · +10 · +15) | **확정** (적용 완료) | 종류당 512 시트 1장(2×2: +0 재현 · +5 · +10 · +15)에서 투명 PNG 66장을 뽑았다. 시안 `preview/bands_all.html`(용암공은 `preview/bands.html`), 후보 `assets/candidates/balls/bands/`. `node tools/approve_bands.mjs all` 로 `assets/approved/balls/` 에 옮겨 게임 · 도감 · 자랑 카드에 적용했다 (66장 + `bands.json`). 명장면 공(글자가 그려져 재생성), 황금공(+15 가 +10 보다 칙칙해 재생성)은 재생성본이다. **+20 이상은 크레딧이 생기면 만든다.** |
| 2026-10-30 | 강화 버스트 (22종) | **확정 대기** | 강화 성공 순간의 종류별 버스트 이미지 22장. 위와 같은 폴더에 같이 옮긴다. |
| 2026-10-30 | 슛 결과 연출 (골 · 파괴 · 키퍼 막기 · 골대 맞기) | **확정 대기** | 효과 이미지 4장. 후보 `assets/candidates/fx/`. 확정되면 `node tools/approve_fx.mjs result`. |
| 2026-10-30 | 로고 엠블럼 | **확정 대기** | 날개 달린 공 + 왕관 (글자 없음). `node tools/approve_fx.mjs logo` 로 옮긴다 (적용 위치는 확정 뒤 정한다: 즐겨찾기 아이콘, 규칙 설명 팝업 등). |
| 2026-10-30 | 공 이름 | 보류 | 단계마다 고유 이름 (`docs/NAMES_DRAFT.md`). 동네 축구공만 31단계 전부 있음. |

## 확정되어 게임에 적용된 에셋

`assets/approved/frames/` (원본 시트 `A_kit_original.png` 를 `tools/slice_frames.py` 로 잘라 투명 배경으로 만든 조각)

| 조각 | 쓰는 곳 |
|---|---|
| `btn_brown` / `btn_blue` / `btn_orange` | 기본 · 파랑(확인 · 구매) · 주황(팔기) 버튼. 왼쪽 절반을 좌우 반전한 대칭 버튼이고 9분할로 늘린다. 눌림은 CSS 로 어둡게 표현 |
| `panel` | 팝업 패널. 제목판 · 닫기 버튼이 덮은 테두리를 메운 버전 |
| `title_plate`, `close_btn` | 팝업 제목판, 닫기 버튼 |
| `gold_pill` | 골드 표시 (코인 포함) |
| `chip_green` / `chip_yellow` / `chip_red` | 성공 · 유지 · 파괴 확률 칩 |
| `banner` | 공 이름 리본 |
| `icon_btn` | 왼쪽 도감 · 상점 · 충전 버튼 틀 |
| `icon_book`, `icon_bag`, `icon_coin_plus`, `icon_question` | 도감, 상점, 충전, 규칙 설명 아이콘 |

버튼 · 팝업의 글자는 이미지에 없고 코드가 올린다.

`assets/approved/field/` (후보 원본을 `tools/process_field.py` 로 같은 도트 밀도로 줄이고 팔레트를 제한한 결과)

| 파일 | 내용 |
|---|---|
| `bg.png` | 필드 배경 B (256×455, 48색) |
| `goal.png` | 골대 B (폭 215px, 32색, 그물 칸 투명) |
| `keeper_ready.png`, `keeper_dive_left.png`, `keeper_dive_right.png`, `keeper_jump.png` | 키퍼 A 포즈 4종 (대기 높이 49px) |
| `manifest.json` | 위 이미지 크기와 선택한 후보 (코드가 비율 계산에 사용) |

## 보관 중인 후보 (버리지 않는다)
나중에 상점의 구장 · 배경, 골대 · 키퍼 스킨으로 바꿀 수 있게 후보를 모두 `assets/candidates/` 에 보관한다.
- `assets/candidates/field/`: 배경 A · B · C, 골대 A · B · C, 키퍼 A · B · C (투명 처리본 + 포즈 분리본 + `raw/` 원본)
- `assets/candidates/frames/`, `styleboard/`, `balls/`: 프레임 B · C, 스타일 보드 A~F, 공 샘플
- 후보를 쓸 때는 `py -3.12 tools/process_field.py --bg A --goal C --keeper B --out <폴더>` 로 같은 도트 밀도로 만든다. 키퍼 B 는 다이빙이 둘 다 오른쪽으로 나와서 왼쪽은 반전해서 써야 한다.
- 갤러리(`preview/`)도 그대로 둔다 (`npm run preview`).

## 아직 없는 것
공의 +5 이상 단계별 외형(장식 이미지)과 +20 이상 이미지는 아직 없다. 지금은 코드가 만든 후광 · 고리 · 왕관으로 표현한다. 크레딧이 생기면 만든다.




