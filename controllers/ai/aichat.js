// ========== AICHAT — slot buat scraper AI chat kamu sendiri ==========
// Dipanggil oleh:
//   - flood-ai.js                 (analisis pola flood/serangan)
//   - middleware/telegram-bot.js  (chat bot Telegram owner-only)
// Gantiin 9router.mayzaa.my.id yang udah gak dipake lagi.
//
// KONTRAK FUNGSI (jangan diubah signature-nya, biar 2 caller di atas
// gak perlu diubah lagi):
//
//   chatCompletion(messages, opts) -> Promise<{ message }>
//
//   messages: array format OpenAI-style
//     [{ role: 'system'|'user'|'assistant'|'tool', content: '...' }, ...]
//
//   opts (optional):
//     { tools, tool_choice }  <- dikirim kalau caller butuh function
//                                calling (dipakai telegram-bot.js).
//                                Kalau scraper kamu gak support tool
//                                calling, boleh diabaikan aja - chat
//                                biasa tetep jalan, cuma fitur
//                                get_stats/block_ip/dst dari bot gak
//                                akan bisa dipanggil otomatis sama AI.
//
//   return value WAJIB:
//     { message: { role: 'assistant', content: '<jawaban AI>' } }
//
//   Kalau scraper kamu support tool calling juga, bentuknya:
//     { message: { role: 'assistant', content: null, tool_calls: [...] } }
//     (samain format tool_calls kayak OpenAI: name + JSON string arguments)

async function chatCompletion(messages, opts = {}) {
    // Gabungin messages jadi 1 prompt teks - kepake kalau scraper kamu
    // cuma nerima 1 string input, bukan array messages kayak OpenAI.
    // Kalau scraper kamu emang udah nerima array messages langsung,
    // gak perlu pakai variabel ini, tinggal oper `messages` apa adanya.
    const prompt = messages
        .filter(m => m.role !== 'tool')
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

    // ================================================================
    // TODO: taruh scraper AI hasil kamu sendiri di sini.
    // Contoh:
    //
    //   const axios = require('axios');
    //   const res = await axios.post('https://scraper-kamu.com/api', { prompt });
    //   return { message: { role: 'assistant', content: res.data.result } };
    //
    // ================================================================

    throw new Error('[aichat.js] Scraper belum diisi — lengkapi chatCompletion() dulu');
}

module.exports = { chatCompletion };
