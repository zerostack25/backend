const WINDOW_MS = 10 * 1000;
const MAX_REQUESTS = 35;
const buckets = new Map();
const activities = [];
const blocked = new Map();
const uniqueIps = new Set();
let totalCreditsUsed = 0;
let monthlyCreditsUsed = 0;
let lastMonthlyReset = new Date();
let totalRequestCount = 0;

function keyOf(ip, endpoint) {
    return `${ip} ${endpoint}`;
}

function checkAndResetMonthlyUsage() {
    const now = new Date();
    if (now.getMonth() !== lastMonthlyReset.getMonth() || now.getFullYear() !== lastMonthlyReset.getFullYear()) {
        monthlyCreditsUsed = 0;
        lastMonthlyReset = now;
    }
}

function recordActivity(activity) {
    totalRequestCount++;
    if (activity.ip && activity.ip !== 'unknown') uniqueIps.add(activity.ip);
    activities.unshift({ ...activity, timestamp: Date.now() });
    if (activities.length > 100) activities.pop();
}

function addCredits(count) {
    totalCreditsUsed += count;
    monthlyCreditsUsed += count;
}

function cleanup(now = Date.now()) {
    for (const [key, bucket] of buckets) {
        bucket.hits = bucket.hits.filter(t => now - t <= WINDOW_MS);
        if (!bucket.hits.length) buckets.delete(key);
    }

    for (const [ip, until] of blocked) {
        if (now >= until) blocked.delete(ip);
    }
}

function antiFlood(req, res, next) {
    checkAndResetMonthlyUsage();
    const now = Date.now();
    cleanup(now);

    const ip = req.clientIp;
    const endpoint = req.path;

    if (endpoint === '/dashboard/stats') {
        return next();
    }

    const blockedUntil = blocked.get(ip);

    if (blockedUntil && now < blockedUntil) {
        recordActivity({ method: req.method, endpoint, ip, action: 'Block', reason: 'Temporary flood block' });
        return res.status(429).json({ success: false, message: 'Too many requests' });
    }

    const key = keyOf(ip, endpoint);
    const bucket = buckets.get(key) || { hits: [] };
    bucket.hits.push(now);
    buckets.set(key, bucket);

    if (bucket.hits.length > MAX_REQUESTS) {
        blocked.set(ip, now + 60 * 1000);
        recordActivity({ method: req.method, endpoint, ip, action: 'Block', reason: `Flood: >${MAX_REQUESTS} req / ${WINDOW_MS / 1000}s on same endpoint` });
        return res.status(429).json({ success: false, message: 'Flood detected' });
    }

    recordActivity({ method: req.method, endpoint, ip, action: 'Allow' });
    addCredits(1);

    next();
}

function getActivities() {
    const now = Date.now();
    return activities.map(a => ({
        ...a,
        timeAgo: `${Math.floor((now - a.timestamp) / 1000)} detik lalu`,
        text: `${a.method} ${a.endpoint}`,
    }));
}

function getStats() {
    checkAndResetMonthlyUsage();
    cleanup();
    return {
        total: totalRequestCount,
        creditsUsed: totalCreditsUsed,
        monthlyUsage: monthlyCreditsUsed,
        users: uniqueIps.size,
        blockedIps: [...blocked.keys()],
        activities: getActivities(),
    };
}

function blockIp(ip, durationMs = 60 * 60 * 1000) {
    blocked.set(ip, Date.now() + durationMs);
}

function unblockIp(ip) {
    blocked.delete(ip);
}

function resetMonthlyUsage() {
    monthlyCreditsUsed = 0;
    lastMonthlyReset = new Date();
}

module.exports = { antiFlood, getStats, addCredits, blockIp, unblockIp, resetMonthlyUsage };
