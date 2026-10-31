"""선택 요소 2장: 슛 결과 연출 시트(효과만, 검은 배경, 스크린 합성용)와 로고 엠블럼(글자 없음). 스타일 F.

결과: assets/candidates/fx/result_fx.png (시트 원본), result_{goal|destroy|block|post}.png (128px), logo_raw.png, logo.png (투명)
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402
from tier_effects import luminance_to_alpha  # noqa: E402

OUT = ROOT / "assets" / "candidates" / "fx"

FX_PROMPT = (
    "A pixel art visual-effect sprite sheet for a football game, cozy storybook pixel style, crisp square pixels, no anti-aliasing. "
    "Pure solid black (#000000) background everywhere. Draw a 2 by 2 grid of four EQUAL square cells with no borders, no grid lines and no frames; "
    "nothing crosses from one cell into another and each cell has a wide black margin. Only light and particle effects, no ball, no characters, no objects, centered in each cell. "
    "Top-left cell = a goal celebration: a colorful firework burst with stars and confetti. "
    "Top-right cell = a destruction: a ball shattering into sharp flying fragments, cracks and gray dust. "
    "Bottom-left cell = a goalkeeper save: a bright impact flash with a star-shaped shockwave and speed lines. "
    "Bottom-right cell = hitting the goalpost: a short sharp spark burst with a ringing impact star. "
    "Glows are drawn as hard-edged pixel bands, bright against the black. No text, no letters, no numbers, no logos."
)

LOGO_PROMPT = (
    "A game logo emblem in cozy storybook pixel art, crisp square pixels, thick dark outline: a round pixel soccer ball with small feathered wings on both sides "
    "and a tiny golden crown above it, a few sparkles, warm earthy palette with gold accents, centered, filling most of the frame. "
    "Drawn on a perfectly flat solid magenta (#ff00ff) background with nothing else. No text, no letters, no numbers, no brand names."
)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    count = 0
    fx = OUT / "result_fx.png"
    if not fx.exists():
        fx.write_bytes(generate(FX_PROMPT, "1:1", None, image_size="512"))
        count += 1
        print("generated result_fx")
    sheet = Image.open(fx)
    w, h = sheet.size
    for label, (cx, cy) in {"goal": (0, 0), "destroy": (1, 0), "block": (0, 1), "post": (1, 1)}.items():
        cell = sheet.crop((cx * w // 2, cy * h // 2, (cx + 1) * w // 2, (cy + 1) * h // 2)).convert("RGB")
        arr = np.array(cell)
        arr[:6] = 0
        arr[-6:] = 0
        arr[:, :6] = 0
        arr[:, -6:] = 0  # 모델이 그린 칸 테두리 제거
        cell = Image.fromarray(arr, "RGB").resize((128, 128), Image.Resampling.BOX)
        q = cell.quantize(colors=32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
        a = np.array(q)
        a[a.max(axis=2) < 22] = 0
        luminance_to_alpha(a).save(OUT / f"result_{label}.png")

    raw = OUT / "logo_raw.png"
    if not raw.exists():
        raw.write_bytes(generate(LOGO_PROMPT, "1:1", None, image_size="512"))
        count += 1
        print("generated logo")
    im = Image.open(raw).convert("RGB")
    a = np.array(im).astype(int)
    dist = np.sqrt(((a - np.array([255, 0, 255])) ** 2).sum(axis=2))
    bg = dist < 110
    fringe = ndimage.binary_dilation(bg, iterations=2) & (dist < 190)
    alpha = np.where(bg | fringe, 0, 255).astype(np.uint8)
    rgba = Image.fromarray(np.dstack([np.array(im), alpha]), "RGBA")
    rgba.crop(rgba.getchannel("A").getbbox()).save(OUT / "logo.png")
    print("images generated this run:", count)


if __name__ == "__main__":
    main()


