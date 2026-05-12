# Cebu Conquest — Network Setup Guide (ZeroTier + XAMPP)

The team uses **ZeroTier** as a virtual LAN to allow all members to connect to a single host machine running **Windows + XAMPP**, no matter where they physically are.

> **ZeroTier Network IP of the Host:** `10.29.219.57`

---

## Architecture Overview

```
[Team Members]
  Browser → ZeroTier (10.29.219.57) → [Windows Host Machine]
                                            ├── XAMPP Apache   (port 80)   — PHP APIs & MySQL DB
                                            ├── Node Socket Server (port 3001) — Real-time game
                                            └── Vite Dev Server  (port 5173) — React frontend
```

---

## 👨‍💻 FOR THE HOST (Windows + XAMPP)

The host machine runs everything: the Apache/PHP backend, MySQL database, Node socket server, and the Vite frontend.

### Step 1: Install ZeroTier
1. Download and install ZeroTier from [https://www.zerotier.com/download/](https://www.zerotier.com/download/)
2. Join the team's ZeroTier network using the shared **Network ID**.
3. Confirm your **ZeroTier IP is `10.29.219.57`**. You can verify this by running `ipconfig` in Command Prompt and looking for the ZeroTier adapter.

### Step 2: Place the Project in XAMPP
- Put the project folder inside `C:\xampp\htdocs\` so the full path is:
  `C:\xampp\htdocs\cebu-conquest-batch21-am\`

### Step 3: Verify the `.env` File
The `.env` file in the project root is already configured with the correct ZeroTier IP:
```
VITE_API_BASE_URL=http://10.29.219.57/cebu-conquest-batch21-am/public/api
VITE_SOCKET_URL=http://10.29.219.57:3001
```
> ⚠️ If the ZeroTier IP ever changes, update both values here and restart `npm run dev`.

### Step 4: Configure the Database
1. Open XAMPP Control Panel and start **Apache** and **MySQL**.
2. Go to `http://localhost/phpmyadmin` and import the project's SQL file if not already done.
3. Verify `config/database.php` and `public/db_connection.php` credentials match your XAMPP setup.
   - **XAMPP Default:** port=`3306`, user=`root`, password=`""` (I have already updated these in the code).
   - **MAMP (if switching back):** port=`8889`, user=`root`, password=`root`.

### Step 5: Start the Node Socket Server
Open a Command Prompt in:
`C:\xampp\htdocs\cebu-conquest-batch21-am\socket-server\`

Then run:
```bash
node server.js
```
You should see: `Server running on port 3001`

### Step 6: Start the Vite Frontend
Open a second Command Prompt in:
`C:\xampp\htdocs\cebu-conquest-batch21-am\`

Then run:
```bash
npm install   # (only needed the first time)
npm run dev
```

Vite will display something like:
```
  Local:   http://localhost:5173/
  Network: http://10.29.219.57:5173/    ← Share this URL with the team!
```

### Step 7: Share the URL
Tell all team members to open their browsers and go to:

**👉 `http://10.29.219.57:5173`**

---

## 👥 FOR TEAM MEMBERS (Clients)

### Step 1: Install ZeroTier
1. Download and install ZeroTier from [https://www.zerotier.com/download/](https://www.zerotier.com/download/)
2. Join the **same ZeroTier Network ID** shared by the host.
3. Wait until the ZeroTier app shows your status as **Connected/Online**.

### Step 2: Open the Application
Open your browser (Chrome recommended) and navigate to:
```
http://10.29.219.57:5173
```
You will see the Cebu Conquest login screen. Log in, create or join a room, and play!

---

## 🗺️ Map Information

The game uses the **PRODUCTION** map (`cebu_map_production.tmj`) with the full tileset.

All required tileset files are located in `public/assets/tilesets/`:
| Tileset Key | File |
|---|---|
| `main` | `[Base]BaseChip_pipo.png` |
| `main2` | `Slates.png` |
| `water_light` | `[A]Water2_pipo.png` |
| `special_small` | `pipo-map001.png` |
| `flower` | `[A]Flower_pipo.png` |
| `grass` | `[A]Grass4_pipo.png` |
| `long_grass` | `[A]LongGrass_pipo.png` |
| `dirt_road` | `[A]Dirt1_pipo.png` |
| `water_dark` | `[A]Water1_pipo.png` |
| `water_bright` | `water_bright.png` |
| `waves` | `waves.png` |
| `waterfall` | `waterfall.png` |
| `japan` | `JapanProps-02.png` |
| `heroes` | `heros.png` |
| `animals` | `animals.png` |

> ⚠️ If the map fails to load, make sure **all** tileset files above exist in `public/assets/tilesets/` on the host machine.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| Cannot reach `http://10.29.219.57:5173` | Make sure ZeroTier is connected and status is **Online** |
| Login fails / API 404 errors | Host must have XAMPP **Apache** running; check `VITE_API_BASE_URL` in `.env` |
| Cannot join a room / Socket errors | Host must have `node server.js` running in `socket-server/` |
| Map tiles missing / black squares | Ensure all tileset PNG files exist in `public/assets/tilesets/` on host |
| ZeroTier IP changed | Update `.env` with the new IP and restart `npm run dev` |
| `CORS` errors in browser console | Check that `public/api/api-cors.php` has `Access-Control-Allow-Origin: *` |

---

## 📋 Quick Reference — Ports Used

| Service | Port | Who runs it |
|---|---|---|
| XAMPP Apache (PHP APIs) | `80` | Host |
| XAMPP MySQL | `3306` | Host (internal only) |
| Node Socket Server | `3001` | Host |
| Vite Dev Server (Frontend) | `5173` | Host |
