#!/usr/bin/env python3
"""Reject staged secrets, model weights, and unexpectedly large files."""

from __future__ import annotations

import os
from pathlib import PurePosixPath
import re
import subprocess
import sys


MAX_FILE_BYTES = 50 * 1024 * 1024
BLOCKED_SUFFIXES = (
    ".token",
    ".safetensors",
    ".ckpt",
    ".pt",
    ".pth",
    ".bin",
    ".gguf",
    ".onnx",
)
BLOCKED_DIRECTORIES = {"hf_cache", "models", "output"}
HF_TOKEN = re.compile(rb"hf_[A-Za-z0-9]{30,}")
HOOK_MARKER = "# intrepid-archive check_commit.py"


def git(*args: str, input_bytes: bytes | None = None) -> bytes:
    """Run Git and return stdout, preserving unusual filenames as bytes."""
    result = subprocess.run(
        ["git", *args],
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        message = result.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(message or f"git {' '.join(args)} failed")
    return result.stdout


def staged_paths() -> list[bytes]:
    output = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
    return [path for path in output.split(b"\0") if path]


def display_path(path: bytes) -> str:
    return path.decode("utf-8", "replace")


def blocked_pattern(path: bytes) -> str | None:
    name = display_path(path).replace("\\", "/")
    pure_path = PurePosixPath(name)
    lower_parts = tuple(part.lower() for part in pure_path.parts)
    lower_name = pure_path.name.lower()

    for directory in BLOCKED_DIRECTORIES:
        if directory in lower_parts:
            return f"{directory}/"
    if lower_name.startswith(".env"):
        return ".env*"
    for suffix in BLOCKED_SUFFIXES:
        if lower_name.endswith(suffix):
            return f"*{suffix}"
    return None


def staged_blob(path: bytes) -> bytes:
    return git("show", ":" + os.fsdecode(path))


def staged_blob_size(path: bytes) -> int:
    raw_size = git("cat-file", "-s", ":" + os.fsdecode(path)).strip()
    return int(raw_size)


def check_staged_files() -> list[str]:
    failures: list[str] = []
    for path in staged_paths():
        shown = display_path(path)
        pattern = blocked_pattern(path)
        if pattern:
            failures.append(f"{shown}: matches blocked secret/weight pattern '{pattern}'")
            continue

        try:
            size = staged_blob_size(path)
        except (RuntimeError, ValueError):
            # Gitlinks and other non-blob entries have no file content to inspect.
            continue

        if size > MAX_FILE_BYTES:
            failures.append(
                f"{shown}: {size / (1024 * 1024):.1f} MB exceeds the 50 MB limit"
            )
            continue

        if HF_TOKEN.search(staged_blob(path)):
            failures.append(
                f"{shown}: looks like a Hugging Face token (hf_ + 30 alphanumerics)"
            )
    return failures


def install_hook() -> int:
    # Linked worktrees use a private git-dir, but Git reads hooks from the
    # repository's common directory.
    git_dir = display_path(git("rev-parse", "--git-common-dir").strip())
    hook_path = os.path.join(git_dir, "hooks", "pre-commit")
    os.makedirs(os.path.dirname(hook_path), exist_ok=True)

    if os.path.exists(hook_path):
        with open(hook_path, encoding="utf-8", errors="replace") as existing:
            if HOOK_MARKER not in existing.read():
                print(f"Refusing to replace existing hook: {hook_path}", file=sys.stderr)
                return 1

    hook = (
        "#!/bin/sh\n"
        f"{HOOK_MARKER}\n"
        'repo_root="$(git rev-parse --show-toplevel)" || exit 1\n'
        'if command -v python3 >/dev/null 2>&1; then\n'
        '  exec python3 "$repo_root/scripts/check_commit.py"\n'
        'fi\n'
        'exec python "$repo_root/scripts/check_commit.py"\n'
    )
    with open(hook_path, "w", encoding="utf-8", newline="\n") as output:
        output.write(hook)
    os.chmod(hook_path, 0o755)
    print(f"Installed pre-commit hook: {hook_path}")
    return 0


def main() -> int:
    if sys.argv[1:] == ["--install"]:
        return install_hook()
    if sys.argv[1:]:
        print("Usage: python scripts/check_commit.py [--install]", file=sys.stderr)
        return 2

    try:
        failures = check_staged_files()
    except RuntimeError as error:
        print(f"Pre-commit guard could not inspect the index: {error}", file=sys.stderr)
        return 2

    if failures:
        print("Pre-commit guard: commit blocked", file=sys.stderr)
        for failure in failures:
            print(f"  BLOCKED  {failure}", file=sys.stderr)
        print("Remove the listed files or token text before committing.", file=sys.stderr)
        return 1

    print("Pre-commit guard: ok, no tokens or weights staged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
