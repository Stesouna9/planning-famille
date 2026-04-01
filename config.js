/**
 * Configuration du Planning Famille
 *
 * MODE LOCAL (par défaut) :
 *   Les données sont sauvegardées dans le navigateur (localStorage).
 *   Chaque navigateur/appareil a ses propres données.
 *
 * MODE GOOGLE SHEETS (partagé) :
 *   1. Créez un Google Sheet avec ces colonnes :
 *      date | type | start | end | note
 *      2026-04-01 | papa | 08:00 | 17:00 | Bureau
 *
 *   2. Allez dans Fichier > Partager > Publier sur le Web
 *      - Choisissez "Feuille 1" et "CSV"
 *      - Cliquez "Publier"
 *
 *   3. Copiez l'ID du Google Sheet (la longue chaîne dans l'URL)
 *      Exemple: https://docs.google.com/spreadsheets/d/VOTRE_ID_ICI/edit
 *
 *   4. Collez-le ci-dessous :
 */

const CONFIG = {
    // Mettre l'ID de votre Google Sheet ici pour synchroniser
    // Laisser vide ("") pour le mode local uniquement
    GOOGLE_SHEET_ID: "",

    // Noms affichés
    PAPA_NAME: "Papa",
    MAMAN_NAME: "Maman",
    NOUNOU_NAME: "Nounou",
    BABY_NAME: "Saku-Aloïs",

    // Labels des types d'événements
    EVENT_LABELS: {
        papa: "Papa travaille",
        maman: "Maman travaille",
        nounou: "Nounou garde",
        both: "Papa + Maman",
        free: "Repos"
    }
};
