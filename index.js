require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');
const { getClientIp } = require('./system/get-client');
const { antiFlood, getStats, blockIp, unblockIp, resetMonthlyUsage } = require('./system/antiflood');
const { analyzeFlood } = require('./system/aichat');

const app = express();
const PORT = process.env.PORT || 9999;

app.set('trust proxy', true);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"],
            "script-src-attr": ["'self'", "'unsafe-inline'"],
        },
    },
}));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    abortOnLimit: true,
    responseOnLimit: JSON.stringify({ status: false, creator: 'Mayzaa', message: 'File terlalu besar (maks 25MB)' }),
}));
app.use(morgan('tiny'));

app.use(express.static('public'));

app.use((req, res, next) => {
    req.clientIp = getClientIp(req);
    next();
});

// Anti-flood middleware
app.use('/api/', antiFlood);

// Core endpoints
app.get('/', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.get('/api/dashboard/stats', (req, res) => {
    const stats = getStats();
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({
        total: stats.total || 0,
        creditsUsed: stats.creditsUsed || 0,
        monthlyUsage: stats.monthlyUsage || 0,
        users: stats.users || 0,
        uptime: uptimeStr,
        status: 'online',
        health: {
            cpu: Math.floor(Math.random() * 35) + 15,
            ram: Math.floor(Math.random() * 30) + 25,
            disk: Math.floor(Math.random() * 20) + 30,
            network: Math.floor(Math.random() * 45) + 10,
        },
        activities: stats.activities || []
    });
});

app.post('/api/flood/analyze', async (req, res) => {
    try {
        const result = await analyzeFlood(getStats().activities);
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(502).json({ success: false, message: e.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ success: true, port: PORT, uptime: process.uptime() });
});

// Admin Dashboard API Routes
function adminApiAuth(req, res, next) {
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass) {
        return res.status(500).json({ success: false, error: 'Admin password not configured on server' });
    }
    
    // Check both x-admin-token and x-admin-pass to be safe, admin-dashboard uses token header usually
    const providedPass = req.headers['x-admin-token'] || req.headers['x-admin-pass'] || req.query.pass;
    
    if (providedPass === adminPass) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'Unauthorized Admin Access' });
    }
}

app.post('/api/nabatinextar/login', (req, res) => {
    const { password } = req.body;
    const adminPass = process.env.ADMIN_PASSWORD;
    
    if (!adminPass) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    
    if (password === adminPass) {
        res.json({ success: true, token: adminPass }); // Simple token for now
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

app.get('/api/nabatinextar/stats', adminApiAuth, (req, res) => {
    const stats = getStats();
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    res.json({
        total: stats.total || 0,
        credits: stats.creditsUsed || 0,
        users: stats.users || 0,
        uptime: uptimeStr,
        health: {
            cpu: Math.floor(Math.random() * 35) + 15,
            ram: Math.floor(Math.random() * 30) + 25,
            disk: Math.floor(Math.random() * 20) + 30,
            network: Math.floor(Math.random() * 45) + 10,
        },
        activities: stats.activities || [],
        blockedIps: stats.blockedIps || []
    });
});

app.post('/api/nabatinextar/block-ip', adminApiAuth, (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ success: false, message: 'IP required' });
    
    blockIp(ip);
    res.json({ success: true, message: `IP ${ip} blocked` });
});

app.post('/api/nabatinextar/unblock-ip', adminApiAuth, (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ success: false, message: 'IP required' });
    
    unblockIp(ip);
    res.json({ success: true, message: `IP ${ip} unblocked` });
});

app.get('/api/nabatinextar/reset-monthly-usage', adminApiAuth, (req, res) => {
    resetMonthlyUsage();
    res.json({ message: 'Monthly usage reset (manual)', success: true });
});

app.post('/api/turnstile/verify', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    
    const secret = process.env.TURNSTILE_SECRET_KEY;
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token })
    });
    const data = await response.json();
    
    if (data.success) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Verification failed' });
    }
});

app.use('/api/ai', require('./routes/ai'));
app.use('/api/ai-image', require('./routes/ai-image'));
app.use('/api/downloader', require('./routes/downloader'));
app.use('/api/game', require('./routes/game'));
app.use('/api/informasi', require('./routes/informasi'));
app.use('/api/maker', require('./routes/maker'));
app.use('/api/random', require('./routes/random'));
app.use('/api/search', require('./routes/search'));
app.use('/api/stalker', require('./routes/stalker'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/uploader', require('./routes/uploader'));

// Handle 404 for API endpoints
app.use('/api', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`backend running on http://localhost:${PORT}`);
});