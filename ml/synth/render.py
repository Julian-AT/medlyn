import random
from datetime import date, timedelta

from .catalog import CONDITIONS, DIAGNOSES, GAP_CONCEPTS, INTROS, MEDICATIONS
from .history import make_history, patient_rng
from .identity import content_hash, refresh_fact_ids
from .normalise import normalise, utf16_len


def format_date(iso: str, variant: int = 0) -> str:
    day = date.fromisoformat(iso)
    return day.strftime(["%d.%m.%Y", "%d/%m/%Y", "%Y-%m-%d"][variant % 3])


def decimal(value) -> str:
    return str(value).replace(".", ",")


class Renderer:
    def __init__(self, patient_id: str, document_id: str, labels: dict):
        self.patient_id = patient_id
        self.document_id = document_id
        self.labels = labels
        self.lines = []
        self.offset = 0

    def line(
        self,
        text: str,
        kind=None,
        label=None,
        attrs=None,
        assertion="present",
        temporal="stated",
        event_date=None,
        due_date=None,
        needs=(),
    ) -> dict:
        text = normalise(text)
        start = self.offset
        end = start + utf16_len(text)
        self.lines.append(text)
        self.offset = end + 1
        passage = {"documentId": self.document_id, "start": start, "end": end}
        if kind:
            fact = {
                **passage,
                "segmentId": f"{self.document_id}-s{len(self.lines) - 1}",
                "kind": kind,
                "labelEn": label,
                "attrs": attrs or {},
                "assertion": assertion,
                "temporalStatus": temporal,
                "eventDate": event_date,
                "datePrecision": "day" if event_date else None,
                "dueDate": due_date,
                "quote": text,
                "needIds": list(needs),
            }
            fact["contentHash"] = content_hash(fact)
            fact_id = "f-" + fact["contentHash"][:16]
            fact["id"] = fact_id
            self.labels["facts"].append(fact)
            passage["factId"] = fact_id
        return passage

    def raw(self) -> str:
        return "<BR>".join(line.replace(">", "&gt;") for line in self.lines)


def medication(renderer, key: str, doc_date: str, schedule=None):
    generic, brand, atc, strength, route, usual, info = MEDICATIONS[key]
    schedule = usual if schedule is None else schedule
    list_label = f"Entlassungsmedikation {format_date(doc_date)}"
    quote = f"{brand} ({generic}) {strength} {route} {' '.join(schedule)} ST {info} ATC {atc}"
    attrs = {
        "generic": generic,
        "brand": brand,
        "atc": atc,
        "strength": strength,
        "unit": "ST",
        "route": route,
        "schedule": schedule,
        "scheduleText": info or None,
        "listLabel": "Entlassungsmedikation",
    }
    passage = renderer.line(
        quote, "medication", generic, attrs, temporal="ongoing", needs=("current_medication_list",)
    )
    return {**passage, "sourceLabel": list_label}


def add_mutations(renderer: Renderer, types: list[str], h: dict, day: str):
    for ordinal, mutation_type in enumerate(types):
        day_text = format_date(day)
        tomorrow = format_date((date.fromisoformat(day) + timedelta(days=1)).isoformat())
        options = {
            "side_flip": (
                f"Duplex vom {day_text}: die fokale Stenose liegt links und beträgt 55%.",
                f"Beurteilung derselben Duplexmessung vom {day_text}: die fokale Stenose liegt rechts und beträgt 55%.",
                "imaging",
                "Carotid stenosis",
                {"side": "links", "degree": "55%"},
                {"side": "rechts", "degree": "55%"},
                "Laterality differs for the explicitly identical duplex measurement.",
                "high",
            ),
            "dose_change": (
                f"Fixierte Einzelgabe am {day_text} um 08:00: Metoprolol 25 mg oral verabreicht.",
                f"Protokoll derselben Einzelgabe am {day_text} um 08:00: Metoprolol 50 mg oral verabreicht.",
                "medication",
                "Metoprolol single administration",
                {"strength": "25 mg"},
                {"strength": "50 mg"},
                "Two incompatible doses describe one explicitly identical administration, not consecutive lists.",
                "high",
            ),
            "date_shift": (
                f"Die einmalige Polypektomie wurde am {day_text} durchgeführt.",
                f"Die oben angeführte einmalige Polypektomie fand am {tomorrow} statt.",
                "procedure",
                "Polypectomy",
                {"date": day},
                {"date": (date.fromisoformat(day) + timedelta(days=1)).isoformat()},
                "The same one-off procedure has incompatible dates.",
                "medium",
            ),
            "assertion_flip": (
                f"Röntgenaufnahme vom {day_text}: Ein Pleuraerguss ist nachweisbar.",
                f"Beurteilung derselben Röntgenaufnahme vom {day_text}: Kein Pleuraerguss nachweisbar.",
                "imaging",
                "Pleural effusion",
                {},
                {},
                "Presence and explicit absence refer to the same radiograph.",
                "high",
            ),
            "bmi_mismatch": (
                f"Körpermaße am {day_text}: Größe {h['heightCm']} cm, Gewicht {h['weightKg']} kg.",
                f"BMI zu genau diesen Körpermaßen am {day_text}: {decimal(round(h['weightKg'] / (h['heightCm'] / 100) ** 2 + 7, 1))} kg/m².",
                "measurement",
                "Body mass index",
                {"height": h["heightCm"], "weight": h["weightKg"]},
                {
                    "value": decimal(round(h["weightKg"] / (h["heightCm"] / 100) ** 2 + 7, 1)),
                    "unit": "kg/m²",
                },
                "The reported BMI is seven units above weight / height squared; rounding cannot explain it.",
                "medium",
            ),
            "date_typo": (
                f"Ende dieses stationären Aufenthalts: {day_text}.",
                f"Entlassungsdatum desselben Aufenthalts: {day_text[:-4]}{day_text[-4:]}7.",
                "event",
                "Discharge",
                {"date": day},
                {"dateText": day_text[:-4] + day_text[-4:] + "7"},
                "The same discharge has a four-digit and a five-digit year.",
                "low",
            ),
            "schedule_change": (
                f"Verbindlicher Einnahmeplan am {day_text} für Bisoprolol 5 mg: 1 0 0 0 ST.",
                f"Zusammenfassung desselben Einnahmeplans am {day_text} für Bisoprolol 5 mg: 0 0 1 0 ST.",
                "medication",
                "Bisoprolol schedule",
                {"schedule": ["1", "0", "0", "0"]},
                {"schedule": ["0", "0", "1", "0"]},
                "Incompatible schedules explicitly describe one dated plan; no treatment change is stated.",
                "medium",
            ),
        }
        original, mutated, kind, label, original_attrs, mutated_attrs, explanation, severity = (
            options[mutation_type]
        )
        original_label = "Body measurements" if mutation_type == "bmi_mismatch" else label
        before = renderer.line(
            original,
            kind,
            original_label,
            original_attrs,
            temporal="given_once" if mutation_type == "dose_change" else "stated",
        )
        after = renderer.line(
            mutated,
            kind,
            label,
            mutated_attrs,
            assertion="negated" if mutation_type == "assertion_flip" else "present",
            temporal="given_once" if mutation_type == "dose_change" else "stated",
        )
        contradiction_id = f"{renderer.patient_id}-c{ordinal}"
        renderer.labels["mutations"].append(
            {
                "id": f"{renderer.patient_id}-m{ordinal}",
                "type": mutation_type,
                "documentId": renderer.document_id,
                "start": after["start"],
                "end": after["end"],
                "original": original,
                "mutated": mutated,
                "factId": after["factId"],
                "contradictionId": contradiction_id,
            }
        )
        renderer.labels["contradictions"].append(
            {
                "id": contradiction_id,
                "category": mutation_type,
                "severity": severity,
                "passages": [before, after],
                "explanation": explanation,
            }
        )


def general_facts(r: Renderer, h: dict, entry: dict, rng: random.Random, style: int):
    day = entry["date"]
    dated = format_date(day, style)
    r.line(
        ["Diagnosen:", "Diagnostische Übersicht:", "Problemliste:", "Begleiterkrankungen:"][
            style % 4
        ]
    )
    for key in h["conditions"]:
        de, en = CONDITIONS[key]
        r.line(
            DIAGNOSES[(style + rng.randrange(4)) % 4].format(condition=de),
            "diagnosis",
            en,
            {"conceptDe": de},
            temporal="ongoing",
            needs=("comorbidities",),
        )
    r.line("Allergien:")
    allergy = r.line(
        f"Bei {h['allergen']} kam es zu Hautausschlag und Schwindel.",
        "allergy",
        h["allergen"],
        {"allergen": h["allergen"], "reaction": "Hautausschlag und Schwindel"},
        needs=("allergies",),
    )
    r.line("Vitalparameter:")
    r.line(
        "Belastungsanamnese: Gehstrecke > 500 m ohne Unterbrechung.",
        "measurement",
        "Walking distance",
        {"value": "> 500", "unit": "m"},
        needs=("pain_mobility",),
    )
    height = r.line(
        f"Messung {dated}: Körpergröße {h['heightCm']} cm.",
        "measurement",
        "Height",
        {"value": h["heightCm"], "unit": "cm"},
        event_date=day,
    )
    weight = r.line(
        f"Messung {dated}: Körpergewicht {h['weightKg']} kg.",
        "measurement",
        "Weight",
        {"value": h["weightKg"], "unit": "kg"},
        event_date=day,
        needs=("weight_trend",),
    )
    bp = r.line(
        f"Sitzend gemessener Blutdruck {dated}: 138/84 mmHg.",
        "measurement",
        "Blood pressure",
        {"value": "138/84", "unit": "mmHg"},
        event_date=day,
    )
    r.line(
        f"Errechneter BMI bei dieser Messung: {decimal(round(h['weightKg'] / (h['heightCm'] / 100) ** 2, 1))} kg/m².",
        "measurement",
        "Body mass index",
        {"value": decimal(round(h["weightKg"] / (h["heightCm"] / 100) ** 2, 1)), "unit": "kg/m²"},
    )
    r.line("Laborbefund:")
    if "hba1c" not in h["absent"]:
        r.line(
            f"Labor vom {dated}: HbA1c {decimal(h['hba1c'])}%.",
            "lab",
            "HbA1c",
            {"value": decimal(h["hba1c"]), "unit": "%"},
            event_date=day,
            needs=("hba1c",),
        )
    if "kidney_function" not in h["absent"]:
        r.line(
            f"Labor vom {dated}: Kreatinin {decimal(h['creatinine'])} mg/dl; eGFR {h['egfr']} ml/min.",
            "lab",
            "Renal function",
            {"creatinine": decimal(h["creatinine"]), "egfr": h["egfr"]},
            event_date=day,
            needs=("kidney_function",),
        )
    if "lipids" not in h["absent"]:
        r.line(
            f"Nüchternlabor {dated}: LDL-Cholesterin {h['ldl']} mg/dl.",
            "lab",
            "LDL cholesterol",
            {"value": h["ldl"], "unit": "mg/dl"},
            event_date=day,
            needs=("lipids",),
        )
    if "family_history" not in h["absent"]:
        r.line(
            "Familienanamnese: Der Vater wurde wegen einer koronaren Herzerkrankung behandelt.",
            "family_history",
            "Paternal coronary disease",
            {"relative": "Vater", "condition": "koronare Herzerkrankung"},
            needs=("family_history",),
        )
    r.line("Weiteres Procedere:")
    if rng.random() < 0.25:
        r.line(
            "V.a. orthostatische Dysregulation; weitere Abklärung vorgesehen.",
            "diagnosis",
            "Orthostatic dysregulation",
            {"conceptDe": "orthostatische Dysregulation"},
            assertion="suspected",
            temporal="planned",
        )
    r.line(
        f"Verlaufskontrolle der Befunde bis {format_date(h['followupDue'])} empfohlen.",
        "recommendation",
        "Follow-up review",
        {"dueDate": h["followupDue"]},
        temporal="recommended",
        due_date=h["followupDue"],
        needs=("open_followups",),
    )
    r.line(
        f"St.p. Cholezystektomie am {format_date((date.fromisoformat(h['start']) - timedelta(days=400)).isoformat())}.",
        "procedure",
        "Cholecystectomy",
        {},
        assertion="historical",
        temporal="done",
        event_date=(date.fromisoformat(h["start"]) - timedelta(days=400)).isoformat(),
    )
    r.line("Entlassungsmedikation")
    r.line("Applikation mo mi ab na Einheit Info")
    medication_passages = {key: medication(r, key, day) for key in h["medications"]}
    r.line("Mit freundlichen Grüßen")
    return {
        "allergy": allergy,
        "height": height,
        "weight": weight,
        "bp": bp,
        "meds": medication_passages,
    }


def specialty(r: Renderer, h: dict, entry: dict, rng: random.Random):
    kind, day = entry["kind"], entry["date"]
    dated = format_date(day, entry["ordinal"])
    r.line("Erhobene Befunde:")
    if kind == "duplex":
        r.line(
            f"Duplex am {dated}: Plaquebildung bds.; Stenose rechts {h['stenosis']}%.",
            "imaging",
            "Carotid duplex",
            {"side": "rechts", "degree": f"{h['stenosis']}%"},
            event_date=day,
            needs=("carotid_stenosis",),
        )
    elif kind == "holter":
        finding = (
            "Paroxysmales Vorhofflimmern dokumentiert"
            if "af" in h["conditions"]
            else "Sinusrhythmus ohne Vorhofflimmern"
        )
        r.line(
            f"Langzeit-EKG am {dated}: {finding}; mittlere Frequenz 72/min.",
            "imaging",
            "Holter rhythm",
            {"finding": finding, "heartRate": 72},
            event_date=day,
        )
    elif kind == "bp":
        r.line(
            f"24h-Blutdruck am {dated}: Tagesmittel 132/80 mmHg.",
            "measurement",
            "Ambulatory blood pressure",
            {"value": "132/80"},
            event_date=day,
        )
    elif kind == "eye":
        r.line(
            f"Funduskontrolle am {dated}: Keine diabetische Retinopathie nachweisbar.",
            "diagnosis",
            "Diabetic retinopathy",
            {"conceptDe": "diabetische Retinopathie"},
            assertion="negated",
            event_date=day,
            needs=("eye_findings",),
        )
    elif kind in ("histology", "oncology", "board", "radiology") and h["cancer"]:
        cancer = h["cancer"]
        de, en = CONDITIONS[cancer]
        side = h["cancerSide"]
        r.line(
            f"Histologischer Befund vom {dated}: {de} {side}, mäßig differenziert, G2.",
            "histology",
            en,
            {"side": side, "grade": "G2"},
            event_date=day,
            needs=("histology_tnm",),
        )
        r.line(
            "Klassifikation des Tumors: cT2 cN0 cM0, G2.",
            "staging",
            "Tumour stage",
            {"tnm": "cT2 cN0 cM0", "grade": "G2"},
            needs=("histology_tnm",),
        )
        r.line(
            f"Bildgebung {dated}: Herd {side}, größte Ausdehnung 24 mm.",
            "imaging",
            "Tumour size",
            {"side": side, "value": 24, "unit": "mm"},
            event_date=day,
            needs=("tumour_size_location",),
        )
        if cancer == "breast":
            r.line(
                "Immunprofil: ER 85%, PR 60%, HER2 0, Ki-67 18%.",
                "receptor",
                "Breast receptor profile",
                {"er": "85%", "pr": "60%", "her2": "0", "ki67": "18%"},
                needs=("receptors_ki67",),
            )
        if kind == "board":
            r.line(
                f"Fallkonferenz vom {dated}: operative Abklärung empfohlen.",
                "recommendation",
                "Tumour board recommendation",
                {},
                temporal="recommended",
                event_date=day,
                needs=("tumour_board",),
            )
    elif kind == "radiology":
        r.line(
            f"Thoraxaufnahme vom {dated}: Kein fokales Infiltrat abgrenzbar.",
            "imaging",
            "Focal pulmonary infiltrate",
            {"conceptDe": "fokales Infiltrat"},
            assertion="negated",
            event_date=day,
        )
    else:
        r.line(
            f"Echokardiografie am {dated}: linksventrikuläre EF {h['ef']}%.",
            "imaging",
            "Ventricular ejection fraction",
            {"value": h["ef"], "unit": "%"},
            event_date=day,
        )
    if rng.random() < 0.2:
        r.line("Befundbesprechnung mit Rückfragen zur weiteren Terminvereinbarung erfolgt.")


def render_patient(index: int, seed: int = 20261030) -> dict:
    patient, history, plan, generation = make_history(index, seed)
    rng = patient_rng(index + 10_000_000, seed)
    labels = {key: [] for key in ("facts", "mutations", "contradictions", "distractors", "gaps")}
    documents = []
    baseline = None
    for entry in plan:
        r = Renderer(patient["id"], entry["id"], labels)
        r.line(entry["title"])
        r.line(
            f"{patient['name']}, geb. am {format_date(patient['dateOfBirth'])}",
            "demographic",
            "Date of birth",
            {"dateOfBirth": patient["dateOfBirth"]},
            event_date=patient["dateOfBirth"],
        )
        r.line(f"Dokumentdatum: {format_date(entry['date'])}")
        r.line(INTROS[generation["styleIndex"]])
        if entry["ordinal"] == 0:
            baseline = general_facts(r, history, entry, rng, generation["styleIndex"])
            # All clinical domains needed by the plan appear independently of document sampling.
            if history["cancer"]:
                specialty(r, history, {**entry, "kind": "oncology"}, rng)
            if "eye_findings" not in history["absent"]:
                specialty(r, history, {**entry, "kind": "eye"}, rng)
            add_mutations(r, generation["mutationTypes"], history, entry["date"])
        else:
            specialty(r, history, entry, rng)
        if entry["ordinal"] == len(plan) - 1:
            r.line("Verlauf:")
            last = r.line(
                f"Körpergewicht bei der heutigen Kontrolle: {history['weightKg'] - 3} kg.",
                "measurement",
                "Weight",
                {"value": history["weightKg"] - 3, "unit": "kg"},
                needs=("weight_trend",),
            )
            pairs = [("change_over_time", baseline["weight"], last)]
            last = r.line(
                f"Körpergröße bei neuer Messung: {history['heightCm'] + 1} cm.",
                "measurement",
                "Height",
                {"value": history["heightCm"] + 1, "unit": "cm"},
            )
            pairs.append(("measurement_variation", baseline["height"], last))
            last = r.line(
                "Blutdruck nach Ruhephase: 134/82 mmHg.",
                "measurement",
                "Blood pressure",
                {"value": "134/82"},
            )
            pairs.append(("measurement_variation", baseline["bp"], last))
            last = r.line(
                f"Allergieanamnese: {history['allergen']} mit Hautausschlag.",
                "allergy",
                history["allergen"],
                {"allergen": history["allergen"], "reaction": "Hautausschlag"},
            )
            pairs.append(("omission", baseline["allergy"], last))
            if "hypertension" in baseline["meds"]:
                r.line("Entlassungsmedikation")
                r.line("Applikation mo mi ab na Einheit Info")
                last = medication(r, "hypertension", entry["date"], ["1", "0", "1", "0"])
                r.line("Mit freundlichen Grüßen")
                pairs.append(("change_over_time", baseline["meds"]["hypertension"], last))
            if history["followupCompleted"]:
                r.line(
                    f"Die bis {format_date(history['followupDue'])} empfohlene Verlaufskontrolle erfolgte am {format_date(history['followupDue'])}.",
                    "event",
                    "Follow-up completed",
                    {},
                    temporal="done",
                    event_date=history["followupDue"],
                    needs=("open_followups",),
                )
            for ordinal, (kind, before, after) in enumerate(pairs):
                labels["distractors"].append(
                    {"id": f"{patient['id']}-x{ordinal}", "type": kind, "passages": [before, after]}
                )
        entry["states"] = [
            fact["id"] for fact in labels["facts"] if fact["documentId"] == entry["id"]
        ]
        documents.append(
            {
                "metadata": {
                    key: entry[key] for key in ("id", "title", "date", "type", "department")
                },
                "text": r.raw(),
            }
        )
    labels["gaps"] = [{"needId": need, "concept": GAP_CONCEPTS[need]} for need in history["absent"]]
    return refresh_fact_ids(
        {
            "patient": patient,
            "documents": documents,
            "labels": labels,
            "history": history,
            "documentationPlan": plan,
            "generation": generation,
        }
    )
