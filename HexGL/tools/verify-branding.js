'use strict';

// Controles de sources de l'habillage ACME.
//
// Ce script est volontairement SEPARE de `npm test` : la suite de non-regression
// doit rester agnostique du branding, afin qu'un retour arriere de l'habillage ne
// la casse pas. Il s'execute via `npm run verify:branding`.
//
// Il ne verifie que ce qui se lit dans les sources. Les criteres visuels
// (rendu, contrastes mesures, parcours de jeu) demandent un navigateur.
//
// Plan d'implementation : work/company-event/design.md

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const css = read(path.join('css', 'multi.css'));
const html = read('index.html');
const launch = read('launch.js');
const head = html.slice(0, html.indexOf('</head>'));

let failures = 0;

function check(criterion, label, ok, detail) {
  if (!ok) {
    failures++;
  }
  const status = ok ? 'OK    ' : 'ECHEC ';
  const suffix = detail && !ok ? `  -> ${detail}` : '';
  console.log(`${status} critere ${String(criterion).padStart(2)}  ${label}${suffix}`);
}

// --- Criteres 9, 10, 11 : textes imposes -----------------------------------

const MESSAGE = 'Bienvenue au ACME Racing Challenge';
const SOUS_TITRE = 'Une expérience événementielle aux couleurs de la marque.';
const BOUTON = 'Démarrer la course';

check(9, 'message d\'accueil present mot pour mot', html.includes(MESSAGE));
check(10, 'sous-titre present', html.includes(SOUS_TITRE));
check(11, 'libelle du bouton principal', html.includes(BOUTON), BOUTON);

// --- Critere 8 : plus aucune couleur hors palette --------------------------

const ANCIENNES = ['#4190bb', '#f66439', '#f8854b'];
for (const couleur of ANCIENNES) {
  const present = css.toLowerCase().includes(couleur);
  check(8, `ancienne couleur ${couleur} absente`, !present, 'encore presente');
}
check(8, 'degrade blanc translucide des items absent',
  !css.includes('rgba(255,255,255'));

// --- Critere 7 : palette de la charte en place -----------------------------

const PALETTE = {
  '#08090D': 'fond principal',
  '#7628FF': 'accent marque',
  '#315BFF': 'accent digital',
  '#00C4E8': 'accent secondaire',
  '#FFFFFF': 'texte',
  '#E6E8EE': 'surfaces secondaires'
};
for (const [valeur, role] of Object.entries(PALETTE)) {
  check(7, `${valeur} (${role}) declaree`, css.toLowerCase().includes(valeur.toLowerCase()));
}

// --- Criteres 17 et 18 : en-tete de page -----------------------------------

for (const balise of ['og:url', 'og:image', 'fb:admins']) {
  check(17, `${balise} retiree`, !head.includes(balise), 'toujours presente');
}
const icones = head.match(/rel="(?:shortcut )?icon"[^>]*href="([^"]+)"/g) || [];
check(17, 'icone du site locale',
  icones.length > 0 && icones.every((t) => !/href="https?:/i.test(t)),
  `${icones.length} balise(s) d'icone`);

const fuites = (head.match(/hexgl|bkcore/gi) || []);
check(18, 'aucune mention de l\'identite d\'origine dans le <head>',
  fuites.length === 0, `${fuites.length} occurrence(s)`);

// --- Critere 19 : langue du document ---------------------------------------

check(19, 'document declare en francais', /<html[^>]+lang="fr"/.test(html));

// --- Critere 12 : libelles francais cote JavaScript ------------------------

const LIBELLES = ['Contrôles : ', 'Qualité : ', 'Clavier', 'Tactile', 'Manette',
  'Basse', 'Moyenne', 'Très haute', 'Désactivé', 'Activé'];
const manquants = LIBELLES.filter((l) => !launch.includes(l));
check(12, 'libelles francais dans launch.js',
  manquants.length === 0, `manquant(s) : ${manquants.join(', ')}`);

// --- Resultat ---------------------------------------------------------------

console.log('');
if (failures === 0) {
  console.log('Tous les controles de sources passent.');
} else {
  console.log(`${failures} controle(s) en echec.`);
  process.exitCode = 1;
}
