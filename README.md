# 🏗 Projekt Planer

Materialplanung für mehrere Projekte mit Live-Sync für dein ganzes Team.

---

## Was du brauchst (alles kostenlos)

- [GitHub Account](https://github.com) — zum Speichern des Codes
- [Supabase Account](https://supabase.com) — die Datenbank
- [Vercel Account](https://vercel.com) — hostet die App online

---

## Schritt 1 — Code auf GitHub hochladen

1. Gehe zu [github.com/new](https://github.com/new)
2. Repository Name: `projekt-planer`
3. Auf **"Create repository"** klicken
4. Dann im Terminal (oder GitHub Desktop):

```bash
cd projekt-planer
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/projekt-planer.git
git push -u origin main
```

---

## Schritt 2 — Supabase einrichten

### 2a. Projekt erstellen
1. Gehe zu [supabase.com](https://supabase.com) → **"New Project"**
2. Name: `projekt-planer`
3. Datenbank-Passwort merken (brauchst du später nicht direkt)
4. Region: **Europe (Frankfurt)** empfohlen
5. Warten bis das Projekt fertig ist (~1 Minute)

### 2b. Datenbank einrichten
1. Im linken Menü auf **"SQL Editor"** klicken
2. Auf **"New Query"** klicken
3. Den kompletten Inhalt aus der Datei **`supabase-schema.sql`** kopieren und einfügen
4. Auf **"Run"** (▶) klicken
5. Du solltest sehen: `Success. No rows returned`

### 2c. Zugangsdaten holen
1. Im linken Menü auf **"Settings"** → **"API"**
2. Notiere dir:
   - **Project URL** (sieht aus wie: `https://abcdefgh.supabase.co`)
   - **anon / public** Key (langer String unter "Project API keys")

---

## Schritt 3 — Vercel deployen

1. Gehe zu [vercel.com](https://vercel.com) → **"Add New Project"**
2. GitHub-Repository `projekt-planer` auswählen → **"Import"**
3. Unter **"Environment Variables"** folgende zwei Einträge hinzufügen:

| Name | Wert |
|------|------|
| `REACT_APP_SUPABASE_URL` | deine Project URL aus Schritt 2c |
| `REACT_APP_SUPABASE_ANON_KEY` | dein anon Key aus Schritt 2c |

4. Auf **"Deploy"** klicken
5. Nach ~2 Minuten bekommst du eine URL wie `https://projekt-planer-xyz.vercel.app`

🎉 **Fertig! Die App ist online.**

---

## Team-Zugang

Schicke deinen Teammitgliedern einfach die Vercel-URL.  
Alle sehen dieselben Daten und alle Änderungen werden sofort synchronisiert.

---

## Lokal entwickeln (optional)

Wenn du die App lokal ausprobieren willst:

```bash
# Dependencies installieren
npm install

# .env.local Datei erstellen
cp .env.example .env.local
# Dann .env.local mit deinen Supabase-Zugangsdaten befüllen

# App starten
npm start
```

Die App läuft dann unter `http://localhost:3000`

---

## Häufige Fragen

**Sind die Daten sicher?**  
Ja. Supabase speichert alles in einer PostgreSQL-Datenbank in Frankfurt. Die anon-Key kann nur lesen/schreiben, aber keine Datenbankstruktur ändern.

**Kann ich den Zugang einschränken?**  
Ja — in Supabase kannst du unter Authentication → Row Level Security (RLS) Regeln definieren, z.B. nur bestimmte E-Mail-Domains dürfen zugreifen. Das ist ein fortgeschrittenes Feature, für den Anfang funktioniert die offene Version problemlos für kleine Teams.

**Was kostet das?**  
Supabase Free Tier: 500MB Datenbank, 50.000 Zeilen — mehr als genug.  
Vercel Free Tier: unbegrenzte Deployments, 100GB Bandbreite/Monat.  
Beides dauerhaft kostenlos für diese Nutzung.

**Ich bekomme einen Verbindungsfehler**  
Prüfe ob deine Environment Variables in Vercel korrekt gesetzt sind (kein Leerzeichen, kein Anführungszeichen um die Werte).

---

## Projektstruktur

```
projekt-planer/
├── src/
│   ├── components/
│   │   ├── UI.js              # Gemeinsame UI-Bausteine
│   │   ├── ProjectCard.js     # Projektkarte in der Übersicht
│   │   ├── ProjectDetail.js   # Projektdetails + Materialien
│   │   ├── CatalogView.js     # Material-Datenbank
│   │   ├── ShoppingList.js    # Bestellliste + Export
│   │   └── ArchiveView.js     # Archiv
│   ├── hooks/
│   │   └── useData.js         # Daten + Realtime-Sync
│   ├── lib/
│   │   ├── supabase.js        # Datenbankzugriff
│   │   └── utils.js           # Hilfsfunktionen
│   ├── App.js                 # Haupt-App
│   └── index.js               # Entry point
├── public/
│   └── index.html
├── supabase-schema.sql        # Datenbankschema (einmalig ausführen)
├── .env.example               # Vorlage für Zugangsdaten
└── package.json
```
