"""Engine segmentation rules used to assign cross-language content identities."""

import re

from .normalise import utf16_len

ABBREVIATIONS = {
    "st.p.",
    "z.n.",
    "vd.a.",
    "v.a.",
    "li.",
    "re.",
    "bds.",
    "pat.",
    "dr.",
    "prim.",
    "diab.",
    "mell.",
    "z.b.",
    "ca.",
    "bzw.",
    "fr.",
    "hr.",
    "nr.",
    "i.v.",
    "s.c.",
    "i.m.",
    "tabl.",
    "art.",
    "a.",
    "aa.",
    "v.",
    "li.,",
    "re.,",
    "geb.",
    "lt.",
    "evtl.",
    "inkl.",
    "max.",
    "min.",
    "o.",
    "u.",
    "vs.",
    "ggf.",
    "zn.",
    "st.",
    "dd.",
    "rez.",
    "wg.",
    "gem.",
    "ventr.",
    "sin.",
}
BARE = {
    "Gesamtbeurteilung",
    "Befundzusammenfassung",
    "Zusammenfassung",
    "Laborbefund",
    "Diagnosen",
    "Allergien",
    "Anamnese",
    "Erhobene Befunde",
    "Labor",
    "Therapie und Verlauf",
    "Entlassungsmedikation",
    "Weiteres Procedere",
    "Verlauf",
    "Vitalparameter",
    "Befunde",
    "Mikroskopischer Befund",
    "Immunhistologisches Profil",
    "Diagnose",
}
INLINE = (
    "Gesamtbeurteilung",
    "Weiteres Procedere",
    "Procedere",
    "Zusammenfassung",
    "Befundzusammenfassung",
    "Interpretation",
    "Anamnese",
    "Diagnose",
    "Therapie",
)
HEADING = re.compile(r"^[^:]{2,100}:$")
PUNCTUATION = re.compile(r"[.!?](?=\s+\S)")


def sentence_bounds(line):
    bounds = []
    start = 0
    for match in PUNCTUATION.finditer(line):
        end = match.start() + 1
        token = re.split(r"\s+", line[:end])[-1].lower()
        if (
            token in ABBREVIATIONS
            or re.fullmatch(r"\d+\.", token)
            or re.fullmatch(r"[a-zäöü]\.", token, re.IGNORECASE)
        ):
            continue
        if match[0] == "." and line[end : end + 1] == ".":
            continue
        bounds.append((start, end))
        start = end
    bounds.append((start, len(line)))
    return [
        (s + len(line[s:e]) - len(line[s:e].lstrip()), s + len(line[s:e].rstrip()))
        for s, e in bounds
        if line[s:e].strip()
    ]


def segment_bounds(text: str) -> list[tuple[int, int]]:
    result = []
    section = None
    pending = None
    offset = 0

    def push(start, end):
        result.append((start, end))

    def flush():
        nonlocal pending
        if pending is None:
            return
        start, end = pending
        for lo, hi in sentence_bounds(text[start:end]):
            push(start + lo, start + hi)
        pending = None

    for line in text.split("\n"):
        line_start = offset
        offset += len(line) + 1
        trimmed = line.strip()
        if not trimmed:
            continue
        start = line_start + line.index(trimmed)
        end = start + len(trimmed)
        if HEADING.fullmatch(trimmed) or trimmed in BARE:
            flush()
            section = trimmed.removesuffix(":").strip()
            push(start, end)
            continue
        if section == "Entlassungsmedikation" and trimmed.startswith("Mit freundlichen Grüßen"):
            flush()
            section = None
        if section == "Entlassungsmedikation":
            push(start, end)
            continue
        inline = next(
            (
                name
                for name in INLINE
                if trimmed.startswith(name + ":") and len(trimmed) > len(name) + 1
            ),
            None,
        )
        if inline:
            flush()
            section = inline
            push(start, start + len(inline) + 1)
            content = start + len(inline) + 1
            lead = len(text[content:end]) - len(text[content:end].lstrip())
            for lo, hi in sentence_bounds(text[content + lead : end]):
                push(content + lead + lo, content + lead + hi)
            continue
        if re.match(
            r"^(?:Sehr geehrte|Wir berichten|Mit (?:freundlichen|kollegialen))",
            trimmed,
            re.IGNORECASE,
        ) and section in ("Diagnosen", "Allergien"):
            flush()
            section = None
        if section in ("Diagnosen", "Allergien"):
            push(start, end)
            continue
        previous = text[pending[0] : pending[1]] if pending else ""
        token = re.split(r"\s+", previous)[-1].lower()
        unfinished = previous and (not re.search(r"[.!?;]$", previous) or token in ABBREVIATIONS)
        continuation = (
            not re.match(r"^[^:]{1,90}:", trimmed)
            and not re.match(r"^Mit (?:freundlichen|kollegialen) Grüßen", previous)
            and (
                re.match(r"^[a-zäöü(]", trimmed)
                or previous.endswith(",")
                or token in ABBREVIATIONS
                or re.search(r"\b(?:von|vom|am|um|auf|mit|und|zu)\s*$", previous)
            )
        )
        if pending and unfinished and continuation:
            pending = (pending[0], end)
        else:
            flush()
            pending = (start, end)
    flush()
    if any(ord(char) > 0xFFFF for char in text):
        return [(utf16_len(text[:start]), utf16_len(text[:end])) for start, end in result]
    return result
