import {
    getTranslationActor,
    getUrl,
    state,
    triggeringPrincipal,
} from "./helpers.mjs";
import { addKeyListener } from "./keyboard.mjs";

let palette, input, commandsBlock, selectedIdx, activeCommand;

const inputPlaceholder = "Execute a command";

export function createCmdPalette() {
    palette = document.createElement("div");
    palette.id = "zv-command-palette";
    palette.className = "d-none";
    activeCommand = document.createElement("p");
    activeCommand.classList.add("selected-command", "d-none");
    palette.append(activeCommand);
    input = document.createElement("input");
    input.placeholder = inputPlaceholder;
    input.addEventListener("input", onCmdInput);
    palette.append(input);
    commandsBlock = document.createElement("div");
    commandsBlock.className = "commands";
    palette.append(commandsBlock);
    const noMatches = document.createElement("p");
    noMatches.classList.add("info", "d-none");
    noMatches.textContent = "No matches";
    palette.append(noMatches);
    document.body.append(palette);
    document.addEventListener("click", (ev) => {
        if (ev.target === input) return;
        if (ev.target.matches(".commands > *")) {
            executeCommand(ev.target.dataset.cmdId);
        } else {
            hideCommandPalette();
        }
    });
    setupPaletteKeyListeners();
    return palette;
}

const COMMANDS_HISTORY_KEY = "zv-commands-history";

function getHistory() {
    const historyStr = SessionStore.getCustomGlobalValue(COMMANDS_HISTORY_KEY);
    if (!historyStr) return [];
    return historyStr.split("---");
}

function getSortedCommands() {
    const history = getHistory();
    const sortedCommands = history.reverse();
    const usedCommands = new Set(history);
    return [
        ...sortedCommands,
        ...Object.keys(commandsList).filter((cmd) => !usedCommands.has(cmd)),
    ];
}

function showCommandPalette() {
    if (!palette.classList.contains("d-none")) return;
    palette.classList.remove("d-none");
    selectedIdx = 0;
    displayCommands(getSortedCommands());
    input.focus();
    state.focus = "cmd_palette";
}

function hideCommandPalette() {
    if (palette.classList.contains("d-none")) return;
    palette.classList.add("d-none");
    activeCommand.classList.add("d-none");
    commandsBlock.classList.remove("d-none");
    commandsBlock.scroll(0, 0);
    input.value = "";
    input.placeholder = inputPlaceholder;
    state.focus = "tab";
}

function onCmdInput() {
    if (!activeCommand.classList.contains("d-none")) return;
    const command = input.value;
    const displayedCommands = [];
    const ids = getSortedCommands();
    for (const id of ids) {
        if (
            commandsList[id].string
                .toLowerCase()
                .includes(command.toLowerCase())
        ) {
            displayedCommands.push(id);
        }
    }
    displayCommands(displayedCommands);
}

function setupPaletteKeyListeners() {
    addKeyListener("tab", "ctrl-shift-:", () => {
        showCommandPalette();
        return true;
    });

    addKeyListener("cmd_palette", "Escape", hideCommandPalette);

    const moveWithStep = (step) => {
        const length = commandsBlock.querySelectorAll(":scope > *").length;
        selectedIdx = (selectedIdx + step + length) % length;
        markFocusedCommand();
    }
    addKeyListener("cmd_palette", "ArrowUp", () => moveWithStep(-1));
    addKeyListener("cmd_palette", "ctrl-p", () => moveWithStep(-1));
    addKeyListener("cmd_palette", "ArrowDown", () => moveWithStep(1));
    addKeyListener("cmd_palette", "ctrl-n", () => moveWithStep(1));

    addKeyListener("cmd_palette", "Enter", () => {
        let cmdId = commandsBlock.querySelector(".selected").dataset.cmdId;
        if (!activeCommand.classList.contains("d-none")) {
            cmdId = activeCommand.textContent;
        }
        executeCommand(cmdId);
    });

    for (const [id, cmd] of Object.entries(commandsList)) {
        if (cmd.shortcut) {
            addKeyListener("tab", cmd.shortcut, () => executeCommand(id));
        }
    }
}

function executeCommand(id) {
    let history = getHistory();
    history = history.filter((cmdId) => cmdId !== id);
    history.push(id);
    SessionStore.setCustomGlobalValue(COMMANDS_HISTORY_KEY, history.join("---"));
    const command = commandsList[id];
    if (!command.takesArgs) {
        command.fn();
        hideCommandPalette();
        return;
    }
    if (activeCommand.classList.contains("d-none")) {
        showCommandPalette();
        input.focus();
        input.value = "";
        input.placeholder = "";
        commandsBlock.classList.add("d-none");
        activeCommand.classList.remove("d-none");
        activeCommand.textContent = id;
    } else {
        command.fn(input.value);
        hideCommandPalette();
    }
}

function displayCommands(commandIds) {
    palette.querySelectorAll(".commands > *").forEach((el) => el.remove());
    palette
        .querySelector(".info")
        .classList.toggle("d-none", !!commandIds.length);

    for (const id of commandIds) {
        const command = document.createElement("div");
        command.innerText = commandsList[id].string;
        command.dataset.cmdId = id;
        if (commandsList[id].shortcut) {
            const shortcut = document.createElement("span");
            shortcut.className = "shortcut";
            shortcut.textContent = commandsList[id].shortcut;
            command.append(shortcut);
        }
        commandsBlock.append(command);
    }
    markFocusedCommand();
}

function markFocusedCommand() {
    const commands = [...commandsBlock.querySelectorAll(":scope > *")];
    commandsBlock.querySelector(".selected")?.classList.remove("selected");
    selectedIdx = Math.max(0, Math.min(selectedIdx, commands.length - 1));
    const focusedCommand = commands[selectedIdx];
    focusedCommand.classList.add("selected");
    // if out of the viewport -> scroll
    const cmdRect = focusedCommand.getBoundingClientRect();
    const cmdBlockRect = commandsBlock.getBoundingClientRect();
    const bottomDiff = cmdRect.bottom - cmdBlockRect.bottom;
    const topDiff = cmdRect.top - cmdBlockRect.top;
    if (bottomDiff >= 0) {
        commandsBlock.scroll({ top: commandsBlock.scrollTop + bottomDiff + 15 });
    } else if (topDiff <= 0) {
        commandsBlock.scroll({ top: commandsBlock.scrollTop + topDiff - 15 });
    }
}

async function glance(query) {
    let url = getUrl(query);
    const tab = await gZenGlanceManager.openGlance({ url, triggeringPrincipal });
    tab.setAttribute("zv-should-remove-glance", true);
    state.focus = "glance";
}

async function split(query) {
    const url = getUrl(query);
    const tab = await gBrowser.addTrustedTab(url);
    gZenViewSplitter.splitTabs([gBrowser.selectedTab, tab], undefined, 1);
}

function openTab(url) {
    gBrowser.addTrustedTab(url, { inBackground: false });
}

function page(string, url) {
    return { string, fn: () => openTab(url) };
}

function toggleTheme() {
    const currentTheme = Services.prefs.getIntPref("zen.view.window.scheme"); // 0 or 1
    Services.prefs.setIntPref("zen.view.window.scheme", (currentTheme + 1) % 2);
}

function addToEssentials() {
    gZenPinnedTabManager.addToEssentials(window.gBrowser.selectedTab);
}

// TODO: right now claude says that the pasted query might be dangerous
// i'll find a way to bypass it later.
function openClaude(query) {
    const params = new URLSearchParams({ q: query });
    openTab(`https://claude.ai/new?${params}`);
}

async function togglePageTranslation() {
    const actor = getTranslationActor();
    const langState = actor.languageState;
    if (langState.requestedLanguagePair) {
        await actor.restorePage();
        gBrowser.selectedBrowser.focus();
        return;
    }
    const detectedLanguages = langState.detectedLanguages;
    if (!detectedLanguages) return;
    const { docLangTag, userLangTag, isDocLangTagSupported } =
        detectedLanguages;
    if (
        docLangTag &&
        userLangTag &&
        isDocLangTagSupported &&
        docLangTag !== userLangTag
    ) {
        actor.translate(
            { sourceLanguage: docLangTag, targetLanguage: userLangTag },
            false,
        );
        gBrowser.selectedBrowser.focus();
    }
}

const commandsList = {
    glance: {
        string: "Glance: preview a page",
        fn: glance,
        takesArgs: true,
        shortcut: "ctrl-w g",
    },
    split: {
        string: "Split: open a new page in the split view",
        fn: split,
        shortcut: "ctrl-w v",
        takesArgs: true,
    },
    translate: {
        string: "Translate: toggle page translation",
        fn: togglePageTranslation,
        shortcut: "ctrl-w t",
    },
    theme: {
        string: "Theme: toggle mode",
        fn: toggleTheme,
    },
    preferences: page("Preferences: open", "about:preferences"),
    preferences_search: page("Preferences: search engines", "about:preferences#search"),
    preferences_privacy: page("Preferences: privacy & security", "about:preferences#privacy"),
    preferences_sync: page("Preferences: sync", "about:preferences#sync"),
    downloads: page("Downloads: open", "about:downloads"),
    pdf: page("PDF tool: open", "about:pdf"),
    task_manager: page("Task Manager: open", "about:processes"),
    unloads: page("Tabs: unload to free memory", "about:unloads"),
    addons: page("Add-ons: manage", "about:addons"),
    logins: page("Passwords: open", "about:logins"),
    config: page("Config: open", "about:config"),
    keyboard: page("Shortcuts: edit", "about:keyboard"),
    profiles: page("Profiles: manage", "about:profiles"),
    protections: page("Privacy: protections dashboard", "about:protections"),
    support: page("Troubleshooting: info", "about:support"),
    debugging: page("Debugging: extensions & workers", "about:debugging"),
    memory: page("Memory: report", "about:memory"),
    policies: page("Policies: view", "about:policies"),
    compact_mode: {
        string: "Sidebar: toggle (show/hide)",
        fn: () => gZenCompactModeManager.toggle(),
        shortcut: "ctrl-w s",
    },
    add_to_essentials: {
        string: "Add current tab to essentials",
        fn: addToEssentials,
    },
    // new_window: {},
    claude: {
        string: "Claude: open a new claude chat with your question",
        fn: openClaude,
        takesArgs: true,
        shortcut: "ctrl-w a i",
    },
};

export function addCommand(id, command) {
    commandsList[id] = command;
    if (command.shortcut) {
        addKeyListener("tab", command.shortcut, () => executeCommand(id));
    }
}
