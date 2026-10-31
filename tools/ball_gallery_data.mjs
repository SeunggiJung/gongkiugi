// 공 0단계 시안 갤러리용 데이터(등급, 종류, +0 이름)를 preview/balls0/manifest.json 으로 만든다.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const config = JSON.parse(readFileSync(new URL("src/core/game.config.json", root), "utf8"));
const names = JSON.parse(readFileSync(new URL("src/core/names.json", root), "utf8"));
const outDir = new URL("preview/balls0/", root);
mkdirSync(outDir, { recursive: true });

const srcDir = new URL("assets/candidates/balls/base/", root);
for (const f of readdirSync(srcDir)) copyFileSync(new URL(f, srcDir), new URL(f, outDir));

const items = [];
for (const g of config.grades) {
  g.kinds.forEach((kind, idx) => items.push({ grade: g.id, gradeName: g.name, idx, kind, name0: names[kind][0] }));
}
writeFileSync(new URL("manifest.json", outDir), JSON.stringify(items, null, 2));
console.log("items:", items.length);
