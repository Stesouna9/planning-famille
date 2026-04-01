/* ============================================
   Planning Famille — app.js (v2)
   ============================================ */

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAYS_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const STORAGE_KEY = "planning-famille-manual";

// State
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let currentWeekStart = getMonday(new Date());
let currentUser = null;
let currentView = "grid"; // default to grid
let manualEvents = loadManualEvents();

/* ==================================================
   1. CONNEXION
   ================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const saved = sessionStorage.getItem("planning-user");
    if (saved) {
        currentUser = JSON.parse(saved);
        showApp();
    }
    bindLogin();
});

function bindLogin() {
    const btn = document.getElementById("login-btn");
    const input = document.getElementById("code-input");
    const err = document.getElementById("code-error");

    function tryLogin() {
        const code = input.value.trim();
        const user = CONFIG.CODES[code];
        if (user) {
            currentUser = user;
            sessionStorage.setItem("planning-user", JSON.stringify(user));
            err.classList.add("hidden");
            showApp();
        } else {
            err.classList.remove("hidden");
            input.value = "";
            input.focus();
        }
    }

    btn.addEventListener("click", tryLogin);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
}

function showApp() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("user-name").textContent = currentUser.name;

    if (currentUser.role === "nounou") {
        document.getElementById("legend").innerHTML = `
            <span class="legend-item"><span class="dot" style="background:var(--nounou)"></span>Garde</span>
            <span class="legend-item"><span class="dot" style="background:var(--vacances)"></span>Vacances</span>
        `;
        document.getElementById("conges-communs").classList.add("hidden");
    }

    document.getElementById("logout-btn").addEventListener("click", () => {
        sessionStorage.removeItem("planning-user");
        location.reload();
    });

    bindNavigation();
    bindViewToggle();
    bindModal();
    render();
}

/* ==================================================
   2. NAVIGATION
   ================================================== */
function bindNavigation() {
    document.getElementById("prev-week").addEventListener("click", () => {
        if (currentView === "list") {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        } else {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        }
        render();
    });
    document.getElementById("next-week").addEventListener("click", () => {
        if (currentView === "list") {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        } else {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        }
        render();
    });
    document.getElementById("today-btn").addEventListener("click", () => {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();
        currentWeekStart = getMonday(now);
        render();
    });
}

function bindViewToggle() {
    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentView = btn.dataset.view;
            render();
        });
    });
}

/* ==================================================
   3. CALCULS AUTOMATIQUES
   ================================================== */
function gabrielWorks(dateStr) {
    // Check manual override first
    const manual = manualEvents[dateStr];
    if (manual && manual.gabriel === "travail") return true;
    if (manual && manual.gabriel === "repos") return false;
    // Default: SEMITAN planning
    const status = CONFIG.GABRIEL_PLANNING[dateStr];
    return status === "travail";
}

function miekoWorks(dateStr) {
    const ref = new Date("2026-04-02T00:00:00");
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((d - ref) / 86400000);
    const mod = ((diff % 4) + 4) % 4;
    return mod === 2 || mod === 3;
}

function isVacances(dateStr) {
    for (const v of CONFIG.VACANCES) {
        if (dateStr >= v.debut && dateStr < v.fin) return v.nom;
    }
    return false;
}

function isFerie(dateStr) {
    return CONFIG.JOURS_FERIES.includes(dateStr);
}

function hasSchool(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    if (dow === 3) return "matin";
    if (isVacances(dateStr)) return false;
    if (isFerie(dateStr)) return false;
    return true;
}

function nounouNeeded(dateStr) {
    return gabrielWorks(dateStr) && miekoWorks(dateStr);
}

function nounouTarif(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    if (isVacances(dateStr)) return CONFIG.TARIFS.jour_complet;
    if (dow === 0 || dow === 3 || dow === 6) return CONFIG.TARIFS.jour_complet;
    return CONFIG.TARIFS.jour_ecole;
}

function getDayStatus(dateStr) {
    const gWork = gabrielWorks(dateStr);
    const mWork = miekoWorks(dateStr);
    if (gWork && mWork) return "both-work";
    if (!gWork && !mWork) return "both-off";
    if (gWork && !mWork) return "papa-only";
    return "maman-only";
}

/* ==================================================
   4. RENDU PRINCIPAL
   ================================================== */
function render() {
    if (currentView === "grid") {
        renderGrid();
    } else {
        renderList();
    }
}

/* ---- Vue Grille (Calendrier mensuel) ---- */
function renderGrid() {
    const cal = document.getElementById("calendar");
    const label = document.getElementById("week-label");
    cal.innerHTML = "";
    cal.className = "cal-grid";

    label.textContent = `${MONTHS_FR[currentMonth]} ${currentYear}`;

    // Header row
    const headerNames = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
    headerNames.forEach(name => {
        const h = document.createElement("div");
        h.className = "g-header";
        h.textContent = name;
        cal.appendChild(h);
    });

    // Build grid days
    const first = new Date(currentYear, currentMonth, 1);
    const start = getMonday(first);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const end = new Date(lastDay);
    while (end.getDay() !== 0) end.setDate(end.getDate() + 1);

    const todayStr = formatDate(new Date());
    let stats = { days: 0, cost: 0, d40: 0, d70: 0, conges: [] };

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const date = new Date(d);
        const dateStr = formatDate(date);
        const inMonth = date.getMonth() === currentMonth;
        const isToday = dateStr === todayStr;
        const info = getDayInfo(dateStr);

        if (inMonth) calcStats(info, stats);

        const cell = document.createElement("div");
        cell.className = "g-cell";
        if (!inMonth) cell.classList.add("g-dim");
        if (isToday) cell.classList.add("g-today");

        // Background color
        cell.setAttribute("data-status", info.status);

        if (currentUser.role === "nounou" && !info.nounou && !info.annulation) {
            cell.classList.add("g-inactive");
        }

        if (currentUser.role === "admin") {
            cell.addEventListener("click", () => openModal(dateStr));
        }

        // Build cell content
        let html = `<div class="g-num">${date.getDate()}</div>`;

        if (currentUser.role === "admin") {
            html += `<div class="g-label g-label-${info.status}">${info.statusLabel}</div>`;
        }

        if (info.nounou && !info.annulation) {
            html += `<div class="g-badge g-badge-nounou">${info.tarif} €</div>`;
        }
        if (info.annulation) {
            html += `<div class="g-badge g-badge-cancel">Annulé</div>`;
        }
        if (info.vacances) {
            html += `<div class="g-badge g-badge-vac">\u{1F3D6}</div>`;
        }
        if (info.ferie) {
            html += `<div class="g-badge g-badge-ferie">F</div>`;
        }
        if (info.school === "matin") {
            html += `<div class="g-badge g-badge-ecole">AM</div>`;
        }

        cell.innerHTML = html;
        cal.appendChild(cell);
    }

    renderSummary(stats);
    renderCongesCommuns(stats.conges);
}

/* ---- Vue Liste (semaine) ---- */
function renderList() {
    const cal = document.getElementById("calendar");
    const label = document.getElementById("week-label");
    cal.innerHTML = "";
    cal.className = "cal-list";

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        days.push(d);
    }

    const endD = days[6];
    const s = MONTHS_FR[days[0].getMonth()];
    const e = MONTHS_FR[endD.getMonth()];
    label.textContent = s === e
        ? `${days[0].getDate()} — ${endD.getDate()} ${s} ${endD.getFullYear()}`
        : `${days[0].getDate()} ${s} — ${endD.getDate()} ${e} ${endD.getFullYear()}`;

    const todayStr = formatDate(new Date());
    let stats = { days: 0, cost: 0, d40: 0, d70: 0, conges: [] };

    days.forEach(date => {
        const dateStr = formatDate(date);
        const isToday = dateStr === todayStr;
        const info = getDayInfo(dateStr);
        calcStats(info, stats);

        const row = document.createElement("div");
        row.className = "l-row";
        row.setAttribute("data-status", info.status);
        if (isToday) row.classList.add("l-today");

        if (currentUser.role === "nounou" && !info.nounou && !info.annulation) {
            row.classList.add("g-inactive");
        }

        if (currentUser.role === "admin") {
            row.addEventListener("click", () => openModal(dateStr));
        }

        let html = `<div class="l-date">
            <span class="l-day-name">${DAYS_FR[date.getDay()]}</span>
            <span class="l-day-num">${date.getDate()}</span>
        </div>`;

        html += `<div class="l-content">`;
        if (currentUser.role === "admin") {
            html += `<span class="l-status l-status-${info.status}">${info.statusLabel}</span>`;
        }
        if (info.nounou && !info.annulation) {
            html += `<span class="l-tag l-tag-nounou">Nounou</span>`;
            html += `<span class="l-tag l-tag-prix">${info.tarif} €</span>`;
        }
        if (info.annulation) {
            html += `<span class="l-tag l-tag-cancel">Annulé ${CONFIG.TARIFS.annulation} €</span>`;
        }
        if (info.school === true) {
            html += `<span class="l-tag l-tag-ecole">École</span>`;
        } else if (info.school === "matin") {
            html += `<span class="l-tag l-tag-ecole">École matin</span>`;
        }
        if (info.vacances) {
            html += `<span class="l-tag l-tag-vac">\u{1F3D6} Vac. Saku</span>`;
        }
        if (info.ferie) {
            html += `<span class="l-tag l-tag-ferie">Férié</span>`;
        }
        if (info.note) {
            html += `<span class="l-note">${info.note}</span>`;
        }
        html += `</div>`;

        row.innerHTML = html;
        cal.appendChild(row);
    });

    renderSummary(stats);
    renderCongesCommuns(stats.conges);
}

/* ---- Helpers ---- */
function getDayInfo(dateStr) {
    const status = getDayStatus(dateStr);
    const manual = manualEvents[dateStr] || null;
    const statusLabels = {
        "both-work": "Les 2",
        "both-off": "Repos",
        "papa-only": "Papa",
        "maman-only": "Maman"
    };
    return {
        status,
        statusLabel: statusLabels[status],
        nounou: nounouNeeded(dateStr),
        tarif: nounouTarif(dateStr),
        school: hasSchool(dateStr),
        vacances: isVacances(dateStr),
        ferie: isFerie(dateStr),
        annulation: manual && manual.type === "annulation",
        note: manual ? manual.note : null,
        dateStr
    };
}

function calcStats(info, stats) {
    if (info.nounou && !info.annulation) {
        stats.days++;
        stats.cost += info.tarif;
        if (info.tarif === 40) stats.d40++; else stats.d70++;
    }
    if (info.annulation) stats.cost += CONFIG.TARIFS.annulation;
    if (info.status === "both-off") {
        const d = new Date(info.dateStr + "T00:00:00");
        stats.conges.push(d);
    }
}

function renderSummary(stats) {
    document.getElementById("summary-days").textContent = stats.days + " jour" + (stats.days > 1 ? "s" : "");
    document.getElementById("summary-cost").textContent = stats.cost + " €";

    let detail = "";
    if (stats.d40 > 0) detail += stats.d40 + "j × 40€ = " + (stats.d40 * 40) + "€\n";
    if (stats.d70 > 0) detail += stats.d70 + "j × 70€ = " + (stats.d70 * 70) + "€";
    document.getElementById("summary-detail").textContent = detail || "Aucune garde";

    const period = currentView === "grid" ? "ce mois" : "cette semaine";
    document.getElementById("summary-title").textContent =
        currentUser.role === "nounou" ? `Mes gains estimés ${period}` : `Coût nounou ${period}`;

    document.getElementById("conges-title").textContent =
        `Congés communs ${period}`;
}

function renderCongesCommuns(dates) {
    const section = document.getElementById("conges-communs");
    const list = document.getElementById("conges-list");
    if (currentUser.role !== "admin" || dates.length === 0) {
        section.classList.add("hidden");
        return;
    }
    section.classList.remove("hidden");
    list.innerHTML = "";
    dates.forEach(d => {
        const chip = document.createElement("span");
        chip.className = "conge-chip";
        chip.textContent = `${DAYS_FR[d.getDay()]} ${d.getDate()}`;
        list.appendChild(chip);
    });
}

/* ==================================================
   5. MODAL
   ================================================== */
function bindModal() {
    const modal = document.getElementById("modal");
    document.getElementById("modal-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.getElementById("event-form").addEventListener("submit", (e) => {
        e.preventDefault();
        saveManualEvent();
    });
    document.getElementById("btn-delete").addEventListener("click", () => {
        deleteManualEvent(document.getElementById("modal").dataset.date);
        closeModal();
    });
}

function openModal(dateStr) {
    if (currentUser.role !== "admin") return;
    const modal = document.getElementById("modal");
    const d = new Date(dateStr + "T00:00:00");
    document.getElementById("modal-title").textContent =
        `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
    modal.dataset.date = dateStr;
    const existing = manualEvents[dateStr];
    document.getElementById("event-gabriel").value = existing ? (existing.gabriel || "auto") : "auto";
    document.getElementById("event-type").value = existing ? (existing.type || "") : "";
    document.getElementById("event-note").value = existing ? (existing.note || "") : "";
    document.getElementById("btn-delete").classList.toggle("hidden", !existing);
    modal.classList.remove("hidden");
}

function closeModal() { document.getElementById("modal").classList.add("hidden"); }

function saveManualEvent() {
    const dateStr = document.getElementById("modal").dataset.date;
    const gabriel = document.getElementById("event-gabriel").value;
    const type = document.getElementById("event-type").value;
    const note = document.getElementById("event-note").value.trim();

    // Only save if something changed
    const data = {};
    if (gabriel !== "auto") data.gabriel = gabriel;
    if (type) data.type = type;
    if (note) data.note = note;

    if (Object.keys(data).length > 0) {
        manualEvents[dateStr] = data;
    } else {
        delete manualEvents[dateStr];
    }
    persistManualEvents();
    closeModal();
    render();
}

function deleteManualEvent(dateStr) {
    delete manualEvents[dateStr];
    persistManualEvents();
    render();
}

/* ==================================================
   6. STOCKAGE
   ================================================== */
function loadManualEvents() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
}

function persistManualEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualEvents));
}

/* ==================================================
   7. UTILITAIRES
   ================================================== */
function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatDate(d) {
    return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
}
