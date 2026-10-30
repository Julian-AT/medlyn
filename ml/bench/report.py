"""Readable aggregate status without claims, passages, or error payloads."""


def value(number):
    return "pending" if number is None else f"{number:.4f}"


def display(metrics, key):
    if metrics[key] is None:
        status = metrics.get("metricStatus", {}).get(key, "")
        if status.startswith("undefined"):
            return "undefined"
        if status.startswith("not_applicable"):
            return "n/a"
    return value(metrics[key])


def markdown(report, path):
    lines = [
        "# Verifier benchmark",
        "",
        f"Run status: {report['status']}. Human measurement review: pending.",
        "",
        "No GPU or proxy result is implied by a dry run. Each suite has its own denominator.",
        "",
        "| Suite | System | N | Macro-F1 | Binary F1 | Balanced accuracy | Coverage |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for suite, methods in report["sets"].items():
        for name, metrics in methods.items():
            lines.append(
                f"| {suite} | {name} | {metrics['n']} | {display(metrics, 'macroF1')} | {display(metrics, 'binaryF1')} | {display(metrics, 'balancedAccuracy')} | {value(metrics['coverage'])} |"
            )
    lines += ["", "## System availability", ""]
    for name, entry in report["systems"].items():
        lines.append(f"- {name}: {entry['status']}.")
        for suite, meta in entry.get("suites", {}).items():
            if meta["status"] != "measured":
                lines.append(f"  - {suite}: {meta['status']}.")
    lines += ["", "## Limits", ""] + [f"- {item}." for item in report["limitations"]]
    lines += [
        "",
        "## Interpretation",
        "",
        "Bootstrap intervals and paired deltas are in the local benchmark JSON. Significance tests are exploratory and unadjusted; the centered bootstrap is approximate. Single-patient intervals are conditional on that patient. Held-out mutations are a subset of the family test set and are not independent evidence. Binary F1 treats supported as positive. Missing decisions count against recall and coverage. Binary F1 is undefined without supported references; balanced accuracy is undefined when either binary reference class is absent. Inspect class support before comparing macro-F1. Local probabilities are uncalibrated. Latency uses successful requests only; cache hits retain original timings. No measured result has been human-approved for the paper.",
        "",
        "Commands, model sources and publication review are in RUNBOOK.md.",
    ]
    start = next(i for i, line in enumerate(lines) if line.startswith("|"))
    end = start
    while end < len(lines) and lines[end].startswith("|"):
        end += 1
    table = [[cell.strip() for cell in line.strip("|").split("|")] for line in lines[start:end]]
    content = [table[0], *table[2:]]
    widths = [max(3, *(len(row[i]) for row in content)) for i in range(len(table[0]))]

    def formatted(row):
        cells = [
            cell.rjust(widths[i]) if i >= 2 else cell.ljust(widths[i]) for i, cell in enumerate(row)
        ]
        return "| " + " | ".join(cells) + " |"

    separator = [
        "-" * (width - 1) + ":" if i >= 2 else "-" * width for i, width in enumerate(widths)
    ]
    lines[start:end] = [
        formatted(content[0]),
        formatted(separator),
        *(formatted(row) for row in content[1:]),
    ]
    path.write_text("\n".join(lines) + "\n")
