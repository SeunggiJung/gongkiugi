"""필드 배경 · 골대 · 키퍼 시안 1차 (GDD 9장). 스타일 F 고정. 9장을 생성한다.

배경 3안, 골대 3안, 키퍼 3안(대기 · 왼쪽 다이빙 · 오른쪽 다이빙 · 점프를 한 장에 묶은 시트).
골대와 키퍼는 단색 마젠타 배경에 그려서 투명하게 딴다. 원본은 preview/raw/field, 결과는 preview/field 에 저장한다.
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

RAW = ROOT / "preview" / "raw" / "field"
OUT = ROOT / "preview" / "field"
STYLE_REF = ROOT / "preview" / "raw" / "styleboard_F.png"

BASE = (
    "Cozy storybook pixel art matching the reference image style: warm earthy palette, crisp square pixels, no anti-aliasing. "
    "No text, no logos, no real brands, no watermark. "
)

BACKGROUNDS = {
    "A": "Portrait 9:16 background art of an empty neighborhood football pitch seen from behind the kicker at golden-hour sunset in autumn: "
    "a wooden fence, big autumn trees on both sides, small houses in the distance, warm orange sky.",
    "B": "Portrait 9:16 background art of an empty neighborhood football pitch seen from behind the kicker on a bright clear spring afternoon: "
    "fluffy white clouds, a blue sky, green hills and a few small houses far away, trees with fresh leaves, a clothesline.",
    "C": "Portrait 9:16 background art of an empty neighborhood football pitch seen from behind the kicker just after rain at dusk: "
    "shiny puddles reflecting a pink and purple sky, wet grass, a rusty fence, soft glowing street lamps.",
}
BACKGROUND_RULES = (
    " The upper-middle area where a goal will be added later is left open: show only the pitch, grass and distant scenery there, "
    "with NO goal, NO goalkeeper, NO ball. Absolutely no user interface: no buttons, no icons, no panels, no HUD, no frames, nothing drawn on top of the scene. "
    "The bottom third is calm plain grass with low contrast so buttons can be added later."
)

GOALS = {
    "A": "A wooden football goal with thick rough-cut posts and crossbar and a hand-knotted rope net, warm brown wood, slightly crooked and charming.",
    "B": "A clean white-painted football goal with a tight white net, thin posts, simple and tidy.",
    "C": "A weathered goal made of rusty gray metal pipes with a patched, sagging net and chalk marks on the posts.",
}
GOAL_RULES = (
    " Front view straight on, the entire goal fully visible and centered, with generous empty margin around it. "
    "Drawn on a perfectly flat solid magenta (#ff00ff) background with nothing else, no ground, no shadow, no goalkeeper, no ball."
)

KEEPERS = {
    "A": "a cheerful kid goalkeeper with messy brown hair, a red jersey with a patch, big gloves and short pants",
    "B": "a stocky middle-aged goalkeeper with a mustache, a blue jersey, cap and thick gloves",
    "C": "a round chubby mascot-like goalkeeper with a big grin, a yellow jersey and oversized gloves",
}
KEEPER_RULES = (
    " Character sheet with four poses of the SAME character side by side in one row, all facing the camera, equal size and evenly spaced: "
    "(1) ready crouch with hands out, (2) full horizontal dive toward the left of the picture, (3) full horizontal dive toward the right of the picture, "
    "(4) straight jump with both arms up. Drawn on a perfectly flat solid magenta (#ff00ff) background with nothing else, no shadows, no ball, no goal."
)


def key_out_magenta(im: Image.Image) -> Image.Image:
    a = np.array(im.convert("RGB")).astype(int)
    dist = np.sqrt(((a - np.array([255, 0, 255])) ** 2).sum(axis=2))
    # 마젠타는 전부 투명으로 만든다. 그물 칸 안쪽처럼 막혀 있는 곳도 필드가 비쳐 보여야 한다.
    mask_bg = dist < 110
    # 경계에 남는 분홍 테두리 제거
    fringe = ndimage.binary_dilation(mask_bg, iterations=2) & (dist < 190)
    alpha = np.where(mask_bg | fringe, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(im.convert("RGB")), alpha]), "RGBA")


def crop_alpha(im: Image.Image) -> Image.Image:
    return im.crop(im.getchannel("A").getbbox())


def split_poses(sheet: Image.Image):
    """시트에서 포즈 덩어리를 찾아 (대기, 점프, 다이빙 두 개)로 분류해 돌려준다.

    덩어리는 2차원 연결로 찾는다 (포즈가 세로로 쌓여 나와도 구분된다). 장갑 · 팔이 몸과 떨어져 보여도
    같은 포즈로 묶이도록 알파를 팽창시켜서 라벨링한다.
    """
    alpha = np.array(sheet.getchannel("A")) > 0
    labels, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=10))
    pieces = []
    for i in range(1, n + 1):
        m = (labels == i) & alpha
        if m.sum() < 800:  # 잡티
            continue
        ys, xs = np.where(m)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        pieces.append((box, sheet.crop(box)))
    pieces.sort(key=lambda p: p[0][0])  # 왼쪽부터
    named = {}
    for box, im in pieces:
        w, h = im.size
        ratio = w / h
        if ratio > 1.25:
            named["dive_b" if "dive_a" in named else "dive_a"] = im
        elif h / w > 1.3 and "jump" not in named:
            named["jump"] = im
        elif "ready" not in named:
            named["ready"] = im
        elif "jump" not in named:
            named["jump"] = im
    return named


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    ref = STYLE_REF.read_bytes()
    count = 0

    def make(path, prompt, aspect):
        nonlocal count
        if not path.exists():
            path.write_bytes(generate(BASE + prompt, aspect, [ref]))
            count += 1
            print("generated", path.name)

    for k, d in BACKGROUNDS.items():
        make(RAW / f"bg_{k}.png", d + BACKGROUND_RULES, "9:16")
        Image.open(RAW / f"bg_{k}.png").convert("RGB").save(OUT / f"bg_{k}.png")
    for k, d in GOALS.items():
        make(RAW / f"goal_{k}.png", d + GOAL_RULES, "1:1")
        crop_alpha(key_out_magenta(Image.open(RAW / f"goal_{k}.png"))).save(OUT / f"goal_{k}.png")
    for k, d in KEEPERS.items():
        make(RAW / f"keeper_{k}.png", "Pixel art character: " + d + "." + KEEPER_RULES, "16:9")
        sheet = key_out_magenta(Image.open(RAW / f"keeper_{k}.png"))
        sheet.save(OUT / f"keeper_{k}_sheet.png")
        for old in OUT.glob(f"keeper_{k}_*.png"):
            if not old.name.endswith("_sheet.png"):
                old.unlink()
        poses = split_poses(sheet)
        print(f"keeper {k}: {sorted(poses)}")
        for name, p in poses.items():
            p.save(OUT / f"keeper_{k}_{name}.png")
    print("images generated this run:", count)


if __name__ == "__main__":
    main()
