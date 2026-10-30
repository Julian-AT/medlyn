"""Cardinality-penalised evidence selection with Qiskit QUBOs and Aer QAOA."""

import itertools
import json
import re
import time

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit import ParameterVector
from qiskit_aer import AerSimulator
from qiskit_aer.primitives import SamplerV2
from qiskit_optimization import QuadraticProgram
from scipy.optimize import minimize

from .features import CACHE, ML, SEED, Embeddings, offline_vectors


def utility(bits, relevance, redundancy, weight=0.25):
    bits = np.asarray(bits)
    return float(
        bits @ relevance
        - weight
        * sum(
            redundancy[i, j] * bits[i] * bits[j]
            for i in range(len(bits))
            for j in range(i + 1, len(bits))
        )
    )


def qubo(relevance, redundancy, k=3, weight=0.25):
    n = len(relevance)
    if not 0 < k <= n or redundancy.shape != (n, n):
        raise ValueError("Invalid candidate count, cardinality or redundancy matrix")
    penalty = 1 + np.abs(relevance).sum() + weight * np.abs(np.triu(redundancy, 1)).sum()
    program = QuadraticProgram("synthetic-evidence")
    for i in range(n):
        program.binary_var(f"x{i}")
    program.minimize(
        constant=penalty * k * k,
        linear={f"x{i}": float(penalty * (1 - 2 * k) - relevance[i]) for i in range(n)},
        quadratic={
            (f"x{i}", f"x{j}"): float(2 * penalty + weight * redundancy[i, j])
            for i in range(n)
            for j in range(i + 1, n)
        },
    )
    return program


def brute_force(relevance, redundancy, k=3):
    n = len(relevance)
    candidates = []
    for selected in itertools.combinations(range(n), k):
        bits = np.zeros(n, dtype=int)
        bits[list(selected)] = 1
        candidates.append((utility(bits, relevance, redundancy), bits))
    return max(candidates, key=lambda pair: pair[0])


def greedy(relevance, redundancy, k=3):
    bits = np.zeros(len(relevance), dtype=int)
    for _ in range(k):
        remaining = np.flatnonzero(bits == 0)
        selected = max(remaining, key=lambda i: relevance[i] - 0.25 * redundancy[i] @ bits)
        bits[selected] = 1
    return utility(bits, relevance, redundancy), bits


def ansatz(program, p):
    operator, _ = program.to_ising()
    n = program.get_num_vars()
    parameters = ParameterVector("theta", 2 * p)
    circuit = QuantumCircuit(n)
    circuit.h(range(n))
    for layer in range(p):
        for pauli, coefficient in operator.to_list():
            qubits = [i for i, char in enumerate(reversed(pauli)) if char == "Z"]
            angle = 2 * float(coefficient.real) * parameters[2 * layer]
            if len(qubits) == 1:
                circuit.rz(angle, qubits[0])
            elif len(qubits) == 2:
                circuit.rzz(angle, *qubits)
        circuit.rx(2 * parameters[2 * layer + 1], range(n))
    return circuit


def solve(relevance, redundancy, p, seed=SEED, shots=4096, iterations=100):
    started = time.perf_counter()
    program = qubo(relevance, redundancy)
    n = len(relevance)
    states = ((np.arange(2**n)[:, None] >> np.arange(n)) & 1).astype(int)
    energies = np.array([program.objective.evaluate(bits) for bits in states])
    utilities = np.array([utility(bits, relevance, redundancy) for bits in states])
    feasible = states.sum(1) == 3
    optimal, _ = brute_force(relevance, redundancy)
    circuit = ansatz(program, p)
    backend = AerSimulator(method="statevector", max_parallel_threads=1)
    evaluation = circuit.copy()
    evaluation.save_statevector()
    compiled = transpile(evaluation, backend, optimization_level=1, seed_transpiler=seed)
    # Normalising the Hamiltonian keeps fixed search bounds comparable across instances.
    scale = max(abs(energies).max(), 1)

    def probabilities(theta):
        result = backend.run(compiled.assign_parameters(theta)).result()
        return np.abs(np.asarray(result.get_statevector())) ** 2

    def objective(theta):
        return float(probabilities(theta) @ energies / scale)

    rng = np.random.default_rng(seed)
    runs = [
        minimize(
            objective,
            rng.uniform(0, np.pi, 2 * p),
            method="COBYLA",
            options={"maxiter": iterations, "rhobeg": 0.3},
        )
        for _ in range(2)
    ]
    best = min(runs, key=lambda result: result.fun)
    probs = probabilities(best.x)
    measured = circuit.assign_parameters(best.x)
    measured.measure_all()
    sampler = SamplerV2(
        default_shots=shots, seed=seed, options={"backend_options": {"max_parallel_threads": 1}}
    )
    compiled_measured = transpile(measured, backend, seed_transpiler=seed)
    counts = sampler.run([compiled_measured]).result()[0].data.meas.get_counts()
    observed = [int(bits, 2) for bits in counts if feasible[int(bits, 2)]]
    mass = probs[feasible].sum()
    return {
        "p": p,
        "qubits": n,
        "shots": shots,
        "depth": compiled_measured.depth(),
        "seconds": time.perf_counter() - started,
        "objectiveEvaluations": int(sum(r.nfev for r in runs)),
        "feasibleProbability": float(mass),
        "optimalProbability": float(probs[feasible & np.isclose(utilities, optimal)].sum()),
        "conditionalExpectedRatio": float(probs[feasible] @ utilities[feasible] / mass / optimal)
        if mass and optimal > 0
        else None,
        "bestSampledRatio": float(max(utilities[i] for i in observed) / optimal)
        if observed and optimal > 0
        else None,
        "sampledOptimalProbability": sum(
            c
            for b, c in counts.items()
            if feasible[int(b, 2)] and np.isclose(utilities[int(b, 2)], optimal)
        )
        / shots,
        "optimizer": f"COBYLA, two seeded starts, {iterations} evaluations each, ideal Aer expectation",
    }


def instances(cache=CACHE, offline=False):
    path = ML / "data/sample/shards/part-0000.jsonl"
    rows = [json.loads(line) for line in path.read_text().splitlines()][:5]
    prepared, inputs = [], []
    for index, row in enumerate(rows):
        if not row["patient"]["id"].startswith("synth-"):
            raise ValueError("Synthetic samples only")
        facts = row["labels"]["facts"][: 8 + index % 3]
        query = " ".join(
            f["labelEn"] for f in facts if f["kind"] in ("diagnosis", "recommendation")
        )
        query = query or facts[0]["labelEn"]
        prepared.append((row["patient"]["id"], facts, query))
        inputs += [(query, "RETRIEVAL_QUERY")] + [
            (f["labelEn"], "RETRIEVAL_DOCUMENT") for f in facts
        ]
    vectors = offline_vectors(inputs) if offline else Embeddings(cache / "embeddings").many(inputs)
    output, cursor = [], 0
    for patient, facts, query in prepared:
        query_vector, vectors_fact = vectors[cursor], vectors[cursor + 1 : cursor + 1 + len(facts)]
        cursor += 1 + len(facts)
        tokens = set(re.findall(r"\w+", query.lower()))
        lexical = np.array(
            [
                len(tokens & set(re.findall(r"\w+", f["labelEn"].lower()))) / max(len(tokens), 1)
                for f in facts
            ]
        )
        relevance = 0.5 * lexical + 0.5 * np.clip(vectors_fact @ query_vector, 0, 1)
        redundancy = np.clip(vectors_fact @ vectors_fact.T, 0, 1)
        output.append(
            {
                "patientId": patient,
                "candidateIds": [f["id"] for f in facts],
                "relevance": relevance.tolist(),
                "redundancy": redundancy.tolist(),
            }
        )
    return output


def run(cache=CACHE, offline=False):
    output = []
    for index, instance in enumerate(instances(cache, offline=offline)):
        relevance, redundancy = np.array(instance["relevance"]), np.array(instance["redundancy"])
        started = time.perf_counter()
        exact, bits = brute_force(relevance, redundancy)
        exact_seconds = time.perf_counter() - started
        started = time.perf_counter()
        greedy_score, _ = greedy(relevance, redundancy)
        greedy_seconds = time.perf_counter() - started
        results = [solve(relevance, redundancy, p, seed=SEED + index) for p in (1, 2, 3)]
        output.append(
            {
                **instance,
                "exactUtility": exact,
                "exactIndices": np.flatnonzero(bits).tolist(),
                "exactSeconds": exact_seconds,
                "greedyRatio": greedy_score / exact,
                "greedySeconds": greedy_seconds,
                "qaoa": results,
            }
        )
        print(f"QAOA instance {index + 1}/5 complete", flush=True)
    return {
        "k": 3,
        "redundancyWeight": 0.25,
        "instances": output,
        "relevance": "Equal-weight token-overlap fraction and clipped embedding cosine; research surrogate",
        "embeddingModel": "offline-char-hashing-768" if offline else "gemini-embedding-2",
        "scope": "Five committed synthetic sample patients; no clinical selection pipeline",
    }
