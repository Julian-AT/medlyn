import argparse
import json
from pathlib import Path


def find_patient(data: Path, patient_id: str) -> dict:
    with (data / "index.jsonl").open() as index:
        for line in index:
            entry = json.loads(line)
            if entry["patientId"] != patient_id:
                continue
            with (data / entry["shard"]).open() as shard:
                for line_number, row in enumerate(shard):
                    if line_number == entry["line"]:
                        record = json.loads(row)
                        if record["patient"]["id"] != patient_id:
                            raise ValueError("Dataset index points to a different patient")
                        return record
            raise ValueError("Dataset index points beyond the shard")
    raise KeyError(f"Patient not found: {patient_id}")


def materialise(record: dict, out: Path):
    if out.exists() and any(out.iterdir()):
        raise FileExistsError(f"Materialisation destination must be empty: {out}")
    (out / "documents").mkdir(parents=True, exist_ok=True)

    def write(path, obj):
        path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")

    write(out / "patient.json", record["patient"])
    write(out / "documents.json", {"documents": [d["metadata"] for d in record["documents"]]})
    for document in record["documents"]:
        write(out / "documents" / f"{document['metadata']['id']}.json", document)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient", required=True)
    parser.add_argument("--data", type=Path, default=Path("data/synth-v1"))
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    record = find_patient(args.data, args.patient)
    materialise(record, args.out)
    print(
        json.dumps(
            {"patient": args.patient, "documents": len(record["documents"]), "out": str(args.out)}
        )
    )


if __name__ == "__main__":
    main()
