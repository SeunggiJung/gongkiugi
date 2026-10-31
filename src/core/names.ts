// 단계별 고유 이름 (가칭). 검 키우기처럼 종류마다 +0~+30 전부 다른 이름을 쓴다. 데이터: names.json, 문서: docs/NAMES.md
// 검 키우기 패턴: 초반 소소·유머 → 중반 능력·원소 → +11~14 신화 인물 → +15 이후 우주 → +20 이후 "종언 · 절대" 같은 극한 수식.
import { gradeById } from "./config";
import raw from "./names.json";

const LADDERS = raw as Record<string, string[]>;

export function kindName(gradeId: string, kindIndex: number): string {
  return gradeById(gradeId).kinds[kindIndex];
}

/** 해당 단계의 고유 이름. 없으면 undefined */
export function stageName(gradeId: string, kindIndex: number, stage: number): string | undefined {
  return LADDERS[kindName(gradeId, kindIndex)]?.[stage];
}

/** 화면에 쓰는 이름: 고유 이름이 있으면 그것, 없으면 "종류 +N" */
export function displayName(gradeId: string, kindIndex: number, stage: number): string {
  return stageName(gradeId, kindIndex, stage) ?? `${kindName(gradeId, kindIndex)} +${stage}`;
}
