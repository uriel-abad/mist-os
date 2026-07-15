from __future__ import annotations
import json
import re
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

for file in list((ROOT / "store/js").glob("*.js")) + list((ROOT / "admin/js").glob("*.js")):
    result = subprocess.run(["node", "--check", str(file)], capture_output=True, text=True)
    if result.returncode:
        errors.append(f"JS syntax: {file}: {result.stderr}")

code = (ROOT / "backend/apps-script/single-file/Code.gs").read_text(encoding="utf-8")
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as temp:
    temp.write(code)
    temp_path = temp.name
result = subprocess.run(["node", "--check", temp_path], capture_output=True, text=True)
if result.returncode:
    errors.append(f"Apps Script syntax: {result.stderr}")

for file in [ROOT / "store/data/products.json", ROOT / "backend/apps-script/appsscript.json"]:
    try:
        json.loads(file.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"JSON parse: {file}: {exc}")

class Inspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids: list[str] = []
        self.local_refs: list[str] = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get("id"):
            self.ids.append(data["id"])
        for key in ("src", "href"):
            value = data.get(key, "")
            if value and not value.startswith(("http://", "https://", "#", "mailto:", "tel:")):
                self.local_refs.append(value)

for html_file in [ROOT / "index.html", ROOT / "store/index.html", ROOT / "admin/index.html"]:
    inspector = Inspector()
    inspector.feed(html_file.read_text(encoding="utf-8"))
    duplicates = {item for item in inspector.ids if inspector.ids.count(item) > 1}
    if duplicates:
        errors.append(f"Duplicate IDs in {html_file}: {sorted(duplicates)}")
    for ref in inspector.local_refs:
        path = (html_file.parent / ref.split("?")[0]).resolve()
        if not path.exists():
            errors.append(f"Missing local reference in {html_file}: {ref}")

for css_file in list((ROOT / "store/css").glob("*.css")) + list((ROOT / "admin/css").glob("*.css")):
    text = css_file.read_text(encoding="utf-8")
    if text.count("{") != text.count("}"):
        errors.append(f"Unbalanced CSS braces: {css_file}")

required = {
    "name": 'document.getElementById("f-name")',
    "mobile": 'document.getElementById("f-mobile")',
    "email": 'document.getElementById("f-email")',
    "address": 'document.getElementById("f-address")',
    "notes": 'document.getElementById("f-notes")',
    "items": "MIST.cart.payloadItems()",
}
app = (ROOT / "store/js/app.js").read_text(encoding="utf-8")
for name, marker in required.items():
    if marker not in app:
        errors.append(f"Missing storefront payload field: {name}")

placeholders = []
for file in ROOT.rglob("*"):
    if file.is_file() and file.suffix.lower() in {".js", ".gs", ".html", ".md", ".json"}:
        text = file.read_text(encoding="utf-8", errors="ignore")
        if "PASTE_YOUR" in text and file != ROOT / "store/js/config.js" and file.name != "CONFIG.md" and file.name != "DEPLOYMENT.md" and file.name not in {"api.js", "utils.js"}:
            placeholders.append(str(file.relative_to(ROOT)))
if placeholders:
    errors.append(f"Undocumented placeholders: {placeholders}")

if errors:
    print("FAILED")
    for error in errors:
        print("-", error)
    raise SystemExit(1)
print("PASS: static checks completed")
