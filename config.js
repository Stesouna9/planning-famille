/* ============================================
   Planning Famille — Configuration
   ============================================ */

const CONFIG = {
    /* --- Codes d'accès --- */
    CODES: {
        "Gabriel17": { name: "Gabriel", role: "admin" },
        "Mieko18": { name: "Mieko", role: "admin" },
        "Manu26": { name: "Emmanuel", role: "nounou" }
    },

    /* --- Google Sheets (optionnel) --- */
    GOOGLE_SHEET_ID: "",

    /* --- Tarifs nounou --- */
    TARIFS: {
        jour_ecole: 40,       // lun, mar, jeu, ven (hors vacances)
        jour_complet: 70,     // mer, sam, dim, vacances
        annulation: 20        // annulation < 24h
    },

    /* --- Horaires parents --- */
    HORAIRES: {
        gabriel_semaine: "14h-15h",
        gabriel_weekend: "~16h",
        mieko: "11h — 23h"
    },

    /* --- Cycle Mieko (référence) --- */
    MIEKO_CYCLE: {
        refDate: "2026-04-02",   // jour 0 = repos jour 1
        // mod 4 : 0,1 = repos / 2,3 = travail
    },

    /* --- Vacances scolaires Zone B 2025-2026 --- */
    VACANCES: [
        { debut: "2025-10-18", fin: "2025-11-03", nom: "Toussaint" },
        { debut: "2025-12-20", fin: "2026-01-05", nom: "Noël" },
        { debut: "2026-02-14", fin: "2026-03-02", nom: "Hiver" },
        { debut: "2026-04-11", fin: "2026-04-27", nom: "Printemps" },
        { debut: "2026-07-04", fin: "2026-09-01", nom: "Été" }
    ],

    /* --- Jours fériés 2026 --- */
    JOURS_FERIES: [
        "2026-01-01", // Jour de l'An
        "2026-04-06", // Lundi de Pâques
        "2026-05-01", // Fête du Travail
        "2026-05-08", // Victoire 1945
        "2026-05-14", // Ascension
        "2026-05-15", // Pont Ascension
        "2026-05-25", // Pentecôte
        "2026-07-14", // Fête nationale
        "2026-08-15", // Assomption
        "2026-11-01", // Toussaint
        "2026-11-11", // Armistice
        "2026-12-25", // Noël
    ],

    /* --- Planning Gabriel (SEMITAN) ---
       Clé = date, Valeur = type
       "travail" | "repos" | "xna" | "malade"
    */
    GABRIEL_PLANNING: {
        // Mars 2026
        "2026-03-23": "travail", "2026-03-24": "travail",
        "2026-03-25": "repos_accepte", "2026-03-26": "repos_accepte",
        "2026-03-27": "repos_accepte", "2026-03-28": "repos_accepte",
        "2026-03-29": "repos_accepte", "2026-03-30": "repos_accepte",
        "2026-03-31": "repos_accepte",
        // Avril 2026 (corrigé avec jours réels)
        "2026-04-01": "repos", "2026-04-02": "travail", "2026-04-03": "travail",
        "2026-04-04": "travail", "2026-04-05": "repos",
        "2026-04-06": "travail", "2026-04-07": "repos",
        "2026-04-08": "travail", "2026-04-09": "travail",
        "2026-04-10": "travail", "2026-04-11": "repos", "2026-04-12": "repos",
        "2026-04-13": "travail", "2026-04-14": "travail",
        "2026-04-15": "travail", "2026-04-16": "travail",
        "2026-04-17": "repos", "2026-04-18": "travail", "2026-04-19": "travail",
        "2026-04-20": "travail", "2026-04-21": "repos",
        "2026-04-22": "travail", "2026-04-23": "travail", "2026-04-24": "travail",
        "2026-04-25": "repos", "2026-04-26": "repos",
        "2026-04-27": "travail", "2026-04-28": "travail",
        "2026-04-29": "repos", "2026-04-30": "travail",
        // Mai 2026 (corrigé avec jours réels)
        "2026-05-01": "repos", "2026-05-02": "repos", "2026-05-03": "repos",
        "2026-05-04": "travail", "2026-05-05": "travail",
        "2026-05-06": "repos", "2026-05-07": "travail",
        "2026-05-08": "travail", "2026-05-09": "travail",
        "2026-05-10": "repos", "2026-05-11": "travail",
        "2026-05-12": "repos", "2026-05-13": "travail",
        "2026-05-14": "travail", "2026-05-15": "travail",
        "2026-05-16": "repos", "2026-05-17": "repos",
        "2026-05-18": "travail", "2026-05-19": "travail",
        "2026-05-20": "travail", "2026-05-21": "repos", "2026-05-22": "repos",
        "2026-05-23": "travail", "2026-05-24": "travail",
        "2026-05-25": "travail", "2026-05-26": "repos",
        "2026-05-27": "travail", "2026-05-28": "travail",
        "2026-05-29": "travail", "2026-05-30": "travail",
        "2026-05-31": "repos",
        // Juin 2026 (corrigé avec jours réels)
        "2026-06-01": "repos", "2026-06-02": "travail",
        "2026-06-03": "travail", "2026-06-04": "travail", "2026-06-05": "travail",
        "2026-06-06": "repos", "2026-06-07": "repos",
        "2026-06-08": "travail", "2026-06-09": "travail",
        "2026-06-10": "repos", "2026-06-11": "travail",
        "2026-06-12": "travail", "2026-06-13": "travail",
        "2026-06-14": "repos",
        "2026-06-15": "travail", "2026-06-16": "repos",
        "2026-06-17": "travail", "2026-06-18": "travail",
        "2026-06-19": "travail", "2026-06-20": "repos", "2026-06-21": "repos",
        "2026-06-22": "travail", "2026-06-23": "travail",
        "2026-06-24": "travail", "2026-06-25": "repos", "2026-06-26": "repos",
        "2026-06-27": "travail", "2026-06-28": "travail",
        "2026-06-29": "travail", "2026-06-30": "repos",
        // Juillet 2026 (corrigé avec jours réels)
        "2026-07-01": "travail", "2026-07-02": "travail",
        "2026-07-03": "travail", "2026-07-04": "travail",
        "2026-07-05": "repos", "2026-07-06": "repos",
        "2026-07-07": "travail", "2026-07-08": "travail",
        "2026-07-09": "travail", "2026-07-10": "travail",
        "2026-07-11": "repos", "2026-07-12": "repos",
        // Vacances été
        "2026-07-13": "repos_accepte", "2026-07-14": "repos_accepte",
        "2026-07-15": "repos_accepte", "2026-07-16": "repos_accepte",
        "2026-07-17": "repos_accepte", "2026-07-18": "repos_accepte",
        "2026-07-19": "repos_accepte", "2026-07-20": "repos_accepte",
        "2026-07-21": "repos_accepte", "2026-07-22": "repos_accepte",
        "2026-07-23": "repos_accepte", "2026-07-24": "repos_accepte",
        "2026-07-25": "repos_accepte", "2026-07-26": "repos_accepte",
        "2026-07-27": "repos_accepte", "2026-07-28": "repos_accepte",
        "2026-07-29": "repos_accepte", "2026-07-30": "repos_accepte",
        "2026-07-31": "repos_accepte",
        // Août 2026
        "2026-08-01": "repos", "2026-08-02": "repos",
        "2026-08-03": "travail", "2026-08-04": "repos",
        "2026-08-05": "travail", "2026-08-06": "travail",
        "2026-08-07": "travail", "2026-08-08": "travail",
        "2026-08-09": "repos", "2026-08-10": "repos",
        "2026-08-11": "travail", "2026-08-12": "travail",
        "2026-08-13": "travail", "2026-08-14": "travail",
        "2026-08-15": "repos", "2026-08-16": "repos",
        "2026-08-17": "travail", "2026-08-18": "travail",
        "2026-08-19": "repos", "2026-08-20": "travail",
        "2026-08-21": "travail", "2026-08-22": "travail",
        "2026-08-23": "repos", "2026-08-24": "travail",
        "2026-08-25": "repos", "2026-08-26": "travail",
        "2026-08-27": "travail", "2026-08-28": "travail",
        "2026-08-29": "repos", "2026-08-30": "repos",
        "2026-08-31": "repos",
    }
};
