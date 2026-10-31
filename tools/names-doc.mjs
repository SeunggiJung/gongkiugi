// src/core/names.json 을 읽기 쉬운 표로 docs/NAMES.md 에 쓴다.
import { readFileSync, writeFileSync } from "node:fs";

const names = JSON.parse(readFileSync(new URL("../src/core/names.json", import.meta.url), "utf8"));
const config = JSON.parse(readFileSync(new URL("../src/core/game.config.json", import.meta.url), "utf8"));

const out = [
  "# 공 이름 전체 (가칭)",
  "",
  "검 키우기처럼 종류마다 +0~+30 이름이 전부 다르다. 데이터는 `src/core/names.json` 이고 이 문서는 `node tools/names-doc.mjs` 로 만든다.",
  "패턴: 초반 소소·유머 → 중반 능력·원소 → +11~14 신화 인물 → +15 이후 우주 → +20 이후 극한 수식.",
  "\"명장면 공\" 은 실제 대회의 유명한 골을 모티브로 한 종류이며, 연도·사건·국가만 쓰고 선수 이름과 대회 상표는 쓰지 않는다. 근거: docs/REAL_GOALS_FACTS.md",
  "",
];
for (const g of config.grades) {
  out.push(`## ${g.name}`, "");
  for (const kind of g.kinds) {
    out.push(`### ${kind}`, "", "| 단계 | 이름 |", "|---|---|");
    names[kind].forEach((n, i) => out.push(`| +${i} | ${n} |`));
    out.push("");
  }
}
writeFileSync(new URL("../docs/NAMES.md", import.meta.url), out.join("\n"));
console.log("wrote docs/NAMES.md");


