"""Generate the Medlyn locations map as a dot-grid of Austria.

Usage:
    python3 -I scripts/generate-austria-map.py <austria.geojson>

The input is the Austria feature from Natural Earth 1:10m admin-0 countries
(public domain): https://github.com/nvkelso/natural-earth-vector

Writes:
    public/svg/austria-dots.svg        gray dot field (1311x821 viewBox)
    src/components/map-points.ts   practice marker boxes on that grid
"""

import json
import math
import random
import sys
from pathlib import Path

VIEW_W, VIEW_H = 1311, 821
# Same lattice as the original map so the dot texture is unchanged.
GRID, ORIGIN_X, ORIGIN_Y = 16.8, 9.6, 7.0
DOT_RADIUS = 4.08
MARGIN = 12
REF_LAT = math.radians(47.6)  # equirectangular, scaled for Austria's mean latitude

# Marker diameters used by the source map, with their relative frequency.
MARKER_SIZES = [(7.59, 0.40), (11.11, 0.18), (13.77, 0.19), (16.89, 0.23)]

# (name, lon, lat, weight) — weight roughly tracks population.
CITIES = [
    ("Wien", 16.37, 48.21, 12),
    ("Graz", 15.44, 47.07, 6),
    ("Linz", 14.29, 48.31, 5),
    ("Salzburg", 13.04, 47.81, 5),
    ("Innsbruck", 11.40, 47.27, 5),
    ("Klagenfurt", 14.31, 46.62, 3),
    ("Villach", 13.85, 46.61, 2),
    ("Wels", 14.03, 48.16, 2),
    ("St. Pölten", 15.63, 48.20, 2),
    ("Dornbirn", 9.74, 47.41, 2),
    ("Wiener Neustadt", 16.24, 47.81, 2),
    ("Bregenz", 9.75, 47.50, 1),
    ("Feldkirch", 9.60, 47.24, 1),
    ("Steyr", 14.42, 48.04, 1),
    ("Leoben", 15.09, 47.38, 1),
    ("Krems", 15.61, 48.41, 1),
    ("Baden", 16.23, 48.01, 1),
    ("Eisenstadt", 16.52, 47.85, 1),
    ("Kufstein", 12.17, 47.58, 1),
    ("Lienz", 12.77, 46.83, 1),
    ("Wolfsberg", 14.84, 46.84, 1),
    ("Bludenz", 9.82, 47.15, 1),
    ("Schwaz", 11.71, 47.35, 1),
    ("Zell am See", 12.80, 47.32, 1),
    ("Bad Ischl", 13.62, 47.71, 1),
    ("Amstetten", 14.87, 48.12, 1),
    ("Braunau", 13.03, 48.26, 1),
    ("Ried", 13.49, 48.21, 1),
    ("Gmunden", 13.80, 47.92, 1),
    ("Spittal", 13.49, 46.80, 1),
    ("Oberwart", 16.20, 47.29, 1),
    ("Hollabrunn", 16.08, 48.56, 1),
    ("Zwettl", 15.17, 48.60, 1),
    ("Mistelbach", 16.57, 48.57, 1),
    ("Kapfenberg", 15.29, 47.44, 1),
    ("Judenburg", 14.66, 47.17, 1),
    ("Liezen", 14.24, 47.57, 1),
    ("Feldbach", 15.89, 46.95, 1),
    ("Landeck", 10.57, 47.14, 1),
    ("Reutte", 10.72, 47.49, 1),
    ("St. Johann im Pongau", 13.20, 47.35, 1),
    ("Weiz", 15.62, 47.22, 1),
]
SCATTERED_MARKERS = 24


def outer_rings(geometry):
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"][0]]
    return [polygon[0] for polygon in geometry["coordinates"]]


def point_in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def main(path):
    feature = json.loads(Path(path).read_text())
    geometry = feature.get("geometry", feature)
    rings = outer_rings(geometry)

    def project(lon, lat):
        return lon * math.cos(REF_LAT), -lat

    projected = [[project(lon, lat) for lon, lat in ring] for ring in rings]
    xs = [x for ring in projected for x, _ in ring]
    ys = [y for ring in projected for _, y in ring]
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
    scale = min((VIEW_W - 2 * MARGIN) / (max_x - min_x), (VIEW_H - 2 * MARGIN) / (max_y - min_y))
    offset_x = (VIEW_W - (max_x - min_x) * scale) / 2
    offset_y = (VIEW_H - (max_y - min_y) * scale) / 2

    def to_view(lon, lat):
        x, y = project(lon, lat)
        return (x - min_x) * scale + offset_x, (y - min_y) * scale + offset_y

    view_rings = [[to_view(lon, lat) for lon, lat in ring] for ring in rings]

    def inside(x, y):
        return any(point_in_ring(x, y, ring) for ring in view_rings)

    columns = int((VIEW_W - ORIGIN_X) // GRID) + 1
    rows = int((VIEW_H - ORIGIN_Y) // GRID) + 1
    grid = {}
    for row in range(rows):
        for column in range(columns):
            x = round(ORIGIN_X + column * GRID, 2)
            y = round(ORIGIN_Y + row * GRID, 2)
            if inside(x, y):
                grid[(column, row)] = (x, y)

    circles = "".join(f'<circle cx="{x:g}" cy="{y:g}" r="{DOT_RADIUS:g}"/>' for x, y in grid.values())
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" fill="none">'
        f'<g fill="#EDECE1">{circles}</g></svg>'
    )
    Path("public/svg/austria-dots.svg").write_text(svg)

    rng = random.Random(2500)
    sizes, weights = zip(*MARKER_SIZES)
    markers = {}
    for _, lon, lat, weight in CITIES:
        cx, cy = to_view(lon, lat)
        count = 1 + round(1.6 * weight)
        spread = 0.8 + 0.45 * math.sqrt(weight)
        for _ in range(count * 4):
            if count <= 0:
                break
            column = round((cx + rng.gauss(0, spread * GRID) - ORIGIN_X) / GRID)
            row = round((cy + rng.gauss(0, spread * GRID) - ORIGIN_Y) / GRID)
            if (column, row) in grid and (column, row) not in markers:
                markers[(column, row)] = rng.choices(sizes, weights)[0]
                count -= 1
    free = [cell for cell in grid if cell not in markers]
    for cell in rng.sample(free, SCATTERED_MARKERS):
        markers[cell] = MARKER_SIZES[0][0]

    lines = []
    for cell in sorted(markers, key=lambda c: (c[1], c[0])):
        x, y = grid[cell]
        size = markers[cell]
        lines.append(f"  [{round(x - size / 2, 2):g}, {round(y - size / 2, 2):g}, {size:g}, {size:g}],")
    Path("src/components/map-points.ts").write_text(
        "// Generated by scripts/generate-austria-map.py: Austrian practice marker boxes [x, y, width, height].\n"
        "export const MAP_POINTS: ReadonlyArray<readonly [number, number, number, number]> = [\n"
        + "\n".join(lines)
        + "\n];\n"
    )
    print(f"{len(grid)} grid dots, {len(markers)} markers")


if __name__ == "__main__":
    main(sys.argv[1])
