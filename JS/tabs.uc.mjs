import { createCmdPalette } from "./cmd_palette.mjs";
import {
    addKeyListener,
    fnKeys,
    getKey,
    getVisibleTabs,
    isCompactMode,
    isSidebarHidden,
    listenerHandlers,
    state,
    toggleFold,
} from "./helpers.mjs";
import { setupTree } from "./tree.mjs";

(() => {
    let timeout, glanceOwner, glancedTabIndex;
    createCmdPalette();
    setupTree();

    function mark(tab) {
        state.currentTab?.classList.remove("zen-vim-active-tab");
        state.currentTab = tab;
        tab.classList.add("zen-vim-active-tab");
        tab.scrollIntoView({ block: "nearest" });
    }

    function exit(nextFocus = "tab") {
        state.focus = nextFocus;
        state.currentTab?.classList.remove("zen-vim-active-tab");
        state.currentTab = null;

        if (isCompactMode() && !isSidebarHidden()) {
            gZenCompactModeManager.toggleSidebar();
        }
        document.removeEventListener("click", exitOnClick);
        gBrowser.selectedBrowser.focus();
    }

    const exitOnClick = () => exit();

    function getActiveGlance() {
        return gBrowser.selectedTab.hasAttribute("zen-glance-tab")
            ? gBrowser.selectedTab
            : null;
    }

    async function dismissGlance() {
        const glancedTab = gBrowser.selectedTab;
        const prevMotionOverrideValue = gReduceMotionOverride;
        gReduceMotionOverride = true;
        try {
            await gZenGlanceManager.fullyOpenGlance();
        } finally {
            gReduceMotionOverride = prevMotionOverrideValue;
        }
        if (!glanceOwner) return;
        const peekedPanel = glancedTab.linkedBrowser?.closest(
            ".browserSidebarContainer",
        );
        [...document.querySelectorAll("#tabbrowser-tabpanels > .deck-selected")]
            .filter((panel) => panel !== peekedPanel)
            .forEach((panel) => panel.classList.remove("deck-selected"));
        gBrowser.moveTabTo(glancedTab, { tabIndex: glancedTabIndex });
        gBrowser.selectedTab = glanceOwner;
        glanceOwner = null;
        glancedTabIndex = null;
    }

    function focusPane(dx, dy) {
        const split = gZenViewSplitter._data[gZenViewSplitter.currentView];
        if (!split || state.focus !== "tab") return false;
        const center = (r) => [r.left + r.width / 2, r.top + r.height / 2];
        const [x, y] = center(gBrowser.selectedBrowser.getBoundingClientRect());
        let best = null;
        let bestDist = Infinity;
        for (const tab of split.tabs) {
            const [tx, ty] = center(tab.linkedBrowser.getBoundingClientRect());
            let correctDirection = (tx - x) * dx > 0 || (ty - y) * dy > 0;
            const dist = Math.hypot(tx - x, ty - y);
            if (correctDirection && dist < bestDist) {
                [best, bestDist] = [tab, dist];
            }
        }
        if (!best) return false;
        gBrowser.selectedTab = best;
        // highlightPage(best.linkedBrowser);
        best.linkedBrowser.focus();
        return true;
    }

    let tabs;
    function closeTab(tab = gBrowser.selectedTab, force = false) {
        if (tab.pinned && !force) {
            return gZenPinnedTabManager.resetPinnedTab(tab);
        }
        gBrowser.removeTab(tab, { animate: true });
        tabs = getVisibleTabs();
    }

    function onKeyDown(ev) {
        if (fnKeys.has(ev.key)) return;
        state.pressedHistory.push(getKey(ev));
        if (state.pressedHistory.length >= 100)
            state.pressedHistory.splice(0, 100);
        tabs = getVisibleTabs();
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
            if (key in globalHandlers) {
                stop();
                if (globalHandlers[key].some((fn) => fn())) {
                    return;
                }
            }

            if (handlers && !handlers["*"]?.some((fn) => fn())) {
                if (key in handlers) {
                    stop();
                    handlers[key].some((fn) => fn());
                    foundKey = true;
                    break;
                }
            }
        }
        if (handlers && !foundKey) {
            handlers["!"]?.some((fn) => fn());
        }
    }

    addKeyListener("*", "*", () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }

        return !!document.getElementById("tab-label-input");
    });

    addKeyListener("*", "ctrl-w", () => {
        stop();
        timeout = setTimeout(() => {
            closeTab();
            state.pressedHistory.pop();
            timeout = null;
        }, 250);
        return true;
    });

    addKeyListener("tab", "ctrl-w h", () => {
        if (focusPane(-1, 0)) return;
        state.focus = "sidebar";
        document.addEventListener("click", exitOnClick);
        if (isCompactMode() && isSidebarHidden())
            gZenCompactModeManager.toggleSidebar();
        let visibleTab = gBrowser.selectedTab;
        while (visibleTab && visibleTab.classList.contains("folded-hidden")) {
            visibleTab = visibleTab.previousElementSibling;
        }
        mark(visibleTab);
    });
    addKeyListener("tab", "ctrl-w l", () => focusPane(1, 0));
    addKeyListener("tab", "ctrl-w j", () => focusPane(0, 1));
    addKeyListener("tab", "ctrl-w k", () => focusPane(0, -1));
    addKeyListener("tab", "ctrl-w c", closeTab);
    addKeyListener("tab", "ctrl-w v", () => {
        const copy = gBrowser.duplicateTab(gBrowser.selectedTab);
        gZenViewSplitter.splitTabs([gBrowser.selectedTab, copy], undefined, 1);
    });
    addKeyListener("tab", "ctrl-w m", async () => {
        if (gBrowser.selectedTab.group.hasAttribute("split-view-group")) {
            const tab = gBrowser.selectedTab;
            await gZenViewSplitter.removeTabFromGroup(tab, undefined, {
                forUnsplit: true,
            });
            gBrowser.selectedTab = tab;
        }
    });

    addKeyListener("glance", "*", () => {
        if (!getActiveGlance()) {
            exit();
            return true;
        }
    });
    addKeyListener("glance", "Escape", async () => {
        await dismissGlance();
        exit();
    });
    addKeyListener("glance", "Enter", async () => {
        glanceOwner = null;
        await gZenGlanceManager.fullyOpenGlance();
        exit();
    });

    addKeyListener("sidebar", "*", stop);

    const goWithStep = (step) => {
        const i = tabs.indexOf(state.currentTab);
        goTo(i + step);
    };

    const goTo = (idx) =>
        mark(tabs[Math.max(0, Math.min(idx, tabs.length - 1))]);

    addKeyListener("sidebar", "ctrl-w l", exit);
    addKeyListener("sidebar", "l", () => goWithStep(1));
    addKeyListener("sidebar", "d", async () => {
        gZenUIManager.shakeElement(state.currentTab);
        const i = tabs.indexOf(state.currentTab);
        closeTab(state.currentTab, true);
        goTo(i);
    });
    addKeyListener("sidebar", "v", () => {
        if (
            state.currentTab.group &&
            state.currentTab.group.hasAttribute("split-view-group")
        ) {
            gZenViewSplitter.removeTabFromGroup(state.currentTab, undefined, {
                forUnsplit: true,
            });
        } else {
            const other =
                state.currentTab === gBrowser.selectedTab
                    ? gBrowser.duplicateTab(state.currentTab)
                    : state.currentTab;
            gZenViewSplitter.splitTabs(
                [gBrowser.selectedTab, other],
                undefined,
                1,
            );
        }
        exit();
    });

    const glance = async () => {
        if (getActiveGlance()) {
            await dismissGlance();
        }
        if (state.currentTab === gBrowser.selectedTab) return;
        glanceOwner = gBrowser.selectedTab;
        glancedTabIndex = state.currentTab.index;
        await gZenGlanceManager.openGlance({}, state.currentTab, glanceOwner);
        exit("glance");
    };

    addKeyListener("sidebar", "g", glance);
    addKeyListener("sidebar", "r", () => {
        state.currentTab
            .querySelector(".tab-label-container")
            .dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

    addKeyListener("sidebar", "y", async () => {
        const url = state.currentTab.linkedBrowser.currentURI.spec;
        try {
            await navigator.clipboard.writeText(url);
            exit();
        } catch (error) {
            gZenUIManager.shakeElement(state.currentTab);
            console.error(error.message);
        }
    });

    addKeyListener("sidebar", "u", () => {
        const currentTab = gBrowser.selectedTab;
        const tab = SessionWindowUI.undoCloseTab(window);
        gBrowser.selectedTab = currentTab;
        gZenUIManager.shakeElement(tab);
    });

    addKeyListener("sidebar", "Enter", async () => {
        gBrowser.selectedTab = state.currentTab;
        exit();
    });

    addKeyListener("sidebar", "z", () => {
        if (!state.currentTab.classList.contains("foldable")) return;
        toggleFold(state.currentTab);
    });

    addKeyListener("sidebar", "Escape", exit);
    addKeyListener("sidebar", " ", glance);
    addKeyListener("sidebar", "j", () => goWithStep(1));
    addKeyListener("sidebar", "k", () => goWithStep(-1));
    addKeyListener("sidebar", "h", () => goWithStep(-1));
    addKeyListener("sidebar", "q", () => {
        exit();
        if (!isCompactMode()) {
            gZenCompactModeManager.toggle();
        }
    });
    addKeyListener("sidebar", "!", exit);

    window.addEventListener("keydown", onKeyDown, true);
})();
