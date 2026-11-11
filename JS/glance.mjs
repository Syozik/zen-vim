import { state } from "./helpers.mjs";
import { addKeyListener } from "./keyboard.mjs";
import { exit } from "./sidebar.mjs";

const glanceState = { owner: null, tabIndex: null };

function getActiveGlance() {
    return gBrowser.selectedTab.hasAttribute("zen-glance-tab")
        ? gBrowser.selectedTab
        : null;
}

async function dismissGlance() {
    const glancedTab = gBrowser.selectedTab;
    if (glancedTab.getAttribute("zv-should-remove-glance")) {
        gZenGlanceManager.closeGlance();
        return;
    }
    const prevMotionOverrideValue = gReduceMotionOverride;
    gReduceMotionOverride = true;
    try {
        await gZenGlanceManager.fullyOpenGlance();
    } finally {
        gReduceMotionOverride = prevMotionOverrideValue;
    }
    if (!glanceState.owner) return;
    const peekedPanel = glancedTab.linkedBrowser?.closest(
        ".browserSidebarContainer",
    );
    [...document.querySelectorAll("#tabbrowser-tabpanels > .deck-selected")]
        .filter((panel) => panel !== peekedPanel)
        .forEach((panel) => panel.classList.remove("deck-selected"));
    gBrowser.moveTabTo(glancedTab, { tabIndex: glanceState.tabIndex });
    gBrowser.selectedTab = glanceState.owner;
    glanceState.owner = null;
    glanceState.tabIndex = null;
}

export function setupGlance() {
    addKeyListener("glance", "*", () => {
        if (!getActiveGlance()) {
            exit();
            return true;
        }
    });

    addKeyListener("glance", "ctrl-w escape", async () => {
        await dismissGlance();
        exit();
    });

    addKeyListener("glance", "ctrl-w enter", async () => {
        state.glanceOwner = null;
        await gZenGlanceManager.fullyOpenGlance();
        exit();
    });

    const preview = async () => {
        if (getActiveGlance()) {
            await dismissGlance();
        }
        if (state.currentTab === gBrowser.selectedTab) return;
        glanceState.owner = gBrowser.selectedTab;
        glanceState.tabIndex = state.currentTab.index;
        await gZenGlanceManager.openGlance(
            {},
            state.currentTab,
            glanceState.owner,
        );
        exit("glance");
    };

    addKeyListener("sidebar", "space", preview);
}
