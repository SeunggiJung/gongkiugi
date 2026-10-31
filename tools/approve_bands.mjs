// 확정된 공 구간 본체 이미지를 후보 폴더에서 assets/approved/balls/ 로 옮긴다 (docs/ASSET_LOG.md 에도 기록할 것).
// 파일 이름은 {등급}_{종류번호}_{5|10|15}.png 이고, 구간 이미지의 크기 보정값은 bands.json 에 모은다.
//   (공 본체 지름은 +0 과 같은 64px 로 맞춰져 있고, 스프라이트가 그보다 커서 바깥 장식이 들어간다. BallArt 가 이 비율로 보정한다.)
// 사용: node tools/approve_bands.mjs all                    → 22종 전부
//       node tools/approve_bands.mjs hero_2 uncommon_0     → 지정한 종류만
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const src = new URL("assets/candidates/balls/bands/", root);
const dst = new URL("assets/approved/balls/", root);
mkdirSync(dst, { recursive: true });

const all = [...new Set(readdirSync(src).filter((f) => /^[a-z]+_\d_info\.json$/.test(f)).map((f) => f.replace("_info.json", "")))];
const wanted = process.argv.slice(2);
const names = wanted.length === 0 || wanted[0] === "all" ? all : wanted;

const bandsPath = new URL("bands.json", dst);
const bands = existsSync(bandsPath) ? JSON.parse(readFileSync(bandsPath, "utf8")) : {};
for (const name of names) {
  if (!all.includes(name)) throw new Error(`후보에 없는 종류: ${name}`);
  for (const lv of [5, 10, 15]) copyFileSync(new URL(`${name}_${lv}.png`, src), new URL(`${name}_${lv}.png`, dst));
  const info = JSON.parse(readFileSync(new URL(`${name}_info.json`, src), "utf8"));
  bands[name] = info.sprite_px;
  console.log(`${name}: 5, 10, 15 옮김 (스프라이트 ${info.sprite_px}px)`);
}
writeFileSync(bandsPath, JSON.stringify(bands, null, 2) + "\n");
console.log(`bands.json: ${Object.keys(bands).length}종`);
