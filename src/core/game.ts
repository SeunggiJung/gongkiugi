// 코어 루프 순수 함수. 상태를 바꾸지 않고 새 상태를 돌려주며, 난수는 Rng 로만 받는다.
// 서버로 옮길 때 이 파일을 그대로 Workers 에서 쓴다. 모든 골드는 BigInt.
import { config, gradeById } from "./config";
import type { Rng } from "./rng";
import { noTickets, ticketForStage, TICKETS, type TicketId } from "./shop";

export type Direction = "left" | "center" | "right";
export type Outcome = "goal" | "keep" | "destroy";

export interface Ball {
  gradeId: string;
  kindIndex: number;
  stage: number;
  /** 골 · 유지로 살아남은 슛 횟수. 이전 저장에는 없을 수 있다 */
  shots?: number;
}

export interface DexEntry {
  maxStage: number;
  /** 내가 판 최고 금액. 판 적이 없으면 0n */
  bestSale: bigint;
}

export interface GameState {
  gold: bigint;
  ball: Ball | null;
  /** 키: `${gradeId}:${kindIndex}` */
  dex: Record<string, DexEntry>;
  /** 보유 방지권 개수 */
  tickets: Record<TicketId, number>;
}

export type Fail = {
  ok: false;
  reason: "no-gold" | "has-ball" | "no-ball" | "max-stage" | "unknown-item";
};

export const dexKey = (b: Pick<Ball, "gradeId" | "kindIndex">) => `${b.gradeId}:${b.kindIndex}`;

export function newGame(): GameState {
  return { gold: config.startGold, ball: null, dex: {}, tickets: noTickets() };
}

export function buyTicket(state: GameState, id: TicketId): { ok: true; state: GameState } | Fail {
  const t = TICKETS.find((x) => x.id === id);
  if (!t) return { ok: false, reason: "unknown-item" };
  if (state.gold < t.price) return { ok: false, reason: "no-gold" };
  return {
    ok: true,
    state: { ...state, gold: state.gold - t.price, tickets: { ...state.tickets, [id]: state.tickets[id] + 1 } },
  };
}

export function shootCost(stage: number): bigint | null {
  return config.stages[stage].shootCost;
}

/** 등급 보정을 반영한 현재 단계의 확률 (0.01% 단위). 줄어든 성공 확률은 유지로 간다. +30 은 null. */
export function stageProbabilities(gradeId: string, stage: number) {
  const s = config.stages[stage];
  if (s.successBp === null || s.keepBp === null || s.destroyBp === null) return null;
  const success = Math.round(s.successBp * gradeById(gradeId).successMult);
  return { success, keep: s.keepBp + (s.successBp - success), destroy: s.destroyBp };
}

export function canDraw(state: GameState) {
  return state.ball === null && state.gold >= config.drawCost;
}

/** 팔기 버튼이 눌리는 조건: 공이 한 번이라도 골 · 유지로 살아남았다 (GDD_CHANGES.md). 서버는 공이 있는지만 확인한다. */
export function canSell(state: GameState) {
  const b = state.ball;
  return !!b && (b.stage > 0 || (b.shots ?? 0) > 0);
}

export function canShoot(state: GameState) {
  if (!state.ball) return false;
  const cost = shootCost(state.ball.stage);
  return cost !== null && state.gold >= cost;
}

export function rollGrade(rng: Rng): string {
  // 뽑기 확률은 0.01% 단위 정수로 비교한다.
  let roll = rng.int(10000);
  for (const g of config.grades) {
    const bp = Math.round(g.drawPct * 100);
    if (roll < bp) return g.id;
    roll -= bp;
  }
  return config.grades[config.grades.length - 1].id;
}

export function drawBall(state: GameState, rng: Rng): { ok: true; state: GameState; ball: Ball } | Fail {
  if (state.ball) return { ok: false, reason: "has-ball" };
  if (state.gold < config.drawCost) return { ok: false, reason: "no-gold" };
  const gradeId = rollGrade(rng);
  const ball: Ball = { gradeId, kindIndex: rng.int(gradeById(gradeId).kinds.length), stage: 0, shots: 0 };
  const key = dexKey(ball);
  const dex = { ...state.dex, [key]: state.dex[key] ?? { maxStage: 0, bestSale: 0n } };
  return { ok: true, ball, state: { ...state, gold: state.gold - config.drawCost, ball, dex } };
}

const DIRS: Direction[] = ["left", "center", "right"];

export interface ShotResult {
  ok: true;
  state: GameState;
  outcome: Outcome;
  cost: bigint;
  /** 연출용. 골이면 키퍼가 반대로, 파괴면 고른 방향으로 뛴다 (GDD 2장) */
  keeperDir: Direction;
  /** 파괴가 났지만 방지권이 자동으로 소모되어 공이 그 단계 그대로 남았다. outcome 은 "keep" */
  saved: boolean;
}

export function shoot(state: GameState, dir: Direction, rng: Rng): ShotResult | Fail {
  const ball = state.ball;
  if (!ball) return { ok: false, reason: "no-ball" };
  const cost = shootCost(ball.stage);
  if (cost === null) return { ok: false, reason: "max-stage" };
  if (state.gold < cost) return { ok: false, reason: "no-gold" };

  const p = stageProbabilities(ball.gradeId, ball.stage)!;
  const roll = rng.int(10000);
  const rolled: Outcome = roll < p.success ? "goal" : roll < p.success + p.keep ? "keep" : "destroy";

  const others = DIRS.filter((d) => d !== dir);
  // 키퍼 연출은 굴린 결과 기준이다. 방지권으로 살아나도 키퍼는 막은 것으로 보인다.
  const keeperDir = rolled === "destroy" ? dir : others[rng.int(others.length)];

  const gold = state.gold - cost;
  if (rolled === "destroy") {
    const ticket = ticketForStage(ball.stage);
    if (ticket && state.tickets[ticket] > 0) {
      const tickets = { ...state.tickets, [ticket]: state.tickets[ticket] - 1 };
      return { ok: true, outcome: "keep", cost, keeperDir, saved: true, state: { ...state, gold, tickets } };
    }
    return { ok: true, outcome: "destroy", cost, keeperDir, saved: false, state: { ...state, gold, ball: null } };
  }
  if (rolled === "keep") {
    const kept: Ball = { ...ball, shots: (ball.shots ?? 0) + 1 };
    return { ok: true, outcome: "keep", cost, keeperDir, saved: false, state: { ...state, gold, ball: kept } };
  }

  const next: Ball = { ...ball, stage: ball.stage + 1, shots: (ball.shots ?? 0) + 1 };
  const key = dexKey(next);
  const entry = state.dex[key] ?? { maxStage: 0, bestSale: 0n };
  const dex = { ...state.dex, [key]: { ...entry, maxStage: Math.max(entry.maxStage, next.stage) } };
  return { ok: true, outcome: "goal", cost, keeperDir, saved: false, state: { ...state, gold, ball: next, dex } };
}

/** 판매가 평균 = 일반 판매가 × (등급 배율)^(단계÷30). 서버 전용 값. */
export function meanSellPrice(gradeId: string, stage: number): bigint {
  const base = Number(config.stages[stage].basePrice);
  const factor = Math.pow(gradeById(gradeId).priceMultAt30, stage / config.maxStage);
  return BigInt(Math.round(base * factor));
}

/** 판매가 = 평균 ± 변동폭. 변동 분포는 GDD 에 없어 균등분포로 두었다 (열린 질문). */
export function rollSellPrice(gradeId: string, stage: number, rng: Rng): bigint {
  const mean = Number(meanSellPrice(gradeId, stage));
  const swing = (rng.float() * 2 - 1) * (config.sellVariancePct / 100);
  return BigInt(Math.round(mean * (1 + swing)));
}

export function sell(state: GameState, rng: Rng): { ok: true; state: GameState; price: bigint } | Fail {
  const ball = state.ball;
  if (!ball) return { ok: false, reason: "no-ball" };
  const price = rollSellPrice(ball.gradeId, ball.stage, rng);
  const key = dexKey(ball);
  const entry = state.dex[key] ?? { maxStage: ball.stage, bestSale: 0n };
  const dex = {
    ...state.dex,
    [key]: { maxStage: Math.max(entry.maxStage, ball.stage), bestSale: price > entry.bestSale ? price : entry.bestSale },
  };
  return { ok: true, price, state: { ...state, gold: state.gold + price, ball: null, dex } };
}
