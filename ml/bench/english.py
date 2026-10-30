"""Existing translations require the complete cited context, without dropping evidence."""

from copy import deepcopy


def existing_translation(row):
    value = deepcopy(row)
    for passage in value["passages"]:
        if not passage.get("textEn"):
            return None
        if passage.get("section") and not passage.get("sectionEn"):
            return None
        for key in ("before", "after"):
            original = passage.get(key, [])
            translated = passage.get(key + "En", [])
            if (
                not isinstance(translated, list)
                or len(translated) != len(original)
                or any(not isinstance(v, str) or not v.strip() for v in translated)
            ):
                return None
            passage[key] = translated
        passage["text"] = passage["textEn"]
        passage["section"] = passage.get("sectionEn")
    value.update(language="en", inputCondition="existing_english_translation")
    return value
