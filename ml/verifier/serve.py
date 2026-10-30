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
    parser.add_argument("--policy", type=str)
    parser.add_argument("--selection", type=str)
    args = parser.parse_args()
    from pathlib import Path

    if args.selection:
        selection_path = Path(args.selection)
        selection = json.loads(selection_path.read_text())
        winner = selection.get("winner")
        if selection.get("selectionSplit") != "valid" or not winner:
            raise ValueError("No completed validation-selected adapter")
        args.model = winner["model"]
        args.adapters = str(selection_path.parent / winner["id"] / "adapters")
    verifier = Verifier(args.model, Path(args.adapters))
    if args.policy:
        from .artifacts import model_identity
        from .statistics import scaled

        policy = json.loads(Path(args.policy).read_text())
        identity = model_identity(args.model, Path(args.adapters))
        if policy.get("verifierIdentity") != identity or policy.get("selectionSplit") != "valid":
            raise ValueError("Policy is not bound to this model and validation split")
        raw_verify = verifier.verify

        def calibrated_verify(claim, passages):
            result = raw_verify(claim, passages)
            probabilities = scaled(result["probabilities"], policy["temperature"])
            return {
                **result,
                "probabilities": probabilities,
                "probability": probabilities[result["label"]],
                "probabilityKind": "temperature_scaled_closed_set_score",
                "verifierIdentity": identity,
                "calibrationTemperature": policy["temperature"],
                "calibrationValidationSha256": policy["validationSha256"],
            }

        verifier.verify = calibrated_verify
    server = HTTPServer(("127.0.0.1", args.port), handler_for(verifier))
    server.timeout = 30
    print(f"Verifier listening on http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
