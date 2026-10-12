"""
Generate the assets for the Unit 13 "Back Nine" prototype:

- One SVG file per wall piece of each hole (src/assets/back_nine_*.svg).
  Each file holds a single path of *relative* line segments (m ... l ... z),
  which is the subset of SVG that JetLag's SvgSystem reads reliably.  Curves
  are flattened into many short segments, the way Inkscape's "flatten
  Beziers" / "add nodes" would.  75 SVG pixels = 1 meter.
- Two sprite sheets with identical frame names, in two visual themes
  (src/assets/back_nine_classic.{png,json} and back_nine_candy.{png,json}).

Run from anywhere:  python3 make_back_nine_assets.py
"""
import json
import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "..", "src", "assets")
PX = 75  # SVG pixels per meter


def write_svg(name, points, closed):
    """Write world-space points (meters) as one relative SVG path"""
    pts = [(x * PX, y * PX) for x, y in points]
    d = [f"m {pts[0][0]:.2f},{pts[0][1]:.2f} l"]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        d.append(f"{x1 - x0:.2f},{y1 - y0:.2f}")
    if closed:
        d.append("z")
    minx = min(p[0] for p in pts)
    miny = min(p[1] for p in pts)
    svg = f"""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="1200" height="675">
  <g id="layer1">
    <path d="{' '.join(d)}" style="fill:none;stroke:#000000;stroke-width:2px" />
  </g>
</svg>
"""
    with open(os.path.join(ASSETS, f"back_nine_{name}.svg"), "w") as f:
        f.write(svg)
    # Report where the shape's top-left corner is, in meters, since that's
    # where the game has to place it
    print(f"{name}: {len(pts) - 1 + (1 if closed else 0)} segments, top-left at ({minx / PX:.3f}, {miny / PX:.3f})")


# Hole 1: a kidney-shaped green, with a bulge that blocks the straight shot
kidney = []
for i in range(48):
    t = -math.pi + 2 * math.pi * i / 48
    x = 8 + 7.0 * math.cos(t)
    y = 4.9 + 3.6 * math.sin(t)
    y += 3.9 * math.exp(-((t + math.pi / 2) / 0.42) ** 2)  # the bulge, pushing down from the top
    kidney.append((x, y))
kidney.append(kidney[0])
write_svg("h1_green", kidney[:-1], True)

# Hole 2: a snail shell.  An elliptical boundary, and a spiral wall inside it
shell = [(8 + 7.4 * math.cos(2 * math.pi * i / 40), 4.9 + 3.95 * math.sin(2 * math.pi * i / 40)) for i in range(40)]
write_svg("h2_shell", shell, True)
spiral = []
t = 0.9
while t <= 2.45 * math.pi:
    r = 0.7 + 0.38 * t
    spiral.append((8 + 1.7 * r * math.cos(t), 4.9 + r * math.sin(t)))
    t += 0.18
write_svg("h2_spiral", spiral, False)

# Hole 3: an S-shaped canyon.  One closed outline: top edge left to right,
# then the bottom edge right to left.
def center(x):
    return 4.9 + 2.3 * math.sin((x - 1) / 14 * 2 * math.pi)
xs = [1 + 14 * i / 36 for i in range(37)]
top = [(x, center(x) - 1.25) for x in xs]
bottom = [(x, center(x) + 1.25) for x in reversed(xs)]
write_svg("h3_canyon", top + bottom, True)


# ---------------------------------------------------------------------------
# Sprite sheets: same frame names, two different looks
# ---------------------------------------------------------------------------
FRAMES = {"turf.png": (0, 0, 256, 144), "ball.png": (256, 0, 64, 64), "cup.png": (320, 0, 64, 64),
          "flag.png": (384, 0, 64, 64), "tee.png": (448, 0, 64, 64), "rail.png": (256, 64, 128, 16),
          "bumper.png": (256, 80, 128, 16)}


def sheet(theme):
    img = Image.new("RGBA", (512, 144), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    classic = theme == "classic"
    # Turf: mowing stripes, or pastel candy stripes
    stripes = [(47, 122, 58), (56, 138, 66)] if classic else [(255, 205, 225), (205, 245, 225)]
    for i in range(0, 256, 32):
        d.rectangle([i, 0, i + 31, 143], fill=stripes[(i // 32) % 2] + (255,))
    # Ball
    if classic:
        d.ellipse([260, 4, 316, 60], fill=(250, 250, 250, 255), outline=(150, 150, 150, 255), width=3)
        for (x, y) in [(275, 20), (295, 18), (285, 34), (300, 38), (272, 40)]:
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(215, 215, 215, 255))
    else:
        d.ellipse([260, 4, 316, 60], fill=(255, 92, 170, 255), outline=(160, 20, 90, 255), width=3)
        d.arc([270, 14, 306, 50], 0, 270, fill=(255, 255, 255, 255), width=5)
    # Cup
    if classic:
        d.ellipse([324, 4, 380, 60], fill=(15, 15, 15, 255), outline=(220, 220, 220, 255), width=4)
    else:
        d.ellipse([324, 4, 380, 60], fill=(120, 70, 40, 255))
        d.ellipse([338, 18, 366, 46], fill=(40, 20, 10, 255))
        for a in range(0, 360, 40):
            x = 352 + 20 * math.cos(math.radians(a)); y = 32 + 20 * math.sin(math.radians(a))
            d.rectangle([x - 2, y - 1, x + 2, y + 1], fill=[(255, 80, 80, 255), (80, 200, 255, 255), (255, 230, 80, 255)][a // 40 % 3])
    # Flag
    if classic:
        d.rectangle([390, 4, 394, 62], fill=(235, 235, 235, 255))
        d.polygon([(394, 6), (440, 18), (394, 30)], fill=(229, 57, 53, 255))
    else:
        d.rectangle([410, 26, 414, 62], fill=(250, 250, 250, 255))
        d.ellipse([392, 2, 432, 42], fill=(255, 120, 200, 255), outline=(255, 255, 255, 255), width=3)
        d.arc([400, 10, 424, 34], 0, 300, fill=(255, 255, 255, 255), width=4)
    # Tee marker
    d.rectangle([456, 8, 504, 56], fill=(255, 255, 255, 70) if classic else (255, 240, 120, 120))
    # Rail: wood, or a candy cane
    if classic:
        d.rectangle([256, 64, 383, 79], fill=(109, 76, 47, 255))
        for x in range(256, 384, 24):
            d.line([x, 64, x + 10, 79], fill=(80, 55, 33, 255), width=2)
    else:
        # Drawn on its own canvas, so the diagonal stripes can't spill over
        cane = Image.new("RGBA", (128, 16), (255, 255, 255, 255))
        cd = ImageDraw.Draw(cane)
        for x in range(-16, 128, 16):
            cd.polygon([(x, 15), (x + 8, 15), (x + 16, 0), (x + 8, 0)], fill=(230, 40, 60, 255))
        img.paste(cane, (256, 64))
    # Bumper: rubber, or a row of gumdrops
    if classic:
        d.rectangle([256, 80, 383, 95], fill=(214, 58, 58, 255))
        d.line([256, 84, 383, 84], fill=(255, 140, 140, 255), width=2)
    else:
        for i, x in enumerate(range(256, 384, 16)):
            d.ellipse([x, 80, x + 15, 95], fill=[(120, 220, 90, 255), (255, 170, 40, 255), (160, 100, 255, 255)][i % 3])
    img.save(os.path.join(ASSETS, f"back_nine_{theme}.png"))
    frames = {name: {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
                     "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}
              for name, (x, y, w, h) in FRAMES.items()}
    meta = {"app": "make_back_nine_assets.py", "version": "1.1", "image": f"back_nine_{theme}.png",
            "format": "RGBA8888", "size": {"w": 512, "h": 144}, "scale": "1"}
    with open(os.path.join(ASSETS, f"back_nine_{theme}.json"), "w") as f:
        json.dump({"frames": frames, "meta": meta}, f, indent=1)


sheet("classic")
sheet("candy")
print("sheets written")
