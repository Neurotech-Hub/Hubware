# Adding firmware to Hubware

This guide walks through publishing a new ESP32-S3 firmware image to the Hubware web flasher after compiling in the Arduino IDE.

## Prerequisites

- Arduino IDE with ESP32 board support installed
- Python 3 with `esptool`: `pip install esptool`

## Step 1 — Copy the esptool line from Arduino

1. In Arduino IDE, open **Settings → Show verbose output during: upload**.
2. Compile and upload your sketch.
3. Copy the full `esptool ... write-flash ...` line from the upload log.

It looks like this:

```
"/Users/.../esptool" --chip esp32s3 ... write-flash ... 0x0 "...bootloader.bin" 0x8000 "...partitions.bin" 0xe000 "...boot_app0.bin" 0x10000 "...sketch.bin"
```

## Step 2 — Edit release.json

Copy the example config if you have not already:

```bash
cp release.example.json release.json
```

Edit `release.json`:

```json
{
  "slug": "beam-v3",
  "name": "Hubware BEAM v3",
  "version": "3.0.0",
  "description": "Firmware for Hubware BEAM devices with ESP32-S3.",
  "badge": "Recommended",
  "flash_size": "8MB",
  "esptool_command": "PASTE THE FULL ESPTOOL LINE HERE"
}
```

| Field | Description |
|-------|-------------|
| `slug` | Folder name under `firmware/` (e.g. `beam-v3`) |
| `name` | Customer-facing name on the install page |
| `version` | Release version string |
| `description` | When customers should pick this firmware |
| `badge` | Optional label (e.g. `Recommended`, `Legacy`) |
| `flash_size` | Board flash size (usually `8MB` for ESP32-S3) |
| `esptool_command` | The full line copied from Arduino upload output |

`release.json` is gitignored so your local paths stay out of version control.

## Step 3 — Run the packaging script

From the repo root:

```bash
python3 scripts/package_firmware.py release.json
```

Or in VS Code / Cursor: **Terminal → Run Build Task** (default build task).

The script will:

1. Parse offset/file pairs from the esptool line
2. Copy source `.bin` files into `firmware/<slug>/parts/`
3. Merge them into `firmware/<slug>/firmware.bin`
4. Write `firmware/<slug>/manifest.json`
5. Add or update the entry in `catalog.json`

## Step 4 — Publish

```bash
git add firmware/<slug>/ catalog.json
git commit -m "Release <slug> v<version>"
git push
```

GitHub Pages redeploys within about a minute.

## Step 5 — Verify before sending to customers

1. Open the Pages URL in **Chrome** or **Edge**.
2. Plug in an ESP32-S3 board.
3. Select the correct firmware card → **Install firmware** → choose the USB serial port.
4. Confirm the flash completes and the device boots.

See [TESTING.md](TESTING.md) for the full checklist.

## Troubleshooting

### `merge_bin` fails or device won't boot after web flash

- Ensure `flash_size` matches your board (4MB vs 8MB).
- The script uses `--flash_mode dio` for web flashing (required for ESP32-S3).

### Source file not found

Arduino cache paths expire. Run the packaging script **immediately after upload**, or paste a fresh esptool line into `release.json`.

### Multiple firmware products

Use a separate `slug` per product. Each gets its own folder under `firmware/` and its own catalog entry. Re-run the script after editing `release.json` to update an existing slug.

## Legacy shell script

`scripts/package-firmware.sh` is a thin wrapper around the Python script. Prefer `python3 scripts/package_firmware.py release.json`.
