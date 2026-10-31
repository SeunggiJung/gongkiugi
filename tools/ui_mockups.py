"""UI 레이아웃 시안 2안 x 3화면 (GDD 9장). 스타일 F, 모바일 세로 9:16.

원본 그대로 preview/ui 에 저장한다. 텍스트 가독성 때문에 도트 축소 후처리는 하지 않는다 (레이아웃 확인용).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from gen_image import ROOT, generate  # noqa: E402

OUT = ROOT / "preview" / "ui"
STYLE_REF = ROOT / "preview" / "raw" / "styleboard_F.png"

STYLE = (
    "A mobile game UI mockup in portrait 9:16, cozy storybook pixel art matching the reference image style: warm earthy palette, "
    "wooden-plank buttons and panels, crisp square pixels, full-bleed screen with no phone frame. "
    "The main game world is a neighborhood playground football field with a wooden goal at dusk. "
    "All Korean text must be rendered exactly as written inside quotes, large, bold and perfectly legible, each appearing once. "
    "No real brands or logos, no watermark, no extra text. "
)

SAMPLE = 'The held ball is a glowing golden pixel soccer ball named "전설의 골목대장 공" with a small badge "+10".'

LAYOUTS = {
    "A": (
        "Layout A, classic full-field layout. Top bar: a gold coin counter pill on the left with the number \"12,340\", "
        "a small speaker icon on the right. Directly below the top bar, three small chips in a row: \"성공 45%\" (green), "
        "\"유지 43%\" (yellow), \"파괴 12%\" (red). The wooden goal with a goalkeeper takes the upper middle. "
        "The ball with its name banner floats above the penalty spot in the lower middle, with the line \"슛 비용 134\" under it. "
        "Along the very bottom, three wide wooden buttons in a row, labeled \"왼쪽\", \"가운데\", \"오른쪽\", reachable by thumb. "
        "Three small round icon buttons just above them on the left edge: book icon (collection), shop bag icon, plus-coin icon."
    ),
    "B": (
        "Layout B, bottom-sheet layout. The upper 55 percent of the screen shows the field, wooden goal and goalkeeper, with the gold "
        "counter pill \"12,340\" in the top-left and a speaker icon top-right. The lower 45 percent is a solid wooden bottom panel. "
        "Inside the panel from top to bottom: the ball name banner with a small ball icon; three horizontal probability bars labeled "
        "\"성공 45%\" (green), \"유지 43%\" (yellow), \"파괴 12%\" (red); a line \"슛 비용 134\"; then three large wooden buttons in a row "
        "labeled \"왼쪽\", \"가운데\", \"오른쪽\". At the very bottom a tab bar with four icons and labels \"뽑기\", \"상점\", \"도감\", \"충전\"."
    ),
}

SCREENS = {
    "shoot": lambda layout: LAYOUTS[layout] + " " + SAMPLE,
    "choose": lambda layout: (
        LAYOUTS[layout]
        + " The screen is dimmed and a centered wooden popup card is open on top: a big title \"골!\", the ball name "
        "\"전설의 골목대장 공 +11\", two lines \"다음 슛 성공 38% · 유지 48% · 파괴 14%\" and \"슛 비용 204\", and two large buttons side by side: "
        "\"팔기\" (orange) and \"계속 차기\" (blue). No price, no number of gold anywhere on the popup. "
        "A small pale link-style button \"자랑하기\" sits under the two buttons."
    ),
    "dex": lambda layout: (
        "Collection book screen (도감) designed for the same game, in the same cozy pixel UI. "
        + ("Layout A: a full-screen opened book on a wooden desk filling the whole 9:16 screen, a wooden header bar with the single word \"도감\" "
           "and a back arrow on the left, parchment pages with the list. Do not show the football field. "
           if layout == "A"
           else "Layout B: a tall bottom sheet that covers 85 percent of the screen with a handle and a header \"도감\", the field visible behind it. ")
        + "A list of rows. One row is expanded: \"동네 축구공\" with \"최고 +4\" and \"내가 판 최고 8,000\", and below it an indented numbered list: "
        "\"+0 바람 빠진 동네 축구공\", \"+1 흙먼지 묻은 축구공\", \"+2 골목을 굴러다니는 공\", \"+3 담벼락에 튕겨 오는 공\", \"+4 유리창을 노리는 말썽쟁이 공\". "
        "Below it two collapsed rows \"고무공\" and \"???\" with a lock icon. Small pixel ball thumbnails on each row."
    ),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ref = STYLE_REF.read_bytes()
    for layout in LAYOUTS:
        for screen, make in SCREENS.items():
            path = OUT / f"{layout}_{screen}.png"
            if path.exists():
                continue
            path.write_bytes(generate(STYLE + make(layout), "9:16", [ref]))
            print("generated", path.name)


if __name__ == "__main__":
    main()
