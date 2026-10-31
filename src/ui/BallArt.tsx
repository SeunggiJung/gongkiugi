import type { CSSProperties } from "react";

export const GRADE_COLOR: Record<string, string> = {
  common: "#d9c7a6",
  uncommon: "#8ad18a",
  rare: "#6db3f2",
  hero: "#b98af0",
  legend: "#f7b73b",
  myth: "#ff6fae",
};

// 확정된 공 이미지: assets/approved/balls/{등급}_{종류번호}.png 가 +0 기본 이미지이고,
// {등급}_{종류번호}_{5|10|15|20|25|30}.png 가 그 구간(5단계마다)의 본체 이미지다 (docs/BALL_CONCEPTS.md).
// 구간 이미지는 투명 배경의 독립된 한 장이라 게임 화면과 도감 썸네일에 그대로 쓴다.
// 구간 이미지가 아직 없는 단계는 가장 가까운 아래 구간 이미지, 그것도 없으면 +0 이미지를 쓴다.
const IMAGES = import.meta.glob("../../assets/approved/balls/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const BAND_STARTS = [30, 25, 20, 15, 10, 5] as const;
const imageKey = (gradeId: string, kindIndex: number, band?: number) =>
  `../../assets/approved/balls/${gradeId}_${kindIndex}${band === undefined ? "" : `_${band}`}.png`;

// 구간 이미지 스프라이트 크기(px). 공 본체 지름은 +0 과 같은 64px 이고 스프라이트가 더 커서 바깥 장식이 들어간다. assets/approved/balls/bands.json
const BANDS_JSON = Object.values(
  import.meta.glob("../../assets/approved/balls/bands.json", { eager: true, import: "default" }),
)[0] as Record<string, number> | undefined;
const BASE_BODY_PX = 64;

export interface BallBody {
  url: string;
  /** 구간 전용 이미지이면 그 구간 시작 단계, +0 기본 이미지이면 undefined */
  band?: number;
  /** 이 이미지를 그릴 때 곱할 배율. 구간 이미지는 본체가 +0 과 같은 크기로 보이도록 스프라이트 크기 비율만큼 키운다 */
  scale?: number;
}

export function ballBody(gradeId: string, kindIndex: number | undefined, stage: number): BallBody | undefined {
  if (kindIndex === undefined) return undefined;
  for (const b of BAND_STARTS) {
    if (stage >= b && IMAGES[imageKey(gradeId, kindIndex, b)]) {
      const px = BANDS_JSON?.[`${gradeId}_${kindIndex}`];
      return { url: IMAGES[imageKey(gradeId, kindIndex, b)], band: b, scale: px ? px / BASE_BODY_PX : 1 };
    }
  }
  const base = IMAGES[imageKey(gradeId, kindIndex)];
  return base ? { url: base } : undefined;
}

/** 단계에 맞는 공 이미지 주소 (구간 이미지 → +0 이미지). 자랑 카드 · 도감 등 CSS 없이 그림만 필요할 때 쓴다. */
export const ballImageUrl = (gradeId: string, kindIndex: number | undefined, stage = 0): string | undefined =>
  ballBody(gradeId, kindIndex, stage)?.url;

// 종류별 강화 버스트 이미지 (assets/approved/balls_fx/{등급}_{번호}_burst.png, 검은 배경을 알파로 바꾼 투명 PNG)
const FX = import.meta.glob("../../assets/approved/balls_fx/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
export const burstUrl = (gradeId: string, kindIndex: number | undefined): string | undefined =>
  kindIndex === undefined ? undefined : FX[`../../assets/approved/balls_fx/${gradeId}_${kindIndex}_burst.png`];

/** +0~4 → 0, +5~9 → 1, … +25~29 → 5, +30 → 6 */
export const tierBand = (stage: number) => (stage >= 30 ? 6 : Math.floor(stage / 5));

export default function BallArt({ stage, gradeId, kindIndex, size = 84 }: { stage: number; gradeId: string; kindIndex?: number; size?: number }) {
  const style = { "--c": GRADE_COLOR[gradeId] ?? "#ddd", "--s": `${size}px` } as CSSProperties;
  const body = ballBody(gradeId, kindIndex, stage);
  return (
    <div className={`ball-art band-${tierBand(stage)}${body ? " has-img" : ""}${body?.band !== undefined ? " has-band" : ""}`} style={style} aria-hidden>
      {body ? (body.scale && body.scale !== 1 ? <img className="ball-img scaled" src={body.url} alt="" style={{ width: `${84 * body.scale}%`, height: `${84 * body.scale}%` }} /> : <img className="ball-img" src={body.url} alt="" />) : <div className="ball-core" />}
    </div>
  );
}
