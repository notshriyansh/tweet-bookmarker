document.addEventListener("DOMContentLoaded", () => {
  const folderList = document.getElementById("folder-list");
  const resetBtn = document.getElementById("reset");
  const folderSelect = document.getElementById("folderSelect");
  const quickSaveBtn = document.getElementById("quickSave");
  const qsStatus = document.getElementById("qsStatus");

  function loadFolderSelect() {
    folderSelect.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Choose folder…";
    folderSelect.appendChild(opt);

    chrome.storage.local.get(["bookmarks"], (data) => {
      const bookmarks = data.bookmarks || {};
      Object.keys(bookmarks).sort().forEach(f => {
        const o = document.createElement("option");
        o.value = f;
        o.textContent = f;
        folderSelect.appendChild(o);
      });
      // Also preload default folder for UX
      chrome.storage.sync.get(["defaultFolder"], (res) => {
        if (res.defaultFolder && bookmarks[res.defaultFolder]) {
          folderSelect.value = res.defaultFolder;
        }
      });
    });
  }

  function renderBookmarks() {
    folderList.innerHTML = "";

    chrome.storage.local.get(["bookmarks"], (data) => {
      const bookmarks = data.bookmarks || {};

      if (Object.keys(bookmarks).length === 0) {
        folderList.innerHTML = "<p class='muted'>No bookmarks saved yet.</p>";
        return;
      }

      Object.keys(bookmarks).sort().forEach(folder => {
        const folderDiv = document.createElement("div");
        folderDiv.className = "folder";

        const header = document.createElement("h3");
        header.innerHTML = `<span>${folder}</span>`;
        const actions = document.createElement("div");
        actions.className = "actions";

        const clearBtn = document.createElement("button");
        clearBtn.textContent = "Clear";
        clearBtn.style.background = "#888";
        clearBtn.onclick = () => {
          delete bookmarks[folder];
          chrome.storage.local.set({ bookmarks }, () => {
            renderBookmarks(); loadFolderSelect();
          });
        };

        actions.appendChild(clearBtn);
        header.appendChild(actions);
        folderDiv.appendChild(header);

        const ul = document.createElement("ul");

        (bookmarks[folder] || []).slice().reverse().forEach((b, idxFromEnd) => {
          // idx in original order:
          const idx = (bookmarks[folder].length - 1) - idxFromEnd;

          const li = document.createElement("li");

          const left = document.createElement("div");
          left.style.display = "flex";
          left.style.flexDirection = "column";
          left.style.gap = "2px";

          const a = document.createElement("a");
          a.href = b.url;
          a.target = "_blank";
          a.className = "link";
          a.textContent = b.url.replace(/^https?:\/\/(www\.)?/, "");

          const ts = document.createElement("span");
          ts.className = "small";
          ts.textContent = new Date(b.savedAt).toLocaleString();

          left.appendChild(a);
          left.appendChild(ts);

          const del = document.createElement("button");
          del.textContent = "❌";
          del.style.background = "#555";
          del.onclick = () => {
            bookmarks[folder].splice(idx, 1);
            if (bookmarks[folder].length === 0) delete bookmarks[folder];
            chrome.storage.local.set({ bookmarks }, () => {
              renderBookmarks(); loadFolderSelect();
            });
          };

          li.appendChild(left);
          li.appendChild(del);
          ul.appendChild(li);
        });

        folderDiv.appendChild(ul);
        folderList.appendChild(folderDiv);
      });
    });
  }

  quickSaveBtn.addEventListener("click", () => {
    const folder = folderSelect.value.trim();
    if (!folder) {
      qsStatus.textContent = "Please choose a folder first.";
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || "";
      if (!/\/status\/\d+/.test(url)) {
        qsStatus.textContent = "Not a tweet page. Open a tweet to quick-save.";
        return;
      }
      chrome.storage.local.get(["bookmarks"], (data) => {
        const bookmarks = data.bookmarks || {};
        if (!bookmarks[folder]) bookmarks[folder] = [];
        if (!bookmarks[folder].some(x => x.url === url)) {
          bookmarks[folder].push({ url, savedAt: new Date().toISOString() });
        }
        chrome.storage.local.set({ bookmarks }, () => {
          qsStatus.textContent = `Saved to "${folder}"`;
          renderBookmarks();
        });
      });
    });
  });

  resetBtn.addEventListener("click", () => {
    if (confirm("Clear ALL folders and bookmarks?")) {
      chrome.storage.local.set({ bookmarks: {} }, () => {
        renderBookmarks(); loadFolderSelect();
      });
    }
  });

  // Initial render
  loadFolderSelect();
  renderBookmarks();
});
