#!/usr/bin/env bash
# Legacy wrapper — use: python3 scripts/package_firmware.py release.json
exec python3 "$(dirname "$0")/package_firmware.py" "$@"
