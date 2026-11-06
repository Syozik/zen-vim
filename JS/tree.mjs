import { addCommand } from "./cmd_palette.mjs";
import {
    DEPTH_KEY,
    getDepth,
    getVisibleTabs,
    setDepth,
    state,
    toggleFold,
} from "./helpers.mjs";
import { addKeyListener, isHolding } from "./keyboard.mjs";

function isFoldable(tab) {
    return tab && tab.classList.contains("foldable");
}

function makeTabNotFoldable(tab) {
    if (!isFoldable(tab)) return;
    tab.classList.remove("foldable");
    tab.querySelector(".zen-vim-fold-btn")?.remove();
}

function promoteChildren(tab) {
    const depth = getDepth(tab);
    let nextTab = tab.nextElementSibling;
    while (nextTab && getDepth(nextTab) > depth) {
        setDepth(nextTab, getDepth(nextTab) - 1);
        nextTab = nextTab.nextElementSibling;
    }
    makeTabNotFoldable(tab);
}

function promoteTab(tab, minDepth) {
    const currentDepth = getDepth(tab);
    if (!currentDepth) return;
    let prevTab = tab.previousElementSibling;
    while (getDepth(prevTab) > minDepth) {
        prevTab = prevTab.previousElementSibling;
    }
    let idx = gBrowser.visibleTabs.indexOf(prevTab) + 1;
    setDepth(tab, minDepth);
    let nextTab = tab.nextElementSibling;
    gBrowser.moveTabTo(tab, { tabIndex: idx++ });
    while (nextTab && getDepth(nextTab) > currentDepth) {
        gBrowser.moveTabTo(nextTab, { tabIndex: idx++ });
        setDepth(nextTab, getDepth(nextTab) - currentDepth + minDepth);
        nextTab = nextTab.nextElementSibling;
    }
}

function oneLevelHigher(tab = gBrowser.selectedTab) {
    const currentDepth = getDepth(tab);
    promoteTab(tab, currentDepth - 1);
}

function updateTab(tab) {
    if (!tab) return;
    const nextTab = tab.nextElementSibling;
    if (nextTab && getDepth(nextTab) <= getDepth(tab)) {
        makeTabNotFoldable(tab);
    }
}

function waitForTabRemoval(tab, timeout = 2000) {
    return new Promise((resolve) => {
        if (!tab.isConnected) return resolve();

        const observer = new MutationObserver(() => {
            if (!tab.isConnected) done();
        });
        const timer = setTimeout(done, timeout);

        function done() {
            observer.disconnect();
            clearTimeout(timer);
            resolve();
        }

        observer.observe(gBrowser.tabContainer, {
            childList: true,
            subtree: true,
        });
    });
}

export function setupTree() {
    const TAB_ID_KEY = "zen-vim-tab-id";
    const PARENT_KEY = "zen-vim-parent-tab";

    function getTabId(tab) {
        let id = SessionStore.getCustomTabValue(tab, TAB_ID_KEY);
        if (!id) {
            id = crypto.randomUUID();
            SessionStore.setCustomTabValue(tab, TAB_ID_KEY, id);
        }
        return id;
    }

    function restoreDepth(tab) {
        const depth =
            parseInt(SessionStore.getCustomTabValue(tab, DEPTH_KEY)) || 0;
        setDepth(tab, depth);
        const prevTab = tab.previousElementSibling;
        if (prevTab && getDepth(prevTab) < depth) makeTabFoldable(prevTab);
    }

    function makeTabFoldable(tab) {
        if (isFoldable(tab)) return;
        tab.classList.add("foldable");
        const btn = document.createElement("div");
        btn.className = "zen-vim-fold-btn";
        btn.addEventListener("mousedown", (e) => e.stopPropagation());
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFold(tab);
        });
        tab.querySelector(".tab-content").prepend(btn);
    }

    function onNewTabOpen(e) {
        const parent = e.target.openerTab;
        if (!parent || parent.pinned) return;
        const parentLevel = parseInt(parent.dataset.depthLevel) || 0;
        setDepth(e.target, parentLevel + 1);
        makeTabFoldable(parent);
        e.target.addEventListener("dragstart", onDragStart);
    }

    function onTabMove(e) {
        const currIndex = e.detail.currentTabState.tabIndex;
        const prevIndex = e.detail.previousTabState.tabIndex;
        let parentIndex;
        if (currIndex <= prevIndex) parentIndex = prevIndex;
        else parentIndex = prevIndex - 1;
        if (parentIndex < 0) return;

        const prevParent = gBrowser.tabs[parentIndex];
        if (prevParent && prevParent.classList.contains("foldable")) {
            const nextEl = prevParent.nextElementSibling;
            if (!nextEl || getDepth(prevParent) >= getDepth(nextEl)) {
                makeTabNotFoldable(prevParent);
            }
        }
    }

    function onTabRestored(e) {
        const tab = e.target;
        restoreDepth(tab);
        SessionStore.deleteCustomTabValue(tab, PARENT_KEY);
        const id = SessionStore.getCustomTabValue(tab, TAB_ID_KEY);
        if (!id) return;
        SessionStore.getClosedTabDataForWindow(window)
            .filter((t) => t.state.extData?.[PARENT_KEY] === id)
            .sort((a, b) => a.pos - b.pos)
            .forEach((t) => SessionStore.undoCloseById(t.closedId));
    }

    async function onTabClose(e) {
        const tab = e.target;
        const depthLevel = getDepth(tab);

        const prevTab = tab.previousElementSibling;

        if (isHolding("shift")) {
            const descendants = [];
            let nextTab = tab.nextElementSibling;
            while (nextTab && getDepth(nextTab) > depthLevel) {
                descendants.push(nextTab);
                nextTab = nextTab.nextElementSibling;
            }
            if (descendants.length) {
                const id = getTabId(tab);
                for (const child of descendants.reverse()) {
                    gZenUIManager.shakeElement(child);
                    SessionStore.setCustomTabValue(child, PARENT_KEY, id);
                    gBrowser.removeTab(child, { animate: true });
                }
            }
        } else {
            promoteChildren(tab);
        }
        await waitForTabRemoval(tab);
        updateTab(prevTab);
    }

    function onDragStart(e) {
        const tab = e.currentTarget;
        const tabDepth = getDepth(tab);
        const prevTab = tab.previousElementSibling;
        const prevTabDepth = getDepth(prevTab);
        let nextTab = tab.nextElementSibling;
        if (prevTab && prevTabDepth < getDepth(tab)) {
            if (!nextTab || getDepth(nextTab) <= prevTabDepth) {
                tab.addEventListener("dragend", () => {
                    makeTabNotFoldable(prevTab);
                });
            }
        }
        tab.addEventListener("dragend", () => {
            setDepth(tab, 0);
            makeTabNotFoldable(tab);
            while (nextTab && getDepth(nextTab) > tabDepth) {
                nextTab.classList.remove("folded-hidden");
                setDepth(nextTab, getDepth(nextTab) - 1);
                nextTab = nextTab.nextElementSibling;
            }
        });
    }

    addKeyListener("sidebar", "p", () => oneLevelHigher(state.currentTab));
    addKeyListener("sidebar", "t", () => promoteTab(state.currentTab, 0));
    addKeyListener("sidebar", "c", () => promoteChildren(state.currentTab));

    addCommand("promoteTab", {
        string: "Tree: promote tab one level higher",
        fn: oneLevelHigher,
    });
    addCommand("promoteTabToRoot", {
        string: "Tree: promote tab to the top",
        fn: () => promoteTab(gBrowser.selectedTab, 0),
    });
    addCommand("promoteTabChildren", {
        string: "Tree: promote tab's children",
        fn: () => promoteChildren(gBrowser.selectedTab),
    });

    // a little hack for now.
    setTimeout(() => {
        const tabs = getVisibleTabs();
        tabs.forEach(restoreDepth);
        for (const tab of tabs) {
            const nextTab = tab.nextElementSibling;
            if (nextTab && getDepth(tab) < getDepth(nextTab)) {
                makeTabFoldable(tab);
            }
            tab.addEventListener("dragstart", onDragStart);
        }
    }, 100);

    gBrowser.tabContainer.addEventListener("click", (ev) => {
        if (!ev.target.matches(".tab-close-button")) return;
        const tab = ev.target.closest("tab");
        gBrowser.removeTab(tab, { animate: true });
    });
    gBrowser.tabContainer.addEventListener("TabOpen", onNewTabOpen);
    gBrowser.tabContainer.addEventListener("TabMove", onTabMove);
    window.addEventListener("TabClose", onTabClose, true);
    gBrowser.tabContainer.addEventListener("SSTabRestoring", onTabRestored);
}
