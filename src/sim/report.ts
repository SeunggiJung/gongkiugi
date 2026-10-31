// GDD 3.3~3.4, 4.1 의 수치를 설정 JSON + 코어 로직으로 다시 계산해 비교한다.
// 실행: npm run sim   →  docs/BALANCE_REPORT.md
import { writeFileSync } from "node:fs";
import { reachProb, netRateWhenSellingAt, weightedReachProb } from "./analytic";
import { playUntilBroke, simulateReach } from "./montecarlo";
import { config } from "../core/config";
import { seededRng } from "../core/rng";

const out: string[] = [];
const log = (s = "") => out.push(s);
const pct = (x: number, d = 1) => (x * 100).toFixed(d) + "%";
const oneIn = (p: number) => (p > 0 ? "1/" + Math.round(1 / p).toLocaleString("en-US") : "-");

log("# 밸런스 검증 리포트");
log();
log("설정 JSON(`src/core/game.config.json`)과 코어 로직으로 GDD 수치를 다시 계산한 결과다. `npm run sim` 으로 다시 만든다.");
log("GDD 값은 PDF 원문이며, 어긋나는 곳은 **차이** 열에 적는다. 수치는 바꾸지 않았다.");
log();

// 1. 일반 공 도달 확률
log("## 1. 일반 공이 파괴되기 전에 도달할 확률 (GDD 3.4)");
log();
log("| 단계 | GDD | 계산 (일반) | 계산 (전체 등급 가중) |");
log("|---|---|---|---|");
const gddReach: Record<number, string> = { 10: "55%", 12: "32%", 15: "약 6% (약 16개에 1개)", 20: "0.1% (약 970개에 1개)", 25: "약 8만 개에 1개", 30: "약 940만 개에 1개" };
for (const n of [10, 12, 15, 20, 25, 30]) {
  const p = reachProb("common", n);
  log(`| +${n} | ${gddReach[n]} | ${pct(p, p < 0.01 ? 4 : 1)} (${oneIn(p)}) | ${pct(weightedReachProb(n), 4)} |`);
}
log();

// 2. 순이익률
log("## 2. 뽑기 1번당 평균 순이익률 (GDD 3.4, 마르코프 계산)");
log();
log("| 팔 단계 | GDD | 계산 | 차이 |");
log("|---|---|---|---|");
const gddRate: Record<number, number> = { 3: -58, 5: -36, 6: -20, 7: 0, 8: 19, 9: 41, 10: 67, 11: 98, 12: 133, 13: 103, 14: 72, 15: 40, 16: 7, 17: -23, 20: -107 };
for (const [n, g] of Object.entries(gddRate)) {
  const v = netRateWhenSellingAt(Number(n)) * 100;
  const diff = v - g;
  log(`| +${n} | ${g > 0 ? "+" : ""}${g}% | ${v >= 0 ? "+" : ""}${v.toFixed(0)}% | ${Math.abs(diff) < 1.5 ? "-" : (diff > 0 ? "+" : "") + diff.toFixed(0) + "%p"} |`);
}
log();

// 3. 몬테카를로 도달
const RUNS = 200_000;
log(`## 3. 몬테카를로 도달 확률 (뽑기 ${RUNS.toLocaleString("en-US")}회, 시드 1, 전체 등급)`);
log();
log("| 단계 | 시뮬레이션 | 마르코프(가중) |");
log("|---|---|---|");
const mc = simulateReach(RUNS, seededRng(1));
for (const n of [5, 7, 10, 12, 15, 17, 20]) {
  log(`| +${n} | ${pct(mc.reached[n] / mc.total, 3)} | ${pct(weightedReachProb(n), 3)} |`);
}
log();

// 4. 플레이 시간
const PLAYS = 5000;
log(`## 4. 처음 받은 골드로 계속 플레이할 때 (전략별 ${PLAYS.toLocaleString("en-US")}회, 시드 2, 광고·초대 없음)`);
log();
log("뽑기 3초, 슛 3.5초(5단계마다·마지막 한 발은 7초), 판매 2.5초, 최대 30분. 다음 슛 비용이 모자라면 판다.");
log(`GDD 값은 첫 접속 5,000골드 기준이다. 현재 설정의 첫 접속 지급은 ${config.startGold.toLocaleString("en-US")}골드다 (GDD_CHANGES.md).`);
log();
log("| 전략 | GDD 10분 이상 (5,000) | 계산 10분 이상 (5,000) | 계산 10분 이상 (현재) | GDD 중앙값 (5,000) | 계산 중앙값 (5,000) | 계산 중앙값 (현재) |");
log("|---|---|---|---|---|---|---|");
const gddPlay: Record<number, [string, string]> = { 5: ["0%", "약 5분"], 7: ["91%", "30분 이상"], 10: ["86%", "30분 이상"], 12: ["64%", "30분 이상"], 14: ["36%", "약 5분"], 15: ["31%", "약 4분"] };
const stat = (target: number, startGold: bigint, rng: ReturnType<typeof seededRng>) => {
  const secs: number[] = [];
  for (let i = 0; i < PLAYS; i++) secs.push(playUntilBroke(target, rng, startGold).seconds);
  secs.sort((a, b) => a - b);
  const median = secs[Math.floor(PLAYS / 2)];
  return {
    over10: pct(secs.filter((s) => s >= 600).length / PLAYS, 0),
    median: median >= 1800 ? "30분 이상" : `약 ${(median / 60).toFixed(1)}분`,
  };
};
const rng = seededRng(2);
for (const [t, [gp, gm]] of Object.entries(gddPlay)) {
  const old = stat(Number(t), 5000n, rng);
  const cur = stat(Number(t), config.startGold, rng);
  log(`| +${t}에서 판다 | ${gp} | ${old.over10} | ${cur.over10} | ${gm} | ${old.median} | ${cur.median} |`);
}
log();

writeFileSync(new URL("../../docs/BALANCE_REPORT.md", import.meta.url), out.join("\n") + "\n");
console.log(out.join("\n"));
