(() => {
    let focus = "tab"; // tab | sidebar | glance
    let currentTab = null;
    let ctrlWPressed = null;
    let timeout = null;
    let glanceOwner = null;

    function mark(tab) {
        currentTab?.classList.remove("vim-cur");
        currentTab = tab;
        tab.classList.add("vim-cur");
        tab.scrollIntoView({ block: "nearest" });
    }

    function exit(nextFocus = "tab") {
        focus = nextFocus;
        currentTab?.classList.remove("vim-cur");
        currentTab = null;
        gBrowser.selectedBrowser.focus();
    }

    function getActiveGlance() {
        return gBrowser.selectedTab.hasAttribute("zen-glance-tab") ? gBrowser.selectedTab : null;
    }

    async function dismissGlance() {
        const peeked = gBrowser.selectedTab;
        const prevMotionOverrideValue = gReduceMotionOverride;
        gReduceMotionOverride = true;
        try {
            await gZenGlanceManager.fullyOpenGlance();
        } finally {
            gReduceMotionOverride = prevMotionOverrideValue;
        }
        if (!glanceOwner) return;
        const peekedPanel = peeked.linkedBrowser?.closest(".browserSidebarContainer");
        [...document.querySelectorAll("#tabbrowser-tabpanels > .deck-selected")]
            .filter((panel) => panel !== peekedPanel)
            .forEach((panel) => panel.classList.remove("deck-selected"));
        gBrowser.selectedTab = glanceOwner;
        glanceOwner = null;
    }

    function focusPane(dx, dy) {
        const split = gZenViewSplitter._data[gZenViewSplitter.currentView];
        if (!split || focus !== "tab") return false;
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
        best.linkedBrowser.focus();
        return true;
    }

    function onKeyDown(e) {
        const stop = () => {
            e.preventDefault();
            e.stopPropagation();
        };

        let tabs = gBrowser.visibleTabs;
        function closeTab(tab = gBrowser.selectedTab, force = false) {
            if (tab.pinned && !force) {
                return gZenPinnedTabManager.resetPinnedTab(tab);
            }
            gBrowser.removeTab(tab, { animate: true });
            tabs = gBrowser.visibleTabs;
        }

        if (e.ctrlKey && e.key === "w") {
            stop();
            ctrlWPressed = true;
            timeout = setTimeout(() => {
                closeTab();
                ctrlWPressed = false;
                timeout = null;
            }, 250);
            return;
        }

        if (timeout) {
            clearTimeout(timeout);
        }

        if (focus === "tab") {
            const h = () => {
                if (focusPane(-1, 0)) return;
                focus = "sidebar";
                mark(gBrowser.selectedTab);
            };
            const l = () => focusPane(1, 0);
            const j = () => focusPane(0, 1);
            const k = () => focusPane(0, -1);
            const c = () => closeTab();
            const v = () => {
                const copy = gBrowser.duplicateTab(gBrowser.selectedTab);
                gZenViewSplitter.splitTabs([gBrowser.selectedTab, copy], undefined, 1);
            };

            const handlers = { h, l, j, k, c, v };

            if (ctrlWPressed) {
                if (e.key in handlers) {
                    stop();
                    handlers[e.key]();
                }
            }
        } else if (focus === "glance") {
            const Escape = async () => {
                await dismissGlance();
                exit();
            };
            const Enter = async () => {
                glanceOwner = null;
                await gZenGlanceManager.fullyOpenGlance();
                exit();
            };
            const handlers = { Escape, Enter };
            if (e.key in handlers) {
                stop();
                handlers[e.key]();
            }
        } else if (focus === "sidebar") {
            stop();

            const i = tabs.indexOf(currentTab);

            const goTo = (idx) => mark(tabs[Math.max(0, Math.min(idx, tabs.length - 1))]);

            const l = () => {
                if (ctrlWPressed) {
                    exit();
                } else {
                    goTo(i + 1);
                }
            };

            const d = () => {
                const start = tabs.indexOf(gBrowser.selectedTab);
                closeTab(currentTab, true);
                console.log(start, i, tabs.length);
                if (start > i) goTo(i - 1);
                else goTo(i);
            };

            const v = () => {
                if (currentTab.group && currentTab.group.hasAttribute("split-view-group")) {
                    gZenViewSplitter.removeTabFromGroup(currentTab, undefined, {
                        forUnsplit: true,
                    });
                } else {
                    const other =
                        currentTab === gBrowser.selectedTab
                            ? gBrowser.duplicateTab(currentTab)
                            : currentTab;
                    gZenViewSplitter.splitTabs([gBrowser.selectedTab, other], undefined, 1);
                }
                exit();
            };

            const g = async () => {
                if (getActiveGlance()) {
                    await dismissGlance();
                }
                if (currentTab === gBrowser.selectedTab) return;
                glanceOwner = gBrowser.selectedTab;
                await gZenGlanceManager.openGlance({}, currentTab, glanceOwner);
                exit("glance");
            };

            const Enter = async () => {
                gBrowser.selectedTab = currentTab;
                exit();
            };

            const sidebarMovementHandlers = {
                d,
                v,
                l,
                j: () => goTo(i + 1),
                k: () => goTo(i - 1),
                h: () => goTo(i - 1),
                g,
                Enter,
                Escape: exit,
            };

            if (e.key in sidebarMovementHandlers) {
                sidebarMovementHandlers[e.key]();
            }
        }
        ctrlWPressed = false;
    }

    window.addEventListener("keydown", onKeyDown, true);
})();
