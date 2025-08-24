function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#1D9BF0",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    zIndex: "2147483647",
    boxShadow: "0 4px 16px rgba(0,0,0,.2)"
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function getTweetUrlFromArticle(articleEl) {
  const a = articleEl.querySelector("a[href*='/status/']");
  if (!a) return null;
  
  const url = new URL(a.href, location.origin);
  return url.toString();
}

function isTweetUrl(u) {
  try {
    const url = new URL(u);
    return /\/status\/\d+/.test(url.pathname);
  } catch {
    return false;
  }
}

function saveToFolder(folder, entry) {
  chrome.storage.local.get(["bookmarks"], (data) => {
    const bookmarks = data.bookmarks || {};
    if (!bookmarks[folder]) bookmarks[folder] = [];
    
    if (!bookmarks[folder].some(x => x.url === entry.url)) {
      bookmarks[folder].push(entry);
    }
    chrome.storage.local.set({ bookmarks }, () => {
      toast(`Saved to "${folder}"`);
    });
  });
}


function openFolderPicker({ url, onClose }) {
  chrome.storage.local.get(["bookmarks"], (data) => {
    const bookmarks = data.bookmarks || {};
    const folderNames = Object.keys(bookmarks).sort();

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,.35)",
      zIndex: "2147483646",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      width: "320px",
      background: "#fff",
      borderRadius: "10px",
      padding: "14px",
      boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    });

    const title = document.createElement("div");
    title.textContent = "Save tweet to folder";
    Object.assign(title.style, { fontWeight: "600", marginBottom: "10px" });

    const select = document.createElement("select");
    Object.assign(select.style, {
      width: "100%",
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ddd",
      marginBottom: "8px"
    });

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = folderNames.length ? "Choose a folder" : "No folders yet";
    select.appendChild(placeholder);

    folderNames.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    const orDiv = document.createElement("div");
    orDiv.textContent = "or create new:";
    Object.assign(orDiv.style, { fontSize: "12px", color: "#666", margin: "6px 0" });

    const newInput = document.createElement("input");
    newInput.placeholder = "New folder name";
    Object.assign(newInput.style, {
      width: "100%", padding: "8px", borderRadius: "6px",
      border: "1px solid #ddd", marginBottom: "10px"
    });

    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    Object.assign(cancelBtn.style, {
      padding: "8px 10px", borderRadius: "6px", border: "1px solid #ddd", background: "#f7f7f7", cursor: "pointer"
    });

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    Object.assign(saveBtn.style, {
      padding: "8px 10px", borderRadius: "6px", border: "none", background: "#1D9BF0", color: "#fff", cursor: "pointer", fontWeight: "600"
    });

    cancelBtn.onclick = () => {
      overlay.remove();
      onClose && onClose(false);
    };

    saveBtn.onclick = () => {
      let folder = select.value || newInput.value.trim();
      if (!folder) {
        alert("Pick a folder or enter a new name.");
        return;
      }
      
      chrome.storage.local.get(["bookmarks"], (data2) => {
        const b2 = data2.bookmarks || {};
        if (!b2[folder]) b2[folder] = [];
        chrome.storage.local.set({ bookmarks: b2 }, () => {
          saveToFolder(folder, { url, savedAt: new Date().toISOString() });
          overlay.remove();
          onClose && onClose(true);
        });
      });
    };

    row.appendChild(cancelBtn);
    row.appendChild(saveBtn);

    card.appendChild(title);
    card.appendChild(select);
    card.appendChild(orDiv);
    card.appendChild(newInput);
    card.appendChild(row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}


function hookBookmarkButtons() {
  const observer = new MutationObserver(() => {
    const btns = document.querySelectorAll('div[data-testid="bookmark"]');
    btns.forEach(btn => {
      if (btn.dataset._tfbHooked) return;
      btn.dataset._tfbHooked = "1";
      btn.addEventListener("click", () => {
        
        setTimeout(() => {
          const article = btn.closest("article");
          if (!article) return;
          const url = getTweetUrlFromArticle(article) || location.href;
          if (!isTweetUrl(url)) return;

          chrome.storage.sync.get(["defaultFolder"], (res) => {
            const def = (res.defaultFolder || "").trim();
            if (def) {
              saveToFolder(def, { url, savedAt: new Date().toISOString() });
            } else {
              openFolderPicker({ url });
            }
          });
        }, 250);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

hookBookmarkButtons();


document.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "b") {
    const url = location.href;
    if (!isTweetUrl(url)) return;
    chrome.storage.sync.get(["defaultFolder"], (res) => {
      const def = (res.defaultFolder || "").trim();
      if (def) {
        saveToFolder(def, { url, savedAt: new Date().toISOString() });
      } else {
        openFolderPicker({ url });
      }
    });
  }
});
