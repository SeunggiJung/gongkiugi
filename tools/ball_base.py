"""공 22종의 0단계 기본 이미지 시안 (GDD 3.2, 9장). 스타일 F 고정. 22장을 생성한다.

각 종류는 +0 단계의 소박한 상태로 그린다 (이름 사다리의 +0 과 맞춘다). 후광 · 날개 · 왕관 같은 단계 효과는 코드가 얹으므로
이미지에는 공 본체만 있다. 단색 마젠타 배경에 그려서 투명하게 따고 64x64 도트, 28색으로 줄인다.

원본은 assets/candidates/balls/raw, 처리본은 assets/candidates/balls/base 에 저장한다.
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

RAW = ROOT / "assets" / "candidates" / "balls" / "raw"
OUT = ROOT / "assets" / "candidates" / "balls" / "base"
STYLE_REF = ROOT / "assets" / "candidates" / "styleboard" / "styleboard_F.png"

SIZE = 64
COLORS = 28
NO_REF = {"common_2"}

BASE = (
    "Cozy storybook pixel art matching the reference image style: warm earthy palette, thick dark outline, crisp square pixels, no anti-aliasing. "
    "A single game item sprite: one perfectly round ball, front view, centered, filling most of the frame, with a strong readable silhouette "
    "and clear colors that still read at tiny sizes. Simple shading. Absolutely no glow, no aura, no sparkles, no particles and no effects outside the ball, "
    "no drop shadow, no text, no logos, no brand names. Drawn on a perfectly flat solid magenta (#ff00ff) background with nothing else. "
)

# (등급 id, 종류 번호): 설명 (+0 의 소박한 상태). 종류 번호는 game.config.json 의 kinds 순서다.
BALLS = {
    ("common", 0): "an old dusty classic black-and-white leather soccer ball, scuffed with mud smudges, slightly deflated",
    ("common", 1): "a soft bright red rubber ball with a glossy highlight and a single seam line, plain and simple",
    ("common", 2): "a lumpy ball made of crumpled translucent grocery plastic bags wrapped with beige tape, wrinkled",
    ("common", 3): "an old brown leather ball with thick visible stitching and patched seams, worn and cracked",
    ("uncommon", 0): "a clean white ball with a bold black hexagon-and-pentagon panel pattern, neat and official looking, generic design with no logo",
    ("uncommon", 1): "a lime-green glow-in-the-dark ball with a soft luminous texture and faint dark panel lines",
    ("uncommon", 2): "a yellow kitchen sponge ball full of holes and pores, porous texture",
    ("uncommon", 3): "a rusty copper metal ball with green verdigris patches and rivets",
    ("rare", 0): "a transparent pale blue ice crystal ball with frost cracks and frosty edges",
    ("rare", 1): "a see-through glass ball with a hairline crack and bright highlights, clear with a blue-green tint",
    ("rare", 2): "a red-orange ball with flame patterns and small ember sparks painted on its surface",
    ("rare", 3): "a yellow ball with electric spark patterns and a black zigzag lightning bolt pattern on it",
    ("hero", 0): "a shiny polished gold metal ball with bright reflections and a hexagon pattern etched in",
    ("hero", 1): "a ball made of purple amethyst crystal shards fused together, faceted",
    ("hero", 2): "a dark basalt ball with glowing orange lava veins between hexagon plates",
    ("hero", 3): "a dark navy ball with glowing cyan and magenta circuit-board lines",
    ("legend", 0): "a deep purple-blue ball showing a starry galaxy with a nebula swirl inside",
    ("legend", 1): "a pitch-black sphere with thin bright white ring lines swirling inward on its surface",
    ("legend", 2): "a dark teal ball with flowing green and violet aurora ribbons across its surface",
    ("myth", 0): "a holographic ball with iridescent rainbow colors shifting across its surface, pastel rainbow gradient",
    ("myth", 1): "a bronze ball with gears and a small hourglass embossed on it, with sand-colored accents",
    ("myth", 2): "a dark crystal sphere containing a tiny spiral galaxy with a glowing heart-shaped core",
}


def key_out_magenta(im: Image.Image) -> Image.Image:
    a = np.array(im.convert("RGB")).astype(int)
    dist = np.sqrt(((a - np.array([255, 0, 255])) ** 2).sum(axis=2))
    bg = dist < 110
    fringe = ndimage.binary_dilation(bg, iterations=2) & (dist < 190)
    alpha = np.where(bg | fringe, 0, 255).astype(np.uint8)
    # 가장 큰 덩어리만 남긴다 (공 본체)
    labels, n = ndimage.label(alpha > 0)
    if n > 1:
        sizes = ndimage.sum(alpha > 0, labels, range(1, n + 1))
        alpha = np.where(labels == 1 + int(np.argmax(sizes)), alpha, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(im.convert("RGB")), alpha]), "RGBA")


def to_pixel_sprite(im: Image.Image) -> Image.Image:
    box = im.getchannel("A").getbbox()
    im = im.crop(box)
    side = max(im.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    rgba = np.array(square)
    # 투명한 곳 색을 가까운 불투명 색으로 채워 마젠타 잔여색이 번지지 않게 한다
    opaque = rgba[:, :, 3] > 0
    idx = ndimage.distance_transform_edt(~opaque, return_distances=False, return_indices=True)
    rgba[:, :, :3] = rgba[idx[0], idx[1], :3]
    rgb = Image.fromarray(rgba[:, :, :3], "RGB").resize((SIZE, SIZE), Image.Resampling.BOX)
    alpha = Image.fromarray(rgba[:, :, 3], "L").resize((SIZE, SIZE), Image.Resampling.BOX)
    rgb = rgb.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    a = (np.array(alpha) > 127).astype(np.uint8) * 255
    return Image.fromarray(np.dstack([np.array(rgb), a]), "RGBA")


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    ref = STYLE_REF.read_bytes()
    count = 0
    for (grade, idx), desc in BALLS.items():
        name = f"{grade}_{idx}"
        raw = RAW / f"{name}.png"
        if not raw.exists():
            # 참고 이미지(스타일 보드)를 보고 공 대신 게임 화면을 그리는 종류는 참고 이미지 없이 뽑는다.
            refs = None if name in NO_REF else [ref]
            raw.write_bytes(generate(BASE + "Draw ONLY the ball object itself as an isolated sprite, not a scene. The ball: " + desc + ".", "1:1", refs))
            count += 1
            print("generated", name)
        to_pixel_sprite(key_out_magenta(Image.open(raw))).save(OUT / f"{name}.png")
    print("images generated this run:", count)


if __name__ == "__main__":
    main()
