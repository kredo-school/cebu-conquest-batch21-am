# Cebu Conquest — Network Setup Guide (ZeroTier + XAMPP)

The team uses **ZeroTier** as a virtual LAN to allow all members to connect to a single host machine running **Windows + XAMPP**, no matter where they physically are.

---

## Architecture Overview

```
[Team Members]
  Browser → ZeroTier IP → [Windows Host Machine]
                                ├── XAMPP Apache   (port 80)  — PHP APIs & DB
                                ├── Node Socket Server (port 3001) — Real-time game
                                └── Vite Dev Server  (port 5173) — React frontend
```

---

## 👨‍💻 FOR THE HOST (Windows + XAMPP)

The host machine runs everything: the Apache/PHP backend, MySQL database, Node socket server, and the Vite frontend.

### Step 1: Install ZeroTier
1. Download and install ZeroTier from [https://www.zerotier.com/download/](https://www.zerotier.com/download/)
2. Join your team's ZeroTier network using your **Network ID**.
3. Find your **ZeroTier IP address** (it looks like `172.x.x.x`). You can find it in the ZeroTier app or by running `ipconfig` in Command Prompt and looking for the ZeroTier adapter.

### Step 2: Place the Project in XAMPP
- Put the project folder inside `C:\xampp\htdocs\` so the path is:
  `C:\xampp\htdocs\cebu-conquest-batch21-am\`

### Step 3: Configure the `.env` File
Open the `.env` file in the project root and set it to your **ZeroTier IP address**:
```
VITE_API_BASE_URL=http://<YOUR_ZEROTIER_IP>/cebu-conquest-batch21-am/public/api
```
> Example: `VITE_API_BASE_URL=http://172.23.14.5/cebu-conquest-batch21-am/public/api`

### Step 4: Configure the Database
1. Open XAMPP Control Panel and start **Apache** and **MySQL**.
2. Go to `http://localhost/phpmyadmin` and import the database SQL file if not already done.
3. Open `public/config/database.php` and confirm the DB credentials match your XAMPP setup (default: host=`localhost`, user=`root`, password=`""`).

### Step 5: Start the Node Socket Server
Open a Command Prompt in `C:\xampp\htdocs\cebu-conquest-batch21-am\socket-server\` and run:
```bash
node server.js
```
The server should log: `Server running on port 3001`

### Step 6: Start the Vite Frontend
Open a second Command Prompt in `C:\xampp\htdocs\cebu-conquest-batch21-am\` and run:
```bash
npm install   # (only needed first time)
npm run dev
```
Vite will start and display something like:
```
  Local:   http://localhost:5173/
  Network: http://172.23.14.5:5173/    ← This is the URL to share!
```

### Step 7: Share the URL
Share the **Network URL** (the ZeroTier IP one) with all team members.

---

## 👥 FOR TEAM MEMBERS (Clients)

### Step 1: Install ZeroTier
1. Download and install ZeroTier from [https://www.zerotier.com/download/](https://www.zerotier.com/download/)
2. Join the **same ZeroTier Network ID** as the host.
3. Wait until your status shows as **Connected** in the ZeroTier app.

### Step 2: Open the Application
Open your browser (Chrome recommended) and go to the URL shared by the host:
```
http://<HOST_ZEROTIER_IP>:5173
```
> Example: `http://172.23.14.5:5173`

That's it! You will be able to log in, create rooms, and play in real-time.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| Cannot reach the app URL | Make sure you are connected to the ZeroTier network and your status is **Online** |
| Login fails / API errors | The host must have XAMPP's **Apache** and **MySQL** both running |
| Cannot join a room | The host must have the **Node socket server** running (`node server.js` in `/socket-server/`) |
| ZeroTier IP changed | Host updates `.env` with the new ZeroTier IP and restarts `npm run dev` |
| `CORS` errors in console | Check that `public/api/api-cors.php` has `Access-Control-Allow-Origin: *` |

---

## 📋 Quick Reference — Ports Used

| Service | Port | Who runs it |
|---|---|---|
| XAMPP Apache (PHP APIs) | `80` | Host |
| XAMPP MySQL | `3306` | Host |
| Node Socket Server | `3001` | Host |
| Vite Dev Server (Frontend) | `5173` | Host |
