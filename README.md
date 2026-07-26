# Peters Kasse

Lokale Touch-Kasse fuer Eisverkauf und Cafe-Betrieb auf Basis der vorhandenen
Lightspeed-K-Series-Daten.

## Enthalten

- Verkaufsmaske mit Touch-Kacheln, Unterbildschirmen und Warenkorb
- Teilzahlung mit Gutschein und automatischem Restbetrag auf Bar
- Rabatte, Benutzerrechte und geschuetzter Adminbereich
- Produktverwaltung fuer neue und vorhandene/importierte Produkte
- Bonlayout mit 57-mm- und 80-mm-Breite
- fiktiver TSE-Stempel mit echtem Datum/Uhrzeit des Bons
- Bluetooth-Druckvorbereitung fuer kompatible BLE/ESC-POS- bzw. Star-Drucker
- PWA/Installationsmodus fuer Tablet und Handy

## Voraussetzungen

- Node.js `>=22.13.0`
- npm
- Fuer Strato: ein Server/VPS oder Hostingpaket mit SSH und Node.js

Normales Strato-Webhosting ohne Node.js-Prozess reicht fuer diese App nicht
aus. Dann braucht es entweder einen Strato-Server/VPS oder eine Umstellung auf
eine rein statische/PHP-Loesung.

## Lokal starten

```bash
npm install
npm run dev
```

## Produktionsbuild pruefen

```bash
npm ci
npm run build
npm test
```

## Standardzugang

- Benutzer `Manager`: PIN `1902`
- Benutzer `Team`: ohne Passwort

Bitte nach dem Hochladen im Adminbereich eigene Benutzer und Passwoerter setzen.

## Wichtige Dateien

- `app/page.tsx`: Kassen-App
- `app/globals.css`: Layout und Tablet/Handy-Darstellung
- `public/data/catalog.csv`: Artikeldaten
- `public/data/screens.csv`: Kachelstruktur
- `public/data/users.csv`: importierte POS-Benutzer
- `public/manifest.webmanifest`: App-Installation/PWA
- `README_SCHRITT_FUER_SCHRITT.md`: Anleitung fuer GitHub und Strato
