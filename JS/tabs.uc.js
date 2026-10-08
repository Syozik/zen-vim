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

        const h = () => {
            browsingTabs = true;
            mark(gBrowser.selectedTab);
        };
        const l = () => {
            exit();
            browsingTabs = false;
        };
        const c = () => closeTab();
        const postCtrlWHandlers = { h, l, c };

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

        const goToNext = () => mark(tabs[Math.min(i + 1, tabs.length - 1)]);
        const goToPrev = () => mark(tabs[Math.max(i - 1, 0)]);

        const d = () => {
            const start = tabs.indexOf(gBrowser.selectedTab);
            closeTab(currentTab);
            if (start > i) goToPrev();
            else goToNext();
        };

        const Enter = () => {
            gBrowser.selectedTab = currentTab;
            exit();
        };

        const tabMovementHandlers = {
            d,
            j: goToNext,
            k: goToPrev,
            Enter,
            Escape: exit,
        };

        if (e.key in tabMovementHandlers) {
            tabMovementHandlers[e.key]();
        }
    }

    window.addEventListener("keydown", onKeyDown, true);
})();
