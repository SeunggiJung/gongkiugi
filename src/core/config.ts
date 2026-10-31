import raw from "./game.config.json";

export interface StageConfig {
  stage: number;
  /** 0.01% 단위 정수 (10000 = 100%). +30 은 null */
  successBp: number | null;
  keepBp: number | null;
  destroyBp: number | null;
  shootCost: bigint | null;
  /** 일반 공 기준 판매가 평균. 서버 전용, 화면에 쓰지 않는다. */
  basePrice: bigint;
}

export interface GradeConfig {
  id: string;
  name: string;
  drawPct: number;
  successMult: number;
  priceMultAt30: number;
  kinds: string[];
}

export interface GameConfig {
  drawCost: bigint;
  startGold: bigint;
  dailyGold: bigint;
  adGold: bigint;
  inviteGold: bigint;
  /** 하루 광고 시청 한도. null 이면 무제한 (프로토타입 한정) */
  adDailyLimit: number | null;
  maxStage: number;
  boastStage: number;
  sellVariancePct: number;
  grades: GradeConfig[];
  stages: StageConfig[];
}

const big = (v: string) => BigInt(v);

export const config: GameConfig = {
  drawCost: big(raw.drawCost),
  startGold: big(raw.startGold),
  dailyGold: big(raw.dailyGold),
  adGold: big(raw.adGold),
  inviteGold: big(raw.inviteGold),
  adDailyLimit: raw.adDailyLimit as number | null,
  maxStage: raw.maxStage,
  boastStage: raw.boastStage,
  sellVariancePct: raw.sellVariancePct,
  grades: raw.grades,
  stages: raw.stages.map((s) => ({
    stage: s.stage,
    successBp: s.successBp,
    keepBp: s.keepBp,
    destroyBp: s.destroyBp,
    shootCost: s.shootCost === null ? null : big(s.shootCost),
    basePrice: big(s.basePrice),
  })),
};

export function gradeById(id: string): GradeConfig {
  const g = config.grades.find((x) => x.id === id);
  if (!g) throw new Error("알 수 없는 등급: " + id);
  return g;
}

