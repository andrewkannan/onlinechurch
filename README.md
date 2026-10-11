# ⛪ Church Live Service Hub

A hosted, tablet- and laptop-friendly web application for church media teams and online moderators. Unifies live chat broadcasting across **YouTube Live** and **Instagram Live**, equips moderators with an **AI Prophetic Sermon Teleprompter (Gemini 3.8 Flash)**, and generates automated **Sunday Service Reports & Analytics** for pastoral staff.

---

## 🌟 Key Features

### 1. 📡 Unified Live Chat Outbox
* **1-Click Simultaneous Broadcast:** Send messages, scriptures, sermon notes, and lyrics to both **YouTube Live** and **Instagram Live** at the same second.
* **1-Click Ministry Presets:** Instant quick-action buttons for Welcome greetings, Tithes & Offerings giving links, Digital Connect Cards, and Salvation decisions.
* **Audit Trail:** Every broadcast is logged into SQLite with platform delivery status.

### 2. 📋 Pastor's Sermon Cue Deck (1-Click Teleprompter)
* **Pre-Service Ingestion:** Upload Pastor's sermon notes (PDF or text).
* **Gemini 3.8 Flash Chunker:** AI extracts scriptures, main headings, pastoral quotes, and decrees into ordered cue cards.
* **1-Click "RELEASE TO ALL":** Tap "RELEASE" as Pastor speaks without copying or switching tabs.

### 3. 🔥 Prophetic Flow Deck (Live Spirit-Led Ministry)
* **1-Tap Anointed Declarations:** Pre-saved faith decrees for **Healing**, **Breakthrough**, **Peace**, **Salvation**, and **Atmosphere Agreement ("AMEN!")**.
* **AI Prophetic Spark:** Enter 1 or 2 keywords (e.g. *"peace in storm"*, *"marriage healing"*) to generate 3 fresh, scriptural, faith-filled declarations ready to blast in 1 second.

### 4. 📊 Service Reporting & Ministry Analytics
* **Real-Time Counters:** Track combined peak attendance, YouTube viewers, Instagram viewers, online first-time visitors, and prayer requests.
* **AI Pastoral Briefing:** Generates an executive service overview and follow-up action items for pastoral leadership.
* **Print / Export PDF:** Ready for staff meetings and pastoral records.

### 5. 📺 OBS Studio Integration
* Can be docked directly inside OBS Studio as a **Custom Browser Dock** (`Docks -> Custom Browser Docks... -> http://localhost:3000`).

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/andrewkannan/onlinechurch.git
cd onlinechurch
npm install
```

### 2. Set Up Database
```bash
npx prisma db push
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser or tablet.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## ⚙️ Configuration & API Credentials

Navigate to the **Settings** page inside the app:
* **Gemini API Key:** Get a free API key at [Google AI Studio](https://aistudio.google.com/) to power scripture formatting, prayer replies, and prophetic generation.
* **YouTube Data API v3:** API Key and active Live Chat ID.
* **Instagram Live (Professional Account):** Meta Graph API Access Token and Live Video ID.
* *Note: When credentials are not yet entered, the app runs in **Simulation / Test Mode** so your team can rehearse safely.*

---

## 🛠️ Tech Stack
* **Framework:** Next.js 15 (App Router, React 19, TypeScript)
* **Styling:** Tailwind CSS (Auditorium Dark Theme)
* **Database:** SQLite with Prisma ORM
* **AI Engine:** Google GenAI SDK (`gemini-3.8-flash`)
* **Streaming Bridges:** YouTube Data API v3 & Meta Instagram Graph API
