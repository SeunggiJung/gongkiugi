// GDD 3.1~3.3, 4, 5 의 표를 src/core/game.config.json 으로 만든다.
// 룰/수치를 바꿀 때는 GDD 를 먼저 고치고, 이 스크립트의 표를 GDD 와 맞춘 뒤 다시 실행한다.
import { writeFileSync } from "node:fs";

// 금액 문자열("1,306", "1.23만", "145억")을 정수로 바꾼다. 표 값은 유효숫자 3자리까지만 주어진다.
const UNITS = { 만: 1e4, 억: 1e8 };
function parseGold(text) {
  const m = /^([\d,.]+)\s*(만|억)?$/.exec(text.trim());
  if (!m) throw new Error("금액 형식 오류: " + text);
  return BigInt(Math.round(parseFloat(m[1].replace(/,/g, "")) * (m[2] ? UNITS[m[2]] : 1)));
}

// [단계, 성공%, 유지%, 파괴%, 슛 비용, 판매가]  (GDD 3.3, 일반 공 기준)
const ROWS = [
  [0, 100, 0, 0, "9", "224"],
  [1, 95, 4, 1, "11", "280"],
  [2, 92, 6.5, 1.5, "14", "354"],
  [3, 88, 10, 2, "18", "449"],
  [4, 84, 13, 3, "23", "574"],
  [5, 78, 18, 4, "30", "744"],
  [6, 72, 23, 5, "39", "977"],
  [7, 66, 27.5, 6.5, "52", "1,306"],
  [8, 59, 33, 8, "69", "1,722"],
  [9, 52, 38, 10, "94", "2,347"],
  [10, 45, 43, 12, "134", "3,357"],
  [11, 38, 48, 14, "204", "5,103"],
  [12, 31, 53, 16, "335", "8,380"],
  [13, 26, 56, 18, "493", "1.23만"],
  [14, 21, 59, 20, "809", "2.02만"],
  [15, 18, 60, 22, "1,533", "3.83만"],
  [16, 17.9, 59.7, 22.4, "3,303", "8.26만"],
  [17, 17.9, 59.2, 22.9, "7,214", "18만"],
  [18, 17.8, 58.9, 23.3, "1.59만", "39.9만"],
  [19, 17.7, 58.6, 23.7, "3.57만", "89.3만"],
  [20, 17.6, 58.3, 24.1, "8.11만", "203만"],
  [21, 17.6, 57.8, 24.6, "18.6만", "466만"],
  [22, 17.5, 57.5, 25, "43.3만", "1,083만"],
  [23, 17.4, 57.2, 25.4, "102만", "2,551만"],
  [24, 17.4, 56.7, 25.9, "244만", "6,088만"],
  [25, 17.3, 56.4, 26.3, "588만", "1.47억"],
  [26, 17.2, 56.1, 26.7, "1,437만", "3.59억"],
  [27, 17.1, 55.8, 27.1, "3,558만", "8.89억"],
  [28, 17.1, 55.3, 27.6, "8,920만", "22.3억"],
  [29, 17, 55, 28, "2.26억", "56.5억"],
  [30, null, null, null, null, "145억"],
];

// GDD 3.1: 등급 / 뽑기 확률% / 성공 확률 보정 / +30 판매가 배율
const GRADES = [
  { id: "common", name: "일반", drawPct: 45, successMult: 1.0, priceMultAt30: 1 },
  { id: "uncommon", name: "고급", drawPct: 27, successMult: 0.97, priceMultAt30: 1.5 },
  { id: "rare", name: "희귀", drawPct: 15, successMult: 0.94, priceMultAt30: 2.5 },
  { id: "hero", name: "영웅", drawPct: 8, successMult: 0.91, priceMultAt30: 4.5 },
  { id: "legend", name: "전설", drawPct: 4, successMult: 0.88, priceMultAt30: 8 },
  { id: "myth", name: "신화", drawPct: 1, successMult: 0.85, priceMultAt30: 15 },
];

// GDD 3.2: 종류 22종 (이름은 가제). 등급 안에서는 같은 확률로 나온다.
const KINDS = {
  common: ["동네 축구공", "고무공", "비닐 뭉치공", "헌 가죽공"],
  uncommon: ["명장면 공", "야광공", "스펀지 공", "구리 공"],
  rare: ["얼음공", "유리공", "불꽃공", "번개공"],
  hero: ["황금공", "수정공", "용암공", "네온 사이버공"],
  legend: ["우주공", "블랙홀 공", "오로라 공"],
  myth: ["무지개 공", "시간의 공", "은하 심장 공"],
};

const toBp = (pct) => Math.round(pct * 100); // 0.01% 단위 정수. 난수도 0~9999 정수로 굴린다.

const stages = ROWS.map(([stage, s, k, d, cost, price]) => ({
  stage,
  successBp: s === null ? null : toBp(s),
  keepBp: k === null ? null : toBp(k),
  destroyBp: d === null ? null : toBp(d),
  shootCost: cost === null ? null : parseGold(cost).toString(),
  basePrice: parseGold(price).toString(),
}));

for (const r of stages) {
  if (r.successBp !== null && r.successBp + r.keepBp + r.destroyBp !== 10000) {
    throw new Error(`+${r.stage} 확률 합이 100% 가 아님`);
  }
}

const config = {
  drawCost: "1000",
  startGold: "10000",
  dailyGold: "10000",
  adGold: "10000",
  inviteGold: "10000",
  adDailyLimit: 3, // GDD 4.1 · 5장: 광고 시청 하루 3회
  maxStage: 30,
  boastStage: 14, // 자랑하기 팝업이 뜨는 기준 단계 (GDD_CHANGES.md, 설정값)
  sellVariancePct: 15,
  grades: GRADES.map((g) => ({ ...g, kinds: KINDS[g.id] })),
  stages,
};

writeFileSync(new URL("../src/core/game.config.json", import.meta.url), JSON.stringify(config, null, 2) + "\n");
console.log("wrote src/core/game.config.json:", stages.length, "stages,", GRADES.length, "grades");



