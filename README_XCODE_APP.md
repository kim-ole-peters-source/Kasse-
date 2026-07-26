# Peters Kasse als iPhone-/iPad-App mit Xcode

Diese App wird als native iOS-Huelle mit Capacitor gebaut. Die Kasse selbst
laeuft weiter als Web-App auf deinem Server. Das ist fuer dein Ziel wichtig:
Wenn du spaeter die Datenbank und die Kassenoberflaeche auf dem Server
aktualisierst, laden iPads und iPhones automatisch den neuen Stand, ohne dass du
jedes Geraet neu bauen musst.

## Grundidee

- Xcode baut eine echte iOS-App mit Bundle-ID `de.kcpremium.peterskasse`.
- Die iOS-App zeigt per WebView deine Kasse an.
- Lokal kann sie `http://localhost:3008` laden.
- Produktiv kann sie `https://kcpremium.de` laden.
- Die spaetere Server-Datenbank sollte hinter einer API liegen. Die App greift
  dann nicht direkt auf die Datenbank zu, sondern auf gesicherte Endpunkte wie
  Login, Produkte, Rabatte, Benutzer, Bons und Mandanten.

## Einmalige Vorbereitung

1. Xcode aus dem Mac App Store installieren.
2. Im Projektordner bleiben:

```bash
cd /Users/kimolepeters/Documents/Codex/2026-07-26/kan
```

3. iOS-Projekt erzeugen:

```bash
npm run ios:add
```

4. Xcode oeffnen:

```bash
npm run ios:open
```

## Lokal im iPhone-/iPad-Simulator testen

1. Produktionsvorschau starten:

```bash
npm run build
npm run start -- --port 3008
```

2. In einem zweiten Terminal die iOS-App auf die lokale Vorschau setzen:

```bash
npm run ios:sync:local
npm run ios:open
```

3. In Xcode oben ein iPad oder iPhone auswaehlen und auf Play druecken.

## Direkt mit iOS 26.5 Simulator bauen

Auf diesem Mac ist Xcode 26.6 mit iOS 26.5 Simulator installiert. Fuer den
direkten Build ohne manuelle Geraeteauswahl:

```bash
cd /Users/kimolepeters/Documents/Codex/2026-07-26/kan
npm run ios:sync:local
npm run ios:build:sim26
```

Wenn die App auch direkt im Simulator installiert und gestartet werden soll:

```bash
npm run ios:run:sim26
```

Das Skript sucht automatisch ein iOS-26.5-Geraet und bevorzugt ein iPad Pro
13-inch (M5). Wenn Xcode trotzdem kein Ziel anzeigt, in Xcode oben neben `App`
einen Simulator mit `iOS 26.5` auswaehlen.

## Auf echtem iPad/iPhone testen

Ein echtes Geraet kann `localhost` deines Macs nicht erreichen. Nutze die
IP-Adresse deines Macs im selben WLAN:

```bash
ipconfig getifaddr en0
```

Dann mit dieser IP synchronisieren, Beispiel:

```bash
CAPACITOR_SERVER_URL=http://192.168.2.50:3008 npm run build
CAPACITOR_SERVER_URL=http://192.168.2.50:3008 npx cap sync ios
npm run ios:open
```

In Xcode waehlt du danach dein angeschlossenes iPad/iPhone aus und startest die
App.

## Produktiv mit kcpremium.de nutzen

Wenn deine Kasse auf `https://kcpremium.de` laeuft:

```bash
npm run ios:sync:prod
npm run ios:open
```

Danach in Xcode bauen. Die App laedt dann die produktive Server-Version.

## Spaetere Server-Datenbank

Empfohlen ist diese Struktur:

- Server-App: `https://kcpremium.de`
- Datenbank: PostgreSQL, MySQL oder Cloudflare D1
- API: Login, Mandanten, Produkte, Rabatte, Benutzer, Bons, TSE/Journal
- iOS-App: laedt nur die Server-App und speichert hoechstens lokale
  Zwischendaten

So kannst du Produkte, Preise, Benutzer und Design zentral aendern. Alle Geraete
bekommen den neuen Stand beim naechsten Start oder Reload.

Wichtig: Kassendaten, Benutzer-PINs und Bons sollten spaeter nicht dauerhaft nur
in `localStorage` bleiben. Fuer den echten Betrieb gehoeren sie in eine
serverseitige Datenbank mit Authentifizierung, Backups und Rollenrechten.
