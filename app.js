/* ============================================
   Planning Famille — app.js
   ============================================ */

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAYS_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const STORAGE_KEY = "planning-famille-manual";
let currentWeekStart = getMonday(new Date());
let currentUser = null; // { name, role }
let currentView = "week";
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

    // Adjust legend for nounou
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
    renderCalendar();
}

/* ==================================================
   2. NAVIGATION
   ================================================== */
function bindNavigation() {
    document.getElementById("prev-week").addEventListener("click", () => {
        if (currentView === "week") {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        } else {
            // Grid: go back one month
            const ref = new Date(currentWeekStart);
            ref.setDate(ref.getDate() + 3);
            ref.setMonth(ref.getMonth() - 1, 1);
            currentWeekStart = getMonday(ref);
        }
        renderCalendar();
    });
    document.getElementById("next-week").addEventListener("click", () => {
        if (currentView === "week") {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        } else {
            // Grid: go forward one month
            const ref = new Date(currentWeekStart);
            ref.setDate(ref.getDate() + 3);
            ref.setMonth(ref.getMonth() + 1, 1);
            currentWeekStart = getMonday(ref);
        }
        renderCalendar();
    });
    document.getElementById("today-btn").addEventListener("click", () => {
        currentWeekStart = getMonday(new Date());
        renderCalendar();
    });
}

function bindViewToggle() {
    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentView = btn.dataset.view;
            if (currentView === "month") {
                const now = new Date(currentWeekStart);
                currentWeekStart = getMonday(new Date(now.getFullYear(), now.getMonth(), 1));
            }
            renderCalendar();
        });
    });
}

/* ==================================================
   3. CALCULS AUTOMATIQUES
   ================================================== */

/** Gabriel travaille ce jour ? */
function gabrielWorks(dateStr) {
    const status = CONFIG.GABRIEL_PLANNING[dateStr];
    if (!status) return false;
    return status === "travail";
}

/** Gabriel est en repos/congé ce jour ? */
function gabrielOff(dateStr) {
    const status = CONFIG.GABRIEL_PLANNING[dateStr];
    if (!status) return true; // pas de data = on ne sait pas, on suppose off
    return status !== "travail";
}

/** Mieko travaille ce jour ? (cycle 2/2) */
function miekoWorks(dateStr) {
    const ref = new Date("2026-04-02T00:00:00");
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((d - ref) / 86400000);
    const mod = ((diff % 4) + 4) % 4;
    return mod === 2 || mod === 3; // 0,1 = repos / 2,3 = travail
}

/** Est-ce un jour de vacances scolaires ? */
function isVacances(dateStr) {
    for (const v of CONFIG.VACANCES) {
        if (dateStr >= v.debut && dateStr < v.fin) return v.nom;
    }
    return false;
}

/** Est-ce un jour férié ? */
function isFerie(dateStr) {
    return CONFIG.JOURS_FERIES.includes(dateStr);
}

/** Saku a école ce jour ? */
function hasSchool(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay(); // 0=dim, 6=sam
    if (dow === 0 || dow === 6) return false;        // weekend
    if (dow === 3) return "matin";                     // mercredi = matin seulement
    if (isVacances(dateStr)) return false;             // vacances
    if (isFerie(dateStr)) return false;                // férié
    return true;                                        // lun, mar, jeu, ven
}

/** La nounou est-elle nécessaire ce jour ? (les 2 parents travaillent) */
function nounouNeeded(dateStr) {
    return gabrielWorks(dateStr) && miekoWorks(dateStr);
}

/** Calcul du tarif nounou pour un jour donné */
function nounouTarif(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    // Vacances scolaires = toujours 70€
    if (isVacances(dateStr)) return CONFIG.TARIFS.jour_complet;
    // Mercredi, Samedi, Dimanche = 70€
    if (dow === 0 || dow === 3 || dow === 6) return CONFIG.TARIFS.jour_complet;
    // Jours d'école (lun, mar, jeu, ven) = 40€
    return CONFIG.TARIFS.jour_ecole;
}

/** Statut combiné du jour */
function getDayStatus(dateStr) {
    const gWork = gabrielWorks(dateStr);
    const mWork = miekoWorks(dateStr);

    if (gWork && mWork) return "both-work";
    if (!gWork && !mWork) return "both-off";
    if (gWork && !mWork) return "papa-only";
    return "maman-only";
}

/* ==================================================
   4. RENDU CALENDRIER
   ================================================== */
function renderCalendar() {
    const cal = document.getElementById("calendar");
    const label = document.getElementById("week-label");
    cal.innerHTML = "";

    // Grid view = separate render
    if (currentView === "grid") {
        renderGridCalendar(cal, label);
        return;
    }

    let days = [];

    // Week list view
    for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        days.push(d);
    }
    const end = days[6];
    const s = MONTHS_FR[days[0].getMonth()];
    const e = MONTHS_FR[end.getMonth()];
    label.textContent = s === e
        ? `${days[0].getDate()} — ${end.getDate()} ${s} ${end.getFullYear()}`
        : `${days[0].getDate()} ${s} — ${end.getDate()} ${e} ${end.getFullYear()}`;

    const todayStr = formatDate(new Date());
    let monthNounouDays = 0;
    let monthNounouCost = 0;
    let monthDetail40 = 0;
    let monthDetail70 = 0;
    let monthCongesCommuns = [];

    // Track which month we're summarizing
    const refDate = currentView === "week" ? new Date(currentWeekStart) : null;
    const summaryMonth = currentView === "month"
        ? new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + (currentWeekStart.getDate() > 15 ? 1 : 0), 1).getMonth()
        : null;

    days.forEach(date => {
        const dateStr = formatDate(date);
        const isToday = dateStr === todayStr;
        const status = getDayStatus(dateStr);
        const school = hasSchool(dateStr);
        const vacances = isVacances(dateStr);
        const ferie = isFerie(dateStr);
        const nounou = nounouNeeded(dateStr);
        const manual = getManualEvent(dateStr);
        const isAnnulation = manual && manual.type === "annulation";

        // Monthly calculations
        const inCurrentMonth = currentView === "month"
            ? date.getMonth() === (new Date(days[Math.floor(days.length / 2)]).getMonth())
            : true;

        if (inCurrentMonth) {
            if (nounou && !isAnnulation) {
                const tarif = nounouTarif(dateStr);
                monthNounouDays++;
                monthNounouCost += tarif;
                if (tarif === 40) monthDetail40++;
                else monthDetail70++;
            }
            if (isAnnulation) {
                monthNounouCost += CONFIG.TARIFS.annulation;
            }
            if (status === "both-off") {
                monthCongesCommuns.push(date);
            }
        }

        const col = document.createElement("div");
        col.className = "day-column";

        // Background color based on status
        col.classList.add(`bg-${status}`);

        // For nounou role, fade days she doesn't work
        if (currentUser.role === "nounou" && !nounou && !isAnnulation) {
            col.style.opacity = "0.25";
        }

        if (currentUser.role === "admin") {
            col.classList.add("clickable");
            col.addEventListener("click", () => openModal(dateStr));
        }

        // Header
        const header = document.createElement("div");
        header.className = "day-header" + (isToday ? " today" : "");
        header.innerHTML = `
            <span class="day-name">${DAYS_FR[date.getDay()]}</span>
            <span class="day-num">${date.getDate()}</span>
        `;
        col.appendChild(header);

        // Body
        const body = document.createElement("div");
        body.className = "day-body";

        // Status indicator (admin sees who works)
        if (currentUser.role === "admin") {
            const statusEl = document.createElement("div");
            statusEl.className = `day-status status-${status}`;
            const statusLabels = {
                "both-work": "Les 2 travaillent",
                "both-off": "Congé commun",
                "papa-only": "Papa travaille",
                "maman-only": "Maman travaille"
            };
            statusEl.textContent = statusLabels[status] || "";
            body.appendChild(statusEl);
        }

        // Tags
        if (nounou && !isAnnulation) {
            const tag = document.createElement("span");
            tag.className = "day-tag tag-nounou";
            tag.textContent = currentUser.role === "nounou" ? "Garde" : "Nounou";
            body.appendChild(tag);

            // Prix tag
            const prixTag = document.createElement("span");
            prixTag.className = "day-tag tag-prix";
            prixTag.textContent = nounouTarif(dateStr) + " €";
            body.appendChild(prixTag);
        }

        if (isAnnulation) {
            const tag = document.createElement("span");
            tag.className = "day-tag tag-annulation";
            tag.textContent = "Annulé — " + CONFIG.TARIFS.annulation + " €";
            body.appendChild(tag);
        }

        if (school === true) {
            const tag = document.createElement("span");
            tag.className = "day-tag tag-ecole";
            tag.textContent = "École";
            body.appendChild(tag);
        } else if (school === "matin") {
            const tag = document.createElement("span");
            tag.className = "day-tag tag-ecole";
            tag.textContent = "École matin";
            body.appendChild(tag);
        }

        if (vacances) {
            const tag = document.createElement("span");
            tag.className = "day-tag tag-vacances-saku";
            tag.textContent = "\u{1F3D6} Vacances Saku";
            body.appendChild(tag);
        }

        if (ferie) {
            const tag = document.createElement("span");
            tag.className = "day-tag tag-ferie";
            tag.textContent = "Férié";
            body.appendChild(tag);
        }

        // Manual note
        if (manual && manual.note) {
            const note = document.createElement("div");
            note.className = "day-note";
            note.textContent = manual.note;
            body.appendChild(note);
        }

        col.appendChild(body);
        cal.appendChild(col);
    });

    // Update monthly summary
    renderMonthlySummary(monthNounouDays, monthNounouCost, monthDetail40, monthDetail70);
    renderCongesCommuns(monthCongesCommuns);
}

function renderMonthlySummary(days, cost, d40, d70) {
    document.getElementById("summary-days").textContent = days + " jour" + (days > 1 ? "s" : "");
    document.getElementById("summary-cost").textContent = cost + " €";

    let detail = "";
    if (d40 > 0) detail += d40 + " jour" + (d40 > 1 ? "s" : "") + " × 40 € = " + (d40 * 40) + " €\n";
    if (d70 > 0) detail += d70 + " jour" + (d70 > 1 ? "s" : "") + " × 70 € = " + (d70 * 70) + " €";
    document.getElementById("summary-detail").textContent = detail || "Aucune garde";

    const title = document.getElementById("summary-title");
    title.textContent = currentUser.role === "nounou"
        ? "Mes gains estimés"
        : "Coût nounou estimé";
}

/* ==================================================
   4b. RENDU GRILLE CALENDRIER (vue carrés)
   ================================================== */
function renderGridCalendar(cal, label) {
    // Determine which month to show
    const ref = new Date(currentWeekStart);
    ref.setDate(ref.getDate() + 3);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    label.textContent = `${MONTHS_FR[month]} ${year}`;

    // Build days array for the grid (Monday-based)
    const first = new Date(year, month, 1);
    const start = getMonday(first);
    const lastDay = new Date(year, month + 1, 0);
    const end = new Date(lastDay);
    while (end.getDay() !== 0) end.setDate(end.getDate() + 1);

    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    // Switch to grid CSS
    cal.className = "calendar-grid";

    // Header row (day names)
    const headerNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    headerNames.forEach(name => {
        const h = document.createElement("div");
        h.className = "grid-day-header";
        h.textContent = name;
        cal.appendChild(h);
    });

    const todayStr = formatDate(new Date());
    let monthNounouDays = 0, monthNounouCost = 0, monthDetail40 = 0, monthDetail70 = 0;
    let monthCongesCommuns = [];

    days.forEach(date => {
        const dateStr = formatDate(date);
        const inMonth = date.getMonth() === month;
        const isToday = dateStr === todayStr;
        const status = getDayStatus(dateStr);
        const school = hasSchool(dateStr);
        const vacances = isVacances(dateStr);
        const ferie = isFerie(dateStr);
        const nounou = nounouNeeded(dateStr);
        const manual = getManualEvent(dateStr);
        const isAnnulation = manual && manual.type === "annulation";

        // Monthly stats
        if (inMonth) {
            if (nounou && !isAnnulation) {
                const tarif = nounouTarif(dateStr);
                monthNounouDays++;
                monthNounouCost += tarif;
                if (tarif === 40) monthDetail40++;
                else monthDetail70++;
            }
            if (isAnnulation) monthNounouCost += CONFIG.TARIFS.annulation;
            if (status === "both-off") monthCongesCommuns.push(date);
        }

        const cell = document.createElement("div");
        cell.className = `grid-cell bg-${status}`;
        if (!inMonth) cell.classList.add("grid-cell-dim");
        if (isToday) cell.classList.add("grid-cell-today");

        if (currentUser.role === "nounou" && !nounou && !isAnnulation) {
            cell.style.opacity = "0.25";
        }

        if (currentUser.role === "admin") {
            cell.style.cursor = "pointer";
            cell.addEventListener("click", () => openModal(dateStr));
        }

        // Day number
        const num = document.createElement("div");
        num.className = "grid-num";
        num.textContent = date.getDate();
        cell.appendChild(num);

        // Status text
        const statusLabels = {
            "both-work": "Les 2 travaillent",
            "both-off": "Congé commun",
            "papa-only": "Papa travaille",
            "maman-only": "Maman travaille"
        };
        if (currentUser.role === "admin") {
            const st = document.createElement("div");
            st.className = "grid-status";
            st.textContent = statusLabels[status] || "";
            cell.appendChild(st);
        }

        // Tags container
        const tags = document.createElement("div");
        tags.className = "grid-tags";

        if (nounou && !isAnnulation) {
            tags.innerHTML += `<span class="day-tag tag-nounou">Nounou</span>`;
            tags.innerHTML += `<span class="day-tag tag-prix">${nounouTarif(dateStr)} €</span>`;
        }
        if (isAnnulation) {
            tags.innerHTML += `<span class="day-tag tag-annulation">Annulé ${CONFIG.TARIFS.annulation} €</span>`;
        }
        if (vacances) {
            tags.innerHTML += `<span class="day-tag tag-vacances-saku">\u{1F3D6} Vac. Saku</span>`;
        }
        if (ferie) {
            tags.innerHTML += `<span class="day-tag tag-ferie">Férié</span>`;
        }
        if (school === true) {
            tags.innerHTML += `<span class="day-tag tag-ecole">École</span>`;
        } else if (school === "matin") {
            tags.innerHTML += `<span class="day-tag tag-ecole">École AM</span>`;
        }

        cell.appendChild(tags);

        if (manual && manual.note) {
            const note = document.createElement("div");
            note.className = "day-note";
            note.textContent = manual.note;
            cell.appendChild(note);
        }

        cal.appendChild(cell);
    });

    renderMonthlySummary(monthNounouDays, monthNounouCost, monthDetail40, monthDetail70);
    renderCongesCommuns(monthCongesCommuns);
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
        chip.textContent = `${DAYS_FULL[d.getDay()]} ${d.getDate()}`;
        list.appendChild(chip);
    });
}

/* ==================================================
   5. MODAL (admin only — ajout/modif manuelle)
   ================================================== */
function bindModal() {
    const modal = document.getElementById("modal");
    const form = document.getElementById("event-form");

    document.getElementById("modal-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        saveManualEvent();
    });

    document.getElementById("btn-delete").addEventListener("click", () => {
        const dateStr = document.getElementById("modal").dataset.date;
        deleteManualEvent(dateStr);
        closeModal();
    });
}

function openModal(dateStr) {
    if (currentUser.role !== "admin") return;

    const modal = document.getElementById("modal");
    const title = document.getElementById("modal-title");
    const deleteBtn = document.getElementById("btn-delete");
    const d = new Date(dateStr + "T00:00:00");

    title.textContent = `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
    modal.dataset.date = dateStr;

    const existing = getManualEvent(dateStr);
    document.getElementById("event-type").value = existing ? existing.type : "nounou";
    document.getElementById("event-note").value = existing ? (existing.note || "") : "";
    deleteBtn.classList.toggle("hidden", !existing);

    modal.classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

function saveManualEvent() {
    const modal = document.getElementById("modal");
    const dateStr = modal.dataset.date;

    manualEvents[dateStr] = {
        type: document.getElementById("event-type").value,
        note: document.getElementById("event-note").value.trim()
    };

    persistManualEvents();
    closeModal();
    renderCalendar();
    notifyNounou(dateStr, manualEvents[dateStr]);
}

function deleteManualEvent(dateStr) {
    delete manualEvents[dateStr];
    persistManualEvents();
    renderCalendar();
}

function getManualEvent(dateStr) {
    return manualEvents[dateStr] || null;
}

/* ==================================================
   6. STOCKAGE LOCAL
   ================================================== */
function loadManualEvents() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch { return {}; }
}

function persistManualEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualEvents));
}

/* ==================================================
   7. NOTIFICATIONS (EmailJS — optionnel)
   ================================================== */
function notifyNounou(dateStr, event) {
    // Si EmailJS est configuré dans config, envoyer une notification
    if (!CONFIG.EMAILJS_SERVICE_ID) return;

    const d = new Date(dateStr + "T00:00:00");
    const label = event.type === "annulation" ? "ANNULATION" : "Modification";
    const dateLabel = `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;

    try {
        emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
            to_email: CONFIG.NOUNOU_EMAIL || "",
            subject: `Planning Saku — ${label} le ${dateLabel}`,
            message: `${label} sur le planning de Saku-Aloïs pour le ${dateLabel}.\n${event.note ? "Note: " + event.note : ""}\nConsultez le planning : ${CONFIG.SITE_URL || window.location.href}`,
            from_name: currentUser.name
        });
    } catch (err) {
        console.warn("Notification email non envoyée:", err);
    }
}

/* ==================================================
   8. UTILITAIRES
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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
