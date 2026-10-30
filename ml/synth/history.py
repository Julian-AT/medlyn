import hashlib
import random
from datetime import date, timedelta

from .catalog import (
    DOC_TYPES,
    HELD_MUTATIONS,
    MEDICATIONS,
    MUTATIONS,
    SCENARIOS,
    STYLES,
)


def patient_rng(index: int, seed: int) -> random.Random:
    digest = hashlib.sha256(f"medlyn-synth-v1:{seed}:{index}".encode()).digest()
    return random.Random(int.from_bytes(digest[:16], "big"))


def make_history(index: int, seed: int) -> tuple[dict, dict, list[dict], dict]:
    rng = patient_rng(index, seed)
    split = "test" if index % 10 == 9 else "val" if index % 10 == 8 else "train"
    style = rng.randrange(4, 6) if split == "test" else rng.randrange(4)
    scenario = (
        rng.randrange(8, 10)
        if split == "test"
        else rng.randrange(6, 8)
        if split == "val"
        else rng.randrange(6)
    )
    sex = rng.choice(["female", "male"])
    given = rng.choice(
        ["Anna", "Eva", "Miriam", "Nora", "Sofia", "Petra", "Judith", "Lea"]
        if sex == "female"
        else ["Martin", "Felix", "Paul", "David", "Georg", "Lukas", "Simon", "Erik"]
    )
    surname = rng.choice(
        [
            "Waldner",
            "Falk",
            "Seebach",
            "Bergmann",
            "Lindner",
            "Auer",
            "Hain",
            "Winter",
            "Kern",
            "Stern",
        ]
    )
    patient = {
        "id": f"synth-{index:06d}",
        "name": f"{given} {surname}",
        "sex": sex,
        "dateOfBirth": date(
            rng.randint(1938, 1978), rng.randint(1, 12), rng.randint(1, 28)
        ).isoformat(),
    }
    conditions = set()
    if rng.random() < 0.55 or scenario == 0:
        conditions.add("diabetes")
    if rng.random() < (0.8 if "diabetes" in conditions else 0.45):
        conditions.add("hypertension")
    if rng.random() < (0.6 if "diabetes" in conditions else 0.3):
        conditions.add("dyslipidemia")
    if rng.random() < (0.4 if "hypertension" in conditions else 0.12):
        conditions.add("cad")
    if rng.random() < (0.3 if "cad" in conditions else 0.1) or scenario == 1:
        conditions.add("carotid")
    if rng.random() < 0.18 or scenario == 2:
        conditions.add("af")
    if rng.random() < (0.24 if "diabetes" in conditions else 0.06) or scenario == 3:
        conditions.add("ckd")
    for condition, probability in [
        ("copd", 0.18),
        ("sle", 0.05),
        ("osteoporosis", 0.22),
        ("gerd", 0.3),
    ]:
        if rng.random() < probability:
            conditions.add(condition)
    if scenario == 5:
        conditions.add("copd")
    if scenario == 6:
        conditions.add("sle")
    cancer = None
    if scenario in (4, 8) or rng.random() < 0.28:
        cancer = rng.choice(["breast", "colon", "lung"] if sex == "female" else ["colon", "lung"])
        conditions.add(cancer)
    if len(conditions) < 2:
        conditions.update(["hypertension", "gerd"])
    meds = [
        key
        for key in sorted(conditions)
        if key in MEDICATIONS and not (key == "cad" and "af" in conditions)
    ]
    if "diabetes" in conditions and "ckd" not in conditions and rng.random() < 0.3:
        meds.append("insulin")
    # Keep the simplified regimen away from severe renal impairment and dose-reduction boundaries.
    height = rng.randint(155, 188)
    weight = rng.randint(61, 109)
    start = date(2017, 1, 1) + timedelta(days=rng.randint(0, 1900))
    duration = rng.randint(183, 730)
    n_docs = rng.randint(3, 15)
    absent = {"urine_albumin", "foot_exam"}
    if rng.random() < 0.5:
        absent.add("family_history")
    if "ckd" not in conditions and rng.random() < 0.35:
        absent.add("kidney_function")
    if rng.random() < 0.2:
        absent.add("hba1c")
    if rng.random() < 0.2:
        absent.add("lipids")
    if "diabetes" not in conditions or rng.random() < 0.35:
        absent.add("eye_findings")
    planned = (start + timedelta(days=70)).isoformat()
    history = {
        "conditions": sorted(conditions),
        "medications": meds,
        "cancer": cancer,
        "cancerSide": rng.choice(["links", "rechts"]),
        "heightCm": height,
        "weightKg": weight,
        "hba1c": round(rng.uniform(6.2, 9.4), 1),
        "creatinine": round(
            rng.uniform(1.2, 1.6) if "ckd" in conditions else rng.uniform(0.65, 1.1), 2
        ),
        "egfr": rng.randint(46, 59) if "ckd" in conditions else rng.randint(72, 104),
        "ldl": rng.randint(64, 176),
        "ef": rng.randint(48, 65),
        "stenosis": rng.choice([35, 45, 55, 65, 75]),
        "absent": sorted(absent),
        "allergen": rng.choice(["Amoxicillin", "Diclofenac", "Jodhaltiges Kontrastmittel"]),
        "followupDue": planned,
        "followupCompleted": rng.random() < 0.6,
        "start": start.isoformat(),
        "end": (start + timedelta(days=duration)).isoformat(),
        "procedures": [
            {
                "name": "Cholezystektomie",
                "date": (start - timedelta(days=400)).isoformat(),
                "status": "done",
            }
        ],
        "hospitalStays": [
            {
                "admission": (start - timedelta(days=4)).isoformat(),
                "discharge": start.isoformat(),
                "department": "Innere Medizin",
            }
        ],
        "recommendations": [{"name": "Verlaufskontrolle", "dueDate": planned}],
    }
    kinds = ["outpatient", "duplex", "radiology", "holter", "bp"]
    if "eye_findings" not in absent:
        kinds.append("eye")
    if cancer:
        kinds += ["histology", "board", "oncology"]
    plan = []
    for ordinal in range(n_docs):
        kind = "internal" if ordinal == 0 else rng.choice(kinds)
        if ordinal == n_docs - 1:
            kind = "oncology" if cancer else "outpatient"
        day = start + timedelta(days=round(duration * ordinal / (n_docs - 1)))
        title, doc_type, department = DOC_TYPES[kind]
        plan.append(
            {
                "id": f"{patient['id']}-d{ordinal:02d}",
                "ordinal": ordinal,
                "kind": kind,
                "date": day.isoformat(),
                "title": title,
                "type": doc_type,
                "department": department,
                "states": [],
                "omits": sorted(absent),
                "paraphraseStyle": STYLES[style],
            }
        )
    mutations = []
    if rng.random() < 0.3:
        allowed = list(
            MUTATIONS if split == "test" else [m for m in MUTATIONS if m not in HELD_MUTATIONS]
        )
        mutations = rng.sample(allowed, rng.randint(1, 3))
    generation = {
        "seed": seed,
        "index": index,
        "split": split,
        "style": STYLES[style],
        "styleIndex": style,
        "scenario": SCENARIOS[scenario],
        "family": f"{STYLES[style]}:{SCENARIOS[scenario]}",
        "rewritten": False,
        "mutationTypes": mutations,
    }
    return patient, history, plan, generation
