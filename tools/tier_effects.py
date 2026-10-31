"""공 단계 외형(+5 · +10 · +15 효과)과 강화 버스트를 종류별 시트 한 장(512, 2x2)으로 만든다. 스타일 F, GDD 6.4.

효과만 검은 배경에 그린다 (공은 그리지 않는다). 가운데 40% 원은 확정된 공이 놓일 빈 자리다.
게임에서는 공 이미지 뒤에 `mix-blend-mode: screen` 으로 겹치므로 마젠타 제거가 필요 없고 후광에 분홍색이 번지지 않는다.
칸: 왼쪽 위 +5, 오른쪽 위 +10, 왼쪽 아래 +15, 오른쪽 아래 강화 버스트(레벨업 순간).

사용: py -3.12 tools/tier_effects.py [common_0 hero_2 ...]   인자가 없으면 22종 전부
결과: assets/candidates/balls/tiers/raw/{종류}.png (시트 원본), assets/candidates/balls/tiers/{종류}_{5|10|15|burst}.png (128px)
"""
import pathlib
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

OUT = ROOT / "assets" / "candidates" / "balls" / "tiers"
RAW = OUT / "raw"
CELL = 128
COLORS = 32

# (등급, 종류번호): (종류 이름, 효과 분위기, 효과 색)
KINDS = {
    ("common", 0): ("동네 축구공", "warm golden shine, little stars and speed lines", "warm gold and white"),
    ("common", 1): ("고무공", "bouncy motion arcs, squash-and-stretch light streaks and sparks", "red, pink and white"),
    ("common", 2): ("비닐 뭉치공", "crinkly light flashes, floating plastic confetti and tape-colored swirls", "pale green, beige and white"),
    ("common", 3): ("헌 가죽공", "dust puffs turning into golden stitch-like glimmers and old-gold sparkles", "brown, amber and gold"),
    ("uncommon", 0): ("명장면 공", "clean white and gold light, stadium flash bulbs and trophy-like sparkles", "white, gold and sky blue"),
    ("uncommon", 1): ("야광공", "luminous glow and floating firefly lights", "lime green and pale yellow"),
    ("uncommon", 2): ("스펀지 공", "yellow bubbles and water droplets flying out with a soft glow", "yellow, cream and light blue"),
    ("uncommon", 3): ("구리 공", "copper-orange sparks, hammer-strike flashes and metallic glints", "orange, copper and teal"),
    ("rare", 0): ("얼음공", "ice crystals, snowflakes and cold blue mist", "ice blue, white and pale cyan"),
    ("rare", 1): ("유리공", "glittering glass shards and rainbow refractions", "aqua, white and pastel rainbow"),
    ("rare", 2): ("불꽃공", "flames, embers and a fiery trail", "red, orange and yellow"),
    ("rare", 3): ("번개공", "electric arcs, lightning bolts and sparks", "yellow, white and electric blue"),
    ("hero", 0): ("황금공", "golden light beams, flying coins and gold sparkles", "gold, yellow and white"),
    ("hero", 1): ("수정공", "orbiting purple crystal shards and a violet glow", "violet, magenta and white"),
    ("hero", 2): ("용암공", "lava drips, erupting sparks and orange flames", "orange, red and yellow"),
    ("hero", 3): ("네온 사이버공", "neon circuit lines, digital pixels and holographic glitch", "cyan, magenta and electric blue"),
    ("legend", 0): ("우주공", "stardust, a nebula ring and orbiting stars", "violet, blue and white"),
    ("legend", 1): ("블랙홀 공", "a swirling accretion disc, bending light and a vortex", "white, purple and deep blue"),
    ("legend", 2): ("오로라 공", "flowing aurora ribbons", "green, violet and teal"),
    ("myth", 0): ("무지개 공", "iridescent rainbow ribbons and prism flares", "full rainbow pastel colors"),
    ("myth", 1): ("시간의 공", "gears, clock hands, hourglass sand streams and golden time ripples", "gold, bronze and sand"),
    ("myth", 2): ("은하 심장 공", "tiny galaxies, heartbeat pulses and pink-gold stardust", "pink, gold and deep blue"),
}

PROMPT = (
    "A pixel art visual-effect sprite sheet for a game, cozy storybook pixel style, crisp square pixels, no anti-aliasing. "
    "Pure solid black (#000000) background everywhere. Draw a 2 by 2 grid of four EQUAL square cells with no borders, no grid lines and no frames; "
    "nothing crosses from one cell into another and each cell has a wide black margin. "
    "There is NO ball, NO character and NO object anywhere: only light and particle effects. "
    "In the exact center of every cell leave a perfectly empty round hole of pure black, 40 percent of the cell width in diameter (a ball will be placed there later); the effects surround that hole. "
    "Theme: {flavor}. Effect colors: {colors}. "
    "Top-left cell = power level 5: a thin glowing rim of light hugging the hole and a few subtle twinkles, small effect. "
    "Top-right cell = power level 10: a strong colored glow and glossy highlights hugging the hole edge with small particles floating around it, medium effect. "
    "Bottom-left cell = power level 15: a long comet-like afterimage trail streaming from the hole toward the lower left, a big radiant halo ring behind the hole, "
    "large particles and flares, very flashy and big. "
    "Bottom-right cell = a level-up burst frame: an expanding ring shockwave with sparks flying outward from the center. "
    "Glows are drawn as hard-edged pixel bands, bright against the black. No text, no letters, no numbers, no logos."
)


def luminance_to_alpha(rgb: np.ndarray) -> Image.Image:
    """검은 배경 위의 빛 효과를 투명 PNG 로 바꾼다. 알파 = 가장 밝은 채널, 색 = 원래 색 ÷ 알파."""
    peak = rgb.max(axis=2).astype(np.float32)
    alpha = peak
    safe = np.maximum(peak, 1)[..., None]
    color = np.clip(rgb.astype(np.float32) * 255.0 / safe, 0, 255)
    return Image.fromarray(np.dstack([color.astype(np.uint8), alpha.astype(np.uint8)]), "RGBA")


def to_cell(cell: Image.Image) -> Image.Image:
    # 모델이 칸 테두리를 얇게 그리는 경우가 있어서 가장자리 6px 을 검게 지운다 (스크린 합성에서 보이지 않게)
    arr = np.array(cell.convert("RGB"))
    m = 6
    arr[:m] = 0
    arr[-m:] = 0
    arr[:, :m] = 0
    arr[:, -m:] = 0
    small = Image.fromarray(arr, "RGB").resize((CELL, CELL), Image.Resampling.BOX)
    q = small.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    a = np.array(q)
    a[a.max(axis=2) < 22] = 0  # 검은 배경은 완전한 검정으로
    return luminance_to_alpha(a)


def make(grade: str, idx: int) -> bool:
    name = f"{grade}_{idx}"
    kind, flavor, colors = KINDS[(grade, idx)]
    sheet_path = RAW / f"{name}.png"
    generated = False
    if not sheet_path.exists():
        sheet_path.write_bytes(generate(PROMPT.format(flavor=flavor, colors=colors), "1:1", None, image_size="512"))
        generated = True
        print("generated", name, kind)
    sheet = Image.open(sheet_path)
    w, h = sheet.size
    for label, (cx, cy) in {"5": (0, 0), "10": (1, 0), "15": (0, 1), "burst": (1, 1)}.items():
        cell = sheet.crop((cx * w // 2, cy * h // 2, (cx + 1) * w // 2, (cy + 1) * h // 2))
        to_cell(cell).save(OUT / f"{name}_{label}.png")
    return generated


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    wanted = sys.argv[1:] or [f"{g}_{i}" for (g, i) in KINDS]
    count = 0
    for name in wanted:
        grade, idx = name.rsplit("_", 1)
        count += make(grade, int(idx))
    print("sheets generated this run:", count)


if __name__ == "__main__":
    main()


