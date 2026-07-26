# Peters Kasse - GitHub + Strato Server

## Wichtig

Lade bei GitHub den Inhalt dieses Ordners hoch. Die Dateien muessen direkt im
GitHub-Repository liegen.

Richtig:

- .openai/hosting.json
- app/page.tsx
- app/globals.css
- public/data/catalog.csv
- public/data/screens.csv
- package.json
- package-lock.json
- vite.config.ts
- README_SCHRITT_FUER_SCHRITT.md

Falsch:

- peters-kasse-github-strato/app/page.tsx

Wenn GitHub oben nur einen Ordner `peters-kasse-...` zeigt, ist es falsch
hochgeladen.

## Schritt 1: ZIP entpacken

ZIP entpacken und den entpackten Ordner oeffnen.

## Schritt 2: GitHub Repository erstellen

Empfohlen: neues Repository erstellen, zum Beispiel:

`peters-kasse`

Im alten Repository alle alten Dateien loeschen oder ein komplett neues
Repository verwenden.

## Schritt 3: Dateien hochladen

In GitHub auf `Add file` -> `Upload files` klicken.

Dann NICHT die ZIP-Datei hochladen, sondern alle Dateien und Ordner aus dem
entpackten Ordner markieren und hochladen.

Wichtig: Diese Ordner nicht hochladen, falls sie bei dir entstehen:

- node_modules
- dist
- .vinext
- .wrangler
- outputs

Hinweis: `.openai` ist ein versteckter Ordner. Wenn er bei GitHub fehlt, baut
die App in dieser Version trotzdem mit einer lokalen Strato-Einstellung.

Danach `Commit changes` klicken.

## Schritt 4: Strato-Voraussetzung pruefen

Diese App braucht einen laufenden Node.js-Prozess.

Geeignet:

- Strato Server/VPS mit SSH
- Strato Paket mit Node.js-Unterstuetzung und eigener Prozessverwaltung

Nicht geeignet ohne Umbau:

- normales Strato-Webhosting, bei dem nur HTML/PHP-Dateien hochgeladen werden

## Schritt 5: Auf dem Strato-Server installieren

Per SSH auf den Server gehen:

```bash
ssh benutzer@deine-server-adresse
```

Repository klonen:

```bash
mkdir -p /opt/peters-kasse
cd /opt/peters-kasse
git clone https://github.com/kim-ole-peters-source/Kasse-.git .
```

Node installieren, falls `nvm` vorhanden ist:

```bash
nvm install
nvm use
```

Pakete installieren und Build pruefen:

```bash
npm ci
npm run build
```

## Schritt 6: App starten

Zum Testen:

```bash
PORT=3005 npm run start
```

Fuer dauerhaften Betrieb empfohlen:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Danach die App ueber deinen Webserver/Reverse Proxy auf die Domain legen.
Ein Nginx-Beispiel liegt in `strato-nginx-peters-kasse.conf`.

## Schritt 7: Updates einspielen

Wenn du spaeter neue Versionen bei GitHub hochlaedst:

```bash
cd /opt/peters-kasse
git pull
npm ci
npm run build
pm2 restart peters-kasse --update-env
```

## Erste Anmeldung

- `Manager` mit PIN `1902`
- `Team` ohne Passwort

Bitte nach der ersten Anmeldung im Adminbereich eigene Benutzer, Passwoerter und
Rechte setzen.

## Hinweis zu TSE und Drucker

Der TSE-Stempel ist aktuell nur fiktiv und nicht rechtssicher. Datum und Uhrzeit
des Bons sind echt. Die echte TSE-Schnittstelle muss spaeter nachgeruestet
werden.

Bluetooth-Druck funktioniert im Browser nur mit kompatiblen Web-Bluetooth-
Druckern. Manche klassischen Bluetooth-Drucker brauchen eine native Bridge oder
ein Hersteller-SDK.
