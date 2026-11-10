export function getVisibleTabs() {
    return gBrowser.visibleTabs.filter(
        (tab) => !tab.classList.contains("folded-hidden"),
    );
}

export const state = {
    focus: "tab", // tab | sidebar | glance | cmd_palette
    currentTab: null,
    pressedHistory: [],
};

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

export function isSidebarOnTheLeft() {
    return !Services.prefs.getBoolPref("zen.tabs.vertical.right-side");
}

export function isDigit(k) {
    return "0" <= k && k <= "9";
}

