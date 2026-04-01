/* Planning Famille — app.js */

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const STORAGE_KEY = "planning-famille-events";

let currentWeekStart = getMonday(new Date());
let events = loadEvents();
let editingEvent = null;

/* ---- Initialisation ---- */
document.addEventListener("DOMContentLoaded", () => {
    renderWeek();
    bindNavigation();
    bindModal();
    checkGoogleSheets();
});

/* ---- Navigation ---- */
function bindNavigation() {
    document.getElementById("prev-week").addEventListener("click", () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeek();
    });
    document.getElementById("next-week").addEventListener("click", () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeek();
    });
    document.getElementById("today-btn").addEventListener("click", () => {
        currentWeekStart = getMonday(new Date());
        renderWeek();
    });
}

/* ---- Rendu du calendrier ---- */
function renderWeek() {
    const label = document.getElementById("week-label");
    const cal = document.getElementById("calendar");
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);

    const startMonth = MONTHS_FR[currentWeekStart.getMonth()];
    const endMonth = MONTHS_FR[end.getMonth()];
    if (startMonth === endMonth) {
        label.textContent = `${currentWeekStart.getDate()} — ${end.getDate()} ${startMonth} ${end.getFullYear()}`;
    } else {
        label.textContent = `${currentWeekStart.getDate()} ${startMonth} — ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
    }

    cal.innerHTML = "";
    const today = formatDate(new Date());

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);
        const isToday = dateStr === today;

        const col = document.createElement("div");
        col.className = "day-column";

        const header = document.createElement("div");
        header.className = "day-header" + (isToday ? " today" : "");
        header.innerHTML = `
            <span class="day-name">${DAYS_FR[date.getDay()]}</span>
            <span class="day-num">${date.getDate()}</span>
        `;
        col.appendChild(header);

        const eventsContainer = document.createElement("div");
        eventsContainer.className = "day-events";

        const dayEvents = getEventsForDate(dateStr);
        dayEvents.sort((a, b) => (a.start || "").localeCompare(b.start || ""));

        dayEvents.forEach(ev => {
            const el = document.createElement("div");
            el.className = `event event-${ev.type}`;
            el.innerHTML = `
                <span class="event-label">${CONFIG.EVENT_LABELS[ev.type] || ev.type}</span>
                ${ev.start && ev.end ? `<span class="event-time">${ev.start} — ${ev.end}</span>` : ""}
                ${ev.note ? `<span class="event-time">${ev.note}</span>` : ""}
            `;
            el.addEventListener("click", () => openModal(dateStr, ev));
            eventsContainer.appendChild(el);
        });

        const addBtn = document.createElement("button");
        addBtn.className = "add-event-btn";
        addBtn.textContent = "+ Ajouter";
        addBtn.addEventListener("click", () => openModal(dateStr, null));
        eventsContainer.appendChild(addBtn);

        col.appendChild(eventsContainer);
        cal.appendChild(col);
    }
}

/* ---- Modal ---- */
function bindModal() {
    const modal = document.getElementById("modal");
    const form = document.getElementById("event-form");
    const closeBtn = document.getElementById("modal-close");
    const deleteBtn = document.getElementById("btn-delete");

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        saveEvent();
    });

    deleteBtn.addEventListener("click", () => {
        if (editingEvent) {
            deleteEvent(editingEvent);
            closeModal();
        }
    });
}

function openModal(dateStr, event) {
    const modal = document.getElementById("modal");
    const title = document.getElementById("modal-title");
    const deleteBtn = document.getElementById("btn-delete");

    editingEvent = event ? { ...event, date: dateStr } : null;

    const d = new Date(dateStr + "T00:00:00");
    title.textContent = event ? "Modifier" : `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;

    document.getElementById("event-type").value = event ? event.type : "papa";
    document.getElementById("event-start").value = event ? (event.start || "08:00") : "08:00";
    document.getElementById("event-end").value = event ? (event.end || "17:00") : "17:00";
    document.getElementById("event-note").value = event ? (event.note || "") : "";

    deleteBtn.classList.toggle("hidden", !event);
    modal.classList.remove("hidden");

    // Store the date for saving
    modal.dataset.date = dateStr;
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
    editingEvent = null;
}

/* ---- Gestion des événements ---- */
function saveEvent() {
    const modal = document.getElementById("modal");
    const dateStr = modal.dataset.date;
    const newEvent = {
        id: editingEvent ? editingEvent.id : generateId(),
        type: document.getElementById("event-type").value,
        start: document.getElementById("event-start").value,
        end: document.getElementById("event-end").value,
        note: document.getElementById("event-note").value.trim()
    };

    if (editingEvent) {
        // Update existing
        const dayEvents = events[dateStr] || [];
        const idx = dayEvents.findIndex(e => e.id === editingEvent.id);
        if (idx !== -1) {
            dayEvents[idx] = newEvent;
        }
    } else {
        // Add new
        if (!events[dateStr]) events[dateStr] = [];
        events[dateStr].push(newEvent);
    }

    persistEvents();
    closeModal();
    renderWeek();
}

function deleteEvent(event) {
    const modal = document.getElementById("modal");
    const dateStr = modal.dataset.date;
    if (events[dateStr]) {
        events[dateStr] = events[dateStr].filter(e => e.id !== event.id);
        if (events[dateStr].length === 0) delete events[dateStr];
    }
    persistEvents();
    renderWeek();
}

function getEventsForDate(dateStr) {
    return (events[dateStr] || []).map(e => ({ ...e }));
}

/* ---- Stockage local ---- */
function loadEvents() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

function persistEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/* ---- Google Sheets sync ---- */
function checkGoogleSheets() {
    if (CONFIG.GOOGLE_SHEET_ID) {
        fetchGoogleSheet();
    }
}

async function fetchGoogleSheet() {
    const id = CONFIG.GOOGLE_SHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;

    try {
        const res = await fetch(url);
        const text = await res.text();
        // Google Sheets returns JSONP-like response
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const rows = json.table.rows;

        const sheetEvents = {};
        rows.forEach(row => {
            const cells = row.c;
            if (!cells[0] || !cells[1]) return;

            const dateVal = cells[0].v;
            let dateStr;
            // Handle Google Sheets date format: "Date(yyyy,m,d)"
            if (typeof dateVal === "string" && dateVal.startsWith("Date(")) {
                const parts = dateVal.match(/Date\((\d+),(\d+),(\d+)\)/);
                if (parts) {
                    const y = parts[1];
                    const m = String(Number(parts[2]) + 1).padStart(2, "0");
                    const d = String(parts[3]).padStart(2, "0");
                    dateStr = `${y}-${m}-${d}`;
                }
            } else if (typeof dateVal === "string") {
                dateStr = dateVal;
            }

            if (!dateStr) return;

            const ev = {
                id: generateId(),
                type: (cells[1].v || "").toLowerCase().trim(),
                start: cells[2] ? cells[2].v || "" : "",
                end: cells[3] ? cells[3].v || "" : "",
                note: cells[4] ? cells[4].v || "" : ""
            };

            if (!sheetEvents[dateStr]) sheetEvents[dateStr] = [];
            sheetEvents[dateStr].push(ev);
        });

        // Merge with local events (Google Sheet = source of truth)
        events = { ...events, ...sheetEvents };
        persistEvents();
        renderWeek();
    } catch (err) {
        console.warn("Impossible de charger le Google Sheet:", err);
    }
}

/* ---- Utilitaires ---- */
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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
