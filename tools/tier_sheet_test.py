"""단계 외형 한 장 시험: 전설 등급 공 하나의 +0, +10, +20, +30 을 2x2 시트 한 장(512)으로 뽑는다.

비용을 줄이는 두 가지 시험이다: (1) 해상도 512, (2) 한 장에 4개 묶기. 크기 값 문자열은 문서에 확정돼 있지 않아서
후보를 차례로 시도한다 (잘못된 값은 API 가 오류를 돌려주고 과금되지 않는다).
결과: assets/candidates/balls/tiers/ (시트 원본 + 칸별 투명 조각)
"""
import pathlib
import sys
import urllib.error

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

OUT = ROOT / "assets" / "candidates" / "balls" / "tiers"
BASE_BALL = ROOT / "assets" / "approved" / "balls" / "legend_0.png"  # 우주공 +0
STYLE_REF = ROOT / "assets" / "candidates" / "styleboard" / "styleboard_F.png"

PROMPT = (
    "Pixel art effect sheet in a cozy storybook pixel style matching the style reference, crisp square pixels, no anti-aliasing. "
    "The first reference image is the exact base ball (a deep purple-blue ball with a starry galaxy and nebula swirl). "
    "Draw a 2 by 2 grid of four EQUAL square cells on a perfectly flat solid magenta (#ff00ff) background, with no grid lines and nothing outside the cells. "
    "Each cell shows the SAME ball, same size, centered in its cell, at an increasing power level, and every effect stays inside its own cell: "
    "top-left = level 0: the plain base ball exactly like the reference, no effects at all. "
    "top-right = level 10: the ball glows brightly, a swirling nebula ring and orbiting stars and small sparks surround it. "
    "bottom-left = level 20: huge glowing wings of starlight on both sides, an ornate floating halo above the ball, long comet trails and a strong radiant aura. "
    "bottom-right = level 30: absolutely over the top and overwhelming, six layered wings of light, a gigantic jeweled crown, three concentric rainbow halo rings, "
    "god rays, a supernova burst, lightning and shooting stars filling the entire cell, while the ball itself stays clearly visible in the center. "
    "No text, no letters, no numbers, no logos."
)

SIZES = ["512", "512px", "0.5K"]


def key_out_magenta(im: Image.Image) -> Image.Image:
    a = np.array(im.convert("RGB")).astype(int)
    dist = np.sqrt(((a - np.array([255, 0, 255])) ** 2).sum(axis=2))
    bg = dist < 110
    fringe = ndimage.binary_dilation(bg, iterations=2) & (dist < 190)
    alpha = np.where(bg | fringe, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(im.convert("RGB")), alpha]), "RGBA")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet_path = OUT / "legend_0_sheet.png"
    if not sheet_path.exists():
        base = Image.open(BASE_BALL).convert("RGBA")
        base = base.resize((256, 256), Image.Resampling.NEAREST)
        flat = Image.new("RGB", base.size, (255, 0, 255))
        flat.paste(base, (0, 0), base)
        flat_path = OUT / "_base_ref.png"
        flat.save(flat_path)
        refs = [flat_path.read_bytes(), STYLE_REF.read_bytes()]
        data = None
        for size in SIZES:
            try:
                data = generate(PROMPT, "1:1", refs, image_size=size)
                print("image_size accepted:", size)
                break
            except urllib.error.HTTPError as e:
                print("image_size rejected:", size, e.code, e.read().decode()[:200])
        if data is None:
            raise SystemExit("512 크기 값을 찾지 못했다. 생성하지 않았다 (과금 없음).")
        sheet_path.write_bytes(data)
    sheet = Image.open(sheet_path)
    print("sheet size:", sheet.size)
    w, h = sheet.size
    for name, (cx, cy) in {"s0": (0, 0), "s10": (1, 0), "s20": (0, 1), "s30": (1, 1)}.items():
        cell = sheet.crop((cx * w // 2, cy * h // 2, (cx + 1) * w // 2, (cy + 1) * h // 2))
        rgba = key_out_magenta(cell)
        rgba.save(OUT / f"legend_0_{name}.png")


if __name__ == "__main__":
    main()
