import { describe, expect, it } from "vitest";
import { config } from "./config";
import { buyTicket, canDraw, canSell, drawBall, meanSellPrice, newGame, sell, shoot, stageProbabilities, type GameState } from "./game";
import { seededRng } from "./rng";
import { netRateWhenSellingAt, reachProb } from "../sim/analytic";

const withBall = (stage: number, gold = 1_000_000n, gradeId = "common"): GameState => ({
  ...newGame(),
  gold,
  ball: { gradeId, kindIndex: 0, stage },
});

describe("설정 표", () => {
  it("등급 22종, 뽑기 확률 합 100%", () => {
    expect(config.grades.flatMap((g) => g.kinds)).toHaveLength(22);
    expect(config.grades.reduce((a, g) => a + g.drawPct, 0)).toBeCloseTo(100);
  });

  it("모든 등급·단계에서 성공+유지+파괴 = 100%, 어떤 값도 음수가 아님", () => {
    for (const g of config.grades) {
      for (let s = 0; s < config.maxStage; s++) {
        const p = stageProbabilities(g.id, s)!;
        expect(p.success + p.keep + p.destroy).toBe(10000);
        expect(Math.min(p.success, p.keep, p.destroy)).toBeGreaterThanOrEqual(0);
      }
      expect(stageProbabilities(g.id, config.maxStage)).toBeNull();
    }
  });

  it("슛 비용은 판매가의 약 4% (최소 5골드), +7 은 52골드", () => {
    for (let s = 0; s < config.maxStage; s++) {
      const expected = Math.max(5, Number(config.stages[s].basePrice) * 0.04);
      expect(Number(config.stages[s].shootCost) / expected).toBeGreaterThan(0.97);
      expect(Number(config.stages[s].shootCost) / expected).toBeLessThan(1.03);
    }
    expect(config.stages[7].shootCost).toBe(52n);
  });

  it("신화 판매가 배율: +10 약 2.5배, +20 약 6배, +30 15배 (GDD 3.1)", () => {
    const ratio = (s: number) => Number(meanSellPrice("myth", s)) / Number(meanSellPrice("common", s));
    expect(ratio(10)).toBeCloseTo(2.47, 1);
    expect(ratio(20)).toBeCloseTo(6.08, 1);
    expect(ratio(30)).toBeCloseTo(15, 5);
  });
});

describe("코어 루프", () => {
  it("뽑기는 1,000골드를 쓰고 +0 공을 준다. 공을 들고 있으면 못 뽑는다", () => {
    const r = drawBall(newGame(), seededRng(1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.gold).toBe(config.startGold - 1000n);
    expect(config.startGold).toBe(10000n);
    expect(r.ball.stage).toBe(0);
    expect(canDraw(r.state)).toBe(false);
    expect(drawBall(r.state, seededRng(1))).toEqual({ ok: false, reason: "has-ball" });
  });

  it("골드가 모자라면 뽑기·슛이 거절된다", () => {
    expect(drawBall({ ...newGame(), gold: 999n }, seededRng(1))).toEqual({ ok: false, reason: "no-gold" });
    expect(shoot(withBall(7, 51n), "left", seededRng(1))).toEqual({ ok: false, reason: "no-gold" });
  });

  it("+30 에서는 더 못 차고, 판매만 남는다", () => {
    expect(shoot(withBall(30), "left", seededRng(1))).toEqual({ ok: false, reason: "max-stage" });
    expect(sell(withBall(30), seededRng(1)).ok).toBe(true);
  });

  it("+0 은 항상 골이다. 슛 비용 9골드가 빠진다", () => {
    const r = shoot(withBall(0, 100n), "center", seededRng(5));
    expect(r.ok && r.outcome).toBe("goal");
    expect(r.ok && r.state.gold).toBe(91n);
    expect(r.ok && r.state.ball?.stage).toBe(1);
  });

  it("파괴하면 공이 사라지고 키퍼는 고른 방향으로 뛴다. 골이면 다른 방향이다", () => {
    const rng = seededRng(7);
    let destroys = 0;
    let goals = 0;
    for (let i = 0; i < 2000 && (destroys < 20 || goals < 20); i++) {
      const dir = (["left", "center", "right"] as const)[i % 3];
      const r = shoot(withBall(12), dir, rng);
      if (!r.ok) throw new Error("슛 실패");
      if (r.outcome === "destroy") {
        destroys++;
        expect(r.state.ball).toBeNull();
        expect(r.keeperDir).toBe(dir);
      } else if (r.outcome === "goal") {
        goals++;
        expect(r.keeperDir).not.toBe(dir);
      } else {
        expect(r.state.ball?.stage).toBe(12);
      }
    }
    expect(destroys).toBeGreaterThanOrEqual(20);
    expect(goals).toBeGreaterThanOrEqual(20);
  });

  it("판매가는 평균의 ±15% 안이고 도감에 내가 판 금액이 남는다", () => {
    const mean = Number(meanSellPrice("common", 12));
    const rng = seededRng(3);
    let state = withBall(12, 0n);
    for (let i = 0; i < 200; i++) {
      const r = sell({ ...state, ball: { gradeId: "common", kindIndex: 0, stage: 12 } }, rng);
      if (!r.ok) throw new Error("판매 실패");
      expect(Number(r.price)).toBeGreaterThanOrEqual(mean * 0.85 - 1);
      expect(Number(r.price)).toBeLessThanOrEqual(mean * 1.15 + 1);
      state = r.state;
    }
    expect(state.dex["common:0"].bestSale).toBeGreaterThan(0n);
  });

  it("샷 결과 객체에 판매가가 들어 있지 않다 (판매가 비공개 규칙)", () => {
    const r = shoot(withBall(12), "left", seededRng(2));
    expect(JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v))).not.toMatch(/price|sell/i);
  });

  it("골드는 BigInt 로 신화 +30 판매가(145억 × 15 ± 15%)도 정확히 다룬다", () => {
    const r = sell(withBall(30, 0n, "myth"), seededRng(1));
    expect(r.ok && typeof r.state.gold).toBe("bigint");
    expect(r.ok && r.price).toBeGreaterThan(184_000_000_000n);
    expect(r.ok && r.price).toBeLessThan(251_000_000_000n);
  });
});

describe("팔기 조건", () => {
  it("뽑은 직후 +0 공은 팔 수 없고, 골 또는 유지로 살아남으면 팔 수 있다", () => {
    const drawn = drawBall(newGame(), seededRng(1));
    if (!drawn.ok) throw new Error("뽑기 실패");
    expect(canSell(drawn.state)).toBe(false);
    const r = shoot(drawn.state, "left", seededRng(2));
    if (!r.ok) throw new Error("슛 실패");
    expect(r.outcome === "destroy" || canSell(r.state)).toBe(true);
  });

  it("유지(골대 맞고 튕김)도 살아남은 것으로 센다", () => {
    const ball = { gradeId: "myth", kindIndex: 0, stage: 0, shots: 0 };
    const rng = seededRng(5);
    for (let i = 0; i < 2000; i++) {
      const r = shoot({ ...newGame(), gold: 10_000n, ball }, "left", rng);
      if (r.ok && r.outcome === "keep") {
        expect(r.state.ball?.stage).toBe(0);
        expect(r.state.ball?.shots).toBe(1);
        expect(canSell(r.state)).toBe(true);
        return;
      }
    }
    throw new Error("신화 +0 유지가 안 나옴");
  });

  it("단계가 오른 이전 저장(shots 없음)도 팔 수 있다", () => {
    expect(canSell({ ...newGame(), ball: { gradeId: "common", kindIndex: 0, stage: 3 } })).toBe(true);
    expect(canSell(newGame())).toBe(false);
  });
});

describe("방지권 (GDD 4.3)", () => {
  const find = (stage: number, tickets: Partial<GameState["tickets"]>) => {
    // 파괴가 나올 때까지 같은 조건으로 굴린다
    const rng = seededRng(11);
    for (let i = 0; i < 5000; i++) {
      const s = { ...withBall(stage), tickets: { ...newGame().tickets, ...tickets } };
      const r = shoot(s, "left", rng);
      if (!r.ok) throw new Error("슛 실패");
      if (r.outcome === "destroy" || r.saved) return { before: s, r };
    }
    throw new Error("파괴가 안 나옴");
  };

  it("구간 안에서 막히면 자동 소모되고 공은 그 단계 그대로 남는다", () => {
    const { r } = find(10, { S: 2 });
    expect(r.ok && r.saved).toBe(true);
    expect(r.ok && r.outcome).toBe("keep");
    expect(r.ok && r.state.tickets.S).toBe(1);
    expect(r.ok && r.state.ball?.stage).toBe(10);
  });

  it("다른 구간 방지권은 쓰이지 않는다", () => {
    const { r } = find(10, { M: 3 });
    expect(r.ok && r.saved).toBe(false);
    expect(r.ok && r.outcome).toBe("destroy");
    expect(r.ok && r.state.tickets.M).toBe(3);
  });

  it("구매는 가격만큼 차감하고, 골드가 모자라면 거절한다", () => {
    const s = { ...newGame(), gold: 2_000n };
    const r = buyTicket(s, "S");
    expect(r.ok && r.state.gold).toBe(0n);
    expect(r.ok && r.state.tickets.S).toBe(1);
    expect(buyTicket({ ...s, gold: 1_999n }, "S")).toEqual({ ok: false, reason: "no-gold" });
  });

  it("판매·뽑기를 거쳐도 보유 방지권이 유지된다", () => {
    const s = { ...withBall(5, 0n), tickets: { ...newGame().tickets, L: 4 } };
    const sold = sell(s, seededRng(1));
    expect(sold.ok && sold.state.tickets.L).toBe(4);
    const drawn = drawBall({ ...(sold as { state: GameState }).state, gold: 5000n }, seededRng(1));
    expect(drawn.ok && drawn.state.tickets.L).toBe(4);
  });
});

describe("GDD 3.4 수치", () => {
  it("일반 공 도달 확률: +10 55%, +12 32%, +15 약 6%", () => {
    expect(reachProb("common", 10)).toBeCloseTo(0.55, 2);
    expect(reachProb("common", 12)).toBeCloseTo(0.317, 2);
    expect(reachProb("common", 15)).toBeCloseTo(0.0625, 2);
  });

  it("+7 근처가 본전, +12 가 최대 이득 (등급 확률 상향 후 기준: GDD_CHANGES.md)", () => {
    expect(Math.abs(netRateWhenSellingAt(7))).toBeLessThan(0.05);
    const best = Math.max(...Array.from({ length: 29 }, (_, i) => netRateWhenSellingAt(i + 1)));
    expect(netRateWhenSellingAt(12)).toBeCloseTo(best, 5);
    expect(netRateWhenSellingAt(12)).toBeCloseTo(1.48, 1);
  });

  it("+17 이후는 평균적으로 손해다 (GDD 3.4 설계 유지)", () => {
    for (let n = 17; n <= 29; n++) expect(netRateWhenSellingAt(n), `+${n}`).toBeLessThan(0);
    expect(netRateWhenSellingAt(20)).toBeLessThan(-0.5);
  });
});
