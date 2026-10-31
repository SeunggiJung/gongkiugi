"""확정된 프레임 A 키트 시트(preview/frames/A_kit.png)를 투명 배경 조각으로 자른다.

결과는 assets/approved/frames/ 에 저장한다. 팝업 패널은 제목판 · 닫기 버튼이 테두리를 덮고 있어서,
그 자리를 테두리 조각으로 메워 9분할 늘리기에 쓸 수 있는 깨끗한 패널을 따로 만든다.
"""
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "preview" / "frames" / "A_kit.png"
OUT = ROOT / "assets" / "approved" / "frames"

BG = np.array([34, 39, 45])
THRESH = 16  # 배경색과의 거리. 이보다 가까우면 배경이다.

# (이름, (left, top, right, bottom)) 키트 시트 좌표
BOXES = {
    "btn_brown": (56, 58, 262, 224),
    "btn_blue": (376, 58, 582, 224),
    "btn_orange": (695, 58, 900, 224),
    "panel_raw": (66, 278, 652, 668),
    "title_plate": (203, 280, 518, 364),
    "close_btn": (574, 286, 650, 370),
    "gold_pill": (703, 380, 970, 485),
    "chip_green": (76, 718, 185, 822),
    "chip_yellow": (214, 718, 322, 822),
    "chip_red": (350, 718, 458, 822),
    "banner": (68, 868, 516, 968),
    "icon_btn": (554, 730, 730, 920),
    "icon_book": (775, 792, 868, 862),
    "icon_bag": (888, 786, 968, 870),
    "icon_coin_plus": (782, 888, 870, 966),
    "icon_question": (900, 888, 958, 968),
}


def foreground_mask(rgb: np.ndarray) -> np.ndarray:
    dist = np.sqrt(((rgb.astype(int) - BG) ** 2).sum(axis=2))
    fg = dist > THRESH
    # 작은 잡티 제거 후 구멍을 메운다 (조각 안쪽의 배경색 비슷한 영역 보존)
    fg = ndimage.binary_opening(fg, structure=np.ones((2, 2)))
    return ndimage.binary_fill_holes(fg)


def crop_piece(rgb: np.ndarray, mask: np.ndarray, box) -> Image.Image:
    l, t, r, b = box
    sub = rgb[t:b, l:r]
    m = mask[t:b, l:r]
    # 상자 안에서 가장 큰 덩어리만 남긴다 (옆 조각 · 그림자 조각 제거)
    labels, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, labels, range(1, n + 1))
        m = labels == (1 + int(np.argmax(sizes)))
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([sub, (m * 255).astype(np.uint8)])[y0:y1, x0:x1]
    return Image.fromarray(rgba, "RGBA")


def symmetric_button(piece: Image.Image, remove_bluish: bool) -> Image.Image:
    """눌림 조각이 겹쳐 있던 오른쪽을 버리고, 왼쪽 절반을 좌우 반전해 대칭 버튼으로 만든다."""
    a = np.array(piece)
    half = a[:, : a.shape[1] // 2]
    if remove_bluish:
        # 배경 그림자의 푸르스름한 잔여 픽셀 제거. 나무색은 빨강이 파랑보다 크다.
        r, b = half[:, :, 0].astype(int), half[:, :, 2].astype(int)
        half = half.copy()
        half[(b - r > 3) & (half[:, :, 3] > 0)] = 0
    full = np.concatenate([half, half[:, ::-1]], axis=1)
    return Image.fromarray(full, "RGBA")


def clean_panel(raw: Image.Image) -> Image.Image:
    """제목판 · 닫기 버튼이 덮은 테두리를 왼쪽 위 테두리 조각으로 메운다.

    좌표는 panel_raw 조각(586x390) 기준이다: 제목판 x 137~452, 닫기 버튼 x 508~586, 둘 다 y 0~100.
    """
    a = np.array(raw).copy()
    interior = np.median(a[150:250, 150:450, :3].reshape(-1, 3), axis=0)  # 패널 안쪽 평평한 갈색
    strip = a[0:100, 44:126].copy()  # 제목판 왼쪽의 가로 테두리 + 밧줄 조각 (세로 밧줄이 섞이지 않는 구간)
    left, right = 128, 466  # 제목판 윤곽선까지 넉넉히 덮는다
    for x in range(left, right, strip.shape[1]):
        w = min(strip.shape[1], right - x)
        a[0:100, x : x + w] = strip[:, :w]
    # 닫기 버튼은 프레임 오른쪽 끝(x=576) 밖으로 튀어나와 있다. 프레임 폭은 576 이다.
    corner = a[0:114, 0:76][:, ::-1].copy()  # 왼쪽 위 모서리를 좌우 반전 (닫기 버튼 그림자까지 덮는 높이)
    # 오른쪽 테두리 두께가 왼쪽과 조금 달라서, 바로 아래 원본 테두리와 가장 잘 이어지는 가로 이동량을 찾는다.
    below = a[114:126, 500:576, :3].astype(int)
    best_dx, best_err = 0, None
    for dx in range(-14, 15):
        shifted = np.roll(corner, dx, axis=1)
        err = np.abs(shifted[102:114, 30:76, :3].astype(int) - below[:, 30:76]).sum()
        if best_err is None or err < best_err:
            best_dx, best_err = dx, err
    a[0:114, 500:576] = np.roll(corner, best_dx, axis=1)
    # 붙인 영역의 안쪽 색을 패널 안쪽 색으로 통일해서 이음매 네모가 보이지 않게 한다.
    for (x0, x1), y1 in (((left, right), 100), ((500, 576), 114)):
        region = a[0:y1, x0:x1]
        near = (np.abs(region[:, :, :3].astype(int) - interior).sum(axis=2) < 30) & (region[:, :, 3] > 0)
        region[near, :3] = interior.astype(np.uint8)
    return Image.fromarray(a[:, :576], "RGBA")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rgb = np.array(Image.open(SRC).convert("RGB"))
    mask = foreground_mask(rgb)
    for name, box in BOXES.items():
        piece = crop_piece(rgb, mask, box)
        if name.startswith("btn_"):
            piece = symmetric_button(piece, remove_bluish=name != "btn_blue")
        piece.save(OUT / f"{name}.png")
        print(name, piece.size)
        if name == "panel_raw":
            clean_panel(piece).save(OUT / "panel.png")
    # 세 버튼은 모양이 같다. 가장 깨끗한 갈색 버튼의 투명 영역으로 파랑 · 주황 버튼 모서리의 그림자 잔여물을 지운다.
    brown_alpha = Image.open(OUT / "btn_brown.png").getchannel("A")
    for name in ("btn_blue", "btn_orange"):
        im = Image.open(OUT / f"{name}.png")
        mask = np.array(brown_alpha.resize(im.size, Image.NEAREST))
        a = np.array(im)
        a[:, :, 3] = np.minimum(a[:, :, 3], mask)
        Image.fromarray(a, "RGBA").save(OUT / f"{name}.png")
    Image.open(SRC).save(OUT / "A_kit_original.png")


if __name__ == "__main__":
    main()
