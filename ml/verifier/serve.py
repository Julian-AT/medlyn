"""Serve one local adapter on loopback; inference is deliberately serial on the GPU."""

import argparse
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

from .common import VERIFIER_DIR
from .model import BASE, Verifier, validate_request


def handler_for(verifier):
    class Handler(BaseHTTPRequestHandler):
        def reply(self, status, payload):
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            self.reply(
                200 if self.path == "/health" else 404,
                {"ready": True} if self.path == "/health" else {"error": "Not found"},
            )

        def do_POST(self):
            if self.path != "/verify":
                self.reply(404, {"error": "Not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 32000:
                    raise ValueError("Invalid request length")
                claim, passages = validate_request(json.loads(self.rfile.read(length)))
                self.reply(200, verifier.verify(claim, passages))
            except (ValueError, TypeError) as error:
                self.reply(400, {"error": str(error)})
            except (RuntimeError, OSError, MemoryError) as error:
                # No patient text in errors or access logs.
                self.log_error("Inference failed: %s", type(error).__name__)
                self.reply(503, {"error": "Local inference unavailable"})

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=BASE)
    parser.add_argument("--adapters", type=str, default=str(VERIFIER_DIR / "adapters"))
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    from pathlib import Path

    verifier = Verifier(args.model, Path(args.adapters))
    server = HTTPServer(("127.0.0.1", args.port), handler_for(verifier))
    server.timeout = 30
    print(f"Verifier listening on http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
