import { addCommand } from "./cmd_palette.mjs";
import {
    addKeyListener,
    DEPTH_KEY,
    getDepth,
    getVisibleTabs,
    promoteChildren,
    setDepth,
    state,
    toggleFold,
} from "./helpers.mjs";

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
        if (tab.classList.contains("foldable")) return;
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

    function makeTabNotFoldable(tab) {
        tab.classList.remove("foldable");
        tab.querySelector(".zen-vim-fold-btn")?.remove();
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

    function onTabClose(e) {
        const tab = e.target;
        if (tab.dataset.closeChildren !== "true") {
            promoteChildren(tab);
            return;
        };
        const depthLevel = getDepth(tab);
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
        const prevTab = tab.previousElementSibling;
        const prevTabDepth = getDepth(prevTab);
        if (prevTab && prevTabDepth < depthLevel) {
            if (!nextTab || prevTabDepth >= getDepth(nextTab)) {
                makeTabNotFoldable(prevTab);
            }
        }
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

    addKeyListener("sidebar", "p", () => oneLevelHigher(state.currentTab));
    addKeyListener("sidebar", "t", () => promoteTab(state.currentTab, 0));

    addCommand("promoteTab", {
        string: "Tree: move current tab one level higher",
        fn: oneLevelHigher,
    });
    addCommand("promoteTabToRoot", {
        string: "Tree: move current tab to the top",
        fn: () => promoteTab(gBrowser.selectedTab, 0),
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

    gBrowser.tabContainer.addEventListener("TabOpen", onNewTabOpen);
    gBrowser.tabContainer.addEventListener("TabMove", onTabMove);
    window.addEventListener("TabClose", onTabClose, true);
    gBrowser.tabContainer.addEventListener("SSTabRestoring", onTabRestored);
}
