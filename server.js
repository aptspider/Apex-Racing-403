const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch'); 
const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// --- MOCKED DATABASE ---
// Stores Failed Login Attempts (The Vulnerable Sink)
const SYSTEM_LOGS = []; 
const ADMIN_COOKIE = "session=RACE_CONTROL_ADMIN_8821_SUPER_SECRET";

// --- MIDDLEWARE: IP RESTRICTION (The "NoMore403" Target) ---
const ipFilter = (req, res, next) => {
    if (req.path.startsWith('/admin')) {
        const forwardedIP = req.headers['x-forwarded-for'];
        const effectiveIP = forwardedIP || '203.0.113.5'; // Default to external
        
        if (effectiveIP.includes('127.0.0.1')) {
            next(); // Unlock
        } else {
            res.status(403).send(`
            <body style="background:black;color:red;font-family:sans-serif;text-align:center;padding-top:100px;">
                <h1 style="font-size:80px;">403 FORBIDDEN</h1>
                <p>ACCESS DENIED</p>
                <p style="color:#555;">Internal IP Address Required.</p>
                <p style="color:#555;">Your IP: ${effectiveIP}</p>
            </body>`);
        }
    } else {
        next();
    }
};

app.use(ipFilter);

// --- BOT SIMULATOR (The Victim) ---
// Admin reviews the "Security Logs" (Failed Logins)
async function adminBotVisit() {
    if (SYSTEM_LOGS.length === 0) return;
    
    console.log(`\n[BOT] Admin is reviewing failed login attempts...`);
    
    for (const log of SYSTEM_LOGS) {
        const scriptMatch = log.username.match(/<script\s+[^>]*src=["']?((?:http)[^"'>\s]+)["']?[^>]*>/i);
        
        if (scriptMatch) {
            const attackerUrl = scriptMatch[1];
            console.log(`[BOT] ⚠️ XSS Execution! Fetching: ${attackerUrl}`);
            try {
                await fetch(attackerUrl, {
                    headers: { 
                        'Cookie': ADMIN_COOKIE, 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApexDashboard/2.0' 
                    }
                });
                console.log(`[BOT] Admin Cookie sent to attacker.`);
            } catch (e) { }
        }
    }
    // Logs persist to show in dashboard
}

// --- ROUTES ---

// 1. STATIC HOMEPAGE
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Apex Racing</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,300;0,700;1,400&display=swap');
            body { font-family: 'Titillium Web', sans-serif; background-color: #15151e; color: #fff; }
            .f1-red { color: #e10600; }
        </style>
    </head>
    <body class="min-h-screen flex flex-col items-center">
        <header class="w-full h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-[#1f1f2b]">
            <div class="flex items-center gap-4">
                <i class="fa-solid fa-flag-checkered text-4xl f1-red"></i>
                <h1 class="text-3xl font-black italic tracking-tighter leading-none">APEX <span class="text-gray-400">DATA</span></h1>
            </div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span class="text-green-500">●</span> System Online
            </div>
        </header>

        <main class="w-full max-w-4xl mt-20 p-8 text-center">
            <h1 class="text-6xl font-black italic mb-6">GLOBAL TELEMETRY</h1>
            <p class="text-gray-400 text-xl">Real-time F1 data aggregation.</p>
            <p class="text-gray-600 text-sm mt-4">Authorized Personnel Only</p>
        </main>
    </body>
    </html>
    `);
});

// 2. ADMIN LOGIN PAGE (The Vector)
app.get('/admin/login', (req, res) => {
    // If you see this, you passed the IP check
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Race Control | Login</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body{background:#0c0c10;color:#fff;font-family:sans-serif;}</style>
    </head>
    <body class="flex flex-col items-center justify-center h-screen">
        <div class="w-full max-w-md bg-[#1f1f2b] p-8 border border-gray-700 rounded shadow-2xl">
            <h1 class="text-3xl font-black italic text-[#e10600] mb-6 text-center">SECURE LOGIN</h1>
            
            <form action="/admin/login" method="POST" class="space-y-6">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Race Director ID</label>
                    <input type="text" name="username" class="w-full bg-black border border-gray-600 text-white p-3 rounded focus:border-[#e10600] outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                    <input type="password" name="password" class="w-full bg-black border border-gray-600 text-white p-3 rounded focus:border-[#e10600] outline-none">
                </div>
                <button class="w-full bg-[#e10600] hover:bg-red-700 text-white font-bold py-3 rounded uppercase tracking-wider">Authenticate</button>
            </form>
        </div>
    </body>
    </html>
    `);
});

// 3. LOGIN ACTION (Vulnerable Logic)
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'supersecret') {
        res.cookie('session', ADMIN_COOKIE.split('=')[1]);
        return res.redirect('/admin');
    }

    // VULNERABLE SINK: Logging failed username
    // We log it to the database for the Admin to review later
    if(username) {
        SYSTEM_LOGS.push({ username: username, ip: req.headers['x-forwarded-for'] || '127.0.0.1', time: new Date().toLocaleTimeString() });
        console.log(`[AUTH] Failed login logged for: ${username}`);
        setTimeout(adminBotVisit, 2000); // Trigger admin review
    }

    res.send(`
    <body style="background:#000;color:white;font-family:sans-serif;text-align:center;padding-top:100px;">
        <h1 style="color:red">ACCESS DENIED</h1>
        <p>Invalid Credentials.</p>
        <p style="color:#555">This incident has been logged.</p>
        <a href="/admin/login" style="color:#e10600">Try Again</a>
    </body>
    `);
});

// 4. ADMIN DASHBOARD
app.get('/admin', (req, res) => {
    const cookie = req.cookies.session;
    
    // Cookie Check
    if (cookie === "RACE_CONTROL_ADMIN_8821_SUPER_SECRET") {
        
        let logsHtml = SYSTEM_LOGS.map(l => `
            <div class="p-3 border-b border-gray-700 font-mono text-xs text-red-300">
                <span class="text-gray-500">[${l.time}]</span> Failed Login: <span class="text-white">${l.username}</span> from ${l.ip}
            </div>
        `).join('');

        if (SYSTEM_LOGS.length === 0) logsHtml = '<div class="p-4 text-gray-500 italic">No security incidents.</div>';

        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Race Control</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>body{background:#0c0c10;color:#fff;font-family:sans-serif;}</style>
        </head>
        <body class="p-10">
            <div class="max-w-4xl mx-auto">
                <div class="flex justify-between items-end border-b border-gray-700 pb-4 mb-8">
                    <h1 class="text-4xl font-black italic text-[#e10600]">RACE CONTROL</h1>
                    <span class="bg-green-900 text-green-400 px-3 py-1 rounded text-xs font-bold">INTERNAL NETWORK</span>
                </div>
                
                <div class="bg-[#1f1f2b] border border-gray-700 rounded-lg overflow-hidden">
                    <div class="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between">
                        <h3 class="font-bold text-gray-300">Security Incident Logs</h3>
                        <span class="text-xs text-gray-500">Live Feed</span>
                    </div>
                    <!-- VULNERABLE SINK: Usernames are printed here -->
                    <div class="max-h-96 overflow-y-auto">
                        ${logsHtml}
                    </div>
                </div>
            </div>
        </body>
        </html>
        `);
    } else {
        // Correct IP, Wrong Cookie -> Redirect to Login
        res.redirect('/admin/login');
    }
});

app.listen(PORT, () => {
    console.log(`[LAB] Apex Racing (Login Poisoning) running at http://localhost:${PORT}`);
});
