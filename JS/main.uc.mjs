import { setupCommandPalette } from "./cmd_palette.mjs";
import { setupGlance } from "./glance.mjs";
import { isSidebarOnTheLeft, state } from "./helpers.mjs";
import { addKeyListener, setupKeyboard } from "./keyboard.mjs";
import { closeTab, focusSidebar, setupSidebar } from "./sidebar.mjs";
import { setupTree } from "./tree.mjs";

function setup() {
    let timeout;
    setupCommandPalette();
    setupGlance();
    setupKeyboard();
    setupSidebar();
    setupTree();

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
        if (focusPane(-1, 0) || !isSidebarOnTheLeft()) return;
        focusSidebar();
    });
    addKeyListener("tab", "ctrl-w l", () => {
        if (focusPane(1, 0) || isSidebarOnTheLeft()) return;
        focusSidebar();
    });
    addKeyListener("tab", "ctrl-w j", () => focusPane(0, 1));
    addKeyListener("tab", "ctrl-w k", () => focusPane(0, -1));
    addKeyListener("tab", "ctrl-w c", closeTab);
    // addKeyListener("tab", "ctrl-shift-w v", () => {
    //     const copy = gBrowser.duplicateTab(gBrowser.selectedTab);
    //     gZenViewSplitter.splitTabs([gBrowser.selectedTab, copy], undefined, 1);
    // });
    addKeyListener("tab", "ctrl-w m", async () => {
        if (gBrowser.selectedTab.group.hasAttribute("split-view-group")) {
            const tab = gBrowser.selectedTab;
            await gZenViewSplitter.removeTabFromGroup(tab, undefined, {
                forUnsplit: true,
            });
            gBrowser.selectedTab = tab;
        }
    });
}

setup();
