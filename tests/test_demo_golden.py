"""Demo golden lock — retailer-scorecard-renegotiation-simulator.

The deployed simulator renders committed JSON in frontend/public/json/. This
locks its content (canonical-serialized SHA-256, stable across line endings) so
the client-mode conversion — purely additive (a new client_mode.py; nothing here
regenerates the JSON) — cannot drift the published site or its numbers. The
engine itself is separately pinned by tests/test_cost_model.py against the
committed fixtures.

If the SHA moves, STOP: a demo golden moved.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "frontend" / "public" / "json"

GOLDEN = {"retailers": "6a9b01e986b8d264597f76dd4e736d2b392a9751e4516a934b2683f9cc8a9613"}


def test_demo_retailers_json_content_unchanged():
    data = json.loads((DATA / "retailers.json").read_text(encoding="utf-8"))
    blob = json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
    digest = hashlib.sha256(blob).hexdigest()
    assert digest == GOLDEN["retailers"], (
        f"retailers.json content changed (sha256 {digest} != golden {GOLDEN['retailers']}). "
        "A demo golden moved — STOP and report before re-baselining."
    )
