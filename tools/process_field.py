"""확정된 필드 · 골대 · 키퍼를 게임 해상도로 후처리한다 (GDD 9장: 줄이고 팔레트를 제한한다).

배경, 골대, 키퍼가 같은 도트 밀도를 갖도록 한 기준으로 줄인다:
  배경 256x455 (스테이지 폭 440px 일 때 도트 1칸 ≈ 1.7px), 골대 폭 215px, 키퍼 대기 포즈 높이 49px.

사용: py -3.12 tools/process_field.py [--bg B] [--goal B] [--keeper A] [--out assets/approved/field]
상점에서 구장 · 골대 · 키퍼 스킨을 바꿀 때도 같은 스크립트로 후보를 같은 밀도로 만든다.
"""
import argparse
import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "candidates" / "field"

BG_SIZE = (256, 455)
BG_COLORS = 48
GOAL_WIDTH = 215
KEEPER_READY_HEIGHT = 49
SPRITE_COLORS = 32


def fill_transparent_rgb(rgba: np.ndarray) -> np.ndarray:
    """투명한 곳의 색을 가장 가까운 불투명 색으로 채워서, 줄일 때 마젠타 잔여색이 번지지 않게 한다."""
    opaque = rgba[:, :, 3] > 0
    if opaque.all():
        return rgba
    idx = ndimage.distance_transform_edt(~opaque, return_distances=False, return_indices=True)
    filled = rgba.copy()
    filled[:, :, :3] = rgba[idx[0], idx[1], :3]
    return filled


def remove_magenta_tint(rgba: np.ndarray) -> np.ndarray:
    """마젠타 배경이 가장자리에 번진 분홍 기운을 걷어 낸다. 빨강과 파랑이 함께 초록보다 큰 픽셀만 해당한다."""
    out = rgba.copy()
    r, g, b = (out[:, :, i].astype(int) for i in range(3))
    tinted = (out[:, :, 3] > 0) & (r - g > 20) & (b - g > 20)
    out[tinted, 1] = np.clip((r[tinted] + b[tinted]) // 2 - 10, 0, 255)
    return out


def pixelate_sprite(im: Image.Image, scale: float, colors: int) -> Image.Image:
    im = im.convert("RGBA")
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    rgba = fill_transparent_rgb(remove_magenta_tint(np.array(im)))
    rgb = Image.fromarray(rgba[:, :, :3], "RGB").resize(size, Image.Resampling.BOX)
    alpha = Image.fromarray(rgba[:, :, 3], "L").resize(size, Image.Resampling.BOX)
    rgb = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    a = (np.array(alpha) > 127).astype(np.uint8) * 255  # 도트 느낌: 반투명 없이 딱 떨어지게
    out = Image.fromarray(np.dstack([np.array(rgb), a]), "RGBA")
    box = out.getchannel("A").getbbox()
    return out.crop(box) if box else out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bg", default="B")
    ap.add_argument("--goal", default="B")
    ap.add_argument("--keeper", default="A")
    ap.add_argument("--out", default=str(ROOT / "assets" / "approved" / "field"))
    args = ap.parse_args()
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    bg = Image.open(SRC / f"bg_{args.bg}.png").convert("RGB").resize(BG_SIZE, Image.Resampling.BOX)
    bg = bg.quantize(colors=BG_COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    bg.save(out / "bg.png")

    goal_src = Image.open(SRC / f"goal_{args.goal}.png")
    goal = pixelate_sprite(goal_src, GOAL_WIDTH / goal_src.width, SPRITE_COLORS)
    goal.save(out / "goal.png")

    ready_src = Image.open(SRC / f"keeper_{args.keeper}_ready.png")
    scale = KEEPER_READY_HEIGHT / ready_src.height
    poses = {"ready": "ready", "jump": "jump", "dive_a": "dive_left", "dive_b": "dive_right"}
    sizes = {}
    for src_name, dst_name in poses.items():
        p = pixelate_sprite(Image.open(SRC / f"keeper_{args.keeper}_{src_name}.png"), scale, SPRITE_COLORS)
        p.save(out / f"keeper_{dst_name}.png")
        sizes[dst_name] = {"w": p.width, "h": p.height}

    manifest = {
        "bg": {"w": bg.width, "h": bg.height},
        "goal": {"w": goal.width, "h": goal.height},
        "keeper": sizes,
        "chosen": {"bg": args.bg, "goal": args.goal, "keeper": args.keeper},
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
