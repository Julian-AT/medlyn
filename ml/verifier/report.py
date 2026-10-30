"""Render aggregate metrics without exporting claim or passage text."""


def write_markdown(report, path):
    lines = [
        "# Verifier results",
        "",
        f"Status: `{report['status']}`.",
        "",
        "Machine-measured research results. Rule labels are not human gold.",
        "",
        "| Set | Method | n | Macro-F1 | 95% bootstrap CI | ECE | Mean ms |",
        "| --- | --- | ---: | ---: | --- | ---: | ---: |",
    ]
    for suite, methods in report["sets"].items():
        for method, values in methods.items():
            interval = values["macroF1CI95"]
            ci = (
                f"{interval['low']:.3f} to {interval['high']:.3f}"
                if interval["low"] is not None
                else "unavailable"
            )
            ece = values["calibration"]["ece"]
            latency = values["latencyMs"]["mean"]
            cells = [
                suite,
                method,
                str(values["n"]),
                f"{values['macroF1']:.3f}",
                ci,
                "unavailable" if ece is None else f"{ece:.3f}",
                "unavailable" if latency is None else f"{latency:.1f}",
            ]
            lines.append("| " + " | ".join(cells) + " |")
    lines += [
        "",
        "Macro-F1 averages all three labels, including absent classes. Inspect class supports.",
        "Bootstrap resamples patients; a single-patient set uses claim resampling conditional on that patient, not population uncertainty.",
        "Confidence coverage and reliability bins are in results.json. Missing GPT confidence is unavailable, not zero ECE.",
        "Failures have automatic tags and are not independently annotated. Text-bearing exports stay in ignored runs/.",
    ]
    if report.get("v2TrainingStatus"):
        lines += [
            "",
            f"V2 training: {report['v2TrainingStatus']}.",
            f"Cascade: {report['cascadeStatus']}.",
        ]
    if report.get("cascade"):
        lines += [
            "",
            "| Set | Projected GPT calls saved | Share saved | Accuracy delta vs GPT |",
            "| --- | ---: | ---: | ---: |",
        ]
        lines.append(
            "Offline replay collects both predictions; live application call savings require the regression integration."
        )
        for name, values in report["cascade"].items():
            lines.append(
                f"| {name} | {values['gptCallsSaved']} | {values['shareSaved']:.3f} | {values['accuracyDeltaVsGpt']:.3f} |"
            )
    lines += [
        "",
        "Proxy tariffs and missing historical usage stay null; local energy cost is unmeasured.",
        "No real-regression or deployment-promotion result is implied.",
    ]
    path.write_text("\n".join(lines) + "\n")
