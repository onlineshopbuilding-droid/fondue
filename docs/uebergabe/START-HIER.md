# Fondue – Start hier

**Spiel:** https://onlineshopbuilding-droid.github.io/fondue/

Am besten in Chrome oder Edge spielen. Firefox konnte nicht automatisch getestet werden, siehe Bekannte Probleme.

## Zusammen spielen
1. **Tim:** Link öffnen, Play, Namen eintragen, **Host Co-op**.
2. **Tim:** **Copy invite link** klicken und Lenny schicken. Der fünfstellige Raumcode geht auch.
3. **Lenny:** Link öffnen, Namen eintragen, **Join**. Ohne Link: Play, Join Co-op, Code eingeben.
4. **Tim:** Sobald „Lenny joined!“ dasteht, Schwierigkeit wählen und **Start** klicken.

Beide sollten vorher die Seite neu laden (Strg+F5), damit dieselbe Version läuft. Bei unterschiedlichen Versionen sagt das Spiel Bescheid.

## Steuerung
| Aktion | Maus oder Touch |
|---|---|
| Gegner greifen | Drücken und halten |
| Werfen | Schnell bewegen und loslassen; ein Schnipp nach oben reicht |
| Fallen lassen | Hochziehen und loslassen |
| Keg Hauler entwaffnen | Kurz anklicken |
| Siege Cart zerstören | Mehrfach anklicken |
| Gefrorene Gegner zerbrechen | Einmal anklicken |
| Opfern | In den Kessel fallen lassen oder an den Haken hängen (beides im Shop kaufen) |
| Waffen | Icon unten oder Tasten 1 bis 5 |
| Waffe abbrechen | Rechtsklick oder Esc |
| Pause | P oder Knopf oben rechts |

Waffen bedienen: Wheels und Roof Bolters lösen sofort aus. Bei Stompers das Icon klicken, zielen, drücken und nach unten schnippen. Bei Comets das Icon klicken, drücken, schwingen, loslassen. Bei Gate Arms das Icon klicken, drücken und zielen, loslassen.

## Tuning und Debug
- **F1** oder **^** öffnet das Tuning-Panel mit allen Reglern, Voreinstellungen, Export und Import. Im Koop gelten die Werte des Hosts.
- **F3** zeigt FPS, Gegneranzahl und Ping.

## Wenn die Verbindung nicht klappt (Plan B)
Studentenwohnheime blockieren direkte Verbindungen manchmal. Dann läuft der Koop über einen kleinen Server bei Tim.

1. PowerShell öffnen und starten:
   ```
   cd C:\Users\timeb\Documents\Fondue
   npm run relay
   ```
   Das Fenster offen lassen.
2. Zweite PowerShell öffnen und starten:
   ```
   & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8787
   ```
   In der Ausgabe steht eine Adresse wie `https://irgendwas.trycloudflare.com`. Diese kopieren.
3. Im Spiel **Host Co-op** öffnen, die Adresse in **Relay server** einfügen und **Re-open room with this relay setting** klicken.
4. **Copy invite link** klicken und Lenny schicken. Der Link enthält die Relay-Adresse schon.

Die Adresse ändert sich bei jedem Start von cloudflared.

## Bekannte Probleme
- Firefox ließ sich auf diesem Laptop nicht automatisch testen, Windows blockiert den Start des Testbrowsers. Das Spiel nutzt nur Standard-Webtechnik, sollte also laufen. Bitte kurz selbst prüfen.
- Sound und Musik konnte niemand anhören; sie sind technisch geprüft (kein Übersteuern), aber nicht nach Gehör abgemischt. Lautstärke in Options.
- Das Wurfgefühl ist gemessen und mit Videos geprüft, aber nicht von einem Menschen gespürt. Dafür ist das Tuning-Panel da.
