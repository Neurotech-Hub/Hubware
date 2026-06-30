async function loadCatalog() {
  const container = document.getElementById("catalog");

  try {
    const response = await fetch("catalog.json");
    if (!response.ok) {
      throw new Error(`Failed to load catalog (${response.status})`);
    }

    const entries = await response.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      container.innerHTML =
        '<p class="catalog-empty">No firmware images are published yet.</p>';
      return;
    }

    container.replaceChildren(...entries.map(renderFirmwareCard));
  } catch (error) {
    container.innerHTML = `<p class="catalog-error">${error.message}</p>`;
  }
}

function renderFirmwareCard(entry) {
  const card = document.createElement("article");
  card.className = "firmware-card";

  const header = document.createElement("div");
  header.className = "firmware-card-header";

  const title = document.createElement("h3");
  title.textContent = entry.name;
  if (entry.version) {
    const version = document.createElement("span");
    version.className = "firmware-version";
    version.textContent = ` v${entry.version}`;
    title.appendChild(version);
  }

  header.appendChild(title);

  if (entry.badge) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = entry.badge;
    header.appendChild(badge);
  }

  const description = document.createElement("p");
  description.className = "firmware-description";
  description.textContent = entry.description || "";

  const installButton = document.createElement("esp-web-install-button");
  installButton.setAttribute("manifest", entry.manifest);

  const activateBtn = document.createElement("button");
  activateBtn.slot = "activate";
  activateBtn.className = "install-btn";
  activateBtn.textContent = "Install firmware";

  const unsupported = document.createElement("span");
  unsupported.slot = "unsupported";
  unsupported.textContent =
    "Use Chrome or Edge on a desktop or laptop. Safari and Firefox are not supported.";

  const notAllowed = document.createElement("span");
  notAllowed.slot = "not-allowed";
  notAllowed.textContent =
    "This page must be opened over HTTPS (for example via GitHub Pages).";

  installButton.append(activateBtn, unsupported, notAllowed);

  card.append(header, description, installButton);
  return card;
}

loadCatalog();
