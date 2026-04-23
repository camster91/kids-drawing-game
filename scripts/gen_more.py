#!/usr/bin/env python3
"""Generate MORE drawing game assets: letters, numbers, seasonal, vehicles"""
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
        return (name, True, "cached")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.65, "responseModalities": ["TEXT", "IMAGE"]}
    }
    try:
        r = requests.post(url, json=payload, timeout=90)
        data = r.json()
        if r.status_code != 200:
            return (name, False, f"HTTP {r.status_code}")
        cand = data.get("candidates", [{}])[0]
        parts = cand.get("content", {}).get("parts", [])
        for part in parts:
            if "inlineData" in part:
                img = base64.b64decode(part["inlineData"]["data"])
                with open(out_path, "wb") as f:
                    f.write(img)
                return (name, True, f"{len(img)//1024}KB")
        return (name, False, "no image")
    except Exception as e:
        return (name, False, str(e)[:40])

TASKS = []

# A-Z Letter Tracing Guides
for letter in list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
    TASKS.append({
        "n": f"letter_{letter}", "m": "gemini-3.1-flash-image-preview",
        "p": f"Simple black and white line art letter '{letter}' coloring page for kids ages 3-6. Large bold uppercase letter '{letter}' filling the entire frame. Thick black outline (8px stroke), NO shading, NO gray, pure white background. Clean, simple, easy to trace with fingers. Giant friendly letter perfect for learning alphabet.",
        "f": OUT / "letters"
    })

# Numbers 0-9
for num in range(10):
    TASKS.append({
        "n": f"number_{num}", "m": "gemini-3.1-flash-image-preview",
        "p": f"Simple black and white line art number '{num}' coloring page for kids ages 3-6. Large bold number '{num}' filling the entire frame. Thick black outline (8px stroke), NO shading, NO gray, pure white background. Clean, simple, easy to trace. Friendly cartoon number with tiny smiley face.",
        "f": OUT / "numbers"
    })

# Seasonal stickers
seasonal = [
    ("pumpkin", "Cute kawaii Halloween pumpkin sticker. Big smile, tiny witch hat, autumn leaves around. Thick black outline, orange and green. Transparent/solid white background."),
    ("ghost", "Cute kawaii friendly Halloween ghost sticker. Smiling face, tiny boo sign, pastel white and light purple. Thick black outline. Transparent/solid white background."),
    ("snowman", "Cute kawaii winter snowman sticker. Carrot nose, coal buttons, cozy scarf, tiny hat. Thick black outline, white and blue. Transparent/solid white background."),
    ("christmas_tree", "Cute kawaii Christmas tree sticker. Colorful ornaments, star topper, wrapped presents underneath. Thick black outline, green and rainbow. Transparent/solid white background."),
    ("santa_hat", "Cute kawaii Santa hat sticker. Fluffy red hat with white trim and pom-pom, tiny bell. Thick black outline. Transparent/solid white background."),
    ("easter_egg", "Cute kawaii decorated Easter egg sticker. Pastel colors, zigzag stripes, tiny flowers pattern. Thick black outline. Transparent/solid white background."),
    ("bunny", "Cute kawaii Easter bunny sticker. Floppy ears, tiny carrot, pastel pink and white. Thick black outline. Transparent/solid white background."),
    ("fireworks", "Cute kawaii fireworks celebration sticker. Colorful bursts, stars, confetti. Thick black outline, bright rainbow colors. Transparent/solid white background."),
]
for name, prompt in seasonal:
    TASKS.append({"n": f"sticker_{name}", "m": "gemini-3.1-flash-image-preview", "p": prompt, "f": OUT / "seasonal"})

# Vehicle coloring pages
vehicles = [
    "a cartoon dump truck carrying colorful blocks",
    "a friendly cartoon train engine with smoke clouds",
    "a cartoon airplane with smiling face in the sky",
    "a cartoon submarine underwater with fish friends",
    "a cartoon tractor on a farm with barn in background",
    "a cartoon helicopter with a rescue basket"
]
for i, v in enumerate(vehicles):
    TASKS.append({
        "n": f"vehicle_{i+1:02d}", "m": "gemini-3.1-flash-image-preview",
        "p": f"Simple black and white line art coloring page for kids ages 4-8. Subject: {v}. Thick bold black outlines (5px stroke), NO shading, NO gradients, pure flat white background. Centered subject, large easy-to-color areas. No text. No watermark.",
        "f": OUT / "coloring-pages"
    })

# Extra reward/badges
badges = [
    ("badge_star", "Shiny gold star badge award sticker with ribbon. Premium quality, sparkling effect. Kids achievement badge. Thick black outline, gold and rainbow. Transparent/solid white background."),
    ("badge_heart", "Shiny ruby heart badge award sticker with ribbon. Premium quality, sparkling effect. Kids achievement badge. Thick black outline, red and gold. Transparent/solid white background."),
    ("badge_rainbow", "Shiny rainbow arch badge award sticker with stars. Premium quality. Kids achievement badge. Thick black outline, vivid rainbow. Transparent/solid white background."),
]
for name, prompt in badges:
    TASKS.append({"n": name, "m": "gemini-3.1-flash-image-preview", "p": prompt, "f": OUT / "badges"})

print(f"\n{'='*60}")
print(f"BATCH 2: {len(TASKS)} new assets")
print(f"  Letters A-Z: 26")
print(f"  Numbers 0-9: 10")
print(f"  Seasonal stickers: {len(seasonal)}")
print(f"  Vehicle coloring: {len(vehicles)}")
print(f"  Badge awards: {len(badges)}")
print(f"{'='*60}\n")

ok = failed = 0

def worker(t):
    return gen(t["n"], t["p"], t["m"], t["f"])

with ThreadPoolExecutor(max_workers=2) as ex:
    for future in as_completed({ex.submit(worker, t): t for t in TASKS}):
        name, success, msg = future.result()
        if success:
            ok += 1; print(f"  ✅ {name} ({msg})")
        else:
            failed += 1; print(f"  ⚠️  {name}: {msg}")
        time.sleep(0.5)

print(f"\nDONE: {ok}/{len(TASKS)} generated  |  Failed: {failed}")
