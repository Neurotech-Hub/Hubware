# Hubware ESP32-S3 Web Flasher

Browser-based firmware installer for Hubware ESP32-S3 devices. Customers pick the firmware you specify, connect their board over USB, and flash from Chrome or Edge — no Arduino IDE required on their end.

**Repository:** [github.com/Neurotech-Hub/Hubware](https://github.com/Neurotech-Hub/Hubware)

**Live site:** [neurotech-hub.github.io/Hubware](https://neurotech-hub.github.io/Hubware/)

## How it works

1. You compile firmware locally in the Arduino IDE.
2. Paste the esptool upload line into `release.json` and run the packaging script.
3. Push to GitHub — manifest and catalog are updated automatically.
4. Customers visit the GitHub Pages URL, select their firmware, and click **Install firmware**.

Powered by [ESP Web Tools](https://esphome.github.io/esp-web-tools/) and the Web Serial API.

## GitHub Pages setup

1. Create a GitHub repository and push this project.
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Set branch to **main** and folder to **/ (root)**.
5. Save. The site will be available at [neurotech-hub.github.io/Hubware](https://neurotech-hub.github.io/Hubware/) within a few minutes.

Optional: add a custom domain (e.g. `flash.hubware.com`) under **Settings → Pages → Custom domain**.

## Adding firmware

See [docs/ADDING_FIRMWARE.md](docs/ADDING_FIRMWARE.md) for the step-by-step workflow.

Quick reference:

```bash
cp release.example.json release.json
# Edit release.json — paste esptool line from Arduino upload log
python3 scripts/package_firmware.py release.json
git add firmware/ catalog.json && git commit -m "Release beam-v3" && git push
```

In Cursor/VS Code: **Terminal → Run Build Task** runs the same command.

## Project structure

```
index.html              Customer-facing install page
catalog.json            Firmware catalog (auto-updated by packaging script)
release.json            Your local release config (gitignored)
css/style.css           Hubware branding
js/catalog.js           Renders firmware cards from catalog.json
firmware/<slug>/        Merged binary, manifest, and copied parts/
scripts/                Packaging automation (package_firmware.py)
docs/                   Maintainer documentation
```

## Customer requirements

- Google Chrome or Microsoft Edge on a desktop/laptop
- USB data cable connected to the ESP32-S3
- The firmware option you told them to use

Safari, Firefox, phones, and tablets are not supported (Web Serial limitation).

## Testing

See [docs/TESTING.md](docs/TESTING.md) for local validation and hardware smoke-test steps.

## License

Firmware binaries and branding are proprietary to Hubware. ESP Web Tools is used under its respective license.
