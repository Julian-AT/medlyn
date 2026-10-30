import pytest

from publish.common import inventory, write_json
from publish.upload import release_files, upload


def release(folder):
    folder.mkdir()
    (folder / "README.md").write_text("Synthetic test model")
    (folder / "adapters.safetensors").write_bytes(b"test-weights")
    write_json(folder / "adapter_config.json", {"model": "synthetic-test"})
    write_json(
        folder / "scan-report.json",
        {
            "status": "passed",
            "matchCount": 0,
            "matches": [],
            "referenceDocuments": 8,
            "windowCharacters": 120,
            "recordsScanned": 3,
        },
    )
    write_json(
        folder / "release-manifest.json",
        {"kind": "model", "syntheticOnly": True, "files": inventory(folder)},
    )


def test_dry_run_lists_size_without_authentication_or_network(tmp_path, monkeypatch, capsys):
    folder = tmp_path / "release"
    release(folder)
    monkeypatch.delenv("HF_TOKEN", raising=False)
    summary = upload("model", "JulianAT/test-model", folder, dry_run=True)
    assert summary["dryRun"] and summary["private"]
    assert summary["totalBytes"] == sum(path.stat().st_size for path in folder.iterdir())
    assert len(summary["files"]) == 5
    assert "totalBytes" in capsys.readouterr().out


def test_modified_or_extra_files_invalidate_release(tmp_path):
    folder = tmp_path / "release"
    release(folder)
    (folder / "README.md").write_text("Changed after scan")
    with pytest.raises(ValueError, match="changed after scanning"):
        release_files(folder, "model")


def test_uploader_refuses_public_mode_and_other_accounts(tmp_path):
    with pytest.raises(ValueError, match="private"):
        upload("model", "JulianAT/test", tmp_path, private=False, dry_run=True)
    with pytest.raises(ValueError, match="JulianAT"):
        upload("model", "someone/test", tmp_path, dry_run=True)


def test_uploader_refuses_symlink_payload(tmp_path):
    folder = tmp_path / "release"
    release(folder)
    (folder / "linked.env").symlink_to(folder / "README.md")
    with pytest.raises(ValueError, match="symlinks"):
        release_files(folder, "model")


def test_hub_resume_metadata_is_never_uploaded(tmp_path):
    folder = tmp_path / "release"
    release(folder)
    cache = folder / ".cache/huggingface/upload"
    cache.mkdir(parents=True)
    (cache / "resume.json").write_text("local-only resume metadata")
    assert len(release_files(folder, "model")) == 5
