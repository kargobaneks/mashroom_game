"""Титульный экран из обложки выпуска (docs/refs/title_source.png): пиксель-арт в палитре NES.

Ведущие по бокам (Сергей слева, Иван справа), посередине — раскол неба: тёмный город и рассвет
(«кто украл будущее»). Надписи выпуска (номер, «ЗРАДА ПЕРЕМОГА», малый логотип) затираются
размытием окружения; поверх — наш логотип «КОМНАТА» крупными пиксельными буквами.
Запуск: python3 scripts/title/build_title.py → assets/title/title.png (256×152).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs/refs/title_source.png"
OUT = ROOT / "assets/title/title.png"

W, H = 256, 152  # картинка титула; ниже неё на чёрном — подзаголовок и «НАЖМИТЕ START»

# Палитра NES (2C02), без дублей.
NES = [
    0x000000, 0x7C7C7C, 0xBCBCBC, 0xFCFCFC, 0x0000FC, 0x0078F8, 0x3CBCFC, 0xA4E4FC,
    0x0000BC, 0x6844FC, 0x9878F8, 0xD8B8F8, 0x4428BC, 0xB8B8F8, 0x940084, 0xD800CC,
    0xF878F8, 0xF8B8F8, 0xA80020, 0xE40058, 0xF85898, 0xF8A4C0, 0xA81000, 0xF83800,
    0xF87858, 0xF0D0B0, 0x881400, 0xE45C10, 0xFCA044, 0xFCE0A8, 0x503000, 0xAC7C00,
    0xF8B800, 0xF8D878, 0x007800, 0x00B800, 0xB8F818, 0xD8F878, 0x006800, 0x00A800,
    0x58D854, 0xB8F8B8, 0x005800, 0x00A844, 0x58F898, 0xB8F8D8, 0x004058, 0x008888,
    0x00E8D8, 0x00FCFC, 0xF8D8F8, 0x787878, 0xFCBCB0, 0xD8D8D8,
]


def nes_palette_image() -> Image.Image:
    pal = []
    for c in NES:
        pal += [(c >> 16) & 255, (c >> 8) & 255, c & 255]
    pal += pal[:3] * (256 - len(NES))
    img = Image.new("P", (1, 1))
    img.putpalette(pal)
    return img


def erase(img: Image.Image, box: tuple[int, int, int, int], blur: int) -> None:
    """Затереть прямоугольник: сильно размытое окружение того же места."""
    x0, y0, x1, y1 = box
    pad = blur * 2
    region = img.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    # Сначала заливаем коробку «соседями» сверху и снизу, потом размываем — надпись исчезает.
    top = region.crop((0, 0, region.width, pad)).resize((region.width, region.height // 2))
    bottom = region.crop((0, region.height - pad, region.width, region.height)).resize(
        (region.width, region.height - region.height // 2)
    )
    fill = Image.new("RGB", region.size)
    fill.paste(top, (0, 0))
    fill.paste(bottom, (0, region.height // 2))
    fill = fill.filter(ImageFilter.GaussianBlur(blur))
    mask = Image.new("L", region.size, 0)
    ImageDraw.Draw(mask).rectangle((pad, pad, region.width - pad, region.height - pad), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(blur // 2))
    region.paste(fill, (0, 0), mask)
    img.paste(region, (x0 - pad, y0 - pad))


# Логотип «КОМНАТА»: свои жирные буквы 9×11, масштаб 2, градиент золото→красный, чёрный контур.
GLYPHS = {
    "К": [
        "###...###", "###..###.", "###.###..", "######...", "#####....", "######...",
        "###.###..", "###..###.", "###...###", "###...###", "###...###",
    ],
    "О": [
        "..#####..", ".#######.", "###...###", "###...###", "###...###", "###...###",
        "###...###", "###...###", "###...###", ".#######.", "..#####..",
    ],
    "М": [
        "###...###", "####.####", "#########", "###.#.###", "###...###", "###...###",
        "###...###", "###...###", "###...###", "###...###", "###...###",
    ],
    "Н": [
        "###...###", "###...###", "###...###", "###...###", "#########", "#########",
        "###...###", "###...###", "###...###", "###...###", "###...###",
    ],
    "А": [
        "..#####..", ".#######.", "###...###", "###...###", "###...###", "#########",
        "#########", "###...###", "###...###", "###...###", "###...###",
    ],
    "Т": [
        "#########", "#########", "...###...", "...###...", "...###...", "...###...",
        "...###...", "...###...", "...###...", "...###...", "...###...",
    ],
}
GOLD = [(0xFC, 0xE0, 0xA8), (0xF8, 0xB8, 0x00), (0xFC, 0xA0, 0x44), (0xE4, 0x5C, 0x10), (0xA8, 0x10, 0x00)]


def draw_logo(img: Image.Image, text: str, cx: int, top: int, scale: int = 2) -> None:
    gw, gh, gap = 9, 11, 2
    width = (len(text) * (gw + gap) - gap) * scale
    x0 = cx - width // 2
    mask = Image.new("L", img.size, 0)
    md = ImageDraw.Draw(mask)
    for i, ch in enumerate(text):
        for y, row in enumerate(GLYPHS[ch]):
            for x, c in enumerate(row):
                if c == "#":
                    px = x0 + (i * (gw + gap) + x) * scale
                    py = top + y * scale
                    md.rectangle((px, py, px + scale - 1, py + scale - 1), fill=255)
    # Контур и тень вниз-вправо — чёрные; контур толстый, чтобы фон не просвечивал между буквами.
    outline = mask.filter(ImageFilter.MaxFilter(9))
    shadow = Image.new("L", img.size, 0)
    shadow.paste(outline, (2, 2))
    black = Image.new("RGB", img.size, (0, 0, 0))
    img.paste(black, (0, 0), shadow)
    img.paste(black, (0, 0), outline)
    # Заливка: горизонтальные полосы градиента.
    h = gh * scale
    fill = Image.new("RGB", img.size)
    fd = ImageDraw.Draw(fill)
    for y in range(h):
        fd.line((0, top + y, img.width, top + y), fill=GOLD[min(len(GOLD) - 1, y * len(GOLD) // h)])
    img.paste(fill, (0, 0), mask)


def main() -> None:
    src = Image.open(SRC).convert("RGB")  # 1280×720
    erase(src, (10, 20, 195, 92), 18)  # номер выпуска
    erase(src, (420, 300, 870, 712), 44)  # «ЗРАДА ПЕРЕМОГА» и малый логотип
    # 1280×720 → 256×144, полосы сверху и снизу добираем до 152 растяжением краёв.
    # Ярче и насыщеннее: левая половина обложки мрачная, без этого лицо уходит в серое.
    src = ImageEnhance.Color(src).enhance(1.3)
    src = ImageEnhance.Contrast(src).enhance(1.15)
    small = src.resize((W, 144), Image.Resampling.BOX)
    q = small.quantize(palette=nes_palette_image(), dither=Image.Dither.NONE).convert("RGB")
    out = Image.new("RGB", (W, H), (0, 0, 0))
    out.paste(q, (0, 4))
    draw_logo(out, "КОМНАТА", W // 2, 96)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)
    print(f"{OUT.relative_to(ROOT)}: {W}x{H}")


if __name__ == "__main__":
    main()
