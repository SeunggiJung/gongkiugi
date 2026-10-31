import type { CSSProperties } from "react";
import type { EvolveSpec } from "./timing";

// 변신 연출의 구간별 추가 효과(번개 · 폭발 · 균열 · 파편 · 색종이 · 암전 · 번쩍). 구성은 timing.ts 의 evolveSpec 이 정한다.
// 모든 요소는 --ms (전체 길이) 를 기준으로 애니메이션 지연을 퍼센트로 잡아, 연출 길이가 바뀌어도 순서가 유지된다.

const W = 360;
const H = 640;
const HIT_X = W / 2;
const HIT_Y = H * 0.7; // 공이 있는 자리 (Burst 와 같은 위치)

/** 결정적인 난수 (같은 단계에서는 항상 같은 모양). 연출 중 다시 그려져도 번개 모양이 바뀌지 않게 한다. */
function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function boltPath(i: number, total: number) {
  // 첫 번째 줄기는 공 위로 곧장, 나머지는 공 주변 곳곳으로 내리친다
  const targetX = i === 0 ? HIT_X : HIT_X + (rnd(i * 3 + 1) - 0.5) * W * 0.95;
  const targetY = i === 0 ? HIT_Y : HIT_Y + (rnd(i * 3 + 2) - 0.5) * 220;
  const startX = targetX + (rnd(i * 3 + 3) - 0.5) * 120;
  const steps = 9;
  const pts: string[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const jitter = k === 0 || k === steps ? 0 : (rnd(i * 31 + k) - 0.5) * 46;
    pts.push(`${(startX + (targetX - startX) * t + jitter).toFixed(1)},${(targetY * t).toFixed(1)}`);
  }
  void total;
  return pts.join(" ");
}

export default function EvoFx({ spec, color }: { spec: EvolveSpec; color: string }) {
  const root = { "--ms": `${spec.ms}ms`, "--c": color, "--dark": spec.dark } as CSSProperties;
  const hitMs = spec.ms * 0.3;
  return (
    <div className="evofx" style={root} aria-hidden>
      {spec.dark > 0 && <div className="evo-dark" />}
      {spec.invert && <div className="evo-invert" />}
      {spec.bolts > 0 && (
        <svg className="evo-bolts" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {Array.from({ length: spec.bolts }, (_, i) => {
            // 번개는 충전이 끝나는 순간부터 연달아 내리친다 (줄기가 많을수록 더 길게 이어진다)
            const delay = hitMs - 60 + i * Math.min(110, (spec.ms * 0.28) / spec.bolts);
            const pts = boltPath(i, spec.bolts);
            return (
              <g key={i} className="bolt" style={{ animationDelay: `${delay}ms` }}>
                <polyline points={pts} className="bolt-glow" />
                <polyline points={pts} className="bolt-core" />
              </g>
            );
          })}
        </svg>
      )}
      {spec.cracks > 0 && (
        <svg className="evo-cracks" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {Array.from({ length: spec.cracks }, (_, i) => {
            const a = (i / spec.cracks) * Math.PI * 2 + rnd(i + 7) * 0.4;
            const len = 150 + rnd(i + 11) * 260;
            const mid = len * (0.4 + rnd(i + 13) * 0.2);
            const bend = (rnd(i + 17) - 0.5) * 0.7;
            const p = (d: number, extra = 0) => `${(HIT_X + Math.cos(a + extra) * d).toFixed(1)},${(HIT_Y + Math.sin(a + extra) * d).toFixed(1)}`;
            return <polyline key={i} points={`${HIT_X},${HIT_Y} ${p(mid * 0.5, bend * 0.4)} ${p(mid, bend)} ${p(len, bend * 0.5)}`} className="crack" style={{ animationDelay: `${hitMs + i * 14}ms` }} />;
          })}
        </svg>
      )}
      {Array.from({ length: spec.rings }, (_, i) => (
        <i key={`r${i}`} className="evo-ring" style={{ animationDelay: `${hitMs + i * 170}ms`, "--rs": 1 + i * 0.5 } as CSSProperties} />
      ))}
      {Array.from({ length: spec.explosions }, (_, i) => (
        <i
          key={`e${i}`}
          className="evo-boom"
          style={{
            left: `${50 + (i === 0 ? 0 : (i % 2 ? 1 : -1) * (14 + i * 6))}%`,
            top: `${70 - (i === 0 ? 0 : 8 + i * 4)}%`,
            animationDelay: `${hitMs + i * 260}ms`,
            "--bs": 1 + i * 0.25,
          } as CSSProperties}
        />
      ))}
      {Array.from({ length: spec.debris }, (_, i) => {
        const a = rnd(i + 21) * 360;
        const d = 90 + rnd(i + 23) * 230;
        return (
          <b
            key={`d${i}`}
            className="evo-debris"
            style={{
              "--a": `${a}deg`,
              "--d": `${d}px`,
              "--sz": `${5 + Math.round(rnd(i + 29) * 9)}px`,
              animationDelay: `${hitMs + (i % 6) * 40}ms`,
            } as CSSProperties}
          />
        );
      })}
      {spec.confetti &&
        Array.from({ length: 70 }, (_, i) => (
          <b
            key={`c${i}`}
            className="evo-confetti"
            style={{
              left: `${rnd(i + 41) * 100}%`,
              background: ["#ff6fae", "#f7b73b", "#6db3f2", "#8ad18a", "#b98af0", "#fff"][i % 6],
              animationDelay: `${hitMs + 200 + rnd(i + 43) * spec.ms * 0.25}ms`,
              animationDuration: `${spec.ms * (0.3 + rnd(i + 47) * 0.2)}ms`,
              "--sway": `${(rnd(i + 53) - 0.5) * 120}px`,
            } as CSSProperties}
          />
        ))}
      {spec.whiteout && <div className="evo-white" />}
    </div>
  );
}
