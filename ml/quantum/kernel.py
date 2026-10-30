"""Exact simulator kernels, finite-shot cross-check and fixed classical baselines."""

import time

import numpy as np
from qiskit.circuit.library import zz_feature_map
from qiskit.primitives import StatevectorSampler
from qiskit_machine_learning.kernels import FidelityQuantumKernel, FidelityStatevectorKernel
from qiskit_machine_learning.state_fidelities import ComputeUncompute
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.svm import SVC

from .features import SEED


def feature_map(dimensions=8):
    return zz_feature_map(dimensions, reps=2, entanglement="full")


def exact_kernel(train, test):
    kernel = FidelityStatevectorKernel(feature_map=feature_map(train.shape[1]), shots=None)
    return kernel.evaluate(train), kernel.evaluate(test, train)


def sampled_kernel(features, shots=4096):
    fidelity = ComputeUncompute(StatevectorSampler(default_shots=shots, seed=SEED))
    return FidelityQuantumKernel(
        feature_map=feature_map(features.shape[1]), fidelity=fidelity, enforce_psd=False
    ).evaluate(features)


def alignment(matrix, labels):
    centered = matrix - matrix.mean(0) - matrix.mean(1)[:, None] + matrix.mean()
    y = 2 * np.asarray(labels, dtype=float) - 1
    target = np.outer(y - y.mean(), y - y.mean())
    denominator = np.linalg.norm(centered) * np.linalg.norm(target)
    return float(np.sum(centered * target) / denominator) if denominator else 0.0


def scores(y, predicted, patients, replicates=1000):
    y, predicted, patients = np.asarray(y), np.asarray(predicted), np.asarray(patients)
    rng = np.random.default_rng(SEED)
    groups = [np.flatnonzero(patients == patient) for patient in np.unique(patients)]
    boot = []
    for _ in range(replicates):
        indices = np.concatenate([groups[i] for i in rng.integers(len(groups), size=len(groups))])
        boot.append(
            [
                accuracy_score(y[indices], predicted[indices]),
                f1_score(
                    y[indices],
                    predicted[indices],
                    average="macro",
                    labels=[False, True],
                    zero_division=0,
                ),
            ]
        )
    ci = np.quantile(boot, [0.025, 0.975], axis=0)
    return {
        "accuracy": float(accuracy_score(y, predicted)),
        "macroF1": float(f1_score(y, predicted, average="macro", zero_division=0)),
        "accuracyCI95": ci[:, 0].tolist(),
        "macroF1CI95": ci[:, 1].tolist(),
        "bootstrap": {
            "unit": "patient",
            "replicates": replicates,
            "limitation": "Conditional on sampled generation families",
        },
    }


def run(features, metadata, cache):
    train, test = features["train"], features["test"]
    y_train, y_test = features["y_train"], features["y_test"]
    started = time.perf_counter()
    k_train, k_test = exact_kernel(train, test)
    kernel_seconds = time.perf_counter() - started
    models = {
        "quantum_fidelity": (SVC(kernel="precomputed", C=1), k_train, k_test),
        "rbf_svm": (SVC(kernel="rbf", C=1, gamma="scale"), train, test),
        "logistic": (LogisticRegression(C=1, max_iter=2000, random_state=SEED), train, test),
    }
    results = {}
    for name, (model, fit_x, predict_x) in models.items():
        started = time.perf_counter()
        model.fit(fit_x, y_train)
        predicted = model.predict(predict_x)
        elapsed = time.perf_counter() - started
        results[name] = {
            **scores(y_test, predicted, metadata["testPatients"]),
            "fitPredictSeconds": elapsed,
        }
    started = time.perf_counter()
    block_exact = FidelityStatevectorKernel(feature_map=feature_map()).evaluate(test[:16])
    block_sampled = sampled_kernel(test[:16])
    np.savez(
        cache / "kernels.npz",
        train=k_train,
        test_train=k_test,
        block_exact=block_exact,
        block_sampled=block_sampled,
    )
    offdiag = k_train[np.triu_indices(len(train), 1)]
    return {
        "models": results,
        "qubits": 8,
        "reps": 2,
        "circuitDepth": feature_map().depth(),
        "fullKernel": "FidelityStatevectorKernel, exact overlaps; equivalent ZZ fidelity",
        "kernelSeconds": kernel_seconds,
        "shots": None,
        "alignmentTrain": alignment(k_train, y_train),
        "minimumEigenvalue": float(np.linalg.eigvalsh(k_train).min()),
        "offDiagonal": {
            "mean": float(offdiag.mean()),
            "std": float(offdiag.std()),
            "median": float(np.median(offdiag)),
        },
        "sampledCheck": {
            "implementation": "FidelityQuantumKernel + ComputeUncompute + StatevectorSampler",
            "size": 16,
            "shots": 4096,
            "seconds": time.perf_counter() - started,
            "meanAbsoluteError": float(np.abs(block_exact - block_sampled).mean()),
        },
        "references": {
            "lora": {"status": "unavailable; no predictions on this exact frozen subset"},
            "gpt": {"status": "unavailable; no predictions on this exact frozen subset"},
        },
    }
