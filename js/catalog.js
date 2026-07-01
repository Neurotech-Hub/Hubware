let allEntries = [];

function getSelectedFirmwareFromUrl() {
  return new URLSearchParams(window.location.search).get("firmware") || "";
}

function isValidFirmwareId(id) {
  return allEntries.some((entry) => entry.id === id);
}

function buildFirmwareUrl(id) {
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set("firmware", id);
  } else {
    url.searchParams.delete("firmware");
  }
  return url.toString();
}

function buildShareUrl(id) {
  return `${location.origin}${location.pathname}?firmware=${encodeURIComponent(id)}`;
}

function populateFilterDropdown(entries, selectedId) {
  const select = document.getElementById("firmware-filter");
  if (!select) {
    return;
  }

  select.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All Firmware";
  select.appendChild(allOption);

  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    select.appendChild(option);
  }

  const validId = selectedId && isValidFirmwareId(selectedId) ? selectedId : "";
  select.value = validId;
}

function syncFilterDropdown(selectedId) {
  const select = document.getElementById("firmware-filter");
  if (!select) {
    return;
  }

  const validId = selectedId && isValidFirmwareId(selectedId) ? selectedId : "";
  select.value = validId;
}

function setFirmwareFilter(id) {
  history.replaceState(null, "", buildFirmwareUrl(id));
  renderCatalog(id);
  syncFilterDropdown(id);
}

function renderCatalog(selectedId) {
  const container = document.getElementById("catalog");
  container.replaceChildren();

  if (selectedId && !isValidFirmwareId(selectedId)) {
    container.innerHTML =
      '<p class="catalog-empty">Firmware not found. Choose a firmware from the dropdown above.</p>';
    return;
  }

  const entries = selectedId
    ? allEntries.filter((entry) => entry.id === selectedId)
    : allEntries;

  if (entries.length === 0) {
    container.innerHTML =
      '<p class="catalog-empty">No firmware images are published yet.</p>';
    return;
  }

  container.replaceChildren(...entries.map(renderFirmwareCard));
}

async function copyFirmwareLink(entry, button) {
  const url = buildShareUrl(entry.id);
  const originalText = button.textContent;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    button.textContent = "Copied!";
  } catch {
    button.textContent = "Copy failed";
  }

  setTimeout(() => {
    button.textContent = originalText;
  }, 2000);
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

  const copyLinkBtn = document.createElement("button");
  copyLinkBtn.type = "button";
  copyLinkBtn.className = "copy-link-btn";
  copyLinkBtn.textContent = "Copy Link";
  copyLinkBtn.addEventListener("click", () => copyFirmwareLink(entry, copyLinkBtn));
  header.appendChild(copyLinkBtn);

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

async function loadCatalog() {
  const container = document.getElementById("catalog");

  try {
    const response = await fetch("catalog.json");
    if (!response.ok) {
      throw new Error(`Failed to load catalog (${response.status})`);
    }

    const entries = await response.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      allEntries = [];
      populateFilterDropdown([], "");
      container.innerHTML =
        '<p class="catalog-empty">No firmware images are published yet.</p>';
      return;
    }

    allEntries = entries;
    const selectedId = getSelectedFirmwareFromUrl();
    populateFilterDropdown(entries, selectedId);
    renderCatalog(selectedId);
  } catch (error) {
    container.innerHTML = `<p class="catalog-error">${error.message}</p>`;
  }
}

function setupFilterListener() {
  const select = document.getElementById("firmware-filter");
  if (!select) {
    return;
  }

  select.addEventListener("change", () => {
    setFirmwareFilter(select.value);
  });
}

setupFilterListener();
loadCatalog();
