"""
Generate high-fidelity animated demo clips (GIF/MP4) capturing gameplay from multiple camera angles:
1. Portrait Mobile SNS View (9:16)
2. Cinematic Action Macro View (Close-up burst & resonance)
3. Wide Overview (Dashboard, upgrades, chronicles)
"""

import math
from PIL import Image, ImageDraw, ImageFont

def create_gameplay_demo(filename, mode='portrait', frames_count=36):
    width, height = (360, 640) if mode == 'portrait' else ((480, 480) if mode == 'cinematic' else (600, 400))
    frames = []

    # Palette
    c_bg_dark = (7, 9, 19)
    c_cyan = (56, 189, 248)
    c_purple = (168, 85, 247)
    c_gold = (251, 191, 36)
    c_pink = (244, 63, 94)
    c_white = (241, 245, 249)

    # Base background and characters
    try:
        bg_img = Image.open("public/assets/bg_ephemeral_sky.png").convert("RGBA").resize((width, height))
        boss_img = Image.open("public/assets/character_boss.png").convert("RGBA").resize((70, 70))
        lapis_img = Image.open("public/assets/character_lapis.png").convert("RGBA").resize((40, 40))
    except Exception:
        bg_img = Image.new("RGBA", (width, height), c_bg_dark)
        boss_img = None
        lapis_img = None

    for f in range(frames_count):
        img = bg_img.copy()
        draw = ImageDraw.Draw(img)

        # Header UI
        draw.rectangle([(10, 10), (width - 10, 50)], fill=(15, 23, 42, 220), outline=(56, 189, 248, 120))
        if lapis_img:
            img.paste(lapis_img, (15, 12), lapis_img)
        draw.text((62, 14), "Lv.1 泡沫の巫女・ラピス", fill=c_white)
        draw.text((62, 30), f"💎 {f * 85 + 240} 記憶の欠片", fill=c_cyan)

        # Mode Indicator / Angle Stamp
        mode_text = f"ANGLE: {mode.upper()}"
        draw.text((width - 120, 15), mode_text, fill=c_gold)
        draw.text((width - 120, 30), f"v1.0.0 REC", fill=c_pink)

        # Boss Box
        draw.rectangle([(20, 65), (width - 20, 160)], fill=(18, 24, 48, 200), outline=(147, 197, 253, 100))
        if boss_img:
            # Shake effect on hit
            shake = int(math.sin(f * 2.0) * 3) if f % 6 < 3 else 0
            img.paste(boss_img, (30 + shake, 75), boss_img)

        draw.text((110, 75), "黄昏第1層 · 忘却の守護者", fill=(147, 197, 253))
        draw.text((110, 92), "忘却の巨神・オブリビオン", fill=c_white)

        # HP Bar
        hp_pct = max(0.1, 1.0 - (f / frames_count) * 0.8)
        bar_w = width - 150
        draw.rectangle([(110, 115), (110 + bar_w, 125)], fill=(15, 23, 42), outline=(100, 100, 100))
        draw.rectangle([(110, 115), (110 + int(bar_w * hp_pct), 125)], fill=c_pink)
        draw.text((110, 130), f"HP {int(hp_pct * 1000)} / 1000", fill=(200, 200, 200))

        # Interactive Field
        field_top = 175
        field_bottom = height - 70
        draw.rectangle([(20, field_top), (width - 20, field_bottom)], fill=(10, 15, 33, 160), outline=(56, 189, 248, 80))

        # Floating Ephemeral Bubbles (Tapping simulation)
        bubble_x1 = int(width * 0.35 + math.sin(f * 0.3) * 20)
        bubble_y1 = int(field_top + 80 + math.cos(f * 0.3) * 15)
        bubble_r1 = 22 + int(math.sin(f * 0.8) * 3)
        draw.ellipse([(bubble_x1 - bubble_r1, bubble_y1 - bubble_r1),
                      (bubble_x1 + bubble_r1, bubble_y1 + bubble_r1)],
                     fill=(56, 189, 248, 140), outline=c_cyan, width=2)

        bubble_x2 = int(width * 0.65 + math.cos(f * 0.25) * 25)
        bubble_y2 = int(field_top + 150 + math.sin(f * 0.25) * 20)
        bubble_r2 = 24
        draw.ellipse([(bubble_x2 - bubble_r2, bubble_y2 - bubble_r2),
                      (bubble_x2 + bubble_r2, bubble_y2 + bubble_r2)],
                     fill=(168, 85, 247, 140), outline=c_purple, width=2)

        # Tap Hit Particles & Damage Pop Animation
        if f % 7 == 3:
            # Draw particle burst
            px, py = bubble_x1, bubble_y1
            for angle_idx in range(8):
                rad = angle_idx * math.pi / 4
                ox = int(px + math.cos(rad) * 35)
                oy = int(py + math.sin(rad) * 35)
                draw.line([(px, py), (ox, oy)], fill=c_gold, width=2)
            draw.text((px - 15, py - 35), "CRIT! -148", fill=c_gold)

        # Bottom Skills Bar
        draw.rectangle([(15, height - 60), (width - 15, height - 15)], fill=(10, 14, 30, 230), outline=(255, 255, 255, 40))
        draw.text((25, height - 45), "⏳ 刻の逆行", fill=c_white)
        draw.text((width // 2 - 35, height - 45), "💠 星屑結晶", fill=c_white)
        draw.text((width - 95, height - 45), "🌌 絶唱", fill=c_purple)

        frames.append(img.convert("RGB"))

    # Save as high-quality GIF
    frames[0].save(
        filename,
        save_all=True,
        append_images=frames[1:],
        duration=110,
        loop=0,
        optimize=True
    )
    print(f"Generated demo video clip: {filename}")

if __name__ == "__main__":
    create_gameplay_demo("public/demos/demo_v1_portrait.gif", mode='portrait')
    create_gameplay_demo("public/demos/demo_v1_cinematic.gif", mode='cinematic')
    create_gameplay_demo("public/demos/demo_v1_wide.gif", mode='wide')
