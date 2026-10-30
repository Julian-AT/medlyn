"""The engine's normalisation and checked-token rules, including UTF-16 offsets."""

import re

ENTITIES = dict(
    zip(
        [
            "gt",
            "lt",
            "quot",
            "apos",
            "nbsp",
            "amp",
            "auml",
            "ouml",
            "uuml",
            "Auml",
            "Ouml",
            "Uuml",
            "szlig",
            "deg",
            "micro",
            "frac12",
            "frac14",
            "frac34",
            "ndash",
            "mdash",
        ],
        [
            ">",
            "<",
            '"',
            "'",
            " ",
            "&",
            "ä",
            "ö",
            "ü",
            "Ä",
            "Ö",
            "Ü",
            "ß",
            "°",
            "µ",
            "½",
            "¼",
            "¾",
            "–",
            "—",
        ],
        strict=True,
    )
)
TOKEN = re.compile(r"<br\s*/?>|&(?:#x[\da-f]+|#\d+|[a-z][a-z\d]+);", re.IGNORECASE)
MONTHS = [
    r"jan(?:uary|uar)?",
    r"feb(?:ruary|ruar)?",
    r"mar(?:ch)?|maerz|märz",
    r"apr(?:il)?",
    r"may|mai",
    r"jun(?:e|i)?",
    r"jul(?:y|i)?",
    r"aug(?:ust)?",
    r"sep(?:tember)?",
    r"oct(?:ober)?|okt(?:ober)?",
    r"nov(?:ember)?",
    r"dec(?:ember)?|dez(?:ember)?",
]
MONTH_PATTERN = "|".join(f"(?:{m})" for m in MONTHS)
CHECKED = re.compile(
    r"\d{4}-\d{2}(?:-\d{2})?|\d+/\d+|\d+(?:\.\d+)?(?:mcg|mg|kg|ml|mmhg|mm|cm|iu|ie|g|l|%)?"
    r"|\b(?:left|right|bilateral)\b"
)


def normalise(raw: str) -> str:
    def replace(match):
        token = match[0]
        if token.startswith("<"):
            return "\n"
        entity = token[1:-1]
        if not entity.startswith("#"):
            return ENTITIES.get(entity, token)
        point = int("0" + entity[1:], 0) if entity[:2].lower() == "#x" else int(entity[1:])
        return chr(point) if 0 < point <= 0x10FFFF and not 0xD800 <= point <= 0xDFFF else token

    return TOKEN.sub(replace, raw)


def utf16_len(text: str) -> int:
    return len(text.encode("utf-16-le")) // 2


def span_text(text: str, start: int, end: int) -> str:
    return text.encode("utf-16-le")[start * 2 : end * 2].decode("utf-16-le")


def canonical(text: str) -> str:
    value = text.lower().replace("½", "1/2").replace("¼", "1/4").replace("¾", "3/4")
    value = re.sub(r"(\d),(?=\d)", r"\1.", value)
    value = re.sub(
        r"\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b",
        lambda m: f"{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}",
        value,
    )
    value = re.sub(r"\b(\d{1,2})/(\d{4})\b", lambda m: f"{m[2]}-{int(m[1]):02d}", value)

    def month(match):
        index = next(
            i
            for i, pattern in enumerate(MONTHS, 1)
            if re.fullmatch(pattern, match[2], re.IGNORECASE)
        )
        return f"{match[3]}-{index:02d}" + (f"-{int(match[1]):02d}" if match[1] else "")

    value = re.sub(
        rf"\b(?:(\d{{1,2}})\.?\s+)?({MONTH_PATTERN})\.?\s+(\d{{4}})\b",
        month,
        value,
        flags=re.IGNORECASE,
    )
    for pattern, replacement in [
        (r"\b(?:link(?:s|e|en|er|es|em)|left|li\.?)(?=\W|$)", " left "),
        (r"\b(?:recht(?:s|e|en|er|es|em)|right|re\.?)(?=\W|$)", " right "),
        (
            r"\b(?:beidseits|beidseitig(?:e|en|er|es|em)?|bilaterally|bilateral|bds\.?)(?=\W|$)",
            " bilateral ",
        ),
        (r"(\d)\s*(?:µg|μg|mcg|ug)\b", r"\1mcg"),
        (r"(\d)\s*(mg|kg|g|ml|l|mmhg|mm|cm|mcg|iu|ie|%)", r"\1\2"),
        (r"%\s*(?:ige[nrs]?|ig)\b", "%"),
        (r"\b(\d+)\s*(?:percent|prozent)\b", r"\1%"),
    ]:
        value = re.sub(pattern, replacement, value)
    return re.sub(r"\s+", " ", value).strip()


def strings(value):
    if isinstance(value, bool) or value is None:
        return []
    if isinstance(value, (str, int, float)):
        return [str(value)]
    if isinstance(value, dict):
        return [s for field in value.values() for s in strings(field)]
    if isinstance(value, (list, tuple)):
        return [s for field in value for s in strings(field)]
    return []


def checked_tokens(fields) -> set[str]:
    return {token for value in strings(fields) for token in CHECKED.findall(canonical(value))}


def schedule_checks(value, passage: str) -> bool:
    if isinstance(value, list):
        return all(schedule_checks(field, passage) for field in value)
    if not isinstance(value, dict):
        return True
    for key, field in value.items():
        if key != "schedule" or field is None:
            if not schedule_checks(field, passage):
                return False
            continue
        if (
            not isinstance(field, list)
            or len(field) != 4
            or not all(isinstance(x, str) for x in field)
        ):
            return False
        columns = [canonical(x) for x in field]
        if any(not re.fullmatch(r"(?:\d+(?:\.\d+|/\d+)?|st)", x) for x in columns):
            return False
        separator = r"(?:\s*(?:st|tabl\.?|tabletten?|dosen?)?\s*[-–|;]\s*|\s+(?:(?:st|tabl\.?|tabletten?|dosen?)\s+)?)"
        pattern = r"(?<![\w./])" + separator.join(map(re.escape, columns)) + r"(?![\w./])"
        if not re.search(pattern, canonical(passage)):
            return False
    return True


def missing_tokens(fields, passage: str) -> set[str]:
    tokens = checked_tokens({"passage": passage})
    for token in list(tokens):
        number = re.match(r"\d+(?:\.\d+)?(?=mcg|mg|kg|ml|mmhg|mm|cm|iu|ie|g|l|%)", token)
        if number:
            tokens.add(number[0])
        if re.fullmatch(r"\d{4}-\d{2}(?:-\d{2})?", token):
            tokens.update([token[:7], token[:4]])
    return checked_tokens(fields) - tokens
