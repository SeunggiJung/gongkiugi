import { useEffect, useRef, useState } from "react";
import { config, gradeById } from "./core/config";
import {
  buyTicket,
  canDraw,
  canSell,
  canShoot,
  dexKey,
  drawBall,
  sell,
  shoot,
  shootCost,
  stageProbabilities,
  type Ball,
  type Direction,
} from "./core/game";
import { kindName, stageName } from "./core/names";
import { randomRng, type Rng } from "./core/rng";
import type { TicketId } from "./core/shop";
import { formatBp, formatGold } from "./format";
import { clearSave, load, persist, type Save } from "./store";
import type { BoastData } from "./ui/boast";
import BallArt, { GRADE_COLOR } from "./ui/BallArt";
import { burstSpec, type BurstInfo } from "./ui/Burst";
import Field, { shotDuration, tenseLevel, type ShotAnim } from "./ui/Field";
import { evolveSpec, SLOW, type EvolveSpec } from "./ui/timing";
import iconBag from "../assets/approved/frames/icon_bag.png";
import iconBook from "../assets/approved/frames/icon_book.png";
import iconCoinPlus from "../assets/approved/frames/icon_coin_plus.png";
import iconQuestion from "../assets/approved/frames/icon_question.png";
import { AdPopup, BoastPopup, ChargePopup, DexPopup, HelpPopup, MilestonePopup, ShopPopup, SoldPopup } from "./ui/Popups";

const DIR_LABEL: Record<Direction, string> = { left: "왼쪽", center: "가운데", right: "오른쪽" };
const AD_PER_DAY = config.adDailyLimit; // null 이면 무제한 (프로토타입 한정, docs/GDD_CHANGES.md)
const FAKE_AD_SECONDS = 5; // 보상형 광고 승인 전 테스트용 가짜 광고 (GDD 7장)

type Popup = "none" | "milestone" | "sold" | "dex" | "shop" | "charge" | "ad" | "help" | "boast";
interface Sold { name: string; price: bigint; record: boolean; boast: BoastData }

function demoLoad(m: RegExpExecArray) {
  const loaded = load();
  const ball: Ball = { gradeId: m[1], kindIndex: Number(m[2]), stage: Number(m[3]), shots: 3 };
  return { ...loaded, save: { ...loaded.save, game: { ...loaded.save.game, gold: 10n ** 12n, ball } } };
}

function ballName(b: Ball) {
  const unique = stageName(b.gradeId, b.kindIndex, b.stage);
  return `[${gradeById(b.gradeId).name}] ${unique ?? kindName(b.gradeId, b.kindIndex)} +${b.stage}`;
}

function boastData(b: Ball, soldText?: string): BoastData {
  const g = gradeById(b.gradeId);
  return {
    gradeId: b.gradeId,
    gradeName: g.name,
    kindIndex: b.kindIndex,
    name: `${stageName(b.gradeId, b.kindIndex, b.stage) ?? kindName(b.gradeId, b.kindIndex)}`,
    stage: b.stage,
    soldText,
  };
}

// 개발 서버에서만 쓰는 데모 링크: #demo=등급_종류번호_단계 (예: #demo=hero_2_4). &win=1 이면 슛이 항상 골이다.
const DEMO = import.meta.env.DEV ? /#demo=([a-z]+)_(\d+)_(\d+)(&win=1)?/.exec(location.hash) : null;
const ALWAYS_GOAL: Rng = { int: () => 0, float: () => 0 };
const gameRng: Rng = DEMO?.[4] ? ALWAYS_GOAL : randomRng;

export default function App() {
  const first = useRef(DEMO ? demoLoad(DEMO) : load());
  const [save, setSave] = useState<Save>(first.current.save);
  const [popup, setPopup] = useState<Popup>("none");
  const [shot, setShot] = useState<(ShotAnim & { prev: Ball }) | null>(null);
  const [sold, setSold] = useState<Sold | null>(null);
  const [boast, setBoast] = useState<BoastData | null>(null);
  const [reveal, setReveal] = useState<Ball | null>(null);
  const [burst, setBurst] = useState<BurstInfo | null>(null);
  // 구간이 바뀌는 골(+5, +10, +15 …): 이전 공이 충전되고 새 구간 본체로 변신하는 연출
  const [evolveFrom, setEvolveFrom] = useState<Ball | null>(null);
  const [evoCap, setEvoCap] = useState<{ id: number; text: string; color: string; scale: number; ms: number } | null>(null);
  const [evo, setEvo] = useState<EvolveSpec | null>(null);
  const [toast, setToast] = useState<string | null>(first.current.dailyGranted ? `일일 지원금 +${formatGold(config.dailyGold)} 골드` : null);
  const [adLeft, setAdLeft] = useState(0);
  const streak = useRef(0);
  const timers = useRef<number[]>([]);
  const toastTimer = useRef<number>(0);

  // 개발용 데모 링크는 실제 저장 데이터를 덮어쓰지 않는다.
  useEffect(() => { if (!DEMO) persist(save); }, [save]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const { game, skip } = save;
  const ball = game.ball;
  const shown = shot?.prev ?? ball;
  const busy = !!shot; // 연출 중에만 입력을 막는다. 뽑기 결과와 토스트는 입력을 막지 않는다.
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  /** 입력을 막지 않는 짧은 알림 */
  function showToast(text: string, ms = 1400) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(null), skip ? 700 : ms);
  }

  function doDraw() {
    const r = drawBall(game, randomRng);
    if (!r.ok) return;
    setSave({ ...save, game: r.state, draws: save.draws + 1 });
    setReveal(r.ball);
    later(() => setReveal(null), skip ? 250 : 800);
  }

  function doShoot(dir: Direction) {
    if (!ball || busy) return;
    const r = shoot(game, dir, gameRng);
    if (!r.ok) return;
    const tense = tenseLevel(ball.stage);
    const ms = shotDuration(tense, skip);
    const next = r.state.ball;
    setReveal(null);
    setBurst(null);
    setShot({ dir, keeperDir: r.keeperDir, outcome: r.outcome, saved: r.saved, tense, ms, prev: ball });
    // 결과는 슛을 차는 순간 저장한다. 연출 도중 새로고침해도 결과를 피할 수 없다.
    setSave({ ...save, game: r.state, bestStage: Math.max(save.bestStage, next?.stage ?? 0) });
    later(() => {
      setShot(null);
      if (r.outcome === "destroy") {
        streak.current += 1;
        showToast(streak.current >= 3 ? "괜찮아, 다음 공은 다를 거야" : "키퍼에게 막혔다! 공이 사라졌다");
        return;
      }
      streak.current = 0;
      if (r.outcome === "keep") {
        showToast(r.saved ? "방지권 사용! 공을 지켰다" : "골대를 맞고 튕겨 나왔다 (단계 유지)");
        return;
      }
      // 골: +13 까지는 공 주위 이펙트와 이름 변경 연출만, +14 부터는 팝업이 뜬다 (GDD_CHANGES.md)
      const stage = next!.stage;
      const evolved = stage >= 5 && stage % 5 === 0;
      // 구간이 바뀌는 변신 연출은 건너뛰기를 켜도 항상 전체를 보여 준다
      const spec = evolved ? evolveSpec(stage) : null;
      const skipNow = skip && !evolved;
      const evoMs = spec?.ms ?? 0;
      setBurst({ id: Date.now(), stage, gradeId: next!.gradeId, kindIndex: next!.kindIndex, evo: spec ?? undefined });
      later(() => setBurst(null), (evolved ? evoMs * 0.3 : 0) + (skipNow ? 400 : (500 + burstSpec(stage, spec?.burstMul).level * 40 + 150) * SLOW) + (evolved ? 600 * SLOW : 0));
      if (spec) {
        setEvolveFrom(ball);
        setEvo(spec);
        setEvoCap({ id: Date.now(), text: `+${stage} ${spec.caption}`, color: GRADE_COLOR[next!.gradeId], scale: spec.captionScale, ms: spec.ms });
        later(() => { setEvolveFrom(null); setEvoCap(null); setEvo(null); }, evoMs + 200 * SLOW);
      }
      if (stage >= config.boastStage) later(() => setPopup("milestone"), evolved ? evoMs + 300 : skip ? 0 : 750);
    }, ms);
  }

  function doSell() {
    if (!ball || busy || !canSell(game)) return;
    const prevBest = game.dex[dexKey(ball)]?.bestSale ?? 0n;
    const r = sell(game, randomRng);
    if (!r.ok) return;
    setSave({ ...save, game: r.state });
    streak.current = 0;
    setBurst(null);
    setSold({
      name: ballName(ball),
      price: r.price,
      record: r.price > prevBest,
      boast: boastData(ball, formatGold(r.price)),
    });
    setPopup("sold");
  }

  function buy(id: TicketId) {
    const r = buyTicket(game, id);
    if (r.ok) setSave({ ...save, game: r.state });
  }

  function startAd() {
    if (AD_PER_DAY !== null && save.adsUsed >= AD_PER_DAY) return;
    setAdLeft(FAKE_AD_SECONDS);
    setPopup("ad");
  }

  useEffect(() => {
    if (popup !== "ad") return;
    if (adLeft <= 0) {
      // 끝까지 본 뒤에만 지급한다. 중간에 닫으면 주지 않는다.
      setSave((s) => ({ ...s, game: { ...s.game, gold: s.game.gold + config.adGold }, adsUsed: s.adsUsed + 1 }));
      setPopup("none");
      showToast(`광고 시청 보상 +${formatGold(config.adGold)} 골드`);
      return;
    }
    const t = setTimeout(() => setAdLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup, adLeft]);

  const cost = shown ? shootCost(shown.stage) : null;
  const probs = shown ? stageProbabilities(shown.gradeId, shown.stage) : null;
  const broke = ball ? cost !== null && !canShoot(game) : !canDraw(game);
  const ticketText = (["S", "M", "L", "XL"] as TicketId[])
    .filter((t) => game.tickets[t] > 0)
    .map((t) => `${{ S: "소", M: "중", L: "대", XL: "특대" }[t]} ${game.tickets[t]}`)
    .join(" · ");

  return (
    <div className="stage">
      <Field ball={shown} shot={shot} burst={burst} skip={skip} evolveFrom={evolveFrom} evo={evo} />

      <div className="topbar">
        <div className="gold-pill">{formatGold(game.gold)}</div>
        {ticketText && <div className="tickets">방지권 {ticketText}</div>}
        <div className="top-right">
          <button className={`mini${skip ? " on" : ""}`} aria-pressed={skip} onClick={() => setSave({ ...save, skip: !skip })}>
            연출 건너뛰기
          </button>
          <button className="mini" onClick={() => setPopup("help")} aria-label="규칙 설명"><img src={iconQuestion} alt="" /></button>
        </div>
      </div>

      {probs && (
        <div className="chips">
          <span className="chip goal">성공 {formatBp(probs.success)}</span>
          <span className="chip keep">유지 {formatBp(probs.keep)}</span>
          <span className="chip destroy">파괴 {formatBp(probs.destroy)}</span>
        </div>
      )}

      <div className="side">
        <button onClick={() => setPopup("dex")}><img src={iconBook} alt="" />도감</button>
        <button onClick={() => setPopup("shop")}><img src={iconBag} alt="" />상점</button>
        <button onClick={() => setPopup("charge")}><img src={iconCoinPlus} alt="" />충전</button>
      </div>

      {/* 팔기는 오른쪽에 상시 배치한다. 바닥의 방향 버튼과 떨어뜨려 실수로 팔지 않게 한다. */}
      <div className="side-right">
        <button className="sell" disabled={busy || !canSell(game)} onClick={doSell}>팔기</button>
      </div>

      {shown && (
        <div className="ballinfo">
          <div className="banner swap" key={ballName(shown)} style={{ ["--g" as string]: GRADE_COLOR[shown.gradeId] }}>{ballName(shown)}</div>
          {cost !== null ? <div className="costline">슛 비용 {formatGold(cost)}</div> : <div className="costline">최고 단계! 팔기만 남았다</div>}
          {shown.stage >= 20 && <div className="pending">이미지 준비 중</div>}
        </div>
      )}

      {reveal && (
        <div className="reveal" style={{ ["--c" as string]: GRADE_COLOR[reveal.gradeId] }}>
          <BallArt stage={0} gradeId={reveal.gradeId} kindIndex={reveal.kindIndex} size={96} />
          <div className="reveal-grade">{gradeById(reveal.gradeId).name}</div>
          <div className="reveal-name">{ballName(reveal)}</div>
        </div>
      )}
      {toast && <div className="toast" key={toast}>{toast}</div>}
      {evoCap && <div className="evo-caption" key={evoCap.id} style={{ color: evoCap.color, ["--evo-ms" as string]: `${evoCap.ms}ms`, ["--cap" as string]: evoCap.scale }}>{evoCap.text}</div>}

      <div className="controls">
        {!ball && (
          <button className="big primary" disabled={!canDraw(game) || busy} onClick={doDraw}>
            공 뽑기 ({formatGold(config.drawCost)} 골드)
          </button>
        )}
        {ball && ball.stage < config.maxStage && (
          <div className="row">
            {(["left", "center", "right"] as Direction[]).map((d) => (
              <button key={d} className="big dir" disabled={busy || !canShoot(game)} onClick={() => doShoot(d)}>
                {DIR_LABEL[d]}
              </button>
            ))}
          </div>
        )}
        {broke && !busy && (
          <div className="broke">
            <span>골드가 모자라 더 할 수 없다{ball && canSell(game) ? " (오른쪽 팔기로 골드를 만들 수 있다)" : ""}</span>
            <button className="primary" onClick={() => setPopup("charge")}>광고 보고 또 차기</button>
          </div>
        )}
        <div className="legal">가상 골드만 사용하며 현금 가치와 결제가 없습니다.</div>
      </div>

      {popup === "milestone" && ball && (
        <MilestonePopup
          stage={ball.stage}
          name={ballName(ball)}
          art={<BallArt stage={ball.stage} gradeId={ball.gradeId} kindIndex={ball.kindIndex} size={88} />}
          onBoast={() => { setBoast(boastData(ball)); setPopup("boast"); }}
          onClose={() => setPopup("none")}
        />
      )}
      {popup === "sold" && sold && (
        <SoldPopup
          name={sold.name}
          price={sold.price}
          record={sold.record}
          skip={skip}
          onBoast={sold.boast.stage >= config.boastStage ? () => { setBoast(sold.boast); setPopup("boast"); } : undefined}
          onClose={() => setPopup("none")}
        />
      )}
      {popup === "boast" && boast && <BoastPopup data={boast} onClose={() => setPopup("none")} />}
      {popup === "dex" && <DexPopup game={game} onClose={() => setPopup("none")} />}
      {popup === "shop" && <ShopPopup game={game} onBuy={buy} onClose={() => setPopup("none")} />}
      {popup === "charge" && <ChargePopup adsUsed={save.adsUsed} adMax={AD_PER_DAY} onAd={startAd} onClose={() => setPopup("none")} />}
      {popup === "ad" && <AdPopup left={adLeft} onClose={() => setPopup("none")} />}
      {popup === "help" && (
        <HelpPopup
          onClose={() => setPopup("none")}
          onReset={() => {
            if (confirm("저장을 지우고 처음부터 시작할까요? (테스트용)")) {
              clearSave();
              location.reload();
            }
          }}
        />
      )}
    </div>
  );
}




