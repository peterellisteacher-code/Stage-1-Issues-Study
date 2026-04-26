/**
 * chat.js — Netlify Function: Vertex AI Socratic agent proxy
 *
 * POST /.netlify/functions/chat
 * Body: { messages: [{role, text}, ...], pack: "stage1_*" or "auto" or "lab_*", workingQuestion: "..." }
 * Returns: { reply: "..." }
 *
 * Architecture:
 *   - Authenticates with GCP using a service account JSON in env var GCP_SERVICE_ACCOUNT_JSON
 *   - Calls Vertex AI generateContent in project gen-lang-client-0274569601, region us-central1
 *   - When the requested pack has a cache name in cache-state.json, uses cachedContent for cheaper retrieval
 *   - When cache is missing/expired, falls back to system-prompt-only generation (still works, just no readings retrieval)
 *   - Always enforces the Socratic system prompt (never write the essay; ask questions instead)
 *
 * Environment variables required:
 *   GCP_SERVICE_ACCOUNT_JSON   — full JSON of a Vertex-AI-enabled service account, as a single string
 *   GCP_PROJECT_ID             — defaults to gen-lang-client-0274569601
 *   GCP_LOCATION               — defaults to us-central1
 *   GEMINI_MODEL               — defaults to gemini-2.5-flash (cheaper than 2.5-pro for chat)
 */

const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

// --- Lazy-loaded config ---
let cacheState = null;
let auth = null;
let cachedAccessToken = null;
let tokenExpiresAt = 0;

function loadCacheState() {
    if (cacheState) return cacheState;
    try {
        const p = path.join(__dirname, '..', '..', 'data', 'cache-state.json');
        cacheState = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
        console.warn('Could not load cache-state.json:', e.message);
        cacheState = { packs: {} };
    }
    return cacheState;
}

function getAuth() {
    if (auth) return auth;
    const json = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!json) throw new Error('GCP_SERVICE_ACCOUNT_JSON env var is not set. Configure it in Netlify site settings.');
    const credentials = JSON.parse(json);
    auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    return auth;
}

async function getAccessToken() {
    const now = Date.now();
    if (cachedAccessToken && now < tokenExpiresAt - 60000) return cachedAccessToken;
    const client = await getAuth().getClient();
    const tokenResp = await client.getAccessToken();
    cachedAccessToken = tokenResp.token;
    tokenExpiresAt = now + 55 * 60 * 1000; // 55 min — tokens last 60
    return cachedAccessToken;
}

// --- The Socratic system prompt — central pedagogical commitment ---
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

function pickModel() {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function projectId() {
    return process.env.GCP_PROJECT_ID || 'gen-lang-client-0274569601';
}

function location() {
    return process.env.GCP_LOCATION || 'us-central1';
}

function buildEndpoint(model, withCache) {
    // Vertex AI REST endpoint for generateContent
    return `https://${location()}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${location()}/publishers/google/models/${model}:generateContent`;
}

function resolveCacheName(packId) {
    if (!packId || packId === 'auto') return null;
    const state = loadCacheState();
    return state.packs?.[packId]?.cache_name || null;
}

function buildContents(messages, workingQuestion) {
    // Prepend the working-question context as a "user" turn so the agent has it
    const contents = [];
    if (workingQuestion) {
        contents.push({
            role: 'user',
            parts: [{ text: `[CONTEXT — my current working question is: "${workingQuestion}". Refer to it when relevant.]` }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'Noted. I have your working question in mind.' }]
        });
    }
    for (const m of messages) {
        contents.push({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.text }]
        });
    }
    return contents;
}

async function callVertex(messages, packId, workingQuestion) {
    const token = await getAccessToken();
    const model = pickModel();
    const cacheName = resolveCacheName(packId);
    const endpoint = buildEndpoint(model, !!cacheName);

    const body = {
        contents: buildContents(messages, workingQuestion),
        systemInstruction: {
            parts: [{ text: SOCRATIC_SYSTEM_PROMPT }]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
            topP: 0.95
        }
    };

    if (cacheName) {
        body.cachedContent = cacheName;
    }

    const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const errText = await resp.text();
        // If cached_content is the cause, retry without it
        if (cacheName && /cachedContent/i.test(errText)) {
            console.warn('Cache reference failed, retrying without cache:', errText.slice(0, 200));
            delete body.cachedContent;
            const retry = await fetch(endpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!retry.ok) {
                throw new Error(`Vertex AI error (after cache retry): ${retry.status} ${(await retry.text()).slice(0, 300)}`);
            }
            return await retry.json();
        }
        throw new Error(`Vertex AI error: ${resp.status} ${errText.slice(0, 300)}`);
    }
    return await resp.json();
}

function extractText(vertexResponse) {
    const candidates = vertexResponse?.candidates || [];
    for (const c of candidates) {
        const parts = c?.content?.parts || [];
        const text = parts.map(p => p?.text || '').join('');
        if (text) return text;
    }
    return '(The agent paused. Try rephrasing your prompt.)';
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
        const vertex = await callVertex(messages, pack, workingQuestion);
        const reply = extractText(vertex);
        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply, cacheUsed: !!resolveCacheName(pack) })
        };
    } catch (err) {
        console.error('chat function error:', err);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'Internal error' })
        };
    }
};
