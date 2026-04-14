"""
Create a sanitized zip of the repository suitable for upload to Google AI Studio.

Usage:
  python package_for_ai_studio.py --output project-ai-studio.zip

It removes common local files like .git, .venv, __pycache__, .env and packages the rest.
"""
import argparse
import os
import shutil
from pathlib import Path

EXCLUDE = {".git", ".venv", "venv", "__pycache__", ".pytest_cache", ".vscode", ".env"}
EXCLUDE_PATTERNS = ["*.pyc", "*.pyo", "*.db", "*.sqlite", "*.log"]


def should_exclude(path: Path) -> bool:
    parts = {p for p in path.parts}
    if parts & EXCLUDE:
        return True
    for pattern in EXCLUDE_PATTERNS:
        if path.match(pattern):
            return True
    return False


def copytree_filtered(src: Path, dst: Path) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if should_exclude(item):
            continue
        target = dst / item.name
        if item.is_dir():
            copytree_filtered(item, target)
        else:
            shutil.copy2(item, target)


def main():
    p = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", "-o", default="project-ai-studio.zip")
    args = parser.parse_args()

    tmp = p / "_ai_studio_package_tmp"
    if tmp.exists():
        shutil.rmtree(tmp)
    copytree_filtered(p, tmp)

    # Ensure README and requirements-ai-studio.txt are present
    if not (tmp / "requirements-ai-studio.txt").exists():
        print("Warning: requirements-ai-studio.txt not found in repo root")

    # Create zip
    out = Path(args.output).resolve()
    if out.exists():
        out.unlink()
    shutil.make_archive(str(out.with_suffix("")), "zip", tmp)
    shutil.rmtree(tmp)
    print(f"Created: {out}")


if __name__ == "__main__":
    main()
