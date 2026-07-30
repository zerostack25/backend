const axios = require('axios');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_KEY = 'FFINFO-Free';
const BASE_URL = 'http://siambhau69.eu.cc';
const ICON_CDN = 'https://ffitems.devhubx.org/items';

const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'freefire');
const BG_PATH = path.join(ASSETS_DIR, 'background.jpg');
const PROFILE_TEMPLATE_PATH = path.join(ASSETS_DIR, 'profile.jpeg');

const UGUU_UPLOAD_URL = 'https://uguu.se/upload';

const REGION_NAMES = {
    ID: 'Indonesia', BD: 'Bangladesh', IN: 'India', BR: 'Brazil',
    US: 'United States', PK: 'Pakistan', TH: 'Thailand', VN: 'Vietnam',
    SG: 'Singapore', TW: 'Taiwan', RU: 'Russia', ME: 'Middle East',
    EU: 'Europe', NA: 'North America', SAC: 'South America'
};

// Template profile.jpeg aslinya 2144x636px. Koordinat di bawah ini
// diukur langsung dari pixel template, lalu discale mengikuti CARD_W.
const TEMPLATE_W = 2144;
const TEMPLATE_H = 636;
const T = {
    avatar: { x: 250, y: 75, w: 345, h: 352 },
    levelNum: { x: 340, yBaseline: 575 },
    uidNum: { x: 1490, yBaseline: 580, maxX: 1990 },
    likesNum: { xStart: 1970, yBaseline: 430 },
    username: { x: 650, yBaseline: 150 },
    region: { x: 650, yBaseline: 230 }
};

// Lebar mini card di banner
const CARD_W = 560;

// ---------- Rank tier (teks doang, gak butuh asset gambar) ----------

const RANK_THRESHOLDS = [
    { min: 0, label: 'Bronze 1' },
    { min: 1000, label: 'Bronze 1' },
    { min: 1300, label: 'Bronze 3' },
    { min: 1400, label: 'Silver 1' },
    { min: 1500, label: 'Silver 2' },
    { min: 1600, label: 'Silver 3' },
    { min: 1725, label: 'Gold 1' },
    { min: 1850, label: 'Gold 2' },
    { min: 1975, label: 'Gold 3' },
    { min: 2100, label: 'Gold 4' },
    { min: 2225, label: 'Platinum 1' },
    { min: 2350, label: 'Platinum 2' },
    { min: 2475, label: 'Platinum 3' },
    { min: 2600, label: 'Platinum 4' },
    { min: 2750, label: 'Platinum 5' },
    { min: 2900, label: 'Diamond 1' },
    { min: 3050, label: 'Diamond 2' },
    { min: 3200, label: 'Diamond 3' },
    { min: 3350, label: 'Diamond 4' },
    { min: 3500, label: 'Heroic \u2605 1' },
    { min: 3800, label: 'Heroic \u2605 2' },
    { min: 4300, label: 'Elite Heroic' },
    { min: 7100, label: 'Master' },
    { min: 8000, label: 'Master - Elite Master' },
    { min: 9000, label: 'Elite Master' },
    { min: 10000, label: 'Grandmaster' }
];

const TIER_COLORS = [
    { key: 'bronze', color: '#cd7f32' },
    { key: 'silver', color: '#c0c0c0' },
    { key: 'gold', color: '#ffd700' },
    { key: 'platinum', color: '#7ec8e3' },
    { key: 'diamond', color: '#4fc3f7' },
    { key: 'heroic', color: '#b23cfd' },
    { key: 'elite heroic', color: '#ff6b6b' },
    { key: 'master', color: '#ffd54f' },
    { key: 'elite master', color: '#ff3d3d' },
    { key: 'grandmaster', color: '#00e5ff' }
];

function getRankColor(label) {
    const lower = label.toLowerCase();
    const sorted = [...TIER_COLORS].sort((a, b) => b.key.length - a.key.length);
    const found = sorted.find(t => lower.includes(t.key));
    return found ? found.color : '#8ab4f8';
}

function getRankTier(points) {
    points = points || 0;
    let current = RANK_THRESHOLDS[0];
    for (const t of RANK_THRESHOLDS) {
        if (points >= t.min) current = t;
    }
    return { label: current.label, color: getRankColor(current.label) };
}

// ---------- Uguu.se uploader ----------

async function uploadToUguu(buffer, fileName, retries = 2) {
    let lastErr;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const form = new FormData();
            form.append('files[]', buffer, fileName);

            const { data } = await axios.post(UGUU_UPLOAD_URL, form, {
                headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
                timeout: 90000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            if (!data.files || !data.files[0]) throw new Error('Upload failed, no files returned');
            return data.files[0];
        } catch (err) {
            lastErr = err;
            if (attempt > retries) throw lastErr;
            await new Promise(r => setTimeout(r, 3000 * attempt));
        }
    }
}

// ---------- Free Fire scraper ----------

async function stalk(uid, region = 'BD') {
    const { data } = await axios.get(`${BASE_URL}/freefireinfo/bhau`, {
        params: { uid, region, key: API_KEY },
        timeout: 15000
    });
    return data;
}

async function safeLoadIcon(itemId) {
    if (!itemId) return null;
    try {
        return await loadImage(`${ICON_CDN}/${itemId}`);
    } catch (e) {
        return null;
    }
}

async function safeLoadLocal(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return await loadImage(filePath);
    } catch (e) {
        return null;
    }
}

// Singkat angka besar: >10.000 jadi "12.3K", >1jt jadi "1.2M"
function formatCount(n) {
    n = n || 0;
    if (n >= 1000000) {
        const v = n / 1000000;
        return (Number.isInteger(v) ? v : v.toFixed(1)) + 'M';
    }
    if (n > 10000) {
        const v = n / 1000;
        return (Number.isInteger(v) ? v : v.toFixed(1)) + 'K';
    }
    return n.toLocaleString();
}

// Cari ukuran font terbesar yang muat di maxWidth
function fitFontSize(ctx, text, maxWidth, maxSize, minSize, weight = 'bold') {
    let size = maxSize;
    while (size > minSize) {
        ctx.font = `${weight} ${size}px Arial`;
        if (ctx.measureText(text).width <= maxWidth) break;
        size -= 1;
    }
    return size;
}

function drawHexSlot(ctx, x, y, size, icon, label, subLabel) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = '#3ad6ff';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(10, 15, 25, 0.55)';
    ctx.fill();
    ctx.stroke();

    ctx.clip();
    if (icon) {
        const s = size * 1.6;
        ctx.drawImage(icon, x - s / 2, y - s / 2, s, s);
    } else {
        ctx.fillStyle = '#8ab4f8';
        ctx.font = `bold ${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x, y);
    }
    ctx.restore();

    ctx.fillStyle = '#e8eaed';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(label, x, y + size + 18);
    if (subLabel) {
        ctx.font = '12px Arial';
        ctx.fillText(subLabel, x, y + size + 34);
    }
    ctx.shadowBlur = 0;
}

// Rank ditampilin teks doang (pill), warna beda per tier — gak butuh asset gambar
function drawRankText(ctx, x, y, tier, position) {
    const label = tier.label;
    ctx.font = 'bold 18px Arial';
    const textWidth = ctx.measureText(label).width;
    const padX = 14, padY = 8;
    const boxW = textWidth + padX * 2;
    const boxH = 26 + padY;

    ctx.save();
    const bx = x - boxW / 2, by = y - boxH / 2;
    ctx.beginPath();
    ctx.moveTo(bx + boxH / 2, by);
    ctx.arcTo(bx + boxW, by, bx + boxW, by + boxH, boxH / 2);
    ctx.arcTo(bx + boxW, by + boxH, bx, by + boxH, boxH / 2);
    ctx.arcTo(bx, by + boxH, bx, by, boxH / 2);
    ctx.arcTo(bx, by, bx + boxW, by, boxH / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 15, 25, 0.65)';
    ctx.fill();
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = tier.color;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(label, x, y - 4);

    ctx.fillStyle = '#e8eaed';
    ctx.font = '12px Arial';
    ctx.fillText(`#${position}`, x, y + 14);
    ctx.shadowBlur = 0;
}

async function drawBackground(ctx, width, height) {
    const bg = await safeLoadLocal(BG_PATH);
    if (bg) {
        ctx.drawImage(bg, 0, 0, width, height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#3a2f1c');
        grad.addColorStop(0.4, '#4a3820');
        grad.addColorStop(0.7, '#2a2a2a');
        grad.addColorStop(1, '#151515');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    const overlay = ctx.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, 'rgba(10,10,20,0.35)');
    overlay.addColorStop(0.5, 'rgba(10,10,20,0.2)');
    overlay.addColorStop(1, 'rgba(10,10,20,0.5)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);
}

// Mini card: template.jpeg jadi frame, teks/avatar ditumpuk di atasnya
// sesuai koordinat yang udah diukur presisi dari file profile.jpeg
async function drawMiniCard(ctx, basic, cardX, cardY, cardW) {
    const template = await safeLoadLocal(PROFILE_TEMPLATE_PATH);
    const scale = cardW / TEMPLATE_W;
    const cardH = TEMPLATE_H * scale;

    if (!template) return cardH;
    ctx.drawImage(template, cardX, cardY, cardW, cardH);

    // ---- Avatar foto ----
    const avX = cardX + T.avatar.x * scale;
    const avY = cardY + T.avatar.y * scale;
    const avW = T.avatar.w * scale;
    const avH = T.avatar.h * scale;

    const avatarIcon = await safeLoadIcon(basic.headPic);
    if (avatarIcon) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(avX, avY, avW, avH);
        ctx.clip();
        ctx.drawImage(avatarIcon, avX, avY, avW, avH);
        ctx.restore();
    }

    // ---- Username ----
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold ${Math.round(34 * scale / 0.3032)}px Arial`;
    ctx.fillText(
        `${basic.nickname || 'Unknown'}`,
        cardX + T.username.x * scale,
        cardY + T.username.yBaseline * scale
    );

    // ---- Region ----
    ctx.fillStyle = '#7a7a7a';
    ctx.font = `${Math.round(22 * scale / 0.3032)}px Arial`;
    ctx.fillText(
        REGION_NAMES[basic.region] || basic.region || '',
        cardX + T.region.x * scale,
        cardY + T.region.yBaseline * scale
    );

    // ---- Level number ----
    ctx.fillStyle = '#111214';
    ctx.font = `bold ${Math.round(24 * scale / 0.3032)}px Arial`;
    ctx.fillText(
        `${basic.level || 0}`,
        cardX + T.levelNum.x * scale,
        cardY + T.levelNum.yBaseline * scale
    );

    // ---- UID number ----
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(20 * scale / 0.3032)}px Arial`;
    ctx.fillText(
        `${basic.accountId || ''}`,
        cardX + T.uidNum.x * scale,
        cardY + T.uidNum.yBaseline * scale
    );

    // ---- Likes number: hitam, native, auto shrink, disingkat kalau >10rb ----
    const likesText = formatCount(basic.liked || 0);
    const likesMaxWidth = (TEMPLATE_W - T.likesNum.xStart - 30) * scale;
    const likesFontSize = fitFontSize(ctx, likesText, likesMaxWidth, Math.round(30 * scale / 0.3032), 12);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold ${likesFontSize}px Arial`;
    ctx.fillText(
        likesText,
        cardX + T.likesNum.xStart * scale,
        cardY + T.likesNum.yBaseline * scale
    );

    return cardH;
}

async function generateBanner(uid, region = 'BD') {
    try {
        const player = await stalk(uid, region);
        const basic = player.basicInfo;
        if (!basic || !basic.accountId) {
            return { success: false, error: 'Player tidak ditemukan, cek uid/region' };
        }

        const social = player.socialInfo || {};
        const clan = player.clanBasicInfo || {};
        const profile = player.profileInfo || {};
        const pet = player.petInfo || {};

        const width = 1080;
        const height = 620;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        await drawBackground(ctx, width, height);

        const clothes = profile.clothes || [];
        const [charIcon, petIcon, ...clothesIcons] = await Promise.all([
            safeLoadIcon(profile.avatarId),
            safeLoadIcon(pet.skinId),
            ...clothes.map(id => safeLoadIcon(id))
        ]);

        const cardH = await drawMiniCard(ctx, basic, 20, 16, CARD_W);

        const tier = getRankTier(basic.rankingPoints || 0);

        const hexY = 16 + cardH / 2;
        drawHexSlot(ctx, 730, hexY, 46, petIcon, `Pet Lv.${pet.level || 0}`);
        drawHexSlot(ctx, 855, hexY, 46, charIcon, 'Character');
        drawRankText(ctx, 990, hexY, tier, basic.rank || 0);

        const gridStartX = 105;
        const gridStartY = 16 + cardH + 60;
        const gapX = 168;
        const gapY = 150;
        const hexSize = 55;

        clothesIcons.forEach((icon, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = gridStartX + col * gapX;
            const y = gridStartY + row * gapY;
            drawHexSlot(ctx, x, y, hexSize, icon, `Outfit ${i + 1}`);
        });

        const statsX = 655;
        const statsY = gridStartY + 15;
        ctx.textAlign = 'left';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`❤ Likes: ${formatCount(basic.liked || 0)}`, statsX, statsY);
        ctx.fillText(`★ EXP: ${formatCount(basic.exp || 0)}`, statsX, statsY + 36);
        ctx.fillText(`🏆 Ranking Points: ${basic.rankingPoints || 0}`, statsX, statsY + 72);

        if (clan.clanName) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText(`🏰 ${clan.clanName}`, statsX, statsY + 116);
            ctx.fillText(`👥 ${clan.memberNum || 0}/${clan.capacity || 0} members`, statsX, statsY + 152);
        }
        ctx.shadowBlur = 0;

        if (social.signature) {
            ctx.textAlign = 'left';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 15px Arial';
            ctx.fillText('Note:', 40, height - 46);

            ctx.fillStyle = '#e8eaed';
            ctx.font = 'italic 18px Arial';
            ctx.fillText(`"${social.signature.slice(0, 45)}"`, 40, height - 22);

            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#ddd';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('Stalker by api.mayzaa.my.id', width - 30, height - 20);
        ctx.shadowBlur = 0;

        const buffer = canvas.toBuffer('image/png');
        const filename = `ff-banner-${uid}-${Date.now()}.png`;
        // pake tmpdir OS, bukan cwd server, biar gak numpuk file di folder project
        const tmpPath = path.join(os.tmpdir(), filename);
        fs.writeFileSync(tmpPath, buffer);

        let link = null;
        try {
            const uploaded = await uploadToUguu(buffer, filename);
            link = uploaded.url;
        } finally {
            fs.unlink(tmpPath, () => {});
        }

        return { success: true, rank: tier.label, link };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ---------- Express handler ----------

const freefire = async (req, res) => {
    const uid = req.query.uid || '';
    const region = (req.query.region || 'BD').toUpperCase();

    if (!uid) return res.json({ author: 'Mayzaa', success: false, error: 'Parameter uid wajib diisi' });
    if (!/^\d+$/.test(uid)) return res.json({ author: 'Mayzaa', success: false, error: 'Parameter uid harus berupa angka' });

    const result = await generateBanner(uid, region);
    res.json({ author: 'Mayzaa', ...result });
};

module.exports = { freefire, generateBanner, uploadToUguu, getRankTier };
