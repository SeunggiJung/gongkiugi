// 마르코프 연쇄로 GDD 3.4 의 수치를 정확히 계산한다 (몬테카를로의 기준값).
import { config, gradeById } from "../core/config";
import { meanSellPrice, stageProbabilities } from "../core/game";

/** 단계 i 의 공이 파괴되기 전에 i+1 에 오를 확률. 유지는 같은 단계에 머무르므로 s / (s + d). */
function passProb(gradeId: string, stage: number): number {
  const p = stageProbabilities(gradeId, stage)!;
  return p.success / (p.success + p.destroy);
}

/** 단계 i 에서 결과(골 또는 파괴)가 날 때까지 쏘는 평균 횟수 */
function shotsAt(gradeId: string, stage: number): number {
  const p = stageProbabilities(gradeId, stage)!;
  return 10000 / (p.success + p.destroy);
}

/** 파괴되기 전에 +n 에 도달할 확률 (+0 에서 시작) */
export function reachProb(gradeId: string, n: number): number {
  let r = 1;
  for (let i = 0; i < n; i++) r *= passProb(gradeId, i);
  return r;
}

/** +n 에 도달할 때까지 평균 슛 비용 합 (파괴로 끝나는 경우 포함) */
function expectedShootCost(gradeId: string, n: number): number {
  let reach = 1;
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += reach * shotsAt(gradeId, i) * Number(config.stages[i].shootCost);
    reach *= passProb(gradeId, i);
  }
  return total;
}

/** 뽑기 1 번당 평균 순이익률. +n 에서 팔 때 (판매가 − 슛 비용 − 뽑기) ÷ 뽑기 (GDD 3.4) */
export function netRateWhenSellingAt(n: number): number {
  const draw = Number(config.drawCost);
  let ev = 0;
  for (const g of config.grades) {
    const w = g.drawPct / 100;
    ev += w * (reachProb(g.id, n) * Number(meanSellPrice(g.id, n)) - expectedShootCost(g.id, n));
  }
  return (ev - draw) / draw;
}

/** 등급 가중 평균 도달 확률 (GDD 의 "일반 공" 수치와 비교하려면 reachProb("common", n)) */
export function weightedReachProb(n: number): number {
  return config.grades.reduce((acc, g) => acc + (g.drawPct / 100) * reachProb(g.id, n), 0);
}

export { gradeById };
