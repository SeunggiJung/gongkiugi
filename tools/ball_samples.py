"""공 샘플 9장 v2 (일반/영웅/신화 x +0/+10/+30), 스타일 F, 과하게 화려한 연출.

+0 을 기준 이미지로 +10, +30 을 같은 공으로 이어 만든다.
원본은 preview/raw/balls, 후처리본은 preview/balls 에 저장한다.
"""
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

RAW = ROOT / "preview" / "raw" / "balls"
OUT = ROOT / "preview" / "balls"
STYLE_REF = ROOT / "preview" / "raw" / "styleboard_F.png"

STYLE = (
    "Pixel art in a warm storybook palette but with maximum visual impact, crisp square pixels, no anti-aliasing. "
    "A single game item illustration centered on a dark brown (#2b2118) background, no text, no logos, "
    "no brand names, no watermark. "
)
KEEP = (
    "Keep the ball itself a clearly visible solid sphere in the exact center of the frame, about 35 percent "
    "of the frame width, with the same design and panels as the reference. "
)

KINDS = {
    "common": dict(
        base="a classic hexagon-patterned soccer ball made of old leather, cream and dark-brown panels",
        s0="Deflated, dusty, scuffed with grass stains and mud, frayed stitching, dull matte surface, "
        "no glow and no effects at all.",
        s10="This is the 'legendary alley boss' ball. Make it showy: the leather turns gleaming gold-trimmed ivory, "
        "a thick spiral of golden energy winds around it, a bright ring of light and a big lens flare, "
        "dozens of glittering stars and sparks orbiting, motion streaks, a strong golden glow filling much of the frame.",
        s30="This is the ultimate 'infinite universe finisher' ball. Make it absurdly over the top and overwhelming: "
        "pure radiant gold and ivory panels with diamond studs, three concentric rainbow halo rings, six layered feathered "
        "wings of light spreading wide across the whole frame, a huge floating jeweled crown, a pillar of light shooting "
        "to the sky, lightning bolts, multiple blazing comet trails, giant god rays from the center, floating golden "
        "runes, confetti and fireworks bursting, cosmic sparkles filling every corner of the frame.",
    ),
    "hero": dict(
        base="a ball with a cooled black basalt crust broken into hexagon plates, glowing molten orange lava between the plates",
        s0="A burnt-out volcanic rock ball, crust nearly cold, only faint dull orange cracks, no effects at all.",
        s10="This is the 'boiling lava heart' ball. Lava erupts through every seam in blazing yellow-orange, a whirling "
        "fire tornado ring around it, flames licking upward, big glowing embers and sparks flying, heat distortion glow "
        "and a fiery orange aura filling much of the frame.",
        s30="This is the ultimate 'sun-swallowing eruption' ball. Make it absurdly over the top and overwhelming: the ball "
        "is a collapsing miniature sun with white-hot lava seams, enormous solar flares arcing around it, six huge wings of "
        "living fire spread across the whole frame, a towering seven-spike flaming crown, three concentric rainbow shockwave "
        "rings, a volcano erupting beneath it, lightning and meteors, multiple blazing comet trails, god rays, "
        "sparks and ash filling every corner of the frame.",
    ),
    "myth": dict(
        base="a dark crystal sphere containing a tiny spiral galaxy with a glowing heart-shaped core, violet, cyan and gold stars inside",
        s0="A lightless glass marble, the galaxy inside nearly dark and still, a few dim stars, no effects at all.",
        s10="This is the 'galaxy breathing heart' ball. The crystal sphere shines from within with a bright swirling "
        "galaxy and a pulsing cyan-violet heart core, tiny planets and rings orbiting it, long star trails, "
        "billowing nebula clouds and stardust, a vivid violet and cyan aura filling much of the frame.",
        s30="This is the ultimate 'genesis of the endless cosmos' ball. Make it absurdly over the top and overwhelming: "
        "the crystal sphere blazes with a white-gold supernova heart, entire galaxies and nebulae swirling around it, "
        "three concentric prismatic rainbow halo rings, six enormous wings made of nebula and starlight spread across the "
        "whole frame, a gigantic floating crown of glowing constellations, a ring of zodiac runes, planets and comets "
        "streaking past, shooting stars, god rays and a supernova burst filling every corner of the frame.",
    ),
}


def pixelate(src: pathlib.Path, dst: pathlib.Path, px=128, colors=64, scale=4):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    small = im.resize((px, px), Image.Resampling.BOX)
    small = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    small.save(dst.with_name(dst.stem + "_lowres.png"))
    small.resize((px * scale, px * scale), Image.Resampling.NEAREST).save(dst)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    style_ref = STYLE_REF.read_bytes()
    for key, k in KINDS.items():
        anchor_path = RAW / f"{key}_0.png"
        if not anchor_path.exists():
            p = STYLE + f"Draw {k['base']}. {k['s0']} Match the pixel style of the reference image."
            anchor_path.write_bytes(generate(p, "1:1", [style_ref]))
            print("generated", key, 0)
        anchor = anchor_path.read_bytes()
        for stage in (10, 30):
            rp = RAW / f"{key}_{stage}.png"
            if not rp.exists():
                p = (
                    STYLE
                    + f"The reference image shows the same ball at +0: {k['base']}. "
                    + KEEP
                    + k["s" + str(stage)]
                )
                rp.write_bytes(generate(p, "1:1", [anchor]))
                print("generated", key, stage)
        for stage in (0, 10, 30):
            pixelate(RAW / f"{key}_{stage}.png", OUT / f"{key}_{stage}.png")
    print("done")


if __name__ == "__main__":
    main()
