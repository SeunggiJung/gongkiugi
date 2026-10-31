// 뽑기 등급 확률 후보별로 경제가 어떻게 달라지는지 계산한다 (GDD 3.1 변경 검토용). 설정 파일은 바꾸지 않는다.
// 실행: npx tsx src/sim/drawrates.ts
import { config } from "../core/config";
import { netRateWhenSellingAt, weightedReachProb } from "./analytic";

const original = config.grades.map((g) => g.drawPct);
const OPTIONS: Record<string, number[]> = {
  "현재 (일반55/고급25/희귀12/영웅5.5/전설2/신화0.5)": [55, 25, 12, 5.5, 2, 0.5],
  "A 조금 (45/27/15/8/4/1)": [45, 27, 15, 8, 4, 1],
  "B 중간 (40/27/16/10/5/2)": [40, 27, 16, 10, 5, 2],
  "C 많이 (33/26/18/12/7/4)": [33, 26, 18, 12, 7, 4],
};

const pct = (x: number, d = 0) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
const lines: string[] = [];
lines.push("| 후보 | 희귀 이상 | 영웅 이상 | 전설 이상 | +7 | +10 | +12 | +15 | +17 | +20 | +15 도달 | +20 도달 |");
lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const [name, rates] of Object.entries(OPTIONS)) {
  config.grades.forEach((g, i) => (g.drawPct = rates[i]));
  const ge = (from: number) => rates.slice(from).reduce((a, b) => a + b, 0);
  const rate = (n: number) => pct(netRateWhenSellingAt(n));
  lines.push(
    `| ${name} | ${ge(2)}% | ${ge(3)}% | ${ge(4)}% | ${rate(7)} | ${rate(10)} | ${rate(12)} | ${rate(15)} | ${rate(17)} | ${rate(20)} | ${(weightedReachProb(15) * 100).toFixed(1)}% | ${(weightedReachProb(20) * 100).toFixed(3)}% |`,
  );
}
config.grades.forEach((g, i) => (g.drawPct = original[i]));
console.log(lines.join("\n"));
