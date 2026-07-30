const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

function looksLikeIp(str) {
    if (!str) return false;
    const s = str.trim();
    return IPV4_RE.test(s) || (s.includes(':') && IPV6_RE.test(s));
}

function getClientIp(req) {
    const cf = req.headers['cf-connecting-ip'];
    if (looksLikeIp(cf)) return cf.trim();

    const realIp = req.headers['x-real-ip'];
    if (looksLikeIp(realIp)) return realIp.trim();

    const xff = req.headers['x-forwarded-for'];
    if (xff) {
        const first = xff.split(',')[0].trim();
        if (looksLikeIp(first)) return first;
    }

    const raw = req.ip || req.connection?.remoteAddress || 'unknown';
    return raw.replace(/^::ffff:/, '');
}

module.exports = { getClientIp };