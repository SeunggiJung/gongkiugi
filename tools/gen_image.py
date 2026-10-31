"""Gemini 이미지 생성 헬퍼. 키는 .env 의 GEMINI_API_KEY 에서만 읽는다.

사용: py -3.12 tools/gen_image.py <out.png> <aspect> <prompt 파일>
"""
import base64
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL = "gemini-3.1-flash-image"


def api_key() -> str:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("GEMINI_API_KEY 가 .env 에 없음")


def generate(prompt: str, aspect: str = "9:16", refs: list[bytes] | None = None, image_size: str | None = None) -> bytes:
    parts = [
        {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(r).decode()}}
        for r in (refs or [])
    ]
    parts.append({"text": prompt})
    image_config = {"aspectRatio": aspect}
    if image_size:
        image_config["imageSize"] = image_size  # 대문자 K 필수 (예: "1K"). 512 는 값 문자열을 호출 쪽에서 시도해 확인한다.
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": image_config,
        },
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key()},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline:
                return base64.b64decode(inline["data"])
    raise RuntimeError("이미지 없음: " + json.dumps(data, ensure_ascii=False)[:500])


if __name__ == "__main__":
    out, aspect, pfile = sys.argv[1:4]
    png = generate(pathlib.Path(pfile).read_text(encoding="utf-8"), aspect)
    pathlib.Path(out).write_bytes(png)
    print("saved", out, len(png))
