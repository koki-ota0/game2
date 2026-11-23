"""
Generate high-fidelity animated demo clips (GIF) capturing gameplay from multiple camera angles:
1. Portrait Mobile SNS View (9:16) - Astral Wheel Dial gameplay
2. Cinematic Action Macro View (Close-up burst & resonance)
3. Wide Overview (Transcendence Ascension, Roguelike Tree)
"""

import math
from PIL import Image, ImageDraw, ImageFont

def create_gameplay_demo(filename, mode='portrait', frames_count=36):
    width, height = (360, 640) if mode == 'portrait' else ((480, 480) if mode == 'cinematic' else (600, 400))
    frames = []

    c_bg_dark = (7, 9, 19)
    c_cyan = (56, 189, 248)
    c_purple = (168, 85, 247)
    c_gold = (251, 191, 36)
    c_emerald = (45, 212, 191)
    c_pink = (244, 63, 94)
    c_white = (241, 245, 249)

    try:
        bg_img = Image.open("public/assets/bg_ephemeral_sky.png").convert("RGBA").resize((width, height))
        boss_img = Image.open("public/assets/character_boss.png").convert("RGBA").resize((65, 65))
        lapis_img = Image.open("public/assets/character_lapis.png").convert("RGBA").resize((38, 38))
    except Exception:
        bg_img = Image.new("RGBA", (width, height), c_bg_dark)
        boss_img = None
        lapis_img = None

    center_x = width // 2
    center_y = int(height * 0.58) if mode == 'portrait' else (height // 2 + 10)
    max_radius = min(width, height) * 0.38

    for f in range(frames_count):
        img = bg_img.copy()
        draw = ImageDraw.Draw(img)

        # Header UI
        draw.rectangle([(10, 8), (width - 10, 46)], fill=(15, 23, 42, 220), outline=(56, 189, 248, 120))
        if lapis_img:
            img.paste(lapis_img, (14, 9), lapis_img)
        draw.text((58, 11), "Lv.1 泡沫の巫女・ラピス", fill=c_white)
        draw.text((58, 27), f"💎 {f * 95 + 320} 記憶の欠片  ⭐ 2 星種", fill=c_cyan)

        # Mode Badge
        draw.text((width - 110, 12), f"ASTRAL DIAL", fill=c_gold)
        draw.text((width - 110, 26), f"v2.0 REC", fill=c_pink)

        # Boss Box
        draw.rectangle([(16, 54), (width - 16, 140)], fill=(18, 24, 48, 210), outline=(147, 197, 253, 110))
        if boss_img:
            shake = int(math.sin(f * 2.5) * 4) if f % 6 < 3 else 0
            img.paste(boss_img, (24 + shake, 62), boss_img)

        draw.text((100, 62), "黄昏第1層 · 忘却の守護者", fill=(147, 197, 253))
        draw.text((100, 78), "忘却の巨神・オブリビオン", fill=c_white)

        # HP Bar
        hp_pct = max(0.1, 1.0 - (f / frames_count) * 0.85)
        draw.rectangle([(100, 98), (width - 30, 106)], fill=(15, 23, 42))
        draw.rectangle([(100, 98), (100 + int((width - 130) * hp_pct), 106)], fill=c_pink)
        draw.text((100, 112), f"HP {int(hp_pct * 1200)} / 1200", fill=(200, 200, 200))

        # Boss Timer Bar (Decay wave)
        decay_pct = (f % 12) / 12.0
        draw.rectangle([(width - 90, 112), (width - 30, 120)], fill=(15, 23, 42))
        draw.rectangle([(width - 90, 112), (width - 90 + int(60 * decay_pct), 120)], fill=c_gold)

        # Astral Dial Concentric Rings Area
        arena_top = 150
        arena_bottom = height - 55
        draw.rectangle([(14, arena_top), (width - 14, arena_bottom)], fill=(8, 12, 28, 180), outline=(56, 189, 248, 90))

        # Draw Orbit Circles
        ring_ratios = [0.25, 0.50, 0.75]
        for r_ratio in ring_ratios:
            r = max_radius * r_ratio
            draw.ellipse([(center_x - r, center_y - r), (center_x + r, center_y + r)],
                         outline=(147, 197, 253, 60), width=1)

        # Draw Radial Axis rays
        for i in range(8):
            rad = (i / 8.0) * math.pi * 2
            draw.line([(center_x, center_y),
                       (int(center_x + math.cos(rad) * max_radius * 0.8),
                        int(center_y + math.sin(rad) * max_radius * 0.8))],
                      fill=(147, 197, 253, 40), width=1)

        # Rotating Orbit Nodes & Active Linking Simulation
        chain_points = []
        node_colors = [c_cyan, c_purple, c_gold, c_emerald]

        for r_idx, r_ratio in enumerate(ring_ratios):
            count = 4 + r_idx * 4
            rot_speed = 0.04 * (1 if r_idx % 2 == 0 else -1)
            base_angle = f * rot_speed

            for n_i in range(count):
                angle = base_angle + (n_i / float(count)) * math.pi * 2
                r = max_radius * r_ratio
                nx = int(center_x + math.cos(angle) * r)
                ny = int(center_y + math.sin(angle) * r)

                # Pick color
                col = node_colors[(n_i + r_idx) % len(node_colors)]

                # Highlight and link chain
                if r_idx == 1 and n_i < 6:
                    chain_points.append((nx, ny))
                    draw.ellipse([(nx - 9, ny - 9), (nx + 9, ny + 9)], fill=c_cyan, outline=c_white, width=2)
                else:
                    draw.ellipse([(nx - 6, ny - 6), (nx + 6, ny + 6)], fill=col)

        # Draw Connected Astral Beam Line
        if len(chain_points) > 1:
            for p_i in range(len(chain_points) - 1):
                draw.line([chain_points[p_i], chain_points[p_i + 1]], fill=c_cyan, width=3)
            # If closed loop on certain frames
            if f % 9 > 4:
                draw.line([chain_points[-1], chain_points[0]], fill=c_pink, width=4)
                draw.text((center_x - 45, center_y - 10), "ECLIPSE!", fill=c_gold)

        # Bottom Skills Bar
        draw.rectangle([(14, height - 50), (width - 14, height - 12)], fill=(10, 14, 30, 240), outline=(255, 255, 255, 50))
        draw.text((22, height - 38), "⏳ 刻の逆行", fill=c_white)
        draw.text((width // 2 - 32, height - 38), "🪐 天球調相", fill=c_white)
        draw.text((width - 92, height - 38), "🌌 絶唱", fill=c_purple)

        frames.append(img.convert("RGB"))

    frames[0].save(
        filename,
        save_all=True,
        append_images=frames[1:],
        duration=110,
        loop=0,
        optimize=True
    )
    print(f"Generated v2 demo clip: {filename}")

if __name__ == "__main__":
    create_gameplay_demo("public/demos/demo_v1_portrait.gif", mode='portrait')
    create_gameplay_demo("public/demos/demo_v1_cinematic.gif", mode='cinematic')
    create_gameplay_demo("public/demos/demo_v1_wide.gif", mode='wide')
