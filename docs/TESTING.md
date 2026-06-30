# Testing the Hubware flasher

## Automated checks (no hardware)

From the repo root:

```bash
# Validate JSON
python3 -m json.tool catalog.json > /dev/null
python3 -m json.tool firmware/hub-s3-devkit/manifest.json > /dev/null

# Validate packaging script
python3 -m py_compile scripts/package_firmware.py

# Serve locally and verify assets load (Web Serial will NOT work over HTTP)
python3 -m http.server 8080
```

Open `http://localhost:8080/` and confirm:

- Hubware header and styling render
- Firmware card appears from `catalog.json`
- Browser console shows no errors loading `catalog.json` or ESP Web Tools script

Note: the **Install firmware** button requires HTTPS. Local HTTP is only useful for layout checks.

## Hardware smoke test (required before customer use)

Perform this after `firmware.bin` has been generated and the site is deployed to GitHub Pages.

### Prerequisites

- ESP32-S3 board matching the packaged firmware
- USB data cable
- Chrome or Edge on macOS, Windows, or Linux

### Steps

1. Open `https://<org>.github.io/<repo>/` in Chrome or Edge.
2. Confirm the correct firmware card is shown with the expected name and version.
3. Connect the ESP32-S3 via USB.
4. Close Arduino IDE serial monitor and any other serial tools.
5. Click **Install firmware** on the correct card.
6. Select the USB serial port when prompted.
7. Wait for the progress bar to complete.
8. Confirm the device reboots and runs the expected firmware.

### If flash fails

- Retry with BOOT held, tap RESET, release BOOT.
- Confirm you packaged with `--flash_mode dio` (the script default).
- Confirm `--flash-size` matches the board (4MB vs 8MB).
- Verify `firmware.bin` exists in the repo and was committed.

### Cross-browser check

Repeat steps 1–8 in Edge if you tested in Chrome first (or vice versa).

## Pre-publish checklist

- [ ] `firmware/<slug>/firmware.bin` exists (not just manifest.json)
- [ ] `catalog.json` entry matches manifest name and version
- [ ] GitHub Pages is enabled on `main` / root
- [ ] Hardware smoke test passed on at least one browser
