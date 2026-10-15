(() => {
    let focus = "tab"; // tab | sidebar | glance
    let currentTab, ctrlWPressed, timeout, glanceOwner;
    let glancedTabIndex, sidebarHidden;
    const sidebar = gZenCompactModeManager.sidebar;

    function getVisibleTabs() {
        return gBrowser.visibleTabs.filter((tab) => !tab.classList.contains("folded-hidden"));
    }

    function mark(tab) {
        currentTab?.classList.remove("zen-vim-active-tab");
        currentTab = tab;
        tab.classList.add("zen-vim-active-tab");
        tab.scrollIntoView({ block: "nearest" });
    }

    function exit(nextFocus = "tab") {
        focus = nextFocus;
        currentTab?.classList.remove("zen-vim-active-tab");
        currentTab = null;

        if (sidebarHidden) {
            gZenCompactModeManager.toggleSidebar();
            sidebarHidden = null;
        }
        document.removeEventListener("click", exitOnClick);
        gBrowser.selectedBrowser.focus();
    }

    const exitOnClick = () => exit();

    function getActiveGlance() {
        return gBrowser.selectedTab.hasAttribute("zen-glance-tab") ? gBrowser.selectedTab : null;
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
        const peekedPanel = glancedTab.linkedBrowser?.closest(".browserSidebarContainer");
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
        // highlightPage(best.linkedBrowser);
        best.linkedBrowser.focus();
        return true;
    }

    function toggleFold(tab) {
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

    function onKeyDown(e) {
        const stop = () => {
            e.preventDefault();
            e.stopPropagation();
        };

        let tabs = getVisibleTabs();
        function closeTab(tab = gBrowser.selectedTab, force = false) {
            if (tab.pinned && !force) {
                return gZenPinnedTabManager.resetPinnedTab(tab);
            }
            gBrowser.removeTab(tab, { animate: true });
            tabs = getVisibleTabs();
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
            timeout = null;
        }

        if (document.getElementById("tab-label-input")) {
            return;
        }
        if (focus === "tab") {
            const h = () => {
                if (focusPane(-1, 0)) return;
                focus = "sidebar";
                document.addEventListener("click", exitOnClick);
                const isCompactMode = document.documentElement.getAttribute("zen-compact-mode");
                sidebarHidden = !sidebar.hasAttribute("zen-user-show");
                if (isCompactMode && sidebarHidden) gZenCompactModeManager.toggleSidebar();
                let visibleTab = gBrowser.selectedTab;
                while (visibleTab && visibleTab.classList.contains("folded-hidden")) {
                    visibleTab = visibleTab.previousElementSibling;
                }
                mark(visibleTab);
            };
            const l = () => focusPane(1, 0);
            const j = () => focusPane(0, 1);
            const k = () => focusPane(0, -1);
            const c = () => closeTab();
            const v = () => {
                const copy = gBrowser.duplicateTab(gBrowser.selectedTab);
                gZenViewSplitter.splitTabs([gBrowser.selectedTab, copy], undefined, 1);
            };
            const m = async () => {
                if (gBrowser.selectedTab.group.hasAttribute("split-view-group")) {
                    const tab = gBrowser.selectedTab;
                    await gZenViewSplitter.removeTabFromGroup(tab, undefined, {
                        forUnsplit: true,
                    });
                    gBrowser.selectedTab = tab;
                }
            };

            const handlers = { h, l, j, k, c, v, m };

            if (ctrlWPressed) {
                if (e.key in handlers) {
                    stop();
                    handlers[e.key]();
                }
            }
        } else if (focus === "glance") {
            if (!getActiveGlance()) {
                exit();
                return;
            }
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

            const d = async () => {
                const start = tabs.indexOf(gBrowser.selectedTab);
                gZenUIManager.shakeElement(currentTab);
                closeTab(currentTab, true);
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
                glancedTabIndex = currentTab.index;
                await gZenGlanceManager.openGlance({}, currentTab, glanceOwner);
                exit("glance");
            };

            const r = () => {
                currentTab
                    .querySelector(".tab-label-container")
                    .dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
            };

            const u = () => {
                const currentTab = gBrowser.selectedTab;
                const tab = SessionWindowUI.undoCloseTab(window);
                gBrowser.selectedTab = currentTab;
                gZenUIManager.shakeElement(tab);
            };

            const Enter = async () => {
                gBrowser.selectedTab = currentTab;
                exit();
            };

            const z = () => {
                if (!currentTab.classList.contains("foldable")) return;
                toggleFold(currentTab);
            };

            const sidebarMovementHandlers = {
                d,
                v,
                l,
                r,
                g,
                u,
                z,
                Enter,
                Escape: exit,
                " ": g,
                j: () => goTo(i + 1),
                k: () => goTo(i - 1),
                h: () => goTo(i - 1),
            };

            if (e.key in sidebarMovementHandlers) {
                sidebarMovementHandlers[e.key]();
            } else {
                exit();
            }
        }
        ctrlWPressed = false;
    }

    window.addEventListener("keydown", onKeyDown, true);

    const DEPTH_KEY = "zen-vim-depth";

    function getDepth(tab) {
        if (!tab) return 0;
        return parseInt(tab.dataset.depthLevel ?? 0);
    }

    function setDepth(tab, depth) {
        if (tab.pinned) return;
        tab.dataset.depthLevel = depth;
        tab.style.setProperty("--depth-level", depth);
        SessionStore.setCustomTabValue(tab, DEPTH_KEY, String(depth));
    }

    function restoreDepth(tab) {
        setDepth(tab, parseInt(SessionStore.getCustomTabValue(tab, DEPTH_KEY)) || 0);
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
        if (!parent) return;
        const parentLevel = parseInt(parent.dataset.depthLevel ?? -1);
        setDepth(e.target, parentLevel + 1);
        makeTabFoldable(parent)
    }

    function onTabClose(e) {
        const tab = e.target;
        const depthLevel = getDepth(tab);
        let nextTab = tab.nextElementSibling;
        while (nextTab && getDepth(nextTab) > depthLevel) {
            gZenUIManager.shakeElement(nextTab);
            gBrowser.removeTab(nextTab, { animate: true });
            nextTab = nextTab.nextElementSibling;
        }
        const prevTab = tab.previousElementSibling;
        const prevTabDepth = getDepth(prevTab);
        if (prevTab && prevTabDepth < depthLevel) {
            if (!nextTab || prevTabDepth >= getDepth(nextTab)) {
                makeTabNotFoldable(prevTab);
            }
        }
    }

    // a little hack for now.
    setTimeout(() => {
        const tabs = getVisibleTabs();
        tabs.forEach(restoreDepth);
        for (const tab of tabs) {
            const nextTab = tab.nextElementSibling;
            if (nextTab && getDepth(tab) < getDepth(nextTab)) {
                makeTabFoldable(tab)
            }
        }
    }, 100);
    gBrowser.tabContainer.addEventListener("TabOpen", onNewTabOpen);
    gBrowser.tabContainer.addEventListener("TabClose", onTabClose);
    gBrowser.tabContainer.addEventListener("SSTabRestoring", (e) => restoreDepth(e.target));
})();
