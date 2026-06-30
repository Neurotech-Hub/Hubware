#!/usr/bin/env python3
"""Package Arduino ESP32-S3 firmware for the Hubware web flasher."""

from __future__ import annotations

import argparse
import json
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FIRMWARE_DIR = REPO_ROOT / "firmware"
DEFAULT_CATALOG = REPO_ROOT / "catalog.json"

PART_NAMES = {
    0x0: "bootloader.bin",
    0x8000: "partitions.bin",
    0xE000: "boot_app0.bin",
    0x10000: "app.bin",
}

CHIP_TO_FAMILY = {
    "esp32": "ESP32",
    "esp32s2": "ESP32-S2",
    "esp32s3": "ESP32-S3",
    "esp32c3": "ESP32-C3",
    "esp32c6": "ESP32-C6",
    "esp8266": "ESP8266",
}


def parse_esptool_command(line: str) -> tuple[str, list[tuple[int, str]]]:
    line = line.strip()
    if not line:
        raise ValueError("esptool_command is empty")

    tokens = shlex.split(line)
    write_flash_idx = next(
        (
            i
            for i, token in enumerate(tokens)
            if token.replace("_", "-").lower() in {"write-flash", "writeflash"}
        ),
        None,
    )
    if write_flash_idx is None:
        raise ValueError("Could not find write-flash in esptool_command")

    chip = "esp32s3"
    for i, token in enumerate(tokens):
        if token == "--chip" and i + 1 < len(tokens):
            chip = tokens[i + 1].lower()

    parts: list[tuple[int, str]] = []
    i = write_flash_idx + 1
    while i < len(tokens):
        token = tokens[i]
        if token.startswith("-"):
            if token in {"-z", "--compress"}:
                i += 1
                continue
            if i + 1 < len(tokens) and not tokens[i + 1].startswith("0x"):
                i += 2
                continue
            i += 1
            continue
        if token.startswith("0x"):
            if i + 1 >= len(tokens):
                raise ValueError(f"Missing file path after offset {token}")
            offset = int(token, 16)
            path = tokens[i + 1]
            parts.append((offset, path))
            i += 2
            continue
        i += 1

    if not parts:
        raise ValueError("No offset/file pairs found after write-flash")

    return chip, parts


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        config = json.load(f)

    required = ["slug", "name", "version", "description", "esptool_command"]
    missing = [key for key in required if not config.get(key)]
    if missing:
        raise ValueError(f"Missing required config keys: {', '.join(missing)}")

    return config


def copy_parts(
    parts: list[tuple[int, str]], dest_dir: Path
) -> list[tuple[int, Path]]:
    copied: list[tuple[int, Path]] = []
    parts_dir = dest_dir / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)

    for offset, source in parts:
        source_path = Path(source).expanduser()
        if not source_path.is_file():
            raise FileNotFoundError(f"Source file not found: {source_path}")

        filename = PART_NAMES.get(offset)
        if filename is None:
            filename = f"part_{offset:#x}.bin"

        target = parts_dir / filename
        shutil.copy2(source_path, target)
        copied.append((offset, target))
        print(f"  copied {source_path.name} -> {target.relative_to(REPO_ROOT)}")

    return copied


def merge_firmware(
    chip: str,
    parts: list[tuple[int, Path]],
    output: Path,
    flash_size: str,
) -> None:
    cmd = [
        sys.executable,
        "-m",
        "esptool",
        "--chip",
        chip,
        "merge_bin",
        "-o",
        str(output),
        "--flash_mode",
        "dio",
        "--flash_size",
        flash_size,
    ]
    for offset, path in sorted(parts, key=lambda item: item[0]):
        cmd.extend([f"{offset:#x}", str(path)])

    print(f"Merging into {output.relative_to(REPO_ROOT)}...")
    subprocess.run(cmd, check=True)


def write_manifest(dest_dir: Path, name: str, version: str, chip_family: str) -> Path:
    manifest = {
        "name": name,
        "version": version,
        "new_install_prompt_erase": True,
        "builds": [
            {
                "chipFamily": chip_family,
                "parts": [{"path": "firmware.bin", "offset": 0}],
            }
        ],
    }
    path = dest_dir / "manifest.json"
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {path.relative_to(REPO_ROOT)}")
    return path


def update_catalog(
    catalog_path: Path,
    slug: str,
    name: str,
    version: str,
    description: str,
    badge: str | None,
) -> None:
    if catalog_path.exists():
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    else:
        catalog = []

    entry = {
        "id": slug,
        "name": name,
        "version": version,
        "description": description,
        "manifest": f"firmware/{slug}/manifest.json",
    }
    if badge:
        entry["badge"] = badge

    updated = False
    for i, existing in enumerate(catalog):
        if existing.get("id") == slug:
            catalog[i] = entry
            updated = True
            break

    if not updated:
        catalog.append(entry)

    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    action = "Updated" if updated else "Added"
    print(f"{action} catalog entry in {catalog_path.relative_to(REPO_ROOT)}")


def package_firmware(config_path: Path) -> None:
    config = load_config(config_path)
    slug = config["slug"]
    chip, parts = parse_esptool_command(config["esptool_command"])
    chip_family = CHIP_TO_FAMILY.get(chip, chip.upper())

    dest_dir = REPO_ROOT / config.get("output_dir", "firmware") / slug
    dest_dir.mkdir(parents=True, exist_ok=True)

    print(f"Packaging {config['name']} v{config['version']} -> firmware/{slug}/")
    print("Copying source binaries...")
    copied_parts = copy_parts(parts, dest_dir)

    merged_path = dest_dir / "firmware.bin"
    merge_firmware(
        chip,
        copied_parts,
        merged_path,
        config.get("flash_size", "8MB"),
    )

    write_manifest(dest_dir, config["name"], config["version"], chip_family)
    update_catalog(
        REPO_ROOT / config.get("catalog", "catalog.json"),
        slug,
        config["name"],
        config["version"],
        config["description"],
        config.get("badge"),
    )

    size = merged_path.stat().st_size
    print()
    print(f"Done. firmware.bin is {size:,} bytes.")
    print()
    print("Next steps:")
    print(f"  git add firmware/{slug}/ catalog.json")
    print(f'  git commit -m "Release {slug} v{config["version"]}"')
    print("  git push")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Package Arduino firmware for the Hubware web flasher."
    )
    parser.add_argument(
        "config",
        nargs="?",
        default="release.json",
        help="Path to release config JSON (default: release.json)",
    )
    args = parser.parse_args()

    config_path = Path(args.config)
    if not config_path.is_file():
        print(f"Config not found: {config_path}", file=sys.stderr)
        print("Copy release.example.json to release.json and edit it.", file=sys.stderr)
        sys.exit(1)

    try:
        package_firmware(config_path.resolve())
    except (ValueError, FileNotFoundError, subprocess.CalledProcessError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
