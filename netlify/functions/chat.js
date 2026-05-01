/**
 * chat.js — Netlify Function: Socratic agent proxy (Anthropic Claude Haiku 4.5)
 *
 * POST /.netlify/functions/chat
 * Body: { messages: [{role, text}, ...], pack: "stage1_*" or "auto", workingQuestion: "..." }
 * Returns: { reply: "..." }
 *
 * Cost-conscious design (for a 14-30 student class over a unit):
 *   - Claude Haiku 4.5 ($1/M in, $5/M out)
 *   - System prompt (and optional readings pack) marked for ephemeral caching
 *   - Per-IP sliding-window rate limit (default: 30 req / 5 min)
 *   - Conversation history truncated to the last 6 turns before sending
 *   - Output capped at 600 tokens; usage logged for cost tracking
 *
 * Readings:
 *   - Looks for data/packs/<pack_id>.txt at request time
 *   - If found, inlines it as a cached system block (caching activates above 4096 tokens)
 *   - If not, falls back to a one-line topic context note
 *
 * Environment variable:
 *   ANTHROPIC_API_KEY — set in Netlify site settings (never commit)
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 600;
const HISTORY_TURN_LIMIT = 6;          // last N user/assistant pairs (last 2N messages)
const RATE_LIMIT_MAX = 30;             // requests per window per IP
const RATE_LIMIT_WINDOW_MS = 5 * 60_000; // 5 minutes

const SOCRATIC_SYSTEM_PROMPT = `You are a Socratic interlocutor for a Year 11 SACE Stage 1 Philosophy student working on their Issues Study assessment. The student must produce their OWN philosophical question, identify multiple positions on it, critically analyse those positions, and defend their own position with logic and evidence.

YOUR ROLE: To help the student refine and sharpen, NOT to do their thinking for them.

YOU MUST NEVER:
- Suggest a complete philosophical question for the student
- Generate paragraphs of philosophical content for them
- Tell them what to think about a position
- Summarise readings unprompted
- Take over the conversation with long lectures
- Praise generically ("great question!", "well done!")
- Write any portion of the actual essay

YOU MUST ALWAYS:
- Ask ONE focused question at a time, then stop
- When the student offers a vague topic ("I want to do something on ethics"), press them: "What about ethics specifically catches your attention? Is there a moment, a news story, or a personal experience that drew you in?"
- When they offer a topic, ask them to convert it to a QUESTION (this is the single most important move for SACE Stage 1 Issues Study)
- When they offer a question, ask them what positions exist on it
- When they name one position, ask: "What would the strongest objection to that view look like?"
- When they want to know what a philosopher thinks, point them to the reading rather than summarising — "Have a look at the Murdoch passage on attention; what do you think she'd say to that?"
- Use philosophical terminology accurately and gently introduce the right technical term when the student gestures at a concept (bad faith, eudaimonia, intentional fallacy, qualia, deontological)
- Reflect their thinking back to test it: "So you're saying X — but doesn't that imply Y?"
- Register intellectual engagement at the LEVEL of thinking, not at task completion: "That's a sharper formulation." "Now we're getting somewhere — but what would [other position] say to that?"
- Keep responses short (2-4 sentences usually). The student does the talking; you do the questioning.

If the student asks you to write the essay, refuse warmly: "That would do the thinking the assessment is asking *you* to do. Let me ask a question that might help instead..."

The student's working question (if any) is in the conversation context. Keep it in mind.`;

const PACK_CONTEXT = {
    stage1_existentialism: 'existentialist tradition (Sartre, de Beauvoir, Camus, Heidegger, Kierkegaard).',
    stage1_virtue_compassion: 'virtue ethics, Murdoch on attention, and Nussbaum on compassion as cognition.',
    stage1_religion_ethics: 'religion and morality, including Haidt on moral binding and secular ethics.',
    stage1_aesthetics: 'aesthetics — what art is, the intentional fallacy (Wimsatt & Beardsley), and how meaning lives in works.',
    stage1_mind_simulation: 'philosophy of mind — identity theory, functionalism, dualism, the simulation argument (Bostrom), and what makes us human.',
    lab_applied_normative_ethics: 'applied ethics — personhood, abortion (Singer, Marquis, Thomson), and ethics of enhancement (Brave New World).'
};

let client = null;
const packCache = new Map();           // pack_id → { content: string, mtime: number } | null
const rateBuckets = new Map();         // ip → number[] of recent timestamps

function getClient() {
    if (client) return client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY env var is not set. Configure it in Netlify site settings.');
    }
    client = new Anthropic({ apiKey });
    return client;
}

function loadPackText(pack) {
    if (!pack || pack === 'auto') return null;
    if (!/^[a-z0-9_]+$/i.test(pack)) return null; // path-traversal guard
    if (packCache.has(pack)) return packCache.get(pack);
    const file = path.join(__dirname, '..', '..', 'data', 'packs', `${pack}.txt`);
    try {
        const stat = fs.statSync(file);
        const content = fs.readFileSync(file, 'utf8');
        const entry = { content, mtime: stat.mtimeMs };
        packCache.set(pack, entry);
        return entry;
    } catch (e) {
        packCache.set(pack, null);
        return null;
    }
}

function checkRateLimit(ip) {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const recent = (rateBuckets.get(ip) || []).filter(t => t > cutoff);
    if (recent.length >= RATE_LIMIT_MAX) {
        const retryAfterMs = recent[0] + RATE_LIMIT_WINDOW_MS - now;
        return { ok: false, retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }
    recent.push(now);
    rateBuckets.set(ip, recent);
    return { ok: true };
}

function getClientIp(event) {
    const xff = event.headers?.['x-forwarded-for'] || event.headers?.['X-Forwarded-For'];
    if (xff) return String(xff).split(',')[0].trim();
    return event.headers?.['client-ip'] || 'unknown';
}

function buildSystem(pack) {
    const blocks = [{ type: 'text', text: SOCRATIC_SYSTEM_PROMPT }];
    const packEntry = loadPackText(pack);
    if (packEntry) {
        blocks.push({
            type: 'text',
            text: `\n\n--- READINGS FOR THIS TOPIC ---\nThe following passages are available for reference. Cite specific lines when pointing the student toward them; do not summarise unprompted.\n\n${packEntry.content}`
        });
    }
    blocks[blocks.length - 1].cache_control = { type: 'ephemeral' };
    return blocks;
}

function buildMessages(messages, workingQuestion, pack, hasInlineReadings) {
    const truncated = messages.slice(-HISTORY_TURN_LIMIT * 2);
    const out = [];
    const contextParts = [];
    if (!hasInlineReadings) {
        const packNote = pack && pack !== 'auto' ? PACK_CONTEXT[pack] : null;
        if (packNote) contextParts.push(`[TOPIC CONTEXT: I'm working in ${packNote}]`);
    }
    if (workingQuestion) contextParts.push(`[WORKING QUESTION: "${workingQuestion}"]`);

    if (contextParts.length) {
        out.push({ role: 'user', content: contextParts.join('\n\n') });
        out.push({ role: 'assistant', content: 'Noted. Keep going.' });
    }

    for (const m of truncated) {
        out.push({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text
        });
    }
    return out;
}

function extractText(response) {
    const text = (response.content || [])
        .filter(b => b && b.type === 'text')
        .map(b => b.text)
        .join('');
    return text || '(The agent paused. Try rephrasing your prompt.)';
}

exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'POST only' })
        };
    }

    const ip = getClientIp(event);
    const limit = checkRateLimit(ip);
    if (!limit.ok) {
        return {
            statusCode: 429,
            headers: { ...corsHeaders, 'Retry-After': String(limit.retryAfter), 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: `Slow down — try again in ${limit.retryAfter}s.` })
        };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON' })
        };
    }

    const { messages, pack, workingQuestion } = payload;
    if (!Array.isArray(messages) || messages.length === 0) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'messages must be a non-empty array' })
        };
    }

    try {
        const system = buildSystem(pack);
        const hasInlineReadings = system.length > 1;
        const response = await getClient().messages.create({
            model: MODEL,
            max_tokens: MAX_OUTPUT_TOKENS,
            system,
            messages: buildMessages(messages, workingQuestion, pack, hasInlineReadings)
        });

        const u = response.usage || {};
        console.log(JSON.stringify({
            event: 'chat.usage',
            ip,
            pack: pack || 'auto',
            input_tokens: u.input_tokens,
            output_tokens: u.output_tokens,
            cache_creation_input_tokens: u.cache_creation_input_tokens,
            cache_read_input_tokens: u.cache_read_input_tokens
        }));

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: extractText(response) })
        };
    } catch (err) {
        const status = (err && typeof err.status === 'number' && err.status >= 400 && err.status < 600)
            ? err.status
            : 500;
        // Anthropic SDK retries 429 + 5xx with exponential backoff (default maxRetries=2,
        // respects Retry-After). If we still see a 429 here, retries were exhausted —
        // log it structurally so we can spot real capacity problems in Netlify function logs.
        if (status === 429) {
            console.log(JSON.stringify({ event: 'chat.rate_limited_after_retries', ip, pack: pack || 'auto' }));
            return {
                statusCode: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: "The agent is briefly overloaded. Try sending again in a few seconds." })
            };
        }
        console.error('chat function error:', err);
        return {
            statusCode: status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'Internal error' })
        };
    }
};
