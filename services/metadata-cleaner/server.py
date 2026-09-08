#!/usr/bin/env python3
"""Private binary image metadata-cleaning service for Pinterest OS."""

from __future__ import annotations

import hmac
import json
import os
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("PORT", "8080"))
TOKEN = os.environ.get("METADATA_CLEANER_TOKEN", "")
MAX_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(20 * 1024 * 1024)))
COMMAND = os.environ.get("METADATA_CLEANER_COMMAND", "remove-ai-watermarks")

EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/heic": ".heic",
    "image/heif": ".heif",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "PinterestMetadataCleaner/1.0"

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} {format % args}", flush=True)

    def send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_json(404, {"ok": False, "error": "Not found"})
            return
        self.send_json(200, {"ok": True, "service": "metadata-cleaner"})

    def do_POST(self) -> None:
        if self.path != "/v1/strip-metadata":
            self.send_json(404, {"ok": False, "error": "Not found"})
            return
        expected = f"Bearer {TOKEN}"
        supplied = self.headers.get("Authorization", "")
        if not TOKEN or not hmac.compare_digest(supplied, expected):
            self.send_json(401, {"ok": False, "error": "Unauthorized"})
            return

        content_type = self.headers.get("Content-Type", "").split(";")[0].strip()
        extension = EXTENSIONS.get(content_type)
        if not extension:
            self.send_json(415, {"ok": False, "error": "Unsupported image type"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0 or content_length > MAX_BYTES:
            self.send_json(413, {"ok": False, "error": "Invalid image size"})
            return

        image = self.rfile.read(content_length)
        if len(image) != content_length:
            self.send_json(400, {"ok": False, "error": "Incomplete image body"})
            return

        try:
            with tempfile.TemporaryDirectory(prefix="pinterest-metadata-") as folder:
                source = Path(folder) / f"source{extension}"
                output = Path(folder) / f"clean{extension}"
                source.write_bytes(image)
                subprocess.run(
                    [
                        COMMAND,
                        "metadata",
                        str(source),
                        "--remove",
                        "--remove-all",
                        "-o",
                        str(output),
                    ],
                    check=True,
                    capture_output=True,
                    timeout=120,
                )
                cleaned = output.read_bytes()
        except subprocess.TimeoutExpired:
            self.send_json(504, {"ok": False, "error": "Metadata cleaning timed out"})
            return
        except (OSError, subprocess.CalledProcessError):
            self.send_json(502, {"ok": False, "error": "Metadata cleaning failed"})
            return

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(cleaned)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Metadata-Stripped", "true")
        self.end_headers()
        self.wfile.write(cleaned)


if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError("METADATA_CLEANER_TOKEN is required")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()
