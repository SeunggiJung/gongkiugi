// 몬테카를로 플레이 시뮬레이션 (GDD 3.4 / 4.1). 실제 게임 로직(core/game.ts)을 그대로 돌린다.
import { config } from "../core/config";
import { canDraw, canShoot, drawBall, newGame, sell, shoot, type GameState } from "../core/game";
import type { Rng } from "../core/rng";

// GDD 3.4 가정: 뽑기 3초, 슛 3.5초 (5단계마다 긴장 연출은 7초), 판매 2.5초, 최대 30분
export const TIMES = { draw: 3, shoot: 3.5, tenseShoot: 7, sell: 2.5, cap: 30 * 60 };

// 긴장 연출은 5, 10, 15, 20, 25 단계의 슛과 마지막 한 발(29→30)에 붙는다 (GDD 6.2)
const isTense = (stage: number) => (stage >= 5 && stage <= 25 && stage % 5 === 0) || stage === 29;

export interface RunResult {
  /** 더 이상 못 할 때까지(또는 30분 상한) 걸린 초 */
  seconds: number;
  gold: bigint;
}

/** "+target 에 오르면 판다" 전략으로 startGold 에서 시작해 광고·초대 없이 끝까지 플레이한다. */
export function playUntilBroke(target: number, rng: Rng, startGold: bigint = config.startGold): RunResult {
  let state: GameState = { ...newGame(), gold: startGold };
  let t = 0;
  while (t < TIMES.cap) {
    if (!state.ball) {
      if (!canDraw(state)) break;
      state = (drawBall(state, rng) as { state: GameState }).state;
      t += TIMES.draw;
      continue;
    }
    // 목표 단계에 오르면 팔고, 다음 슛을 못 낼 만큼 골드가 모자라도 판다.
    if (state.ball.stage >= target || !canShoot(state)) {
      state = (sell(state, rng) as { state: GameState }).state;
      t += TIMES.sell;
      continue;
    }
    const stage = state.ball.stage;
    const r = shoot(state, "center", rng);
    if (!r.ok) break;
    state = r.state;
    t += isTense(stage) ? TIMES.tenseShoot : TIMES.shoot;
  }
  return { seconds: Math.min(t, TIMES.cap), gold: state.gold };
}

/** 뽑기 1 번의 결과를 끝까지 굴려 도달한 최고 단계를 센다 (골드 제약 없음). */
export function simulateReach(draws: number, rng: Rng): { total: number; reached: number[] } {
  const reached = new Array(config.maxStage + 1).fill(0);
  for (let i = 0; i < draws; i++) {
    let state: GameState = { ...newGame(), gold: 10n ** 30n };
    state = (drawBall(state, rng) as { state: GameState }).state;
    let max = 0;
    while (state.ball && state.ball.stage < config.maxStage) {
      const r = shoot(state, "center", rng);
      if (!r.ok) break;
      state = r.state;
      if (state.ball) max = Math.max(max, state.ball.stage);
    }
    if (state.ball) max = state.ball.stage;
    for (let s = 0; s <= max; s++) reached[s]++;
  }
  return { total: draws, reached };
}
