"""Frozen synthetic sampling and cached Gemini pair features."""

import argparse
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.preprocessing import MinMaxScaler

from verifier.integrity import file_hash, verify_frozen

ML = Path(__file__).resolve().parents[1]
CACHE = ML / "data/quantum"
MODEL = "gemini-embedding-2"
DIM = 768
SEED = 73


def load_environment():
    path = ML.parent / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            key, sep, value = line.partition("=")
            if sep and key.strip() in ("GEMINI_API_KEY", "IBM_QUANTUM_TOKEN"):
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def identity(row):
    return hashlib.sha256(json.dumps(row, sort_keys=True).encode()).hexdigest()


def sample_split(rows, count, seed=SEED):
    if count < 4 or count % 4:
        raise ValueError("Sample size must be a positive multiple of four")
    rng = np.random.default_rng(seed)
    selected = []
    for label, size in (
        ("supported", count // 2),
        ("unsupported", count // 4),
        ("contradicted", count // 4),
    ):
        candidates = [r for r in rows if r["label"] == label]
        if len(candidates) < size:
            raise ValueError(f"Insufficient synthetic {label} examples")
        selected.extend(candidates[i] for i in rng.permutation(len(candidates))[:size])
    return [selected[i] for i in rng.permutation(len(selected))]


def load_splits(data, train_count=400, test_count=200):
    frozen = verify_frozen(data)
    manifest = json.loads((data / "manifest.json").read_text())
    if manifest.get("dryRun") or manifest.get("version") != 2:
        raise ValueError("A real, frozen synthetic v2 dataset is required")
    groups = []
    for split, count in (("train", train_count), ("test", test_count)):
        rows = [
            json.loads(line) for line in (data / f"{split}.examples.jsonl").read_text().splitlines()
        ]
        for row in rows:
            assigned = manifest["assignment"].get(row["patientId"], {})
            if (
                row.get("source") != "synthetic"
                or not row["patientId"].startswith("synth-")
                or assigned.get("split") != split
                or assigned.get("family") != row["family"]
            ):
                raise ValueError("Non-synthetic or incorrectly assigned input rejected")
        groups.append(sample_split(rows, count))
    train, test = groups
    for key in ("patientId", "family"):
        if {r[key] for r in train} & {r[key] for r in test}:
            raise ValueError(f"Split overlap: {key}")
    if {identity([r["claim"], r["passages"]]) for r in train} & {
        identity([r["claim"], r["passages"]]) for r in test
    }:
        raise ValueError("Duplicate prompts cross splits")
    return (
        train,
        test,
        {
            "frozenTestHashes": frozen,
            "manifestHash": file_hash(data / "manifest.json"),
            "trainFileHash": file_hash(data / "train.examples.jsonl"),
        },
    )


def passage_text(row):
    return "\n".join(
        "\n".join(
            str(p.get(k) or "") for k in ("documentDate", "section", "before", "text", "after")
        )
        for p in row["passages"]
    )


def formatted(text, task):
    if task == "RETRIEVAL_DOCUMENT":
        return f"title: none | text: {text}"
    if task == "RETRIEVAL_QUERY":
        return f"task: search result | query: {text}"
    raise ValueError("Unknown retrieval task")


class Embeddings:
    def __init__(self, cache=CACHE / "embeddings", requests_per_minute=60):
        if not 1 <= requests_per_minute <= 60:
            raise ValueError("Embedding input budget must be between 1 and 60 per minute")
        self.cache = Path(cache)
        self.cache.mkdir(parents=True, exist_ok=True)
        self.interval = 60 / requests_per_minute
        self.next_request = 0.0

    def path(self, text, task):
        return self.cache / (identity([MODEL, DIM, "retrieval-prefix-v1", task, text]) + ".json")

    def many(self, inputs):
        missing = list(
            dict.fromkeys(
                (text, task) for text, task in inputs if not self.path(text, task).exists()
            )
        )
        for start in range(0, len(missing), 20):
            batch = missing[start : start + 20]
            body = {
                "requests": [
                    {
                        "model": f"models/{MODEL}",
                        "content": {"parts": [{"text": formatted(text, task)}]},
                        "outputDimensionality": DIM,
                    }
                    for text, task in batch
                ]
            }
            for attempt in range(4):
                time.sleep(max(0, self.next_request - time.monotonic()))
                self.next_request = time.monotonic() + len(batch) * self.interval + 0.1
                request = urllib.request.Request(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:batchEmbedContents",
                    data=json.dumps(body).encode(),
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": os.environ["GEMINI_API_KEY"],
                    },
                )
                try:
                    with urllib.request.urlopen(request, timeout=60) as response:
                        result = json.load(response)
                    break
                except urllib.error.HTTPError as error:
                    details = json.loads(error.read()).get("error", {})
                    daily = "per day" in details.get("message", "").lower()
                    if daily or error.code not in (429, 500, 502, 503, 504) or attempt == 3:
                        reason = "; daily quota exhausted" if daily else ""
                        raise RuntimeError(f"Gemini embedding HTTP {error.code}{reason}") from None
                    self.next_request = max(
                        self.next_request, time.monotonic() + 30 * (attempt + 1)
                    )
            values = result.get("embeddings", [])
            if len(values) != len(batch):
                raise ValueError("Embedding response count mismatch")
            for (text, task), value in zip(batch, values, strict=True):
                vector = unit(np.asarray(value["values"], dtype=float))
                if vector.shape != (DIM,):
                    raise ValueError("Embedding dimension mismatch")
                self.path(text, task).write_text(json.dumps(vector.tolist()))
            print(
                f"embedded {min(start + len(batch), len(missing))}/{len(missing)} new inputs",
                flush=True,
            )
        return np.array(
            [unit(np.asarray(json.loads(self.path(t, k).read_text()))) for t, k in inputs]
        )


def unit(values):
    norm = np.linalg.norm(values, axis=-1, keepdims=True)
    if not np.isfinite(values).all() or np.any(norm == 0):
        raise ValueError("Embedding must be finite and nonzero")
    return values / norm


def pair_features(claims, passages):
    claims, passages = unit(claims), unit(passages)
    return np.column_stack(
        ((claims * passages).sum(axis=1), claims * passages, np.abs(claims - passages))
    )


def reduce_features(train, test, dimensions=8):
    pca = PCA(n_components=dimensions, svd_solver="full")
    projected = pca.fit_transform(train)
    scaler = MinMaxScaler(feature_range=(0, np.pi), clip=True)
    return (
        scaler.fit_transform(projected),
        scaler.transform(pca.transform(test)),
        {
            "pcaVariance": pca.explained_variance_ratio_.tolist(),
            "fitSplit": "train",
            "testClipped": True,
        },
    )


def offline_vectors(inputs):
    encoder = HashingVectorizer(
        n_features=DIM, analyzer="char_wb", ngram_range=(3, 5), alternate_sign=False, norm="l2"
    )
    return encoder.transform([text for text, _ in inputs]).toarray()


def prepare(data, cache=CACHE, offline=False):
    train, test, provenance = load_splits(data)
    rows = train + test
    inputs = [(r["claim"], "RETRIEVAL_QUERY") for r in rows] + [
        (passage_text(r), "RETRIEVAL_DOCUMENT") for r in rows
    ]
    started = time.perf_counter()
    vectors = offline_vectors(inputs) if offline else Embeddings(cache / "embeddings").many(inputs)
    features = pair_features(vectors[: len(rows)], vectors[len(rows) :])
    x_train, x_test, transform = reduce_features(features[: len(train)], features[len(train) :])
    cache.mkdir(parents=True, exist_ok=True)
    np.savez(
        cache / "features.npz",
        train=x_train,
        test=x_test,
        y_train=[r["label"] == "supported" for r in train],
        y_test=[r["label"] == "supported" for r in test],
    )
    meta = {
        "seed": SEED,
        "featureHash": file_hash(cache / "features.npz"),
        "train": len(train),
        "test": len(test),
        "provenance": provenance,
        "embeddingModel": "offline-char-hashing-768" if offline else MODEL,
        "geminiStatus": "blocked_daily_quota_http_429" if offline else "complete",
        "embeddingDimensions": DIM,
        "taskEncoding": "Gemini 2 retrieval prefixes; taskType unsupported",
        "seconds": time.perf_counter() - started,
        "transform": transform,
        "trainIds": [identity(r) for r in train],
        "testIds": [identity(r) for r in test],
        "testPatients": [r["patientId"] for r in test],
        "testFamilies": [r["family"] for r in test],
    }
    (cache / "features.json").write_text(json.dumps(meta, indent=2) + "\n")
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline-features", action="store_true")
    parser.add_argument("--data", type=Path, default=ML / "verifier/runs/data-v2")
    args = parser.parse_args()
    load_environment()
    result = prepare(args.data, offline=args.offline_features)
    print(json.dumps({k: result[k] for k in ("train", "test", "seconds")}))


if __name__ == "__main__":
    main()
