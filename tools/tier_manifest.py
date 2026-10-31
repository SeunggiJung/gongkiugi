"""단계 효과 128px 이미지에서 가운데 빈 자리(공이 놓일 곳)의 지름 비율을 측정해 manifest.json 으로 저장한다.

게임에서는 효과 이미지를 (공 지름 ÷ 이 비율) 폭으로 그려서, 빈 자리가 공 크기와 맞게 한다.
버스트는 빈 자리가 없어 비율을 재지 않고 고정 값을 쓴다.
"""
import json
import math
import re
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIR = ROOT / "assets" / "candidates" / "balls" / "tiers"


def hole_fraction(path: pathlib.Path) -> float:
    a = np.array(Image.open(path).convert("RGBA").getchannel("A"))  # 알파 = 효과가 있는 곳
    h, w = a.shape
    cx, cy = w / 2, h / 2
    radii = []
    for k in range(48):
        t = 2 * math.pi * k / 48
        r = 0.0
        while r < w / 2 - 1:
            x, y = int(cx + math.cos(t) * r), int(cy + math.sin(t) * r)
            if a[y, x] > 60:
                break
            r += 0.5
        radii.append(r)
    return float(np.median(radii)) * 2 / w


def main():
    out = {}
    for p in sorted(DIR.glob("*.png")):
        if not re.fullmatch(r"[a-z]+_\d_(5|10|15)", p.stem):
            continue
        name = p.stem  # 예: hero_2_10
        out[name] = round(hole_fraction(p), 3)
    (DIR / "manifest.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    vals = list(out.values())
    print("cells:", len(vals), "hole fraction min/median/max:", min(vals), float(np.median(vals)), max(vals))


if __name__ == "__main__":
    main()


