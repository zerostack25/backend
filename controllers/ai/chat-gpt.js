const axios = require('axios');
const crypto = require('crypto');
const credit = { creator: 'Mayzaa' };

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const chatGpt = async (req, res) => {
    try {
        const text = req.query.text || '';
        const model = req.query.model || 'chatgpt';

        if (!text) return res.json({ ...credit, status: false, message: 'Parameter text wajib diisi' });

        if (model === 'chatgpt') {
            const base_url = 'https://www.chatday.ai';
            const baseHeaders = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
                'Origin': base_url,
                'Referer': base_url + '/chat',
                'Content-Type': 'application/json'
            };

            // Anonymous Sign In
            const loginRes = await axios.post(base_url + '/api/auth/sign-in/anonymous', {}, {
                headers: baseHeaders,
                withCredentials: true,
                timeout: 10000
            });

            const cookies = loginRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
            const visitorId = uuidv4().replace(/-/g, '');
            const conversationId = crypto.randomBytes(8).toString('hex').toUpperCase();

            const chatRes = await axios.post(base_url + '/api/v2/chat/anonymous', {
                content: text,
                model: 'openai/gpt-5.5',
                visitorId: visitorId,
                conversationId: conversationId
            }, {
                headers: {
                    ...baseHeaders,
                    'Cookie': cookies,
                    'Accept': 'text/event-stream'
                },
                timeout: 45000
            });

            let answer = '';
            const lines = chatRes.data.split('\n');
            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const json = line.substring(5).trim();
                if (!json) continue;
                try {
                    const evt = JSON.parse(json);
                    if (evt.type === 'text-delta' && evt.delta) {
                        answer += evt.delta;
                    }
                } catch (e) {}
            }

            if (!answer) throw new Error('Response kosong');
            return res.json({ ...credit, status: true, result: { model: 'ChatGPT 5.5', text: answer } });
        }

        const models = {
            deepseek: { bot_id: 25873, name: 'DeepSeek' },
            claude: { bot_id: 25875, name: 'Claude' },
            grok: { bot_id: 25872, name: 'Xai (Grok)' },
            perplexity: { bot_id: 29624, name: 'Perplexity Sonar' },
            llama: { bot_id: 25870, name: 'Meta: Llama 4 Maverick' },
            qwen: { bot_id: 25869, name: 'Qwen 3 30B A3B' }
        };

        if (!models[model]) return res.json({ ...credit, status: false, message: 'Model tidak valid' });

        const cfg = models[model];
        const BASE = 'https://chatgptfree.ai';
        const AJAX = BASE + '/wp-admin/admin-ajax.php';
        const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

        await axios.get(BASE + '/chat/', {
            headers: { 'User-Agent': UA },
            withCredentials: true,
            timeout: 10000
        });

        const nonceRes = await axios.post(AJAX, new URLSearchParams({
            action: 'aipkit_get_frontend_chat_nonce',
            bot_id: '25871',
            post_id: '261'
        }), {
            headers: {
                'User-Agent': UA,
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': BASE,
                'Referer': BASE + '/chat/'
            },
            withCredentials: true,
            timeout: 10000
        });

        const nonce = nonceRes.data?.data?.nonce || '';
        if (!nonce) throw new Error('Gagal nonce');

        function uuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        const suid = uuid(), cuid = uuid(), mid = uuid(), ckey = uuid(), ts = String(Date.now());

        const cacheRes = await axios.post(AJAX, new URLSearchParams({
            action: 'aipkit_cache_sse_message',
            bot_id: cfg.bot_id,
            message: text,
            _ajax_nonce: nonce,
            post_id: '261',
            user_client_message_id: mid,
            cache_key: ckey,
            session_id: suid,
            conversation_uuid: cuid,
            _ts: ts
        }), {
            headers: {
                'User-Agent': UA,
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': BASE,
                'Referer': BASE + '/chat/'
            },
            withCredentials: true,
            timeout: 10000
        });

        if (!cacheRes.data?.success) throw new Error('Cache failed');

        const streamUrl = `${AJAX}?action=aipkit_frontend_chat_stream&cache_key=${encodeURIComponent(cacheRes.data.data.cache_key)}&bot_id=${cfg.bot_id}&session_id=${suid}&conversation_uuid=${cuid}&post_id=261&_ajax_nonce=${encodeURIComponent(nonce)}&_ts=${ts}`;

        const streamRes = await axios.get(streamUrl, {
            headers: {
                'User-Agent': UA,
                'Accept': 'text/event-stream',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': BASE,
                'Referer': BASE + '/chat/'
            },
            withCredentials: true,
            timeout: 45000
        });

        let fullText = '';
        const lines = streamRes.data.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const j = JSON.parse(line.substring(6));
                    if (j?.delta) fullText += j.delta;
                    if (j?.finished) break;
                } catch (e) {}
            }
        }

        if (!fullText) throw new Error('Response kosong');

        res.json({ ...credit, status: true, result: { model: cfg.name, text: fullText } });

    } catch (error) {
        const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
        const message = isTimeout
            ? 'Server ChatGPT (pihak ketiga) gak respon tepat waktu, coba lagi beberapa saat'
            : error.message;
        res.json({ ...credit, status: false, message });
    }
};

module.exports = { chatGpt };