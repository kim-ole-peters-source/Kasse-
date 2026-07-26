# Verbesserungsvorschlaege fuer Peters Kasse

## Bereits nachgezogen

- Firmen-Login als Startseite mit Opa-Peters-Logo.
- Standardzugang wird auf der Loginseite nicht mehr offen angezeigt.
- Firmenverwaltung ist nur noch in der Hauptkasse sichtbar.
- Neue Firmenkassen starten leer, ohne vorangelegte Produkte.
- Mandanten-Sicherung im Adminbereich: Export und Import aller lokalen Kassen.
- Suchmaschinen sollen die Seite nicht indexieren (`noindex`).

## Naechste wichtige Schritte

1. Server-Datenbank einbauen
   - Aktuell liegen Kassen, Produkte, Benutzer und Bons noch im Browser-Speicher.
   - Fuer mehrere Unternehmen und mehrere Geraete sollte alles serverseitig gespeichert werden.

2. Sichere Anmeldung einbauen
   - Passwoerter nicht mehr im Browser speichern.
   - Passwoerter auf dem Server hashen.
   - Firmen-Admin und Plattform-Admin klar trennen.

3. Echte Mandanten-Trennung
   - Jede Firma braucht eine eigene Daten-ID.
   - Benutzer duerfen nur Daten ihrer eigenen Firma sehen.
   - Sicherungen sollten pro Firma und als Gesamtsicherung moeglich sein.

4. Rechtssichere Fiskalisierung vorbereiten
   - Die aktuelle TSE-Markierung ist nur simuliert.
   - Fuer echten Betrieb muss spaeter eine echte TSE oder ein zertifizierter Anbieter angebunden werden.

5. Druck stabilisieren
   - Browser-Bluetooth ist je nach Tablet, Drucker und Browser eingeschraenkt.
   - Fuer produktiven Betrieb waere ein kleiner Druckdienst oder eine Star-Micronics-Integration robuster.

6. Adminbereich weiter aufteilen
   - Firmenverwaltung, Kassenlayout, Bonlayout, Benutzer und Produkte koennen spaeter eigene Unterseiten bekommen.
   - Das macht die Bedienung fuer fremde Unternehmen leichter.

7. Serverbetrieb absichern
   - HTTPS erzwingen.
   - Basic Auth oder Linkschutz fuer Testversionen.
   - Regelmaessige automatische Backups.
   - PM2-Logs und Neustartverhalten ueberwachen.
