import itertools

import numpy as np

from quantum.qaoa import brute_force, greedy, qubo, solve, utility


def test_qubo_bruteforce_matches_hand_checked_instance():
    relevance = np.array([1.0, 0.9, 0.8, 0.1])
    redundancy = np.eye(4)
    redundancy[0, 1] = redundancy[1, 0] = 1
    score, selected = brute_force(relevance, redundancy)
    assert np.array_equal(selected, [1, 1, 1, 0])
    assert np.isclose(score, 2.45)
    program = qubo(relevance, redundancy)
    all_bits = [list(bits) for bits in itertools.product((0, 1), repeat=4)]
    best = min(all_bits, key=program.objective.evaluate)
    assert np.array_equal(best, selected)
    for bits in all_bits:
        if sum(bits) == 3:
            assert np.isclose(
                program.objective.evaluate(bits), -utility(bits, relevance, redundancy)
            )
    assert greedy(relevance, redundancy)[0] <= score


def test_aer_qaoa_returns_valid_probabilities():
    result = solve(np.array([1.0, 0.9, 0.8, 0.1]), np.eye(4), p=1, iterations=20, shots=256)
    assert 0 <= result["optimalProbability"] <= result["feasibleProbability"] <= 1 + 1e-12
    assert 0 <= result["conditionalExpectedRatio"] <= 1 + 1e-12
    assert 0 <= result["bestSampledRatio"] <= 1 + 1e-12
    assert result["qubits"] == 4
