import {
    getVisibleTabs,
    isCompactMode,
    isSidebarHidden,
    isSidebarOnTheLeft,
    state,
    toggleFold,
} from "./helpers.mjs";
import { addKeyListener } from "./keyboard.mjs";

export function exit(nextFocus = "tab") {
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

function mark(tab) {
    state.currentTab?.classList.remove("zen-vim-active-tab");
    state.currentTab = tab;
    tab.classList.add("zen-vim-active-tab");
    tab.scrollIntoView({ block: "nearest" });
}

export function focusSidebar() {
    state.focus = "sidebar";
    document.addEventListener("click", exitOnClick);
    if (isCompactMode() && isSidebarHidden())
        gZenCompactModeManager.toggleSidebar();
    let visibleTab = gBrowser.selectedTab;
    while (visibleTab && visibleTab.classList.contains("folded-hidden")) {
        visibleTab = visibleTab.previousElementSibling;
    }
    mark(visibleTab);
}

function goWithStep(step) {
    const i = getVisibleTabs().indexOf(state.currentTab);
    goTo(i + step);
}

function goTo(idx) {
    const tabs = getVisibleTabs();
    mark(tabs[Math.max(0, Math.min(idx, tabs.length - 1))]);
}

function deleteSelectedTab() {
    const tabs = getVisibleTabs();
    gZenUIManager.shakeElement(state.currentTab);
    const i = tabs.indexOf(state.currentTab);
    closeTab(state.currentTab, true);
    goTo(i);
}

export function closeTab(tab = gBrowser.selectedTab, force = false) {
    if (tab.pinned && !force) {
        return gZenPinnedTabManager.resetPinnedTab(tab);
    }
    gBrowser.removeTab(tab, { animate: true });
}

export function setupSidebar() {
    addKeyListener("sidebar", "ctrl-w l", () => {
        if (isSidebarOnTheLeft()) exit();
    });

    addKeyListener("sidebar", "ctrl-w h", () => {
        if (!isSidebarOnTheLeft()) exit();
    });

    addKeyListener("sidebar", "l", (step = 1) => goWithStep(step));

    addKeyListener("sidebar", "*", stop);

    addKeyListener("sidebar", ["d", "shift-d"], deleteSelectedTab);

    addKeyListener("sidebar", "v", () => {
        const tab = state.currentTab;
        if (tab.group && tab.group?.hasAttribute("split-view-group")) {
            gZenViewSplitter.removeTabFromGroup(tab, undefined, {
                forUnsplit: true,
            });
        } else {
            const other =
                tab === gBrowser.selectedTab ? gBrowser.duplicateTab(tab) : tab;
            gZenViewSplitter.splitTabs([tab, other], undefined, 1);
        }
        exit();
    });

    addKeyListener("sidebar", "g g", () => goTo(0));
    addKeyListener("sidebar", "shift-g", () => {
        const tabs = getVisibleTabs();
        goTo(tabs.length - 1);
    });

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

    addKeyListener("sidebar", "enter", async () => {
        gBrowser.selectedTab = state.currentTab;
        exit();
    });

    addKeyListener("sidebar", "z", () => {
        if (!state.currentTab.classList.contains("foldable")) return;
        toggleFold(state.currentTab);
    });

    addKeyListener("sidebar", "escape", exit);
    addKeyListener("sidebar", "j", (step = 1) => goWithStep(step));
    addKeyListener("sidebar", "k", (step = 1) => goWithStep(-step));
    addKeyListener("sidebar", "h", (step = 1) => goWithStep(-step));
    addKeyListener("sidebar", "q", () => {
        exit();
        if (!isCompactMode()) {
            gZenCompactModeManager.toggle();
        }
    });
    // addKeyListener("sidebar", "!", exit);
}
