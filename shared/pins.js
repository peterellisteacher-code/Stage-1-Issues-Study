/* ============================================================
   pins.js — Shared pinned-question state across pages
   Uses sessionStorage so pins persist within a browser session
   but don't survive a closed tab (Issues Study work is single-session).
   Switch to localStorage to persist across sessions.
   ============================================================ */

(function (window) {
    'use strict';

    const KEY = 'marginalia.pins';

    function read() {
        try {
            return JSON.parse(sessionStorage.getItem(KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function write(arr) {
        sessionStorage.setItem(KEY, JSON.stringify(arr));
    }

    const pins = {
        list() {
            return read();
        },
        has(id) {
            return read().some(p => p.id === id);
        },
        add(id, text) {
            const arr = read();
            if (arr.some(p => p.id === id)) return;
            arr.push({ id, text, addedAt: Date.now() });
            write(arr);
        },
        remove(id) {
            write(read().filter(p => p.id !== id));
        },
        clear() {
            write([]);
        }
    };

    window.pins = pins;
})(window);
