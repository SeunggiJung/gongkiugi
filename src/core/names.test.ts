import { describe, expect, it } from "vitest";
import { config } from "./config";
import { displayName, stageName } from "./names";
import raw from "./names.json";

const ladders = raw as Record<string, string[]>;

describe("공 이름 (22종 x +0~+30)", () => {
  it("설정의 모든 종류에 31개 단계 이름이 있다", () => {
    for (const g of config.grades) {
      g.kinds.forEach((k, i) => {
        expect(ladders[k], `${k} 이름 없음`).toBeDefined();
        expect(ladders[k], `${k} 개수`).toHaveLength(config.maxStage + 1);
        expect(stageName(g.id, i, 0)).toBeTruthy();
        expect(stageName(g.id, i, config.maxStage)).toBeTruthy();
      });
    }
  });

  it("설정에 없는 종류의 이름은 들어 있지 않다", () => {
    const kinds = new Set(config.grades.flatMap((g) => g.kinds));
    for (const k of Object.keys(ladders)) expect(kinds.has(k), `${k} 는 설정에 없음`).toBe(true);
  });

  it("종류 안에서도, 종류끼리도 이름이 겹치지 않는다", () => {
    const seen = new Map<string, string>();
    for (const [kind, names] of Object.entries(ladders)) {
      names.forEach((n, stage) => {
        expect(n.trim().length).toBeGreaterThan(0);
        const prev = seen.get(n);
        expect(prev, `"${n}" 중복: ${prev} / ${kind} +${stage}`).toBeUndefined();
        seen.set(n, `${kind} +${stage}`);
      });
    }
  });

  it("마지막 단계 이름은 종언 · 창세 같은 극한 수식이다", () => {
    for (const [kind, names] of Object.entries(ladders)) {
      expect(names[30], kind).toMatch(/종언|창세/);
    }
  });

  it("명장면 공 이름에는 선수 이름, 월드컵 표기, 구단 이름이 들어 있지 않다 (GDD_CHANGES.md)", () => {
    const banned = ["월드컵", "FIFA", "피파", "마라도나", "메시", "펠레", "지단", "호날두", "음바페", "손흥민", "박지성", "안정환", "설기현", "황선홍", "황희찬", "김영권", "조규성", "홍명보", "하메스", "카힐", "괴체", "이니에스타", "클로제", "판페르시", "도노반", "리샬리송", "파바르", "알도사리", "바이에른", "레알", "바르셀로나"];
    for (const n of ladders["명장면 공"]) {
      for (const w of banned) expect(n, `"${n}" 에 금지어 "${w}"`).not.toContain(w);
    }
  });

  it("명장면 공 이름은 모두 실제 사건의 연도(4자리)를 포함하거나 +30 의 극한 수식이다", () => {
    const names = ladders["명장면 공"];
    names.slice(0, 30).forEach((n, i) => expect(n, `+${i}`).toMatch(/(19|20)\d\d년/));
    expect(names[30]).toMatch(/1986년/);
  });

  it("displayName 은 고유 이름을 돌려준다", () => {
    expect(displayName("common", 0, 0)).toBe("바람 빠진 동네 축구공");
  });
});
