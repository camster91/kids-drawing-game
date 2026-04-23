#!/usr/bin/env python3
"""
Kids Drawing Game — Creative Asset Generation Pipeline
Uses Google Gemini API for high-quality game assets.
"""
import os
import sys
import json
import time
import base64
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_KEY:
    print("ERROR: Set GEMINI_API_KEY env var")
    sys.exit(1)

OUTPUT_DIR = Path.home() / "kids-drawing-game" / "assets" / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Prompt Templates ──────────────────────────────────────

COLORING_PAGE_PROMPT = """Simple black and white line art coloring page for kids ages 4-8.
Subject: {subject}
Style: Thick bold black outlines (4px stroke), no shading, no gradients, flat white background.
Details: Large friendly {subject} in the center, minimal background elements (grass, clouds, sun).
Composition: Centered, filling 80% of frame, simple recognizable shapes.
Clean crisp vector-quality lines. No text. No watermark. Purely black lines on white.
"""

MASCOT_PROMPT = """Cute cartoon mascot character for a children's drawing app.
Description: A friendly colorful chameleon-like blob creature named "Doodle".
-features: Big sparkling eyes, tiny smile, holding a rainbow paintbrush in one hand,
wearing a tiny beret hat.
-colors: Soft pastel rainbow body (pink, orange, yellow, green, blue, purple gradients).
-style: Kawaii/cute art style, rounded soft edges, no sharp angles, adorable proportions.
-background: Soft pastel gradient (lavender to sky blue), scattered white stars and paint splatters.
digital illustration, vibrant colors, Pixar-inspired cuteness, high resolution."""

BACKGROUND_PROMPT = """Children's app background, {theme} themed.
Style: Soft pastel watercolor-style digital art, dreamy and magical.
Details: {details}
Colors: {colors}
Mood: Happy, playful, kid-friendly.
No text, no characters, no watermarks. Pure environmental art.
Suitable as a subtle app background (not too busy). 16:9 landscape."""

STICKER_PROMPT = """Cute cartoon {subject} sticker illustration for kids.
Style: Kawaii, thick black outlines, flat vibrant colors, simple shapes.
Expression: Happy, excited, adorable.
Details: {details}
Background: Transparent/solid white. Clean edges, sticker-ready.
digital illustration, children's book style."""

SPLASH_PROMPT = """Hero splash screen art for "Kids Drawing Game" app.
Scene: A magical creative world where crayons, paintbrushes, and colored pencils come alive.
Center: A cute cartoon character happily drawing on a giant floating canvas.
Atmosphere: Sparkles, rainbow paint splatters, floating stars, magic dust.
Style: Vibrant children's illustration, Pixar-esque warmth, rich saturated colors,
dreamy lighting, digital painting.
Text: Add the title "KIDS DRAWING" in big playful rounded bubbly letters with rainbow colors
at top center.
16:9 landscape composition. Ultra-detailed, premium quality."""

# ── Generation Tasks ──────────────────────────────

tasks = []

# 1. Mascot (1 image)
tasks.append({
    "name": "mascot_doodle",
    "prompt": MASCOT_PROMPT,
    "model": "gemini-3-pro-image-preview",
    "size": "1024x1024",
    "folder": OUTPUT_DIR / "mascot"
})

# 2. Splash screen (1 image)
tasks.append({
    "name": "splash_hero",
    "prompt": SPLASH_PROMPT,
    "model": "gemini-3-pro-image-preview",
    "size": "1536x1024",  # 3:2 landscape
    "folder": OUTPUT_DIR / "splash"
})

# 3. Coloring pages (12 — use flash for speed)
coloring_subjects = [
    "a friendly lion", "a cute dolphin", "a rocket ship", "a birthday cake",
    "a teddy bear", "a butterfly", "a pirate ship", "a fairy princess",
    "a dinosaur (T-Rex)", "a fire truck", "a unicorn", "a cute penguin"
]
for i, subject in enumerate(coloring_subjects):
    tasks.append({
        "name": f"coloring_{i+1:02d}_{subject.replace(' ','_')[:20]}",
        "prompt": COLORING_PAGE_PROMPT.format(subject=subject),
        "model": "gemini-3.1-flash-image-preview",
        "size": "1024x1024",
        "folder": OUTPUT_DIR / "coloring-pages"
    })

# 4. Backgrounds (6 — pro for quality)
backgrounds = [
    ("underwater", "coral reef, friendly fish bubbles, sea turtles, seaweed", "teal, aqua, coral pink, golden yellow"),
    ("space", "planets, stars, nebulas, friendly alien spaceships", "deep purple, navy, bright orange, cyan"),
    ("forest", "tall trees, mushrooms, butterflies, rainbow flowers", "emerald green, sky blue, dandelion yellow"),
    ("candy_land", "candy cane trees, gumdrop hills, lollipop flowers, chocolate river", "hot pink, mint green, lemon yellow, sky blue"),
    ("cloud_castle", "fluffy clouds forming castle shapes, rainbow bridges, flying birds", "soft blue, white, pastel rainbow"),
    ("jungle", "tropical leaves, parrots, monkeys, waterfalls", "lime green, turquoise, mango orange"),
]
for theme, details, colors in backgrounds:
    tasks.append({
        "name": f"bg_{theme}",
        "prompt": BACKGROUND_PROMPT.format(theme=theme, details=details, colors=colors),
        "model": "gemini-3.1-flash-image-preview",
        "size": "1536x1024",
        "folder": OUTPUT_DIR / "backgrounds"
    })

# 5. Sticker packs (18 — flash for speed)
sticker_subjects = [
    ("happy sun", "smiling face, rays like arms, sunglasses"),
    ("sleepy moon", "crescent moon with face, tiny stars around"),
    ("rain cloud", "fluffy cloud with rain drops, rainbow underneath"),
    ("pizza slice", "cartoon pizza with happy face, pepperoni hearts"),
    ("ice cream cone", "triple scoop cone, waffle pattern, cherry on top"),
    ("robot buddy", "small friendly robot, antenna, heart on chest"),
    ("magic wand", "sparkle wand with star tip, rainbow trail"),
    ("crown", "golden crown with jewels, tiny stars"),
    ("music note", "eighth notes dancing together, musical staff lines"),
    ("bicycle", "simple cute bicycle, basket with flowers"),
    ("sneaker", "colorful high-top sneaker, laces shaped like a bow"),
    ("balloon", "cluster of 3 balloons with happy faces, string tied in a bow"),
    ("birthday cupcake", "cupcake with sprinkles, single candle"),
    ("rocket_mini", "small cartoon rocket with flames and stars"),
    ("trophy", "gold trophy with star, ribbons"),
    ("diamond_gem", "giant sparkling diamond, rainbow refractions"),
    ("lightning_bolt", "cartoon lightning bolt with energy sparks"),
    ("rainbow_arc", "vibrant full rainbow with clouds at each end"),
]
for i, (subject, details) in enumerate(sticker_subjects):
    tasks.append({
        "name": f"sticker_{i+1:02d}_{subject.replace(' ','_')[:15]}",
        "prompt": STICKER_PROMPT.format(subject=subject, details=details),
        "model": "gemini-3.1-flash-image-preview",
        "size": "1024x1024",
        "folder": OUTPUT_DIR / "stickers"
    })

print(f"\n{'='*60}")
print(f"KIDS DRAWING GAME — Asset Generation Plan")
print(f"{'='*60}")
print(f"Total tasks: {len(tasks)}")
print(f"  Mascot:     1 (Pro model)")
print(f"  Splash:     1 (Pro model)")
print(f"  Coloring:  {len(coloring_subjects)} (Flash model)")
print(f"  Backgrounds: {len(backgrounds)} (Flash model)")
print(f"  Stickers:  {len(sticker_subjects)} (Flash model)")
print(f"{'='*60}")
print(f"Models: gemini-3-pro-image-preview + gemini-3.1-flash-image-preview")
print(f"Output: {OUTPUT_DIR}")
print(f"{'='*60}\n")

# ── Generate Assets ───────────────────────────────────

def generate_image(task, idx):
    task["folder"].mkdir(parents=True, exist_ok=True)
    
    print(f"  [{idx+1:3d}/{len(tasks)}] {task['name']} → {task['model']}")
    
    size = task.get("size", "1024x1024")
    import requests
    
    # Build request
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{task['model']}:generateContent?key={GEMINI_KEY}"
    
    payload = {
        "contents": [{
            "role": "user",
            "parts": [{"text": task["prompt"]}]
        }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "temperature": 0.7
        }
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=90)
        data = resp.json()
        
        if resp.status_code != 200:
            print(f"    ⚠️  HTTP {resp.status_code}: {data.get('error',{}).get('message','unknown')[:80]}")
            return False
        
        # Extract image bytes
        candidates = data.get("candidates", [])
        if not candidates:
            print(f"    ⚠️  No candidates returned")
            return False
            
        parts = candidates[0].get("content", {}).get("parts", [])
        for part in parts:
            if "image" in part:
                img_b64 = part["inlineData"]["data"]
                if img_b64:
                    img_bytes = base64.b64decode(img_b64)
                    out_path = task["folder"] / f"{task['name']}.png"
                    with open(out_path, "wb") as f:
                        f.write(img_bytes)
                    size_kb = len(img_bytes) / 1024
                    print(f"    ✅ {size_kb:.0f} KB → {out_path}")
                    return True
        
        # Check for text-only responses
        for part in parts:
            if "text" in part:
                print(f"    ⚠️  Text only (no image): {part['text'][:80]}...")
        print(f"    ⚠️  No image in response")
        return False
        
    except Exception as e:
        print(f"    ❌ Error: {str(e)[:80]}")
        return False

# Run with parallel workers
from concurrent.futures import ThreadPoolExecutor, as_completed

print(f"\n{'='*60}")
print(f"PARALLEL GENERATION: 3 workers, {len(tasks)} tasks")
print(f"{'='*60}\n")

successful = 0
failed = 0
completed = 0

def gen_wrapper(task_idx):
    idx = task_idx[0]
    task = task_idx[1]
    ok = generate_image(task, idx)
    return (idx, task['name'], ok)

with ThreadPoolExecutor(max_workers=3) as executor:
    future_to_task = {executor.submit(gen_wrapper, (i, tasks[i])): i for i in range(len(tasks))}
    for future in as_completed(future_to_task):
        idx, name, ok = future.result()
        completed += 1
        if ok:
            successful += 1
        else:
            failed += 1
        # Print progress
        if completed % 5 == 0:
            print(f"    [{completed}/{len(tasks)}] Progress: {successful} ✅ / {failed} ⚠️")

print(f"\n{'='*60}")
print(f"Done: {successful}/{len(tasks)} assets generated")
print(f"Failed: {failed}")
print(f"{'='*60}")
