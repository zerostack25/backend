require('dotenv').config();
const { chatCompletion } = require('./aichat');

async function analyzeFlood(activities, blockedIps) {
    // Format data untuk AI
    const activityList = activities.map(a => `- ${a.text} from ${a.ip} (${a.timeAgo})`).join('\n');
    
    const prompt = `Anda adalah sistem deteksi flood/DDoS. Analisa aktivitas berikut:

${activityList}

IP yang sudah diblokir: ${blockedIps.join(', ') || 'Tidak ada'}

Tugas:
1. Deteksi apakah ada pola mencurigakan (banyak request ke endpoint sama dari IP berbeda dalam waktu singkat)
2. Kalau suspect flood, jawab dengan format: "SUSPECT: <ip1>,<ip2>,<ip3> - <alasan>"
3. Kalau normal, jawab: "NORMAL"

Contoh suspect: "SUSPECT: 1.2.3.4,5.6.7.8 - 10 request ke /stalker/roblox dalam 30 detik"`;

    try {
        const { message } = await chatCompletion([
            { role: "system", content: "Anda adalah expert cyber security. Deteksi flood attack." },
            { role: "user", content: prompt }
        ]);

        const result = message?.content || '';
        console.log('🤖 AI Analysis:', result.substring(0, 100));
        
        // Parse result
        if (result.startsWith('SUSPECT:')) {
            const match = result.match(/SUSPECT: ([0-9., ]+)/);
            if (match) {
                const ips = match[1].split(',').map(ip => ip.trim()).filter(ip => ip);
                return { suspect: true, ips, reason: result };
            }
        }
        
        return { suspect: false, ips: [], reason: result };
    } catch (e) {
        console.error('AI Analysis Error:', e.message);
        return { suspect: false, ips: [], reason: 'Error' };
    }
}

module.exports = { analyzeFlood };