import type { CSSProperties } from "react";
import { burstUrl, GRADE_COLOR } from "./BallArt";
import { SLOW, type EvolveSpec } from "./timing";

export interface BurstInfo {
  /** 같은 단계에서 연속으로 터져도 애니메이션이 다시 시작되도록 하는 값 */
  id: number;
  stage: number;
  gradeId: string;
  kindIndex?: number;
  /** 구간이 바뀌는 골(변신): 구간 구성(timing.ts evolveSpec)만큼 더 크고 많고, 충전이 끝나는 순간(번쩍)에 터진다 */
  evo?: EvolveSpec;
}

/** 골로 강화될 때 공 주위에서 터지는 이펙트. +1 부터 +13 까지 단계가 오를수록 커지고 화려해진다. 변신이면 mul 배로 커진다. */
export function burstSpec(stage: number, mul = 1) {
  const level = Math.max(1, Math.min(13, stage));
  const k = mul;
  return {
    level,
    count: Math.round((8 + level * 2) * k), // 10 ~ 34 (변신은 1.45배)
    radius: Math.round((70 + level * 12) * k), // 82 ~ 226px (변신은 1.45배)
    rings: level >= 10 ? 3 : level >= 5 ? 2 : 1,
    flash: level >= 8,
    stars: level >= 10,
  };
}

export default function Burst({ info, skip }: { info: BurstInfo; skip: boolean }) {
  const evolve = !!info.evo;
  const s = burstSpec(info.stage, info.evo?.burstMul);
  const base = info.evo ? Math.round(info.evo.ms * 0.3) : 0; // 충전이 끝나는 순간에 터진다
  const color = GRADE_COLOR[info.gradeId] ?? "#fff";
  const fx = burstUrl(info.gradeId, info.kindIndex); // 종류별 강화 버스트 이미지 (확정되면 생김)
  const dur = skip ? 350 : (500 + s.level * 40) * SLOW; // 520 ~ 1020ms
  const root = { "--c": color, "--r": `${s.radius}px`, "--dur": `${dur}ms`, "--base": `${base}ms` } as CSSProperties;

  return (
    <>
      {(s.flash || evolve) && <div className={`screen-flash${evolve ? " big" : ""}`} key={`f${info.id}`} style={{ animationDuration: `${dur}ms`, animationDelay: `${base}ms` }} />}
      <div className="burst" key={info.id} style={root} aria-hidden>
        {fx && <img className="burst-fx" src={fx} alt="" style={{ width: s.radius * 2.2 }} />}
        {Array.from({ length: s.rings }, (_, i) => (
          <i key={`r${i}`} className="ring" style={{ "--k": i } as CSSProperties} />
        ))}
        {Array.from({ length: s.count }, (_, i) => {
          const angle = (i * 360) / s.count + ((i * 37) % 17);
          const dist = s.radius * (0.55 + (i % 3) * 0.22);
          const size = 4 + s.level * 0.6 + (i % 2) * 3;
          return (
            <b
              key={`s${i}`}
              className={s.stars && i % 3 === 0 ? "spark star" : "spark"}
              style={{ "--a": `${angle}deg`, "--d": `${dist}px`, "--sz": `${size}px`, "--dl": `${base + (i % 4) * 40}ms` } as CSSProperties}
            />
          );
        })}
      </div>
    </>
  );
}

