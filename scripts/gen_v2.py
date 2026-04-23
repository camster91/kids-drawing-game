#!/usr/bin/env python3
"""Kids Drawing Game — Creative Asset Generation Pipeline"""
import os, sys, json, base64, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_KEY:
    print("ERROR: Set GEMINI_API_KEY env var")
    sys.exit(1)

OUT = Path.home() / "kids-drawing-game" / "assets" / "generated"
OUT.mkdir(parents=True, exist_ok=True)

def gen(name: str, prompt: str, model: str, folder: Path):
    folder.mkdir(parents=True, exist_ok=True)
    out_path = folder / f"{name}.png"
    if out_path.exists():
        return (name, True, "already cached")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.65, "responseModalities": ["TEXT", "IMAGE"]}
    }
    try:
        r = requests.post(url, json=payload, timeout=90)
        data = r.json()
        if r.status_code != 200:
            return (name, False, f"HTTP {r.status_code}: {data.get('error',{}).get('message','')[:60]}")

        cand = data.get("candidates", [{}])[0]
        parts = cand.get("content", {}).get("parts", [])
        for part in parts:
            if "inlineData" in part:
                img = base64.b64decode(part["inlineData"]["data"])
                with open(out_path, "wb") as f:
                    f.write(img)
                return (name, True, f"{len(img)//1024}KB")
            elif "text" in part:
                return (name, False, f"text-only: {part['text'][:80]}")
        return (name, False, "no image or text in parts")
    except Exception as e:
        return (name, False, f"err: {str(e)[:60]}")

TASKS = []

# ── Mascot (Pro) ──
TASKS.append({
    "n": "mascot_doodle", "m": "gemini-3-pro-image-preview",
    "p": "Cute cartoon mascot for a children's drawing app. A friendly colorful blob creature named Doodle with big sparkling eyes, tiny smile, holding a rainbow paintbrush. Wearing a tiny red beret. Soft pastel rainbow gradient body (pink orange yellow green blue purple). Kawaii/cute art style, rounded soft edges, Pixar-inspired adorable proportions. Soft pastel gradient background (lavender to sky blue), scattered white stars and colorful paint splatters. Digital illustration, vibrant colors, premium quality, center-framed, isolated subject.",
    "f": OUT / "mascot"
})

# ── Splash (Pro) ──
TASKS.append({
    "n": "splash_hero", "m": "gemini-3-pro-image-preview",
    "p": "Hero splash screen art for \"Kids Drawing Game\" app. A magical creative world scene: crayons, paintbrushes, and colored pencils coming alive as tiny characters. Center: a cute rainbow blob creature happily drawing on a giant floating canvas with paint splatters in the air. Atmosphere: sparkles, rainbow paint droplets, floating gold stars, magic dust swirls. Warm dreamy lighting. Vibrant children's illustration style, Pixar-esque warmth, rich saturated colors. Digital painting. 16:9 landscape composition. Ultra-detailed premium quality. Title text at top in big playful rounded bubbly rainbow letters: \"KIDS DRAWING\".",
    "f": OUT / "splash"
})

# ── Coloring pages (Flash, fast) ──
SUBJECTS = [
    "a friendly cartoon lion with a big fluffy mane", "a cute jumping dolphin with a splash",
    "a cartoon rocket ship blasting off with stars", "a 3-tier birthday cake with candles",
    "a teddy bear sitting with a bow tie", "a colorful butterfly with patterned wings",
    "a pirate ship with sails and a flag", "a fairy princess with a wand and crown",
    "a friendly cartoon T-Rex dinosaur", "a red fire truck with ladder",
    "a magical unicorn with a rainbow mane", "a cute baby penguin on ice"
]
for i, s in enumerate(SUBJECTS):
    TASKS.append({
        "n": f"coloring_{i+1:02d}", "m": "gemini-3.1-flash-image-preview",
        "p": f"Simple black and white line art coloring page for kids ages 4-8. Subject: {s}. Thick bold black outlines (5px stroke), NO shading, NO gradients, NO gray tones, pure flat white background. Centered subject filling 70% of frame. Simple recognizable shapes. Clean crisp lines. NO text. NO watermark. Large areas to color. Vector-quality line art.",
        "f": OUT / "coloring-pages"
    })

# ── Backgrounds (Flash) ──
BGS = [
    ("bg_underwater", "Underwater coral reef scene for kids app. Friendly clownfish, sea turtles, seaweed, starfish, bubbles. Soft teal and aqua with coral pink accents. Watercolor-style digital art, dreamy magical mood. No characters, no text."),
    ("bg_space", "Outer space scene for kids app. Colorful planets, twinkling stars, gentle nebulas, small friendly rockets. Deep purple and navy with bright orange and cyan accents. Soft dreamy digital painting. No characters, no text."),
    ("bg_forest", "Enchanted forest scene for kids app. Tall friendly trees, mushrooms with spots, butterflies, rainbow flowers, sunbeams through canopy. Emerald green, sky blue, dandelion yellow. Soft watercolor style. No characters, no text."),
    ("bg_candy_land", "Candy land scene for kids app. Candy cane trees, gumdrop hills, lollipop flowers, chocolate river. Hot pink, mint green, lemon yellow, sky blue. Soft pastel digital art. No characters, no text."),
    ("bg_cloud_castle", "Sky castle scene for kids app. Fluffy white clouds forming castle shapes, rainbow bridge, flying birds, golden sun. Soft blue and white with pastel rainbow. Gentle watercolor style. No characters, no text."),
    ("bg_jungle", "Tropical jungle scene for kids app. Big tropical leaves, colorful parrots, banana trees, waterfall. Lime green, turquoise, mango orange. Soft vibrant digital painting. No characters, no text."),
]
for name, prompt in BGS:
    TASKS.append({"n": name, "m": "gemini-3.1-flash-image-preview", "p": prompt, "f": OUT / "backgrounds"})

# ── Stickers (Flash) ──
STICKERS = [
    ("sticker_01_sun", "Cute kawaii happy sun sticker. Big smile, cool sunglasses, golden rays like arms. Thick black outline, flat vibrant yellow/orange colors. Transparent/solid white background."),
    ("sticker_02_moon", "Cute kawaii sleepy crescent moon sticker. Smiling face with closed eyes wearing a nightcap. Tiny stars around. Thick black outline, pastel yellow/blue. Transparent/solid white background."),
    ("sticker_03_cloud", "Cute kawaii rain cloud sticker. Cheerful cloud face with rainbow underneath and rain drops. Thick black outline, soft blue/pastel colors. Transparent/solid white background."),
    ("sticker_04_pizza", "Cute kawaii happy pizza slice sticker. Smiling face, pepperoni hearts, melting cheese drip. Thick black outline, warm red/yellow/orange. Transparent/solid white background."),
    ("sticker_05_icecream", "Cute kawaii triple-scoop ice cream cone sticker. Smiling faces on scoops, waffle cone pattern, cherry on top. Thick black outline, pastel rainbow colors. Transparent/solid white background."),
    ("sticker_06_robot", "Cute kawaii friendly robot buddy sticker. Small rounded robot with antenna, big eyes, heart on chest panel. Thick black outline, silver and rainbow accent colors. Transparent/solid white background."),
    ("sticker_07_wand", "Cute kawaii magic wand sticker. Golden star tip with rainbow sparkle trail, handle wrapped with ribbon. Thick black outline, gold and rainbow shimmer. Transparent/solid white background."),
    ("sticker_08_crown", "Cute kawaii golden crown sticker. Jewels in rainbow colors, tiny sparkles, velvet cushion. Thick black outline, gold and jewel tones. Transparent/solid white background."),
    ("sticker_09_music", "Cute kawaii dancing music notes sticker. Two eighth notes holding hands, happy faces, musical staff lines. Thick black outline, rainbow pastel colors. Transparent/solid white background."),
    ("sticker_10_bike", "Cute kawaii bicycle sticker. Simple cute bike with flower basket, two big wheels, streamers. Thick black outline, bright rainbow colors. Transparent/solid white background."),
    ("sticker_11_balloon", "Cute kawaii cluster of 3 balloons sticker. Each balloon has a happy face, tied together with a big bow, floating upward. Thick black outline, primary rainbow colors. Transparent/solid white background."),
    ("sticker_12_cupcake", "Cute kawaii birthday cupcake sticker. Sprinkles, single lit candle with flame, frosting swirl. Thick black outline, pastel pink and white. Transparent/solid white background."),
    ("sticker_13_trophy", "Cute kawaii gold trophy sticker. Big gold cup with star emblem, colorful ribbons, sparkles. Thick black outline, gold and rainbow. Transparent/solid white background."),
    ("sticker_14_gem", "Cute kawaii sparkling diamond gem sticker. Giant faceted diamond with rainbow refractions, sparkle stars. Thick black outline, bright rainbow crystal colors. Transparent/solid white background."),
    ("sticker_15_lightning", "Cute kawaii cartoon lightning bolt sticker. Yellow lightning with face and tiny sparks around it. Thick black outline, bright yellow and gold. Transparent/solid white background."),
    ("sticker_16_rainbow", "Cute kawaii full rainbow sticker. Vibrant 7-color arc with fluffy clouds at each end, both clouds smiling. Thick black outline, bright saturated rainbow. Transparent/solid white background."),
    ("sticker_17_cookie", "Cute kawaii chocolate chip cookie sticker. Round cookie with chocolate chunks as eyes, bite taken out showing soft inside. Thick black outline, warm brown and tan. Transparent/solid white background."),
    ("sticker_18_glasses", "Cute kawaii round sunglasses sticker. Big round pink-tinted lenses, tiny star reflection, glossy frame. Thick black outline, pink and black. Transparent/solid white background."),
]
for name, prompt in STICKERS:
    TASKS.append({"n": name, "m": "gemini-3.1-flash-image-preview", "p": prompt, "f": OUT / "stickers"})

print(f"\n{'='*65}")
print(f"KIDS DRAWING GAME — Asset Generation")
print(f"Tasks: {len(TASKS)}  |  Pro: 2  |  Flash: {len(TASKS)-2}")
print(f"{'='*65}\n")

ok = failed = done = 0
RESULTS = []

def worker(t):
    return gen(t["n"], t["p"], t["m"], t["f"])

with ThreadPoolExecutor(max_workers=2) as ex:
    for future in as_completed({ex.submit(worker, t): t for t in TASKS}):
        name, success, msg = future.result()
        done += 1
        if success:
            ok += 1
            print(f"  ✅ {name} ({msg})")
        else:
            failed += 1
            print(f"  ⚠️  {name}: {msg}")
        if done % 5 == 0:
            print(f"    ── [{done}/{len(TASKS)}]  {ok} OK | {failed} Failed ──")

print(f"\n{'='*65}")
print(f"DONE: {ok}/{len(TASKS)} assets generated  |  Failed: {failed}")
print(f"Output: {OUT}")
print(f"{'='*65}")
