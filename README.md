# 🕶️ Smart Glasses Web Dashboard

A full-stack web application that simulates a smart glasses experience with live camera, HUD overlay, media gallery, timeline, tagging, and activity dashboard.

---

## ✨ Features

### Core
- **Live Camera View** — Real-time webcam feed with getUserMedia
- **Photo Capture** — Snapshot from video with flash animation
- **Video Recording** — Start/stop recording with timer and REC indicator
- **Media Gallery** — Grid layout with filtering by tag, type, location
- **Timeline View** — Media grouped by date + time of day (Morning / Afternoon / Evening / Night)
- **Tagging System** — Tag-based filtering and search

### Advanced
- **HUD Overlay** — AR-style UI with clock, battery, REC indicator, crosshair
- **Location Tagging** — Attach location text to media
- **Auth System** — JWT-based login/signup; each user has a private gallery
- **Share Feature** — Generate shareable links; download media
- **Activity Dashboard** — Charts for 7-day activity, media type, top tags

### Bonus
- **POV Mode** — Fullscreen immersive camera view
- **Auto Capture** — Take photos every N seconds automatically
- **Toast Notifications** — Contextual feedback for all actions
- **Dark/Light Mode** — Toggle with persistence

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm v9+

### Install & Run

```bash
# Clone / unzip the project
cd smart-glasses

# Install dependencies
npm install

# Start the server
npm start
# → http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

### Access
Open `http://localhost:3000` in your browser.

- Click **Try Demo Account** on the login page for instant access
- Or create a new account via **Sign Up**

---

## 📁 Project Structure

```
smart-glasses/
├── package.json
├── README.md
│
├── backend/
│   ├── server.js          ← Express server, API routes, in-memory DB
│   └── uploads/           ← Saved photos/videos (auto-created)
│
└── frontend/
    ├── index.html          ← 📷 Camera + HUD (home page)
    ├── gallery.html        ← 🗂️ Media gallery with filters
    ├── timeline.html       ← 📅 Timeline by date/time-of-day
    ├── dashboard.html      ← 📊 Stats + charts
    ├── login.html          ← 🔐 Authentication
    ├── signup.html         ← 📝 Registration
    ├── share.html          ← 🔗 Shared media viewer
    ├── css/
    │   └── style.css       ← Full design system (Orbitron/Space Mono/Rajdhani)
    └── js/
        └── app.js          ← API client, Toast, Modal, HUD, TagsInput, Helpers
```

---

## 🔌 API Reference

All endpoints require `Authorization: Bearer <token>` unless noted.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/media` | Get user's media (supports `?tag=`, `?type=`, `?search=`, `?location=`) |
| POST | `/api/media/upload` | Upload photo/video (base64) |
| PATCH | `/api/media/:id` | Update tags/location |
| DELETE | `/api/media/:id` | Delete |
| POST | `/api/media/:id/share` | Generate share link |
| GET | `/api/share/:shareId` | Access shared media (public) |
| GET | `/api/stats` | Activity stats |

---

## 🗃️ Production Upgrade Path

The backend uses in-memory storage by default (resets on restart). To persist data:

### MongoDB
```bash
npm install mongoose
```
Replace the in-memory arrays with Mongoose models (User, MediaItem).

### Firebase
Use Firebase Auth + Firestore + Storage instead of the Express backend.

### File Storage
Replace local `uploads/` with AWS S3, Cloudinary, or Firebase Storage for production.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Capture photo (on camera page) |
| `Escape` | Exit POV mode / close modals |

---

## 🎨 Design System

- **Fonts**: Orbitron (display) · Space Mono (mono/code) · Rajdhani (UI)  
- **Theme**: Cyberpunk AR / Military HUD aesthetic  
- **Colors**: Cyan `#00d4ff` · Green `#00ff88` · Amber `#ffaa00` · Red `#ff3366`  
- **Scanline overlay** on the body for authentic CRT feel

---

## 🛡️ Security Notes

- Passwords are hashed with bcrypt (cost factor 10)
- JWT tokens expire in 7 days
- For production: use a real `JWT_SECRET` environment variable
- Consider rate limiting and CORS origin restrictions in production

---

*Built with Express.js · Vanilla JS · CSS Custom Properties · Chart.js*
