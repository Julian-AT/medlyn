"""Write bounded Parquet shards with stable schemas across empty and nested labels."""

from collections import Counter, defaultdict

import pyarrow as pa
import pyarrow.parquet as pq

LABEL_COLUMNS = ("facts", "mutations", "contradictions", "distractors", "gaps")
DOCUMENT = pa.struct(
    [(name, pa.string()) for name in ("id", "title", "date", "type", "department", "text")]
)
PATIENT_SCHEMA = pa.schema(
    [(name, pa.string()) for name in ("id", "family", "split")]
    + [("documents", pa.list_(DOCUMENT))]
    + [(name, pa.string()) for name in LABEL_COLUMNS]
)
VERIFIER_SCHEMA = pa.schema(
    [
        (name, pa.string())
        for name in (
            "patient_id",
            "family",
            "split",
            "source",
            "claim",
            "label",
            "assertion",
            "timing",
            "mutation",
            "document_id",
            "fact_id",
            "quote_hash",
            "passages",
            "messages",
        )
    ]
    + [("start", pa.int64()), ("end", pa.int64())]
)


class Shards:
    def __init__(self, folder, config, schema, shard_size=1000):
        if shard_size < 1:
            raise ValueError("Shard size must be positive")
        self.folder = folder
        self.config = config
        self.schema = schema
        self.shard_size = shard_size
        self.pending = defaultdict(list)
        self.counts = Counter()
        self.files = Counter()

    def add(self, row):
        split = row["split"]
        self.pending[split].append(row)
        self.counts[split] += 1
        if len(self.pending[split]) >= self.shard_size:
            self.flush(split)

    def flush(self, split):
        rows = self.pending[split]
        if not rows:
            return
        destination = self.folder / self.config / split
        destination.mkdir(parents=True, exist_ok=True)
        path = destination / f"part-{self.files[split]:05d}.parquet"
        pq.write_table(pa.Table.from_pylist(rows, schema=self.schema), path, compression="zstd")
        self.files[split] += 1
        rows.clear()

    def close(self):
        for split in tuple(self.pending):
            self.flush(split)
        return dict(self.counts)
