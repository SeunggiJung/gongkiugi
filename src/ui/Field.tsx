import type { CSSProperties } from "react";
import type { Ball, Direction, Outcome } from "../core/game";
import BallArt from "./BallArt";
import Burst, { type BurstInfo } from "./Burst";
import EvoFx from "./EvoFx";
import { GRADE_COLOR } from "./BallArt";
import { SLOW, type EvolveSpec } from "./timing";
import bgUrl from "../../assets/approved/field/bg.png";
import goalUrl from "../../assets/approved/field/goal.png";
import keeperReady from "../../assets/approved/field/keeper_ready.png";
import keeperDiveLeft from "../../assets/approved/field/keeper_dive_left.png";
import keeperDiveRight from "../../assets/approved/field/keeper_dive_right.png";
import keeperJump from "../../assets/approved/field/keeper_jump.png";
import manifest from "../../assets/approved/field/manifest.json";

export type TenseLevel = 0 | 1 | 2 | 3;

export interface ShotAnim {
  dir: Direction;
  keeperDir: Direction;
  outcome: Outcome;
  saved: boolean;
  tense: TenseLevel;
  ms: number;
}

/** 5, 10 → 1 (어두워짐), 15, 20 → 2 (붉은 테두리), 25 와 마지막 한 발(29) → 3 (암전 + 스포트라이트). GDD 6.2 */
export function tenseLevel(stage: number): TenseLevel {
  if (stage === 29 || stage === 25) return 3;
  if (stage === 15 || stage === 20) return 2;
  if (stage === 5 || stage === 10) return 1;
  return 0;
}

const BASE_MS = 1400; // 기본 연출은 2초 이내 (GDD 6.1)
const TENSE_MS = [BASE_MS, 2600, 3400, 4400] as const;
const SKIP_MS = 350;

export const shotDuration = (tense: TenseLevel, skip: boolean) => (skip ? SKIP_MS : TENSE_MS[tense]);

// 골대는 스테이지 폭의 84% (left 8%) 이고, 바닥이 배경의 골라인에 닿는다 (CSS 변수 --gt, --gh. styles.css 참고).
const GOAL_RATIO = manifest.goal.h / manifest.goal.w;
/** 골대 안쪽 세로 위치(0=윗면, 1=아랫면)를 스테이지 좌표로 바꾼다 */
const goalY = (frac: number) => `calc(var(--gt) + var(--gh) * ${frac})`;

const X: Record<Direction, string> = { left: "30.7%", center: "50%", right: "69.3%" };
const POST: Record<Direction, [string, string]> = { left: ["12%", goalY(0.5)], center: ["50%", goalY(0.05)], right: ["88%", goalY(0.5)] };
const REBOUND: Record<Direction, [string, string]> = { left: ["34%", "64%"], center: ["50%", "66%"], right: ["66%", "64%"] };

// 슛 결과 연출 이미지(assets/approved/fx/result_{goal|destroy|block|post}.png). 검은 배경이라 스크린 합성. 확정 전에는 없다.
const RESULT_FX = import.meta.glob("../../assets/approved/fx/result_*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const resultFx = (name: "goal" | "destroy" | "block" | "post") => RESULT_FX[`../../assets/approved/fx/result_${name}.png`];

const KEEPER_IMG =  { ready: keeperReady, left: keeperDiveLeft, right: keeperDiveRight, center: keeperJump } as const;
const KEEPER_SIZE = { ready: manifest.keeper.ready, left: manifest.keeper.dive_left, right: manifest.keeper.dive_right, center: manifest.keeper.jump } as const;
const readySize = manifest.keeper.ready;
/** 키퍼 영역 폭 = 대기 포즈 폭(골대 폭 대비). 다른 포즈 폭은 대기 포즈 폭 대비 비율로 그린다. */
const keeperBoxW = `${(readySize.w / manifest.goal.w) * 100}%`;
const poseWidth = (p: keyof typeof KEEPER_SIZE) => `${(KEEPER_SIZE[p].w / readySize.w) * 100}%`;

const ballSize = (stage: number) => Math.round(76 + Math.min(stage, 30) * 1.6);

export default function Field({ ball, shot, burst, skip, evolveFrom, evo }: { ball: Ball | null; shot: ShotAnim | null; burst: BurstInfo | null; skip: boolean; evolveFrom?: Ball | null; evo?: EvolveSpec | null }) {
  const wind = shot && shot.tense > 0 ? shot.ms * 0.55 : 0;
  const flight = shot ? shot.ms - wind : 0;

  let ballClass = "ball-idle";
  // 슛 결과 연출 이미지 (공이 목표에 닿을 즈음 터진다)
  const fxList: { url?: string; left: string; top: string; at: number; key: string }[] = [];
  const vars: Record<string, string> = { "--gr": String(GOAL_RATIO) };
  if (shot) {
    const [bx, by] = shot.outcome === "keep" ? POST[shot.dir] : shot.outcome === "destroy" ? [X[shot.keeperDir], goalY(0.6)] : [X[shot.dir], goalY(0.55)];
    vars["--bx"] = bx;
    vars["--by"] = by;
    vars["--rx"] = REBOUND[shot.dir][0];
    vars["--ry"] = REBOUND[shot.dir][1];
    vars["--flight"] = `${flight}ms`;
    vars["--wind"] = `${wind}ms`;
    // 방지권으로 살아난 공도 연출은 키퍼에게 막히는 쪽이다. 결과는 유지다.
    ballClass = shot.outcome === "goal" ? "ball-goal" : shot.saved || shot.outcome === "destroy" ? "ball-blocked" : "ball-keep";
    if (shot.saved) ballClass = "ball-saved";
    if (shot.outcome === "goal") fxList.push({ url: resultFx("goal"), left: bx, top: by, at: 0.85, key: "goal" });
    else if (shot.outcome === "keep" && !shot.saved) fxList.push({ url: resultFx("post"), left: bx, top: by, at: 0.4, key: "post" });
    else {
      // 파괴(또는 방지권으로 살아난 경우): 키퍼가 막는 충격, 파괴는 파편까지
      fxList.push({ url: resultFx("block"), left: X[shot.keeperDir], top: goalY(0.6), at: 0.55, key: "block" });
      if (!shot.saved) fxList.push({ url: resultFx("destroy"), left: X[shot.keeperDir], top: goalY(0.6), at: 0.65, key: "destroy" });
    }
  }

  // 키퍼: 공이 날아가기 전(wind)에는 대기 포즈, 날아가기 시작하면 다이빙(좌/우) 또는 점프(가운데) 포즈로 바뀐다.
  const dive = shot ? shot.keeperDir : null;
  const keeperClass = shot ? `keeper go-${shot.keeperDir}` : "keeper idle";
  const keeperVars = {
    width: keeperBoxW,
    aspectRatio: `${readySize.w} / ${readySize.h}`,
    ...(shot ? { "--flight": `${flight}ms`, "--wind": `${wind + 60}ms` } : {}),
  } as CSSProperties;

  const evolving = !!(evolveFrom && evo && !shot);
  const fullEvo = evolving; // 변신 연출은 건너뛰기와 무관하게 항상 전체
  if (fullEvo && evo!.shake > 0) {
    vars["--shake"] = String(evo!.shake);
    vars["--quake"] = `${evo!.quakeMs * SLOW}ms`;
    vars["--hit"] = `${Math.round(evo!.ms * 0.3)}ms`;
  }
  const quake = fullEvo && evo!.shake > 0;

  return (
    <div className={`field${quake ? " quake" : ""}`} style={vars as CSSProperties}>
      <img className="bg-img" src={bgUrl} alt="" />
      <div className="goalbox">
        <img className="goal-img" src={goalUrl} alt="" />
        <div className={keeperClass} style={keeperVars}>
          <img className="pose pose-ready" src={KEEPER_IMG.ready} alt="" style={{ width: poseWidth("ready") }} />
          {dive && <img className="pose pose-dive" src={KEEPER_IMG[dive]} alt="" style={{ width: poseWidth(dive) }} />}
        </div>
      </div>
      {ball && (
        <div className={`ball-pos ${ballClass}`}>
          {evolveFrom && !shot ? (
            // 변신: 이전 구간 공이 충전되며 하얗게 번쩍이고, 같은 자리에서 새 구간 본체가 크게 튀어나온다
            <div className="evo-wrap" style={{ ["--evo-ms" as string]: `${evo?.ms ?? 1500}ms` } as CSSProperties}>
              <div className="evo-old">
                <BallArt stage={evolveFrom.stage} gradeId={evolveFrom.gradeId} kindIndex={evolveFrom.kindIndex} size={ballSize(evolveFrom.stage)} />
              </div>
              <div className="evo-new">
                <BallArt stage={ball.stage} gradeId={ball.gradeId} kindIndex={ball.kindIndex} size={ballSize(ball.stage)} />
              </div>
            </div>
          ) : (
            <BallArt stage={ball.stage} gradeId={ball.gradeId} kindIndex={ball.kindIndex} size={ballSize(ball.stage)} />
          )}
        </div>
      )}
      {shot && fxList.map((e) => e.url && (<img key={e.key} className="result-fx" src={e.url} alt="" style={{ left: e.left, top: e.top, ["--at" as string]: e.at } as CSSProperties} />))}
      {fullEvo && <EvoFx spec={evo!} color={GRADE_COLOR[ball?.gradeId ?? ""] ?? "#fff"} />}
      {burst && !shot && <Burst info={burst} skip={skip && !fullEvo} />}
      {shot && shot.tense > 0 && <div className={`tense tense-${shot.tense}`} style={{ animationDuration: `${shot.ms}ms` }} />}
    </div>
  );
}




