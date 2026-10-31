// 연출 시간 상수와 변신 연출 구성. 개발 서버의 데모 링크에서 #...&slow=20 처럼 주면 연출을 N 배 느리게 돌려 볼 수 있다 (배포본에서는 항상 1).
export const SLOW = import.meta.env.DEV ? Number(/#.*[&?]slow=(\d+)/.exec(location.hash)?.[1] ?? 1) : 1;

/**
 * 변신 연출 구성. 구간(+5, +10, +15, +20, +25, +30)이 오를수록 연출의 종류와 규모가 함께 커진다.
 * 모든 시간은 ms 이고 0~30% 가 충전(점점 어두워지며 떨림), 30% 지점이 내리침(번개 · 폭발 · 번쩍)이다.
 */
export interface EvolveSpec {
  level: number;
  ms: number;
  caption: string;
  /** 내리치는 번개 줄기 수 */
  bolts: number;
  /** 화면 흔들림 세기(px)와 길이(ms). 0 이면 흔들리지 않는다 */
  shake: number;
  quakeMs: number;
  /** 충전 중 가장자리가 어두워지는 정도 (0~1) */
  dark: number;
  /** 충격파 고리 수 */
  rings: number;
  /** 폭발 불덩이 수 */
  explosions: number;
  /** 화면 균열 줄 수 */
  cracks: number;
  /** 날아가는 파편 수 */
  debris: number;
  /** 색종이 (완전체) */
  confetti: boolean;
  /** 색 반전 번쩍 */
  invert: boolean;
  /** 화면 전체가 하얗게 되는 번쩍 (완전체) */
  whiteout: boolean;
  /** 버스트(불꽃) 크기 · 개수 배율 */
  burstMul: number;
  captionScale: number;
}

const SPECS: Record<number, Omit<EvolveSpec, "level" | "ms"> & { ms: number }> = {
  5: { ms: 1500, caption: "변신!", bolts: 0, shake: 0, quakeMs: 0, dark: 0, rings: 1, explosions: 0, cracks: 0, debris: 0, confetti: false, invert: false, whiteout: false, burstMul: 1.45, captionScale: 1 },
  10: { ms: 1900, caption: "각성!", bolts: 1, shake: 7, quakeMs: 450, dark: 0.25, rings: 2, explosions: 1, cracks: 0, debris: 10, confetti: false, invert: false, whiteout: false, burstMul: 1.8, captionScale: 1.15 },
  15: { ms: 2400, caption: "폭주!", bolts: 3, shake: 11, quakeMs: 650, dark: 0.4, rings: 2, explosions: 1, cracks: 0, debris: 18, confetti: false, invert: false, whiteout: false, burstMul: 2.2, captionScale: 1.3 },
  20: { ms: 3000, caption: "신화 강림!", bolts: 6, shake: 15, quakeMs: 900, dark: 0.55, rings: 3, explosions: 2, cracks: 8, debris: 28, confetti: false, invert: false, whiteout: false, burstMul: 2.7, captionScale: 1.45 },
  25: { ms: 3600, caption: "초월!", bolts: 10, shake: 19, quakeMs: 1100, dark: 0.7, rings: 4, explosions: 2, cracks: 12, debris: 40, confetti: false, invert: true, whiteout: false, burstMul: 3.2, captionScale: 1.5 },
  30: { ms: 4400, caption: "완전체!", bolts: 16, shake: 24, quakeMs: 1500, dark: 0.8, rings: 5, explosions: 3, cracks: 16, debris: 60, confetti: true, invert: true, whiteout: true, burstMul: 3.8, captionScale: 1.6 },
};

/** 구간 경계 단계(5, 10, …, 30)에 맞는 변신 연출 구성. "연출 건너뛰기"와 무관하게 항상 전체를 쓴다. */
export function evolveSpec(stage: number): EvolveSpec {
  const base = SPECS[Math.min(30, Math.max(5, stage))] ?? SPECS[5];
  return { ...base, level: stage, ms: base.ms * SLOW };
}
