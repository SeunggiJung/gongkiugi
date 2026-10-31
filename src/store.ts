// 1 차 프로토타입 저장소: 서버 없이 localStorage 에 저장한다. 서버로 옮기면 이 파일이 API 호출로 바뀐다.
import { config } from "./core/config";
import { newGame, type GameState } from "./core/game";
import { noTickets } from "./core/shop";

export interface Save {
  game: GameState;
  /** 일일 지원금을 마지막으로 받은 날 (KST, YYYY-MM-DD) */
  lastDaily: string;
  adDate: string;
  adsUsed: number;
  draws: number;
  bestStage: number;
  /** "연출 건너뛰기" 옵션. 건너뛰어도 확률은 같다 (GDD 6.2) */
  skip: boolean;
}

const KEY = "gongkiugi.save.v1";

export const kstDate = (now = Date.now()) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);

export function freshSave(): Save {
  // 처음 접속하면 첫 접속 골드만 받고, 일일 지원금은 다음 날부터다 (GDD 2장).
  return { game: newGame(), lastDaily: kstDate(), adDate: kstDate(), adsUsed: 0, draws: 0, bestStage: 0, skip: false };
}

export function load(): { save: Save; dailyGranted: boolean } {
  const text = localStorage.getItem(KEY);
  if (!text) return { save: freshSave(), dailyGranted: false };
  const save: Save = JSON.parse(text, (_, v) => (v && typeof v === "object" && "$b" in v ? BigInt(v.$b) : v));
  // 이전 버전 저장에 없던 필드를 채운다.
  save.game.tickets = { ...noTickets(), ...save.game.tickets };
  save.skip = save.skip ?? false;
  const today = kstDate();
  let dailyGranted = false;
  if (save.lastDaily !== today) {
    // 매일 첫 접속 때 보유 골드와 상관없이 더한다.
    save.game = { ...save.game, gold: save.game.gold + config.dailyGold };
    save.lastDaily = today;
    dailyGranted = true;
  }
  if (save.adDate !== today) {
    save.adDate = today;
    save.adsUsed = 0;
  }
  return { save, dailyGranted };
}

export function persist(save: Save) {
  localStorage.setItem(KEY, JSON.stringify(save, (_, v) => (typeof v === "bigint" ? { $b: v.toString() } : v)));
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
