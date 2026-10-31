"""버튼 · 팝업 프레임 시안 3안 (GDD 9장). 스타일 F 고정, 레이아웃 A 고정.

각 안마다 (1) 글자 없는 UI 키트 시트 (2) A 레이아웃 슛 화면에 적용한 모습 을 만든다.
글자는 이미지 모델이 틀리게 그리므로 실제 게임에서는 코드가 올린다. 원본 그대로 preview/frames 에 저장한다.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

OUT = ROOT / "preview" / "frames"
STYLE_REF = ROOT / "preview" / "raw" / "styleboard_F.png"
LAYOUT_REF = ROOT / "preview" / "ui" / "A_shoot.png"

BASE = (
    "Cozy storybook pixel art UI, crisp square pixels, no anti-aliasing, warm earthy palette matching the first reference image. "
    "No real brands, no logos, no watermark. "
)

KIT = (
    "A UI asset sheet for a mobile football game laid out neatly in a grid on a flat dark charcoal background with generous spacing. "
    "Contains, all completely EMPTY with no letters, no digits and no text anywhere: "
    "(1) three wide rectangular buttons in a row, brown default, blue primary, orange sell, each shown in a normal and a pressed state; "
    "(2) one large popup panel frame with a title bar and a close button in its corner; "
    "(3) a rounded gold counter pill with a coin icon on its left; "
    "(4) three small stat chips in green, yellow and red; "
    "(5) a name banner ribbon; "
    "(6) a square icon button shown with four plain icons: an open book, a shopping bag, a coin with a plus sign, a question mark. "
)

SCREEN = (
    "Redraw the game screen from the second reference image, keeping its layout, field, goal, goalkeeper and ball exactly the same, "
    "but replace every button, chip, banner, gold pill and icon button with the matching pieces from the UI asset sheet design described. "
    "Keep these Korean labels exactly: \"왼쪽\", \"가운데\", \"오른쪽\", \"성공 45%\", \"유지 43%\", \"파괴 12%\", \"슛 비용 134\". "
    "Portrait 9:16, full-bleed, no phone frame. "
)

CANDIDATES = {
    "A": "Design A, chunky wooden planks: thick warm wooden boards with visible grain, round nail heads in the corners, rope trim on panels, soft highlights.",
    "B": "Design B, stitched leather and brass: dark brown leather panels with cream stitching, brass corner plates and rivets, embossed edges, cream accent lines.",
    "C": "Design C, paper cut-out stickers: cream paper pieces with thick dark outlines, slightly uneven edges, small tape strips on the corners, flat bright color fills.",
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    style = STYLE_REF.read_bytes()
    layout = LAYOUT_REF.read_bytes()
    for key, desc in CANDIDATES.items():
        kit_path = OUT / f"{key}_kit.png"
        if not kit_path.exists():
            kit_path.write_bytes(generate(BASE + desc + " " + KIT, "1:1", [style]))
            print("generated", kit_path.name)
        scr_path = OUT / f"{key}_screen.png"
        if not scr_path.exists():
            kit = kit_path.read_bytes()
            prompt = BASE + desc + " The third reference image is the UI asset sheet to follow. " + SCREEN
            scr_path.write_bytes(generate(prompt, "9:16", [style, layout, kit]))
            print("generated", scr_path.name)


if __name__ == "__main__":
    main()
