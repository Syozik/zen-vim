(() => {
    let browsingTabs = false;
    let currentTab = null;
    let timeout = null;

    const mark = (tab) => {
        currentTab?.classList.remove("vim-cur");
        currentTab = tab;
        tab.classList.add("vim-cur");
        tab.scrollIntoView({ block: "nearest" });
    };

    const exit = () => {
        browsingTabs = false;
        currentTab?.classList.remove("vim-cur");
        currentTab = null;
        gBrowser.selectedBrowser.focus();
    };

    function onKeyDown(e) {
        const stop = () => {
            e.preventDefault();
            e.stopPropagation();
        };

        const closeTab = (tab = gBrowser.selectedTab, force = false) => {
            if (tab.pinned && !force) {
                return gZenPinnedTabManager.resetPinnedTab(tab);
            }
            gBrowser.removeTab(tab, { animate: true });
            tabs = gBrowser.visibleTabs;
        };

        const focusPane = (dx, dy) => {
            const split = gZenViewSplitter._data[gZenViewSplitter.currentView];
            if (!split || browsingTabs) return false;
            const center = (r) => [r.left + r.width / 2, r.top + r.height / 2];
            const [x, y] = center(gBrowser.selectedBrowser.getBoundingClientRect());
            let best = null, bestDist = Infinity;
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
            best.linkedBrowser.focus();
            return true;
        };

        const h = () => {
            if (focusPane(-1, 0)) return;
            browsingTabs = true;
            mark(gBrowser.selectedTab);
        };
        const l = () => {
            if (focusPane(1, 0)) return;
            exit();
            browsingTabs = false;
        };
        const j = () => focusPane(0, 1);
        const k = () => focusPane(0, -1);
        const c = () => closeTab();
        const postCtrlWHandlers = { h, l, j, k, c };

        if (e.ctrlKey && e.key === "w") {
            stop();
            timeout = setTimeout(() => {
                closeTab();
                timeout = null;
            }, 250);
            return;
        }
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
            if (e.key in postCtrlWHandlers) {
                stop();
                postCtrlWHandlers[e.key]();
            }
            return;
        }
        if (!browsingTabs) return;
        stop();

        let tabs = gBrowser.visibleTabs;
        const i = tabs.indexOf(currentTab);

        const goTo = (idx) => mark(tabs[Math.max(0, Math.min(idx, tabs.length - 1))]);

        const d = () => {
            const start = tabs.indexOf(gBrowser.selectedTab);
            closeTab(currentTab, true);
            if (start > i) goTo(i - 1);
            else goTo(i);
        };

        const v = () => {
            if (currentTab.group && currentTab.group.hasAttribute("split-view-group")) {
                gZenViewSplitter.removeTabFromGroup(currentTab);
            } else {
                const other = currentTab === gBrowser.selectedTab ? gBrowser.duplicateTab(currentTab) : currentTab;
                gZenViewSplitter.splitTabs([gBrowser.selectedTab, other], undefined, 1);
            }
            exit();
        };

        const Enter = () => {
            gBrowser.selectedTab = currentTab;
            exit();
        };

        const tabMovementHandlers = {
            d,
            v,
            l: () => goTo(i + 1),
            j: () => goTo(i + 1),
            k: () => goTo(i - 1),
            h: () => goTo(i - 1),
            Enter,
            Escape: exit,
        };

        if (e.key in tabMovementHandlers) {
            tabMovementHandlers[e.key]();
        }
    }

    window.addEventListener("keydown", onKeyDown, true);
})();
