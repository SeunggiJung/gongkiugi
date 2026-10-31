// 상점 데이터 (GDD 4.3). 가격이 GDD 에 정확히 적힌 품목만 구매할 수 있다.
// 나머지는 가격대(범위)만 있어서 가격 확정 전까지 구매할 수 없게 둔다.

export type TicketId = "S" | "M" | "L" | "XL";

/** 방지권: 지정한 단계 구간에서 키퍼에게 막히는 순간 자동으로 한 번 소모되고, 공은 그 단계 그대로 남는다. */
export const TICKETS: { id: TicketId; label: string; from: number; to: number; price: bigint }[] = [
  { id: "S", label: "소", from: 8, to: 12, price: 2_000n },
  { id: "M", label: "중", from: 13, to: 17, price: 20_000n },
  { id: "L", label: "대", from: 18, to: 22, price: 1_000_000n },
  { id: "XL", label: "특대", from: 23, to: 30, price: 50_000_000n },
];

export const noTickets = (): Record<TicketId, number> => ({ S: 0, M: 0, L: 0, XL: 0 });

export function ticketForStage(stage: number): TicketId | null {
  return TICKETS.find((t) => stage >= t.from && stage <= t.to)?.id ?? null;
}

export interface CatalogCategory {
  id: string;
  name: string;
  items: string[];
  /** GDD 가격대 문구. 정확한 가격이 아직 없다 */
  range: string;
  note: string;
}

export const CATALOG: CatalogCategory[] = [
  { id: "warp", name: "워프권", items: ["+3 시작", "+5 시작", "+7 시작", "+10 시작", "+12 시작"], range: "700 ~ 2만", note: "판매가를 역산하지 못하도록 단계마다 판매가의 1.5~2.5배 사이에서 다르게 정한다" },
  { id: "pick", name: "뽑기권 · 지정권", items: ["고급 이상 보장 뽑기권", "등급 지정권"], range: "3,000 ~ 30만", note: "지정권은 희귀할수록 비쌈" },
  { id: "fx-shot", name: "슛 이펙트", items: ["불꽃", "무지개", "번개", "별가루 궤적"], range: "1,000 ~ 10만", note: "외형만" },
  { id: "fx-goal", name: "골 연출", items: ["폭죽", "관중 환호", "슬로모션", "세리머니"], range: "5,000 ~ 100만", note: "외형만" },
  { id: "aura", name: "공 오라", items: ["단계별 글로우", "네온", "불꽃 둘레"], range: "5만 ~ 1,000만", note: "외형만" },
  { id: "stadium", name: "구장 · 배경", items: ["동네 공터", "눈 덮인 구장", "야간 경기장", "우주 경기장"], range: "10만 ~ 5,000만", note: "외형만" },
  { id: "skin", name: "골대 · 골키퍼 스킨", items: ["황금 골대", "로봇 골키퍼", "고양이 골키퍼"], range: "100만 ~ 10억", note: "외형만" },
  { id: "sound", name: "응원 · 사운드", items: ["응원가", "관중 소리", "효과음 팩"], range: "1만 ~ 500만", note: "외형만" },
  { id: "title", name: "칭호 · 프로필", items: ["칭호", "자랑 카드 프레임 · 배경"], range: "1만 ~ 100억", note: "외형만" },
  { id: "auto", name: "편의", items: ["자동 도전 (정한 단계까지 자동 슛, 도달하면 자동 판매)", "빠른 연출"], range: "50만 ~ 5,000만", note: "확률 · 판매가에는 영향 없음" },
];
