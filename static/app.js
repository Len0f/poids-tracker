// ─── ÉTAT ────────────────────────────────────────────────────────────────────
let entries = []; // Tableau d'objets { id, date, weight, note }
let chart = null;
let activeTab = "daily";

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.getElementById("inp-date").value = todayStr();
fetchEntries();
fetchMe(); // Charge le pseudo de l'utilisateur connecté

async function fetchMe() {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    document.getElementById("username-display").textContent =
      "👤 " + data.username;
  } catch {}
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

// ─── API CALLS ────────────────────────────────────────────────────────────────
// Toutes les fonctions qui parlent au backend FastAPI

async function fetchEntries() {
  try {
    // GET /api/entries → retourne le tableau JSON de toutes les entrées
    const res = await fetch("/api/entries");
    if (!res.ok) throw new Error("Erreur serveur");
    const data = await res.json();
    // Les entrées arrivent triées par date DESC (plus récente en premier)
    // On les inverse pour avoir l'ordre chronologique pour le graphique
    entries = data.reverse();
    render();
  } catch (err) {
    showToast("Impossible de charger les données", "error");
  }
}

async function addEntry() {
  const date = document.getElementById("inp-date").value;
  const weight = parseFloat(document.getElementById("inp-weight").value);
  const note = document.getElementById("inp-note").value.trim();

  if (!date || isNaN(weight)) {
    document.getElementById("inp-weight").style.borderColor = "#f06080";
    setTimeout(
      () => (document.getElementById("inp-weight").style.borderColor = ""),
      1000,
    );
    return;
  }

  const btn = document.getElementById("btn-save");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";

  try {
    // POST /api/entries avec le body JSON
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // JSON.stringify() convertit l'objet JS en string JSON
      body: JSON.stringify({ date, weight, note: note || null }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erreur");
    }

    document.getElementById("inp-weight").value = "";
    document.getElementById("inp-note").value = "";
    document.getElementById("inp-date").value = todayStr();
    showToast("Poids enregistré ✓", "success");
    await fetchEntries(); // Recharge toutes les données
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "＋ Enregistrer";
  }
}

async function deleteEntry(dateStr) {
  if (!confirm(`Supprimer l'entrée du ${fmtDate(dateStr)} ?`)) return;

  try {
    // DELETE /api/entries/2024-01-15
    const res = await fetch(`/api/entries/${dateStr}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erreur suppression");
    showToast("Entrée supprimée", "success");
    await fetchEntries();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function diffStr(d) {
  if (d === null || d === undefined || isNaN(d)) return null;
  return `${d > 0 ? "+" : ""}${d.toFixed(1)} kg`;
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ─── STATS ────────────────────────────────────────────────────────────────────

function computeStats() {
  if (!entries.length) return;

  const last = entries[entries.length - 1];
  const elLast = document.getElementById("stat-last");
  elLast.textContent = `${last.weight.toFixed(1)} kg`;
  elLast.className = "stat-value neutral";
  document.getElementById("stat-last-date").textContent = fmtDate(last.date);

  // Semaine : vendredi dernier → aujourd'hui
  // 0=Dim 1=Lun 2=Mar 3=Mer 4=Jeu 5=Ven 6=Sam
  const today = new Date();
  const dow = today.getDay();
  const daysBack = [8, 3, 4, 5, 6, 0, 1]; // jours depuis le dernier vendredi
  const daysToLastFri = daysBack[dow];
  const lastFri = new Date(today);
  lastFri.setDate(today.getDate() - daysToLastFri);
  const lastFriStr = lastFri.toISOString().slice(0, 10);

  const friEntry = entries.filter((e) => e.date <= lastFriStr).pop();
  const todayEntry = entries.filter((e) => e.date <= todayStr()).pop();

  const elWeek = document.getElementById("stat-week");
  if (friEntry && todayEntry && friEntry.date !== todayEntry.date) {
    const wd = todayEntry.weight - friEntry.weight;
    elWeek.textContent = diffStr(wd);
    elWeek.className =
      "stat-value " + (wd < 0 ? "loss" : wd > 0 ? "gain" : "neutral");
    document.getElementById("stat-week-sub").textContent =
      `${fmtDate(friEntry.date)} → ${fmtDate(todayEntry.date)}`;
  } else {
    elWeek.textContent = "—";
    elWeek.className = "stat-value neutral";
  }

  // Mois courant
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEntry = entries.find((e) => e.date >= monthStart);
  const elMonth = document.getElementById("stat-month");
  if (monthEntry && last.date !== monthEntry.date) {
    const md = last.weight - monthEntry.weight;
    elMonth.textContent = diffStr(md);
    elMonth.className =
      "stat-value " + (md < 0 ? "loss" : md > 0 ? "gain" : "neutral");
    document.getElementById("stat-month-sub").textContent =
      `depuis le ${fmtDate(monthEntry.date)}`;
  } else {
    elMonth.textContent = "—";
    document.getElementById("stat-month-sub").textContent =
      "pas assez de données";
  }
}

// ─── GRAPHIQUE ────────────────────────────────────────────────────────────────

function renderChart() {
  const ctx = document.getElementById("chart").getContext("2d");
  if (chart) chart.destroy();
  if (!entries.length) return;

  const minW = Math.min(...entries.map((e) => e.weight)) - 1;
  const maxW = Math.max(...entries.map((e) => e.weight)) + 1;

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: entries.map((e) => fmtDate(e.date)),
      datasets: [
        {
          data: entries.map((e) => e.weight),
          borderColor: "#c8f060",
          backgroundColor: (c) => {
            const g = c.chart.ctx.createLinearGradient(0, 0, 0, 200);
            g.addColorStop(0, "rgba(200,240,96,0.25)");
            g.addColorStop(1, "rgba(200,240,96,0)");
            return g;
          },
          pointBackgroundColor: "#c8f060",
          pointRadius: entries.length > 30 ? 2 : 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1e2126",
          borderColor: "#2a2d35",
          borderWidth: 1,
          titleFont: { family: "DM Mono" },
          bodyFont: { family: "DM Mono" },
          callbacks: { label: (c) => ` ${c.raw.toFixed(1)} kg` },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#6b7280",
            font: { family: "DM Mono", size: 10 },
            maxTicksLimit: 8,
          },
          grid: { color: "#1e2126" },
        },
        y: {
          min: minW,
          max: maxW,
          ticks: {
            color: "#6b7280",
            font: { family: "DM Mono", size: 10 },
            callback: (v) => v.toFixed(1) + " kg",
          },
          grid: { color: "#2a2d35" },
        },
      },
    },
  });
}

// ─── HISTORIQUE ───────────────────────────────────────────────────────────────

function switchTab(tab, el) {
  activeTab = tab;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  renderHistory();
}

function renderHistory() {
  const cont = document.getElementById("history-content");
  if (!entries.length) {
    cont.innerHTML = '<div class="empty">Aucune entrée pour le moment.</div>';
    return;
  }
  if (activeTab === "daily") renderDaily(cont);
  else if (activeTab === "weekly") renderWeekly(cont);
  else renderMonthly(cont);
}

function renderDaily(cont) {
  const reversed = [...entries].reverse();
  let html =
    '<table class="history-table"><thead><tr><th>Date</th><th>Poids</th><th>Diff. J-1</th><th>Note</th><th></th></tr></thead><tbody>';
  reversed.forEach((e, i) => {
    const prev = reversed[i + 1];
    const diff = prev ? e.weight - prev.weight : null;
    const cls =
      diff === null ? "none" : diff < 0 ? "loss" : diff > 0 ? "gain" : "none";
    const pill =
      diff !== null
        ? `<span class="diff-pill ${cls}">${diffStr(diff)}</span>`
        : '<span class="diff-pill none">—</span>';
    html += `<tr>
      <td>${fmtDate(e.date)}</td>
      <td><strong>${e.weight.toFixed(1)}</strong> kg</td>
      <td>${pill}</td>
      <td style="color:var(--muted);font-size:0.75rem">${e.note || ""}</td>
      <td><button class="del-btn" onclick="deleteEntry('${e.date}')">✕</button></td>
    </tr>`;
  });
  html += "</tbody></table>";
  cont.innerHTML = html;
}

function renderWeekly(cont) {
  if (entries.length < 2) {
    cont.innerHTML = '<div class="empty">Pas assez de données.</div>';
    return;
  }
  const weeks = {};
  entries.forEach((e) => {
    const d = new Date(e.date + "T00:00:00");
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const mon = new Date(d);
    mon.setDate(d.getDate() - diff);
    const key = mon.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(e);
  });
  const sortedWeeks = Object.keys(weeks).sort().reverse();
  let html = "";
  sortedWeeks.forEach((wk) => {
    const wEntries = weeks[wk];
    const first = wEntries[0];
    const last = wEntries[wEntries.length - 1];
    const diff = wEntries.length > 1 ? last.weight - first.weight : null;
    const cls =
      diff === null ? "none" : diff < 0 ? "loss" : diff > 0 ? "gain" : "none";
    const sunDate = new Date(wk + "T00:00:00");
    sunDate.setDate(sunDate.getDate() + 6);
    html += `<div class="week-section">
      <div class="week-header">
        <span>${fmtDate(wk)} → ${sunDate.toISOString().slice(0, 10).split("-").reverse().join("/")} · ${wEntries.length} entrée(s)</span>
        ${diff !== null ? `<span class="week-diff" style="color:var(--${cls === "loss" ? "accent" : cls === "gain" ? "danger" : "muted"})">${diffStr(diff)}</span>` : ""}
      </div>
      <table class="history-table"><tbody>`;
    wEntries.forEach((e) => {
      html += `<tr><td>${fmtDate(e.date)}</td><td><strong>${e.weight.toFixed(1)}</strong> kg</td><td style="color:var(--muted);font-size:0.75rem">${e.note || ""}</td></tr>`;
    });
    html += "</tbody></table></div>";
  });
  cont.innerHTML = html;
}

function renderMonthly(cont) {
  const months = {};
  entries.forEach((e) => {
    const key = e.date.slice(0, 7);
    if (!months[key]) months[key] = [];
    months[key].push(e);
  });
  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  const sorted = Object.keys(months).sort().reverse();
  let html =
    '<table class="history-table"><thead><tr><th>Mois</th><th>Début</th><th>Fin</th><th>Évolution</th><th>Entrées</th></tr></thead><tbody>';
  sorted.forEach((m) => {
    const mEntries = months[m];
    const first = mEntries[0];
    const last = mEntries[mEntries.length - 1];
    const diff = mEntries.length > 1 ? last.weight - first.weight : null;
    const cls =
      diff === null ? "none" : diff < 0 ? "loss" : diff > 0 ? "gain" : "none";
    const [y, mo] = m.split("-");
    html += `<tr>
      <td><strong>${monthNames[parseInt(mo) - 1]} ${y}</strong></td>
      <td>${first.weight.toFixed(1)} kg</td>
      <td>${last.weight.toFixed(1)} kg</td>
      <td>${diff !== null ? `<span class="diff-pill ${cls}">${diffStr(diff)}</span>` : '<span class="diff-pill none">—</span>'}</td>
      <td style="color:var(--muted)">${mEntries.length}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  cont.innerHTML = html;
}

// ─── CALCUL DE PLAGE ──────────────────────────────────────────────────────────

function calcRange() {
  const from = document.getElementById("range-from").value;
  const to = document.getElementById("range-to").value;
  const res = document.getElementById("range-result");
  if (!from || !to) {
    showToast("Sélectionne les deux dates", "error");
    return;
  }
  if (from > to) {
    showToast("La date de début doit être avant la date de fin", "error");
    return;
  }

  // Entrée la plus proche après "from" (ou exactement ce jour)
  const eFrom = entries.find((e) => e.date >= from);
  // Entrée la plus proche avant "to" (ou exactement ce jour)
  const eTo = [...entries].reverse().find((e) => e.date <= to);

  if (!eFrom || !eTo || eFrom.date === eTo.date) {
    res.style.display = "block";
    document.getElementById("range-label").textContent =
      "Pas assez de données sur cette période";
    document.getElementById("range-value").textContent = "";
    return;
  }

  const diff = eTo.weight - eFrom.weight;
  const cls =
    diff < 0 ? "var(--accent)" : diff > 0 ? "var(--danger)" : "var(--muted)";
  res.style.display = "block";
  document.getElementById("range-label").textContent =
    `${fmtDate(eFrom.date)} (${eFrom.weight.toFixed(1)} kg)\n→ ${fmtDate(eTo.date)} (${eTo.weight.toFixed(1)} kg)`;
  const rv = document.getElementById("range-value");
  rv.textContent = diffStr(diff);
  rv.style.color = cls;
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function render() {
  computeStats();
  renderChart();
  renderHistory();
}
