import { useEffect, useRef, useState, type ReactNode } from "react";
import { config } from "../core/config";
import { dexKey, type GameState } from "../core/game";
import { stageName } from "../core/names";
import { CATALOG, TICKETS, type TicketId } from "../core/shop";
import { formatGold } from "../format";
import { ballImageUrl } from "./BallArt";
import { drawBoastCard, inviteLink, type BoastData } from "./boast";

export function Modal({ title, onClose, children, wide }: { title?: string; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className={`sheet${wide ? " wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="sheet-head">
            <h2>{title}</h2>
            {onClose && <button className="x" onClick={onClose} aria-label="닫기">✕</button>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** 판매 금액은 팔기를 확정한 뒤 이 화면에서 처음 공개된다. */
export function SoldPopup({ name, price, record, skip, onBoast, onClose }: {
  name: string; price: bigint; record: boolean; skip: boolean; onBoast?: () => void; onClose: () => void;
}) {
  const [shown, setShown] = useState(skip ? price : 0n);
  useEffect(() => {
    if (skip) return;
    const steps = 30;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(i >= steps ? price : (price * BigInt(i)) / BigInt(steps));
      if (i >= steps) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [price, skip]);
  return (
    <Modal>
      <div className="center">
        <h2>판매 완료</h2>
        <div className="sold-name">{name}</div>
        <div className="sold-price">+{formatGold(shown)} <small>골드</small></div>
        {record && shown === price && <div className="record">내가 판 최고 금액 신기록!</div>}
        <div className="row">
          <button className="big primary" onClick={onClose}>확인</button>
        </div>
        {onBoast && <button className="link" onClick={onBoast}>자랑하기</button>}
      </div>
    </Modal>
  );
}

/** +14 이상 골: 팝업이 뜨고 자랑하기만 나온다. 판매 금액은 쓰지 않는다. */
export function MilestonePopup({ stage, name, art, onBoast, onClose }: {
  stage: number; name: string; art: ReactNode; onBoast: () => void; onClose: () => void;
}) {
  return (
    <Modal>
      <div className="center">
        <h2>+{stage} 달성!</h2>
        {art}
        <div className="sold-name">{name}</div>
        <div className="row">
          <button className="big primary" onClick={onBoast}>자랑하기</button>
          <button className="big" onClick={onClose}>닫기</button>
        </div>
      </div>
    </Modal>
  );
}

export function DexPopup({ game, onClose }: { game: GameState; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Modal title="도감" onClose={onClose} wide>
      <div className="dex-scroll">
        {config.grades.map((g) => (
          <div key={g.id}>
            <h3>{g.name}</h3>
            {g.kinds.map((k, i) => {
              const key = dexKey({ gradeId: g.id, kindIndex: i });
              const e = game.dex[key];
              const isOpen = !!e && open === key;
              return (
                <div key={k}>
                  <button className="dex-row" disabled={!e} onClick={() => setOpen(isOpen ? null : key)}>
                    {/* 도감에서 공 이미지를 볼 수 있어야 한다. 만난 적 없는 종류는 실루엣으로만 보인다. */}
                    <img className={`dex-thumb${e ? "" : " unknown"}`} src={ballImageUrl(g.id, i, e?.maxStage ?? 0)} alt="" />
                    <span>{e ? `${isOpen ? "▾" : "▸"} ${k}` : "???"}</span>
                    <span>{e ? `최고 +${e.maxStage}` : "-"}</span>
                    <span>{e && e.bestSale > 0n ? `내가 판 최고 ${formatGold(e.bestSale)}` : "-"}</span>
                  </button>
                  {isOpen && (
                    <ol className="dex-stages" start={0}>
                      {Array.from({ length: e.maxStage + 1 }, (_, s) => (
                        <li key={s}>
                          <img className="dex-thumb sm" src={ballImageUrl(g.id, i, s)} alt="" />
                          <span><em>+{s}</em> {stageName(g.id, i, s) ?? `${k} +${s}`}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function ShopPopup({ game, onBuy, onClose }: { game: GameState; onBuy: (id: TicketId) => void; onClose: () => void }) {
  const [tab, setTab] = useState("guard");
  const cat = CATALOG.find((c) => c.id === tab);
  return (
    <Modal title="상점" onClose={onClose} wide>
      <div className="gold-line">보유 {formatGold(game.gold)} 골드</div>
      <div className="tabs-scroll">
        <button className={tab === "guard" ? "on" : ""} onClick={() => setTab("guard")}>방지권</button>
        {CATALOG.map((c) => (
          <button key={c.id} className={tab === c.id ? "on" : ""} onClick={() => setTab(c.id)}>{c.name}</button>
        ))}
      </div>
      {tab === "guard" ? (
        <div className="shop-list">
          <p className="hint">미리 사 두면 지정한 단계 구간에서 키퍼에게 막히는 순간 자동으로 한 장 쓰이고, 공은 그 단계 그대로 남습니다.</p>
          {TICKETS.map((t) => (
            <div className="shop-item" key={t.id}>
              <div>
                <b>방지권 {t.label}</b>
                <div className="sub">+{t.from}~+{t.to} 구간 · 보유 {game.tickets[t.id]}장</div>
              </div>
              <button className="primary" disabled={game.gold < t.price} onClick={() => onBuy(t.id)}>{formatGold(t.price)}</button>
            </div>
          ))}
        </div>
      ) : (
        cat && (
          <div className="shop-list">
            {cat.items.map((it) => (
              <div className="shop-item" key={it}>
                <div>
                  <b>{it}</b>
                  <div className="sub">가격대 {cat.range} 골드 · {cat.note}</div>
                </div>
                <button disabled>준비 중</button>
              </div>
            ))}
            <p className="hint">정확한 가격과 효과는 아직 정해지지 않았습니다. 가격이 확정되면 구매할 수 있게 열립니다.</p>
          </div>
        )
      )}
    </Modal>
  );
}

export function ChargePopup({ adsUsed, adMax, onAd, onClose }: { adsUsed: number; adMax: number | null; onAd: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal title="골드 충전" onClose={onClose}>
      <button className="big primary" disabled={adMax !== null && adsUsed >= adMax} onClick={onAd}>
        광고 보기 +{formatGold(config.adGold)} ({adMax === null ? `오늘 ${adsUsed}회 · 프로토타입은 횟수 제한 없음` : `오늘 ${adsUsed}/${adMax}`})
      </button>
      <button
        className="big"
        onClick={async () => {
          await navigator.clipboard?.writeText(inviteLink());
          setCopied(true);
        }}
      >
        {copied ? "초대 링크를 복사했어요" : `초대 링크 복사 (친구 1명당 +${formatGold(config.inviteGold)})`}
      </button>
      <p className="hint">친구 초대 보상은 서버에서 검증한 뒤 지급합니다. 지금 프로토타입에서는 링크 복사까지만 됩니다.</p>
      <p className="hint">매일 00:00(KST) 이후 첫 접속에서 일일 지원금 {formatGold(config.dailyGold)} 골드를 받습니다.</p>
    </Modal>
  );
}

export function AdPopup({ left, onClose }: { left: number; onClose: () => void }) {
  return (
    <Modal title="테스트용 광고">
      <p className="center">{left}초 뒤에 보상이 지급됩니다.</p>
      <p className="hint center">광고 승인 전에는 가짜 광고를 씁니다. 끝까지 보기 전에 닫으면 보상이 없습니다.</p>
      <button onClick={onClose}>닫기 (보상 없음)</button>
    </Modal>
  );
}

export function HelpPopup({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  return (
    <Modal title="규칙 설명" onClose={onClose}>
      <ol className="help">
        <li>골드로 공을 뽑고, 방향을 골라 슛을 차서 강화합니다. 방향 선택은 연출용이고 확률에는 영향이 없습니다.</li>
        <li>결과는 세 가지입니다. 성공은 골이 들어가 +1, 유지는 골대를 맞고 튕겨 나와 단계가 그대로(슛 비용만 사라짐), 파괴는 키퍼에게 막혀 공이 사라집니다.</li>
        <li>왼쪽 · 가운데 · 오른쪽만 계속 누르면 됩니다. 공이 한 번이라도 골이나 유지로 살아남으면 오른쪽의 팔기 버튼을 언제든 누를 수 있고, 판매 금액은 팔기를 누른 뒤에야 보입니다.</li>
        <li>성공·유지·파괴 확률과 슛 비용은 항상 공개됩니다. 판매가는 단계별 기준값에 ±15% 변동이 붙어서 같은 공도 팔 때마다 조금 다릅니다. 도감의 "내가 판 최고 금액"으로 감을 잡으세요.</li>
        <li>+30 에 도달하면 더 찰 수 없고 팔기만 남습니다.</li>
        <li>골드가 모자라면 광고 시청이나 친구 초대로 충전하고, 매일 첫 접속에 일일 지원금을 받습니다.</li>
        <li>이 게임의 골드는 가상 재화이며 현금 가치가 없고 결제 요소도 없습니다.</li>
      </ol>
      <button className="link" onClick={onReset}>저장 지우고 처음부터 (테스트용)</button>
    </Modal>
  );
}

export function BoastPopup({ data, onClose }: { data: BoastData; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (ref.current) drawBoastCard(ref.current, data);
  }, [data]);

  const toBlob = () => new Promise<Blob | null>((res) => ref.current!.toBlob(res, "image/png"));

  async function share() {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], "gongkiugi.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "공키우기", text: "내 최고 기록!", url: inviteLink() });
      } catch {
        /* 사용자가 공유 창을 닫음 */
      }
    } else {
      setMsg("이 브라우저는 공유 창을 지원하지 않아요. 이미지 저장이나 링크 복사를 써 주세요.");
    }
  }
  async function save() {
    const blob = await toBlob();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gongkiugi-record.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function copy() {
    await navigator.clipboard?.writeText(inviteLink());
    setMsg("링크를 복사했어요.");
  }

  return (
    <Modal title="자랑 카드" onClose={onClose}>
      <canvas ref={ref} className="boast" />
      <div className="row">
        <button className="primary" onClick={share}>공유</button>
        <button onClick={save}>이미지 저장</button>
        <button onClick={copy}>링크 복사</button>
      </div>
      {msg && <p className="hint center">{msg}</p>}
    </Modal>
  );
}

