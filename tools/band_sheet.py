"""공 구간 본체 이미지(+5, +10, +15)를 종류별 시트 한 장(512, 2x2)으로 만든다. docs/BALL_CONCEPTS.md 의 컨셉을 따른다.

칸: 왼쪽 위 +0 재현(크기 기준, 확정 이미지를 참고로 준다), 오른쪽 위 +5, 왼쪽 아래 +10, 오른쪽 아래 +15.
각 칸은 배경이 투명한 독립된 한 장이어야 한다 (게임 화면과 도감 썸네일에 그대로 쓴다). 마젠타 배경에 그려서 투명하게 딴다.

사용: py -3.12 tools/band_sheet.py hero_2
결과: assets/candidates/balls/bands/raw/{종류}.png (시트 원본), assets/candidates/balls/bands/{종류}_{0|5|10|15}.png (투명 PNG)
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

OUT = ROOT / "assets" / "candidates" / "balls" / "bands"
RAW = OUT / "raw"
BASE_DIR = ROOT / "assets" / "approved" / "balls"

BODY_PX = 64  # 공 본체 지름(도트). +0 기본 이미지와 같은 도트 밀도
COLORS = 40

# 종류별 컨셉 (docs/BALL_CONCEPTS.md). 키: 파일 이름 접두 {등급}_{종류번호}
CONCEPTS = {
    "hero_2": {
        "kind": "lava ball (dark basalt hexagon plates with glowing orange lava veins)",
        "p5": (
            "the same ball freshly found at a volcano and still burning hot right now: the cracks glow bright orange and parts of the surface are red-hot, "
            "wisps of steam and embers rise from the top and a few drops of molten lava drip from the bottom. It is still a plain round ball."
        ),
        "p10": (
            "the same ball redesigned to look clearly awesome: the basalt crust splits open to reveal a pulsing molten lava heart with white-hot cracks, "
            "a small volcano crater cone on one side of the ball with lava streaming down its flank. It is still recognizably a ball with a small cone."
        ),
        "p15": (
            "an even more spectacular evolution of the level 10 design: the volcano cone has grown like a planet core, rings of lava circle the ball, "
            "three volcanic bombs float and orbit around it, a white-hot core with tiny blue sparks, and molten lava flows off the ball so its outline drips and flows "
            "(it may look less like a perfect ball and more like a flowing molten mass around a ball). Much flashier than level 10."
        ),
    },
    "common_0": {
        "kind": "old dusty classic black-and-white leather soccer ball",
        "p5": "the same soccer ball cleaned and polished: the leather shines, the mud stains are gone, one panel has a golden stitched line and a small leather name tag hangs from it. It is still a plain round ball.",
        "p10": "a redesigned legendary classic ball: every panel edge outlined in gold foil, star and flame doodles carved on the surface, a victory ribbon wrapped once around the ball, golden shine. Still clearly a ball.",
        "p15": "the panels now show a starry night sky pattern with a tiny planet in each pentagon, three small satellites orbit the ball on a thin orbit ring, strong golden glow. Still clearly a ball, much flashier than level 10.",
    },
    "common_1": {
        "kind": "plain bright red rubber ball with a single glossy highlight line",
        "p5": "squashed slightly flat as if it just hit the ground and is about to bounce, with a long stretched glossy highlight and a small dust puff beneath. It is still a plain round-ish ball.",
        "p10": "spring coil patterns visible inside the translucent red rubber, star-shaped bounce marks on the surface, three motion arcs of bounce afterimages above it. Still clearly a ball.",
        "p15": "the rubber turned into translucent pink-purple jelly with tiny planets bouncing off its surface and elastic shockwave rings spreading around it. Still clearly a ball, much flashier than level 10.",
    },
    "common_2": {
        "kind": "lumpy ball of crumpled translucent grocery plastic bags wrapped with beige tape",
        "p5": "the plastic compressed into a smoother glossy translucent sphere, the tape neatly wrapped in a clean cross pattern, small sparkles. It is still a plain round ball.",
        "p10": "layers of plastic visible like a cross-section, armor-like tape belts, rainbow oil-film reflections between the layers. Still clearly a ball.",
        "p15": "the plastic strands turned into starlight threads winding around the ball like orbits, nebula colors, tiny stars hanging from the thread ends. Still clearly a ball, much flashier than level 10.",
    },
    "common_3": {
        "kind": "old cracked brown leather ball with thick visible stitching",
        "p5": "the leather soaked in oil with a deep shine, the stitches reinforced with golden thread, worn but tough looking. It is still a plain round ball.",
        "p10": "every scar holds a metal rivet or a leather armor patch, a red unyielding aura seeps from the scars, a belt buckle on the front. Still clearly a ball.",
        "p15": "star-patterned cosmic cow hide where constellations connect the scars, two small horn ornaments on top. Still clearly a ball, much flashier than level 10.",
    },
    "uncommon_0": {
        "kind": "clean white soccer ball with bold black hexagon and pentagon panels, no logo",
        "p5": "a thin passing-path line connecting 24 dots is engraved across the surface and the ball has shiny sky-blue and white stripes (no flags). It is still a plain round ball.",
        "p10": "an anonymous orange silhouette streak with long speed lines behind the ball and small wing-shaped wind marks on both sides (no faces, no numbers, no logos). Still clearly a ball.",
        "p15": "the ball keeps its hexagon panels but glows with a red and orange extra-time sunset, a big ring of red cheering waves circles it and three small flames of cheering orbit the ball, dazzling light rays behind. Still clearly a ball, much flashier than level 10.",
    },
    "uncommon_1": {
        "fringe": (6, 230),  # 연두 후광이 마젠타와 섞여 생기는 분홍 번짐을 더 넓게 지운다
        "kind": "lime-green glow-in-the-dark soccer ball with soft luminous texture",
        "p5": "the glow is revived to vivid lime, a green motion trail streams behind it and 3 or 4 fireflies hover around. It is still a plain round ball.",
        "p10": "the ball becomes a small lime moon with a glowing crater pattern, a ring of fireflies, lime aurora spilling above it. Still clearly a ball.",
        "p15": "a lime nebula swirls inside the ball, four to six cross-shaped light rays cut through the darkness, lime shooting stars; the outline may glow and disperse into light.",
    },
    "uncommon_2": {
        "kind": "yellow kitchen sponge ball full of holes and pores",
        "p5": "the holes are crisp and bouncy, the sponge looks moist and plump, concentric shock-wave ripples are being sucked into the holes. It is still a plain round ball.",
        "p10": "each hole is a deep swirling tunnel, droplets and light being sucked in, a yellow and teal two-tone look. Still clearly a ball.",
        "p15": "the holes are tiny galaxy entrances, spiral sound waves are sucked in, starlight water droplets, water pours out of it; the outline may flow and splash.",
    },
    "uncommon_3": {
        "kind": "rusty copper metal ball with green verdigris patches and rivets",
        "p5": "the rust is stripped off to reveal shiny copper, crisp rivets, one clear hammer dent. It is still a plain round ball.",
        "p10": "a forged sphere covered in hammer marks, glowing orange cracks with metallic gloss, an anvil emblem throwing sparks. Still clearly a ball.",
        "p15": "the copper turned into teal-and-orange starlight metal with quenching steam, two small hammers orbit the ball. Still clearly a ball, much flashier than level 10.",
    },
    "rare_0": {
        "kind": "transparent pale blue ice crystal ball with frost cracks",
        "p5": "frost crystals growing on the surface, cold mist flowing down from it, clearer and harder ice. It is still a plain round ball.",
        "p10": "a transparent glacier core with a pulsing blue crystal heart in the center and hexagonal snowflake patterns on the surface. Still clearly a ball.",
        "p15": "stars and a nebula frozen inside the ice, polar aurora light, ice shards orbiting; a blizzard may blur and scatter the outline into snow.",
    },
    "rare_1": {
        "kind": "see-through blue-green glass ball with a hairline crack and bright highlights",
        "p5": "the glass is clearer and splits light into a rainbow, with a tiny rainbow reflection inside. It is still a plain round ball.",
        "p10": "kintsugi style: every crack glows gold with light leaking out, floating shards that do not fall. Still clearly a ball.",
        "p15": "a mirror sphere reflecting space and stars, six mirror shards orbit it. Still clearly a ball, much flashier than level 10.",
    },
    "rare_2": {
        "kind": "red-orange ball with a painted flame pattern",
        "p5": "the flame pattern is actually burning now with a tail of fire and a spray of sparks behind it. It is still a plain round ball.",
        "p10": "a swirling fireball wraps the ball, an angry eye-shaped mark, a white-hot center. Still clearly a ball.",
        "p15": "a star being born: blue-white corona, solar flare rings, two or three phoenix feathers; the flames flow and the outline disperses into fire.",
    },
    "rare_3": {
        "kind": "yellow ball with electric spark patterns and a black zigzag lightning bolt",
        "p5": "the lightning mark is sharper and brighter, four or five sparks shoot out from the surface. It is still a plain round ball.",
        "p10": "a compressed lightning orb with plasma streaks inside and a lightning spear shooting forward. Still clearly a ball.",
        "p15": "lightning linked like constellations forms a ring around it, purple and yellow double lightning; the outline disperses into bolts.",
    },
    "hero_0": {
        "kind": "shiny polished gold metal ball with bright reflections and a hexagon pattern etched in",
        "p5": "pure gold luster, a crisp etched pattern, bright sparkle points. It is still a plain round ball.",
        "p10": "a royal crest and ruby and emerald gems set into it, golden chains wrapped around, a throne-like halo behind. Still clearly a ball.",
        "p15": "a blazing treasure star: the surface is a brilliant golden nebula pattern even brighter and more luxurious than level 10, dazzling golden light rays burst from behind the ball, three gold coins and gems orbit it, a sparkling golden halo ring. Clearly more flashy and glorious than level 10, still a ball.",
    },
    "hero_1": {
        "kind": "ball made of purple amethyst crystal shards fused together, faceted",
        "p5": "clearer crystal with a fog-like shape moving inside it. It is still a plain round ball.",
        "p10": "an eye-like pupil appears in the crystal center, crystal shards orbit it, a purple-blue glow. Still clearly a ball.",
        "p15": "a star map and timelines visible inside the crystal, two violet aura rings around it. Still clearly a ball, much flashier than level 10.",
    },
    "hero_3": {
        "kind": "dark navy ball with glowing cyan and magenta circuit-board lines",
        "p5": "the circuits are lit up with data dots flowing along them, vivid colors. It is still a plain round ball.",
        "p10": "half of the ball has real texture and half is a wireframe hologram, glitch stripes, neon cyan and magenta flames. Still clearly a ball.",
        "p15": "falling code rain and data rings, four server-rack shaped parts orbit it, a computing-grid halo. Still clearly a ball, much flashier than level 10.",
    },
    "legend_0": {
        "kind": "deep purple-blue ball showing a starry galaxy with a nebula swirl",
        "p5": "the nebula swirls clearly on the surface, the stars are brighter, a little stardust drifts off it. It is still a plain round ball.",
        "p10": "the surface opens like a window showing a universe inside, spiral galaxy arms, one small planet satellite, violet pink and blue colors. Still clearly a ball.",
        "p15": "a cracked cosmic egg with big-bang light through the cracks, three planets and a ringed planet orbit it, shooting stars; the outline may flow and dissolve into cosmos.",
    },
    "legend_1": {
        "kind": "pitch-black sphere with thin bright white ring lines swirling inward",
        "p5": "light bends around it like a lens, a thin bright white accretion disc line circles it. It is still a plain round ball.",
        "p10": "a clear event-horizon ring, a purple-white accretion disc with star debris falling in, an absolutely black center. Still clearly a ball.",
        "p15": "part of a galaxy is being sucked and stretched into it, jets of light shoot up and down; the outline is stretched and distorted.",
    },
    "legend_2": {
        "kind": "dark teal ball with flowing green and violet aurora ribbons",
        "p5": "the aurora ribbons are vivid purple and green, a few polar snow crystals drift around. It is still a plain round ball.",
        "p10": "three layers of aurora curtains wrap around and rise upward, night sky stars behind. Still clearly a ball.",
        "p15": "aurora ribbons flow out into space and connect to a nebula, golden hues mixed in; the outline dissolves into ribbons of light.",
    },
    "myth_0": {
        "kind": "pastel holographic ball with an iridescent rainbow hexagon pattern",
        "p5": "the colors shift by angle and sparkle, small prism light rays shoot out. It is still a plain round ball.",
        "p10": "a rainbow bridge arch rises from the ball and seven color rings orbit it, a few small clouds. Still clearly a ball.",
        "p15": "the ball becomes a giant prism crystal with spectrum beams shooting out in every direction; the light disperses around it.",
    },
    "myth_1": {
        "kind": "bronze ball with gears and a small hourglass embossed on it",
        "p5": "the gears are crisp and engaged, one clock hand moves, sand grains fall. It is still a plain round ball.",
        "p10": "a multi-layer gear sphere that is disassembled and reassembled, reverse-arrow marks, two hourglasses flowing in opposite directions. Still clearly a ball.",
        "p15": "the dial turns into a galaxy dial with constellation clock hands, a golden sand ring orbits; streams of sand may disperse the outline.",
    },
    "myth_2": {
        "kind": "dark crystal sphere containing a tiny spiral galaxy with a glowing heart-shaped core",
        "p5": "the stars are brighter, the swirl is clearer, the heart core is faintly lit. It is still a plain round ball.",
        "p10": "the heart core pulses, galaxy arms spread like blood vessels, pink and gold light, a heartbeat ring. Still clearly a ball.",
        "p15": "the heart has grown to cosmic size with pulse waves pushing stars away, vessel-like galaxies orbit it; the outline may dissolve into a glowing heart.",
    },
}

PROMPT = (
    "A pixel art sprite sheet of ONE game item at four power levels, cozy storybook pixel style, crisp square pixels, no anti-aliasing. "
    "The reference image is the exact base ball: a {kind}. "
    "Draw a 2 by 2 grid of four EQUAL square cells on a perfectly flat solid magenta (#ff00ff) background, with no grid lines, no borders and no frames; "
    "each cell has a wide magenta margin and nothing touches the cell edges or crosses into another cell. "
    "Every cell is ONE self-contained complete sprite (not an effect layer): the whole picture of the item, on magenta, with a strong readable silhouette and clear bold colors "
    "that still read when shrunk to 40 pixels. Glows must be drawn as hard-edged pixel bands, never soft blurry gradients. "
    "In every cell the original ball body has exactly the same diameter, about 45 percent of the cell width, centered in the cell. "
    "Top-left cell = level 0: the plain base ball exactly like the reference, no changes. "
    "Top-right cell = level 5: {p5} The change from level 0 must be clearly visible even when shrunk to 40 pixels. "
    "Bottom-left cell = level 10: {p10} "
    "Bottom-right cell = level 15: {p15} "
    "Do not write any text, level labels, captions, letters or numbers anywhere on the image, not even tiny ones, and do not label the cells. No logos."
)


def key_out_magenta(im: Image.Image, iters: int = 2, thresh: int = 190) -> np.ndarray:
    """마젠타를 투명으로 만들고 RGBA 배열을 돌려준다. 작은 잡티는 지우고, 가장자리 분홍 번짐을 제거한다."""
    a = np.array(im.convert("RGB")).astype(int)
    dist = np.sqrt(((a - np.array([255, 0, 255])) ** 2).sum(axis=2))
    bg = dist < 110
    fringe = ndimage.binary_dilation(bg, iterations=iters) & (dist < thresh)
    alpha = ~(bg | fringe)
    labels, n = ndimage.label(alpha)
    if n:
        sizes = ndimage.sum(alpha, labels, range(1, n + 1))
        keep = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s >= 30])
        alpha = alpha & keep
    return np.dstack([np.array(im.convert("RGB")), (alpha * 255).astype(np.uint8)])


def make(name: str) -> bool:
    c = CONCEPTS[name]
    RAW.mkdir(parents=True, exist_ok=True)
    sheet_path = RAW / f"{name}.png"
    generated = False
    if not sheet_path.exists():
        base = Image.open(BASE_DIR / f"{name}.png").convert("RGBA").resize((256, 256), Image.Resampling.NEAREST)
        flat = Image.new("RGB", base.size, (255, 0, 255))
        flat.paste(base, (0, 0), base)
        flat_path = RAW / f"_{name}_ref.png"
        flat.save(flat_path)
        prompt = PROMPT.format(kind=c["kind"], p5=c["p5"], p10=c["p10"], p15=c["p15"])
        sheet_path.write_bytes(generate(prompt, "1:1", [flat_path.read_bytes()], image_size="512"))
        generated = True
        print("generated", name)

    sheet = Image.open(sheet_path).convert("RGB")
    w, h = sheet.size
    cells = {}
    for label, (cx, cy) in {"0": (0, 0), "5": (1, 0), "10": (0, 1), "15": (1, 1)}.items():
        cell = np.array(sheet.crop((cx * w // 2, cy * h // 2, (cx + 1) * w // 2, (cy + 1) * h // 2)))
        m = 6  # 모델이 칸 테두리를 그리는 경우가 있어서 가장자리를 마젠타로 덮는다
        cell[:m] = cell[-m:] = (255, 0, 255)
        cell[:, :m] = cell[:, -m:] = (255, 0, 255)
        cells[label] = key_out_magenta(Image.fromarray(cell), *c.get("fringe", (2, 190)))

    # +0 재현 칸의 공 본체 지름을 기준으로 모든 칸을 같은 도트 밀도로 줄인다.
    a0 = cells["0"][:, :, 3] > 0
    ys, xs = np.where(a0)
    body_w = xs.max() - xs.min() + 1
    scale = BODY_PX / body_w
    sizes = {}
    # 모든 칸을 같은 크기의 정사각형으로 자른다 (칸 중심 = 공 중심). 가장 멀리 뻗은 부분까지 담는다.
    half = 0
    for arr in cells.values():
        yy, xx = np.where(arr[:, :, 3] > 0)
        half = max(half, np.abs(yy - arr.shape[0] / 2).max(), np.abs(xx - arr.shape[1] / 2).max())
    half = int(np.ceil(half)) + 2
    out_px = int(round(2 * half * scale))
    for label, arr in cells.items():
        cy, cx = arr.shape[0] // 2, arr.shape[1] // 2
        pad = np.zeros((arr.shape[0] + 2 * half, arr.shape[1] + 2 * half, 4), np.uint8)
        pad[half : half + arr.shape[0], half : half + arr.shape[1]] = arr
        crop = pad[cy : cy + 2 * half, cx : cx + 2 * half]
        # 투명한 곳 색을 가까운 불투명 색으로 채워 마젠타 잔여색이 번지지 않게 한다
        opaque = crop[:, :, 3] > 0
        if opaque.any():
            idx = ndimage.distance_transform_edt(~opaque, return_distances=False, return_indices=True)
            crop[:, :, :3] = crop[idx[0], idx[1], :3]
        rgb = Image.fromarray(crop[:, :, :3], "RGB").resize((out_px, out_px), Image.Resampling.BOX)
        al = Image.fromarray(crop[:, :, 3], "L").resize((out_px, out_px), Image.Resampling.BOX)
        rgb = rgb.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
        hard = (np.array(al) > 127).astype(np.uint8) * 255
        Image.fromarray(np.dstack([np.array(rgb), hard]), "RGBA").save(OUT / f"{name}_{label}.png")
        sizes[label] = out_px
    (OUT / f"{name}_info.json").write_text(json.dumps({"body_px": BODY_PX, "sprite_px": out_px, "scale": round(float(scale), 4)}, indent=2) + "\n", encoding="utf-8")
    print(f"{name}: 본체 {body_w}px → {BODY_PX}px, 스프라이트 {out_px}x{out_px}")
    return generated


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = sys.argv[1:] or list(CONCEPTS)
    n = sum(make(name) for name in names)
    print("sheets generated this run:", n)


if __name__ == "__main__":
    main()
