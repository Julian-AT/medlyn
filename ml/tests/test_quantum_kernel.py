import numpy as np

from quantum.hardware import elapsed, overlap_circuits
from quantum.kernel import alignment, exact_kernel, sampled_kernel, scores


def test_kernel_is_symmetric_psd_and_finite_shots_agree():
    points = np.random.default_rng(3).uniform(0, np.pi, (6, 3))
    matrix, cross = exact_kernel(points, points[:2])
    assert np.allclose(matrix, matrix.T)
    assert np.allclose(matrix.diagonal(), 1)
    assert np.linalg.eigvalsh(matrix).min() >= -1e-10
    assert np.allclose(cross, matrix[:2])
    sampled = sampled_kernel(points, shots=4096)
    assert np.abs(sampled - matrix).mean() < 0.025
    assert np.allclose(sampled, sampled.T)


def test_alignment_and_cluster_bootstrap():
    labels = np.array([False, False, True, True])
    signed = 2 * labels.astype(float) - 1
    assert alignment(np.outer(signed, signed), labels) > 0.99
    result = scores(labels, labels, ["a", "a", "b", "b"], replicates=20)
    assert result["accuracyCI95"] == [1, 1]
    assert result["bootstrap"]["unit"] == "patient"


def test_hardware_block_includes_diagonal_without_connecting():
    circuits, pairs = overlap_circuits(np.ones((16, 8)))
    assert len(circuits) == 136
    assert len([pair for pair in pairs if pair[0] == pair[1]]) == 16
    assert all(c.num_clbits == 8 for c in circuits)
    assert (
        elapsed(
            {"created": "2026-10-30T00:00:00Z", "running": "2026-10-30T00:00:03Z"},
            "created",
            "running",
        )
        == 3
    )
    assert elapsed({}, "created", "running") is None
