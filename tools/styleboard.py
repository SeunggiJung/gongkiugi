"""픽셀 스타일 보드 3안 생성 + 픽셀화 후처리 (GDD 9장).

원본은 preview/raw, 후처리본은 preview/styleboard 에 저장한다.
"""
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

COMMON = (
    "A pixel art game screen mockup for a mobile penalty-kick game, portrait 9:16. "
    "Scene: a soccer penalty area seen from behind the kicker. A goal with a net and a goalkeeper "
    "in a ready crouch at the top, a grass pitch with a penalty spot, and a single large soccer ball "
    "glowing slightly in the lower center. Along the bottom, three big rounded buttons in a row "
    "(left, center, right) with simple arrow icons. At the top, a small gold coin counter. "
    "Friendly and readable for ages from elementary school to adults. "
    "True pixel art with crisp square pixels, no anti-aliasing, no blur, no photographic textures. "
    "No real team logos, no brand names, no watermark, no text other than digits. "
)

STYLES = {
    "A": dict(
        name="16비트 선명 (180x320, 32색, 검은 윤곽선)",
        size=(180, 320),
        colors=32,
        prompt=COMMON
        + "Style: classic 16-bit console look like a SNES sports game. Bold 1-pixel black outlines "
        "around every sprite, saturated limited palette of about 32 colors, flat cel-shaded colors "
        "with at most two shade steps, bright daytime stadium with blue sky.",
    ),
    "B": dict(
        name="레트로 칩튠 (120x214, 16색, 윤곽선 없음)",
        size=(120, 214),
        colors=16,
        prompt=COMMON
        + "Style: chunky low-resolution handheld-console look. Very large visible pixels, a strict "
        "16-color pastel palette, no black outlines (shapes separated by darker shades of their own "
        "color), simple shapes, soft sunset stadium with warm orange and lavender sky.",
    ),
    "C": dict(
        name="모던 HD 픽셀 (270x480, 48색, 네온 야간)",
        size=(270, 480),
        colors=48,
        prompt=COMMON
        + "Style: modern detailed pixel art in the vein of contemporary indie games. Finer pixels, "
        "selective colored outlines instead of pure black, dithering for gradients, dramatic night "
        "stadium with floodlights, neon cyan and magenta accents, glowing ball with a subtle light trail.",
    ),
    "D": dict(
        name="귀여운 캔디 치비 (160x284, 24색, 굵은 윤곽선)",
        size=(160, 284),
        colors=24,
        prompt=COMMON
        + "Full-bleed game screen with no phone frame. Style: cute chibi casual mobile game. Round, "
        "bouncy proportions, the goalkeeper is a big-headed chibi mascot with a huge goofy grin, "
        "thick dark-brown outlines, bright candy colors (mint, strawberry pink, lemon yellow), "
        "a sunny daytime pitch with fluffy clouds and a tiny cheering crowd of round blobs.",
    ),
    "E": dict(
        name="80년대 아케이드 (224x398, 12색, 네온 그리드)",
        size=(224, 398),
        colors=12,
        prompt=COMMON
        + "Full-bleed game screen with no phone frame. Style: 1980s arcade cabinet look with a strict "
        "12-color palette, hard-edged shapes, visible scanline-like banding, a synthwave sunset with a "
        "magenta and cyan perspective grid for the pitch, a glowing wireframe goal, a silhouette-style "
        "goalkeeper, chrome-looking arcade buttons.",
    ),
    "F": dict(
        name="포근한 동화풍 (200x356, 40색, 따뜻한 질감)",
        size=(200, 356),
        colors=40,
        prompt=COMMON
        + "Full-bleed game screen with no phone frame. Style: cozy storybook pixel art in the spirit of "
        "farm-life games. Warm earthy palette, soft hand-placed dithering, a small neighborhood "
        "playground field with a wooden goal and rope net, a fence, trees, a golden-hour sun, "
        "a friendly goalkeeper in a patched jersey, wooden-plank styled buttons.",
    ),
}


def pixelate(raw_path: pathlib.Path, out_path: pathlib.Path, size, colors, scale):
    im = Image.open(raw_path).convert("RGB")
    small = im.resize(size, Image.Resampling.BOX)
    small = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    small.save(out_path.with_name(out_path.stem + "_lowres.png"))
    small.resize((size[0] * scale, size[1] * scale), Image.Resampling.NEAREST).save(out_path)


def main():
    raw = ROOT / "preview" / "raw"
    out = ROOT / "preview" / "styleboard"
    raw.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    for key, s in STYLES.items():
        rp = raw / f"styleboard_{key}.png"
        if not rp.exists():
            rp.write_bytes(generate(s["prompt"], "9:16"))
            print("generated", key)
        scale = max(1, 960 // s["size"][1])
        pixelate(rp, out / f"{key}.png", s["size"], s["colors"], scale)
        print("processed", key)


if __name__ == "__main__":
    main()
