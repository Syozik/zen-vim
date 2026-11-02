export function getVisibleTabs() {
    return gBrowser.visibleTabs.filter(
        (tab) => !tab.classList.contains("folded-hidden"),
    );
}

export const state = {
    focus: "tab", // tab | sidebar | glance
    currentTab: null,
    pressedHistory: [],
};

export const fnKeys = new Set(["Control", "Shift", "Meta", "Alt"]);

export function getKey(ev) {
    const keys = [];

    if (ev.ctrlKey) keys.push("ctrl");
    if (ev.shiftKey) keys.push("shift");
    if (ev.altKey) keys.push("alt");
    if (ev.metaKey) keys.push("meta");
    if (ev.key == " ") keys.push("space");
    else if (!fnKeys.has(ev.key)) keys.push(ev.key);

    return keys.join("-");
}

// [focus: { key: callbacks[] }]
export const listenerHandlers = {
    "*": {},
    tab: {},
    sidebar: {},
    glance: {},
};

/**
 * Adds a key press listener that will execute a functin fn in the specified focus.
 * "*" is a wildcard, both for focus and key.
 * "!" is a fallback key, if nothing matched.
 * @param {"tab"|"sidebar"|"glance"|"*"} focus - where this key should be listened to.
 * @param {string} key - key.
 * @param {Function} fn - callback .
 */
export function addKeyListener(focus, key, fn) {
    const keys = [key];
    const m = key.match(/^ctrl-w (\w)$/);
    if (m) keys.push(`ctrl-w ctrl-${m[1]}`); // ctrl-w h should be the same as ctrl-w ctrl-h
    for (const k of keys) {
        if (!(k in listenerHandlers[focus])) {
            listenerHandlers[focus][k] = [];
        }
        listenerHandlers[focus][k].push(fn);
    }
}

export function isCompactMode() {
    return document.documentElement.getAttribute("zen-compact-mode") === "true";
}

export function isSidebarHidden() {
    return !gZenCompactModeManager.sidebar.hasAttribute("zen-user-show");
}

function isValidUrl(string) {
    if (!/\w+\.\w+/.test(string)) return false;
    try {
        if (!string.startsWith("http")) string = "https://" + string;
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function getUrl(string) {
    let url = string;
    if (isValidUrl(url)) {
        if (!url.startsWith("http")) url = "https://" + url;
    } else {
        const base = "https://google.com/search";
        const params = new URLSearchParams({ q: string });
        url = `${base}?${params.toString()}`;
    }
    return url;
}

export const triggeringPrincipal =
    Services.scriptSecurityManager.getSystemPrincipal();

export function toggleFold(tab) {
    const depthLevel = getDepth(tab);
    if (tab.classList.contains("folded")) {
        tab.classList.remove("folded");
        let nextTab = tab.nextElementSibling;
        while (nextTab && getDepth(nextTab) > depthLevel) {
            nextTab.classList.remove("folded-hidden");
            if (nextTab.classList.contains("folded")) {
                const currDepth = getDepth(nextTab);
                nextTab = nextTab.nextElementSibling;
                while (nextTab && getDepth(nextTab) > currDepth) {
                    nextTab = nextTab.nextElementSibling;
                }
            } else {
                nextTab = nextTab.nextElementSibling;
            }
        }
    } else {
        tab.classList.add("folded");
        let nextTab = tab.nextElementSibling;
        while (nextTab && getDepth(nextTab) > depthLevel) {
            nextTab.classList.add("folded-hidden");
            nextTab = nextTab.nextElementSibling;
        }
    }
}

export const DEPTH_KEY = "zen-vim-depth";

export function getDepth(tab) {
    if (!tab) return 0;
    return parseInt(tab.dataset.depthLevel ?? 0);
}

export function setDepth(tab, depth) {
    if (tab.pinned) return;
    tab.dataset.depthLevel = depth;
    tab.style.setProperty("--depth-level", depth);
    SessionStore.setCustomTabValue(tab, DEPTH_KEY, String(depth));
}

export function getTranslationActor() {
    return TranslationsParent.getTranslationsActor(gBrowser.selectedBrowser);
}
