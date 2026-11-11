import { isDigit, state } from "./helpers.mjs";

export const fnKeys = new Set(["Control", "Shift", "Meta", "Alt"]);

export function getKey(ev) {
    const keys = [];

    if (ev.ctrlKey) keys.push("ctrl");
    if (ev.shiftKey) keys.push("shift");
    if (ev.altKey) keys.push("alt");
    if (ev.metaKey) keys.push("meta");
    if (ev.key == " ") keys.push("space");
    else if (!fnKeys.has(ev.key)) keys.push(ev.key.toLowerCase());

    return keys.join("-");
}

// [focus: { key: callbacks[] }]
export const listenerHandlers = {
    "*": {},
    tab: {},
    sidebar: {},
    glance: {},
    cmd_palette: {},
};

/**
 * Adds a key press listener that will execute a functin fn in the specified focus.
 * "*" is a wildcard, both for focus and key.
 * "!" is a fallback key, if nothing matched.
 * @param {"tab"|"sidebar"|"glance"|"*"} focus - where this key should be listened to.
 * @param {string} keys - keys[] or a single key.
 * @param {Function} fn - callback .
 */
export function addKeyListener(focus, keys, fn) {
    if (!Array.isArray(keys)) keys = [keys];

    for (const key of [...keys]) {
        const m = key.match(/^ctrl-w (\w)$/);
        if (m) keys.push(`ctrl-w ctrl-${m[1]}`); // ctrl-w h should be the same as ctrl-w ctrl-h
    }

    for (const key of keys) {
        if (!(key in listenerHandlers[focus])) {
            listenerHandlers[focus][key] = [];
        }
        listenerHandlers[focus][key].push(fn);
    }
}

let holdingKey = null;
function addHoldListener() {
    document.addEventListener("keydown", (ev) => {
        const key = getKey(ev);
        holdingKey = key;
    });
    document.addEventListener("keyup", () => (holdingKey = null));
}

export function isHolding(key) {
    return holdingKey?.includes(key);
}

function onKeyDown(ev) {
    if (fnKeys.has(ev.key)) return;
    state.pressedHistory.push(getKey(ev));
    if (state.pressedHistory.length >= 100)
        state.pressedHistory.splice(0, 100);
    const stop = () => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    const globalHandlers = listenerHandlers["*"];
    if (globalHandlers["*"]?.some((fn) => fn())) {
        return;
    }

    const historyLength = state.pressedHistory.length;
    const handlers = listenerHandlers[state.focus];
    let foundKey = false;
    for (let length = Math.min(3, historyLength); length >= 1; length--) {
        const key = state.pressedHistory
            .slice(historyLength - length)
            .join(" ");

        const digits = [];
        let i = historyLength - length - 1;
        while (i >= 0 && isDigit(state.pressedHistory[i])) {
            digits.push(state.pressedHistory[i]);
            i -= 1;
        }
        const multiplier = parseInt(digits.reverse().join("")) || undefined;

        if (key in globalHandlers) {
            stop();
            if (globalHandlers[key].some((fn) => fn(multiplier))) {
                return;
            }
        }

        if (handlers && !handlers["*"]?.some((fn) => fn(multiplier))) {
            if (key in handlers) {
                stop();
                handlers[key].some((fn) => fn(multiplier));
                foundKey = true;
                break;
            }
        }
    }
    if (handlers && !foundKey) {
        handlers["!"]?.some((fn) => fn());
    }
}

export function setupKeyboard() {
    addHoldListener();
    window.addEventListener("keydown", onKeyDown, true);
}
