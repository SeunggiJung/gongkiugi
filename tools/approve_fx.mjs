// 확정된 공 단계 효과 · 강화 버스트 · 슛 결과 연출을 후보 폴더에서 approved 폴더로 옮긴다 (docs/ASSET_LOG.md 에도 기록할 것).
// 사용: node tools/approve_fx.mjs tiers      → 공 22종 단계 효과(+5, +10, +15)와 강화 버스트, manifest.json
//       node tools/approve_fx.mjs result     → 슛 결과 연출 4종 (골 · 파괴 · 키퍼 막기 · 골대 맞기)
//       node tools/approve_fx.mjs logo       → 로고 엠블럼
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const what = process.argv[2];

function copyMatching(srcRel, dstRel, test) {
  const src = new URL(srcRel, root);
  const dst = new URL(dstRel, root);
  mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of readdirSync(src)) {
    if (!test(f)) continue;
    copyFileSync(new URL(f, src), new URL(f, dst));
    n++;
  }
  console.log(`${srcRel} -> ${dstRel}: ${n} files`);
}

if (what === "tiers") {
  copyMatching("assets/candidates/balls/tiers/", "assets/approved/balls_fx/", (f) => /^[a-z]+_\d_(5|10|15|burst)\.png$/.test(f) || f === "manifest.json");
} else if (what === "result") {
  copyMatching("assets/candidates/fx/", "assets/approved/fx/", (f) => /^result_(goal|destroy|block|post)\.png$/.test(f));
} else if (what === "logo") {
  mkdirSync(new URL("assets/approved/", root), { recursive: true });
  copyFileSync(new URL("assets/candidates/fx/logo.png", root), new URL("assets/approved/logo.png", root));
  console.log("logo -> assets/approved/logo.png");
} else {
  console.error("사용: node tools/approve_fx.mjs tiers|result|logo");
  process.exit(1);
}
