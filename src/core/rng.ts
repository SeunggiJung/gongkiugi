export interface Rng {
  /** 0 이상 maxExclusive 미만의 정수 */
  int(maxExclusive: number): number;
  /** 0 이상 1 미만의 실수 */
  float(): number;
}

/** 시뮬레이션과 테스트용 시드 난수 (mulberry32) */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  const float = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { float, int: (n) => Math.floor(float() * n) };
}

/** 프로토타입용. 서버로 옮기면 서버 난수가 이 자리를 대신한다. */
export const randomRng: Rng = {
  float: () => Math.random(),
  int: (n) => Math.floor(Math.random() * n),
};
