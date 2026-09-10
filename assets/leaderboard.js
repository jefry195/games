/**
 * =========================================================================
 * UNIVERSAL LEADERBOARD CLIENT - ARCADE MAHAKAM SAMARINDA
 * =========================================================================
 * Modul client-side untuk menampilkan Papan Peringkat dan mengirimkan skor
 * ke Google Sheet (via Google Apps Script) dengan fallback cerdas ke LocalStorage.
 * 
 * Credit by Jefri (https://jefri-orcin.vercel.app/)
 * =========================================================================
 */

(function () {
  "use strict";

  const DEFAULT_GAMES_LIST = [
    { id: "51-fps-shooter", name: "Mahakam FPS Defender" },
    { id: "01-candy-crush", name: "Candy Crush" },
    { id: "02-pacman", name: "Pac-Man" },
    { id: "03-chess", name: "Catur (Chess)" },
    { id: "04-doodle-jump", name: "Doodle Jump" },
    { id: "05-solitaire", name: "Solitaire" },
    { id: "06-sudoku", name: "Sudoku" },
    { id: "07-crossy-road", name: "Crossy Road Mahakam" },
    { id: "09-flappy-bird", name: "Flappy Bird" },
    { id: "10-2048", name: "2048" },
    { id: "12-hangman", name: "Hangman" },
    { id: "14-archery", name: "Panahan (Archery)" },
    { id: "16-minesweeper", name: "Minesweeper" },
    { id: "18-breakout", name: "Breakout" },
    { id: "19-ping-pong", name: "Ping Pong" },
    { id: "20-tetris", name: "Tetris" },
    { id: "24-snake", name: "Ular Naga Mahakam" },
    { id: "32-fruit-slicer", name: "Iris Buah & Amplang" },
    { id: "35-whack-a-mole", name: "Pukul Tikus Tanah" },
    { id: "36-simon-says", name: "Simon Says" },
    { id: "42-space-invaders", name: "Space Invaders" },
    { id: "43-asteroids", name: "Asteroids" },
    { id: "46-frogger", name: "Frogger Mahakam" },
    { id: "50-lights-out", name: "Lights Out" }
  ];

  const Leaderboard = {
    modalEl: null,
    currentGameId: "51-fps-shooter",
    currentGameName: "Mahakam FPS Defender",
    pendingScore: null,

    getApiUrl: function () {
      const stored = localStorage.getItem("arcade_apps_script_url");
      if (stored && stored.trim()) return stored.trim();
      if (window.LEADERBOARD_CONFIG && window.LEADERBOARD_CONFIG.GOOGLE_APPS_SCRIPT_URL) {
        return window.LEADERBOARD_CONFIG.GOOGLE_APPS_SCRIPT_URL.trim();
      }
      return "";
    },

    setApiUrl: function (url) {
      if (url) {
        localStorage.setItem("arcade_apps_script_url", url.trim());
      } else {
        localStorage.removeItem("arcade_apps_script_url");
      }
    },

    initModal: function () {
      if (document.getElementById("arcade-lb-modal-overlay")) {
        this.modalEl = document.getElementById("arcade-lb-modal-overlay");
        return;
      }

      const overlay = document.createElement("div");
      overlay.id = "arcade-lb-modal-overlay";
      overlay.className = "lb-modal-overlay";
      overlay.innerHTML = `
        <div class="lb-modal">
          <div class="lb-header">
            <div class="lb-title-wrap">
              <span>🏆</span>
              <h3>Papan Peringkat</h3>
              <span class="lb-badge-samarinda">🐬 Mahakam</span>
            </div>
            <button class="lb-close-btn" id="lb-btn-close" title="Tutup">✕</button>
          </div>

          <div class="lb-selector-bar">
            <select id="lb-game-select" class="lb-select"></select>
            <button id="lb-btn-refresh" class="lb-refresh-btn" title="Muat Ulang Skor">🔄</button>
            <button id="lb-btn-config" class="lb-config-btn" title="Pengaturan URL Google Sheet">⚙️</button>
          </div>

          <div class="lb-body" id="lb-body-content">
            <div class="lb-loading">
              <div class="lb-spinner"></div>
              <div>Memuat data peringkat...</div>
            </div>
          </div>

          <div class="lb-submit-section" id="lb-submit-section">
            <div class="lb-submit-title">
              <span>📝 Kirim Skor Anda</span>
              <span id="lb-score-display" style="color: #38bdf8; font-weight: 800;">Skor: 0</span>
            </div>
            <form id="lb-submit-form" class="lb-form-row">
              <input type="text" id="lb-input-name" class="lb-input" placeholder="Nama / Inisial Pemain" maxlength="25" required />
              <input type="text" id="lb-input-city" class="lb-input" placeholder="Kota / Daerah" value="Samarinda" maxlength="25" />
              <button type="submit" id="lb-btn-send" class="lb-send-btn">
                <span>Kirim</span> 🚀
              </button>
            </form>
            <div id="lb-msg-box" class="lb-msg-box"></div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.modalEl = overlay;

      // Event Listeners
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeModal();
      });

      document.getElementById("lb-btn-close").addEventListener("click", () => this.closeModal());
      document.getElementById("lb-btn-refresh").addEventListener("click", () => this.loadLeaderboard(this.currentGameId));
      document.getElementById("lb-btn-config").addEventListener("click", () => this.promptConfigUrl());

      const gameSelect = document.getElementById("lb-game-select");
      gameSelect.addEventListener("change", (e) => {
        this.currentGameId = e.target.value;
        const selectedOpt = e.target.options[e.target.selectedIndex];
        this.currentGameName = selectedOpt ? selectedOpt.textContent : this.currentGameId;
        this.loadLeaderboard(this.currentGameId);
      });

      const submitForm = document.getElementById("lb-submit-form");
      submitForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("lb-input-name").value.trim();
        const city = document.getElementById("lb-input-city").value.trim() || "Samarinda";
        const score = this.pendingScore !== null ? this.pendingScore : 0;
        this.submitScore(this.currentGameId, this.currentGameName, score, name, city);
      });
    },

    populateGameSelect: function (selectedId) {
      const select = document.getElementById("lb-game-select");
      if (!select) return;

      select.innerHTML = "";
      let found = false;

      DEFAULT_GAMES_LIST.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = g.name;
        if (g.id === selectedId) {
          opt.selected = true;
          found = true;
        }
        select.appendChild(opt);
      });

      if (!found && selectedId) {
        const opt = document.createElement("option");
        opt.value = selectedId;
        opt.textContent = this.currentGameName || selectedId;
        opt.selected = true;
        select.prepend(opt);
      }
    },

    openModal: function (options) {
      this.initModal();

      options = options || {};
      if (options.gameId) this.currentGameId = options.gameId;
      if (options.gameName) this.currentGameName = options.gameName;
      this.pendingScore = options.score !== undefined ? options.score : null;

      const scoreDisplay = document.getElementById("lb-score-display");
      const submitSection = document.getElementById("lb-submit-section");
      if (this.pendingScore !== null) {
        scoreDisplay.textContent = `Skor: ${this.pendingScore}`;
        submitSection.style.display = "block";
      } else {
        scoreDisplay.textContent = "";
        submitSection.style.display = "block";
      }

      this.populateGameSelect(this.currentGameId);
      this.modalEl.classList.add("active");
      this.loadLeaderboard(this.currentGameId);
    },

    closeModal: function () {
      if (this.modalEl) {
        this.modalEl.classList.remove("active");
      }
    },

    loadLeaderboard: function (gameId) {
      const body = document.getElementById("lb-body-content");
      if (!body) return;

      body.innerHTML = `
        <div class="lb-loading">
          <div class="lb-spinner"></div>
          <div>Mengambil data peringkat dari Google Sheet...</div>
        </div>
      `;

      const apiUrl = this.getApiUrl();

      // Jika URL Google Apps Script sudah diset
      if (apiUrl) {
        const fetchUrl = `${apiUrl}?gameId=${encodeURIComponent(gameId)}&limit=10&t=${Date.now()}`;
        fetch(fetchUrl)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.leaderboard)) {
              this.renderLeaderboard(data.leaderboard);
            } else {
              this.loadFromLocalStorage(gameId);
            }
          })
          .catch((err) => {
            console.warn("Koneksi Google Sheet offline / belum diatur, beralih ke LocalStorage:", err);
            this.loadFromLocalStorage(gameId);
          });
      } else {
        // Fallback langsung ke LocalStorage
        this.loadFromLocalStorage(gameId);
      }
    },

    loadFromLocalStorage: function (gameId) {
      const key = `arcade_scores_${gameId}`;
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(key) || "[]");
      } catch (e) {
        list = [];
      }

      // Mock default awal jika kosong agar menarik
      if (list.length === 0) {
        list = [
          { rank: 1, playerName: "Jefri", score: 2500, city: "Samarinda", timestamp: "Tepian Mahakam" },
          { rank: 2, playerName: "Pesut Mahakam", score: 1800, city: "Samarinda", timestamp: "Sungai Mahakam" },
          { rank: 3, playerName: "Pahlawan Tepian", score: 1200, city: "Balikpapan", timestamp: "Kaltim" }
        ];
      }

      list.sort((a, b) => b.score - a.score);
      list = list.slice(0, 10).map((item, idx) => ({ ...item, rank: idx + 1 }));
      this.renderLeaderboard(list, true);
    },

    renderLeaderboard: function (items, isLocal) {
      const body = document.getElementById("lb-body-content");
      if (!body) return;

      if (!items || items.length === 0) {
        body.innerHTML = `
          <div class="lb-empty">
            <div style="font-size: 2rem; margin-bottom: 8px;">🐬</div>
            <div style="font-weight: 700; color: #fff;">Belum ada skor tercatat!</div>
            <div>Jadilah yang pertama mencetak rekor skor untuk game ini!</div>
          </div>
        `;
        return;
      }

      const medals = ["🥇", "🥈", "🥉"];
      const html = items
        .map((item, index) => {
          const rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "";
          const rankIcon = medals[index] || `#${item.rank || index + 1}`;
          const cityText = item.city ? `📍 ${item.city}` : "📍 Samarinda";
          const dateText = item.timestamp ? `<span class="lb-date">${String(item.timestamp).substring(0, 16)}</span>` : "";

          return `
            <div class="lb-item ${rankClass}">
              <div class="lb-left">
                <div class="lb-rank-num">${rankIcon}</div>
                <div class="lb-player-info">
                  <div class="lb-player-name">${this.escapeHtml(item.playerName || "Pemain")}</div>
                  <div class="lb-player-city">${cityText} ${dateText}</div>
                </div>
              </div>
              <div class="lb-right">
                <div class="lb-score-val">${Number(item.score).toLocaleString("id-ID")}</div>
              </div>
            </div>
          `;
        })
        .join("");

      const sourceNotice = isLocal
        ? `<div style="font-size: 11px; text-align: center; margin-top: 10px; color: #64748b;">* Data offline LocalStorage (Hubungkan Google Sheet untuk online)</div>`
        : `<div style="font-size: 11px; text-align: center; margin-top: 10px; color: #10b981;">⚡ Terhubung Realtime dengan Google Sheet</div>`;

      body.innerHTML = `<div class="lb-list">${html}</div>${sourceNotice}`;
    },

    submitScore: function (gameId, gameName, score, playerName, city) {
      const msgBox = document.getElementById("lb-msg-box");
      const sendBtn = document.getElementById("lb-btn-send");
      if (!msgBox || !sendBtn) return;

      sendBtn.disabled = true;
      sendBtn.innerHTML = `<span>Menyimpan...</span> ⏳`;
      msgBox.className = "lb-msg-box";
      msgBox.style.display = "none";

      const payload = {
        gameId: gameId,
        gameName: gameName,
        playerName: playerName,
        score: Number(score) || 0,
        city: city || "Samarinda"
      };

      // Simpan juga ke LocalStorage sebagai backup instan
      try {
        const key = `arcade_scores_${gameId}`;
        const localList = JSON.parse(localStorage.getItem(key) || "[]");
        localList.push({
          playerName: playerName,
          score: Number(score) || 0,
          city: city,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19)
        });
        localList.sort((a, b) => b.score - a.score);
        localStorage.setItem(key, JSON.stringify(localList.slice(0, 20)));
      } catch (e) {}

      const apiUrl = this.getApiUrl();

      if (apiUrl) {
        fetch(apiUrl, {
          method: "POST",
          mode: "no-cors", // Google Apps Script redirect mode
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(() => {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<span>Kirim</span> 🚀`;
            msgBox.className = "lb-msg-box success";
            msgBox.textContent = `✅ Berhasil dikirim ke Google Sheet Peringkat!`;
            setTimeout(() => this.loadLeaderboard(gameId), 600);
          })
          .catch((err) => {
            console.error("Gagal mengirim ke Google Apps Script:", err);
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<span>Kirim</span> 🚀`;
            msgBox.className = "lb-msg-box success";
            msgBox.textContent = `✅ Tersimpan di perangkat (Koneksi cloud offline).`;
            this.loadLeaderboard(gameId);
          });
      } else {
        setTimeout(() => {
          sendBtn.disabled = false;
          sendBtn.innerHTML = `<span>Kirim</span> 🚀`;
          msgBox.className = "lb-msg-box success";
          msgBox.textContent = `✅ Skor berhasil disimpan di Papan Peringkat lokal!`;
          this.loadLeaderboard(gameId);
        }, 400);
      }
    },

    promptConfigUrl: function () {
      const currentUrl = this.getApiUrl();
      const newUrl = prompt(
        "Masukkan URL Web App Google Apps Script Anda (berakhiran /exec):\n\n(Kosongkan jika ingin menggunakan penyimpanan lokal)",
        currentUrl
      );
      if (newUrl !== null) {
        this.setApiUrl(newUrl);
        alert(newUrl.trim() ? "✅ URL Google Apps Script berhasil disimpan!" : "Menggunakan penyimpanan lokal.");
        this.loadLeaderboard(this.currentGameId);
      }
    },

    escapeHtml: function (str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };

  window.ArcadeLeaderboard = Leaderboard;
})();
