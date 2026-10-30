"""Unknown tariffs, hardware amortisation and energy remain unmeasured."""


def costs(rows, proxy=False, input_rate=None, output_rate=None):
    known = [r for r in rows if isinstance(r.get("usage"), dict)]
    prompt = sum(r["usage"].get("prompt_tokens", 0) for r in known)
    completion = sum(r["usage"].get("completion_tokens", 0) for r in known)
    usd = (
        (prompt * input_rate + completion * output_rate) / 1e6
        if proxy
        and rows
        and len(known) == len(rows)
        and input_rate is not None
        and output_rate is not None
        else None
    )
    return {
        "inputTokens": prompt,
        "outputTokens": completion,
        "usageCoverage": len(known) / len(rows) if rows else 0,
        "apiUsdPer1000Claims": usd * 1000 / len(rows)
        if usd is not None
        else (0 if not proxy else None),
        "localComputeUsdPer1000Claims": None,
        "cacheHits": sum(r.get("cacheHit", False) for r in rows),
        "inputUsdPerMillion": input_rate if proxy else None,
        "outputUsdPerMillion": output_rate if proxy else None,
    }
