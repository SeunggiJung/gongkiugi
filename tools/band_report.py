"""구간 본체 이미지 점검: 각 종류에서 구간 사이 변화량을 계산해 변화가 약한 곳을 찾는다.

d(a→b) 는 두 이미지를 같은 크기 검정 배경 위에 겹쳐 놓고 구한 픽셀 평균 차이다. 값이 클수록 많이 달라 보인다.
사용: py -3.12 tools/band_report.py
"""
import json
import pathlib
import statistics

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "assets" / "candidates" / "balls" / "bands"


def flat(im: Image.Image, size: int) -> np.ndarray:
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    bg.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return np.array(bg.convert("RGB")).astype(float)


def main():
    grades = json.loads((ROOT / "src" / "core" / "game.config.json").read_text(encoding="utf-8"))["grades"]
    rows = []
    for g in grades:
        for i, kind in enumerate(g["kinds"]):
            n = f"{g['id']}_{i}"
            ims = [Image.open(D / f"{n}_{lv}.png").convert("RGBA") for lv in (0, 5, 10, 15)]
            size = max(im.width for im in ims)
            a = [flat(im, size) for im in ims]
            d = lambda x, y: float(np.abs(a[x] - a[y]).mean())  # noqa: E731
            opaque = [float((np.array(im.getchannel("A")) > 0).mean()) for im in ims]
            rows.append((n, kind, d(0, 1), d(1, 2), d(2, 3), d(0, 3), opaque, size))
    print("종류          d(0→5) d(5→10) d(10→15) d(0→15)  불투명 비율(+0 +5 +10 +15)  스프라이트")
    for r in rows:
        print(f"{r[0]:11s} {r[1][:8]:10s} {r[2]:6.1f} {r[3]:7.1f} {r[4]:8.1f} {r[5]:7.1f}   " + " ".join(f"{o:.2f}" for o in r[6]) + f"   {r[7]}")
    for j, name in ((2, "+0→+5"), (3, "+5→+10"), (4, "+10→+15")):
        vals = [r[j] for r in rows]
        print(f"{name}: 중앙값 {statistics.median(vals):.1f}, 최소 {min(vals):.1f} ({min(rows, key=lambda r: r[j])[0]})")
    med5 = statistics.median(r[2] for r in rows)
    print("+5 변화가 약한 종류(중앙값의 60% 미만):", [r[0] for r in rows if r[2] < med5 * 0.6])


if __name__ == "__main__":
    main()
