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

addHoldListener();

export function isHolding(key) {
    return holdingKey?.includes(key);
}
