import { getUrl, triggeringPrincipal } from "./helpers.mjs";

let palette, input, commandsBlock, selectedIdx, selectedCommand;

const inputPlaceholder = "Execute a command";

export function createCmdPalette() {
    palette = document.createElement("div");
    palette.id = "zv-command-palette";
    palette.className = "d-none";
    selectedCommand = document.createElement("p");
    selectedCommand.classList.add("selected-command", "d-none");
    palette.append(selectedCommand);
    input = document.createElement("input");
    input.placeholder = inputPlaceholder;
    input.addEventListener("blur", () => toggleCommandPalette(false));
    input.addEventListener("input", onCmdInput);
    input.addEventListener("keydown", onKeyDown);
    palette.append(input);
    commandsBlock = document.createElement("div");
    commandsBlock.className = "commands";
    palette.append(commandsBlock);
    const noMatches = document.createElement("p");
    noMatches.classList.add("info", "d-none");
    noMatches.textContent = "No matches";
    palette.append(noMatches);
    document.body.append(palette);
    return palette;
}

export function toggleCommandPalette(shouldShow = true) {
    if (palette.classList.contains("d-none") && shouldShow) {
        palette.classList.remove("d-none");
        selectedIdx = 0;
        displayCommands(Object.keys(commandsList).slice(0, 5));
        input.focus();
    } else if (!palette.classList.contains("d-none")) {
        palette.classList.add("d-none");
        selectedCommand.classList.add("d-none");
        commandsBlock.classList.remove("d-none");
        input.value = "";
        input.placeholder = inputPlaceholder;
    }
}

function onCmdInput() {
    if (!selectedCommand.classList.contains("d-none")) return;
    const command = input.value;
    const ids = Object.keys(commandsList);
    const displayedCommands = [];
    for (const id of ids) {
        if (
            commandsList[id].string
                .toLowerCase()
                .includes(command.toLowerCase())
        ) {
            displayedCommands.push(id);
        }
    }
    displayCommands(displayedCommands.slice(0, 5));
}

function onKeyDown(ev) {
    if (ev.key === "Escape") toggleCommandPalette();
    const commands = [...commandsBlock.querySelectorAll(":scope > *")];
    if (ev.key === "ArrowUp") {
        if (!selectedIdx) selectedIdx = commands.length - 1;
        else selectedIdx -= 1;
        markSelectedCommand();
    }
    if (ev.key === "ArrowDown") {
        if (selectedIdx === commands.length - 1) selectedIdx = 0;
        else selectedIdx += 1;
        markSelectedCommand();
    }
    if (ev.key === "Enter") {
        if (!selectedCommand.classList.contains("d-none")) {
            const cmdId =
                commandsBlock.querySelector(".selected").dataset.cmdId;
            const command = commandsList[cmdId];
            command.fn(input.value);
        } else {
            const cmdId =
                commandsBlock.querySelector(".selected").dataset.cmdId;
            const command = commandsList[cmdId];
            if (command.takesArgs) {
                selectCommandWithQuery(cmdId);
            } else {
                command.fn();
                toggleCommandPalette(false);
            }
        }
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
        commandsBlock.append(command);
    }
    markSelectedCommand();
}

function markSelectedCommand() {
    const commands = [...commandsBlock.querySelectorAll(":scope > *")];
    commandsBlock.querySelector(".selected")?.classList.remove("selected");
    selectedIdx = Math.max(0, Math.min(selectedIdx, commands.length - 1));
    commands[selectedIdx].classList.add("selected");
}

function selectCommandWithQuery(id) {
    input.value = "";
    input.placeholder = "";
    commandsBlock.classList.add("d-none");
    selectedCommand.classList.remove("d-none");
    selectedCommand.textContent = id;
}

function glance(query) {
    let url = getUrl(query);
    gZenGlanceManager.openGlance({ url, triggeringPrincipal });
}

async function split(query) {
    const url = getUrl(query);
    const tab = await gBrowser.addTrustedTab(url);
    gZenViewSplitter.splitTabs([gBrowser.selectedTab, tab], undefined, 1);
}

function openPreferences() {
    gBrowser.addTrustedTab("about:preferences", { inBackground: false });
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
    const base = "https://claude.ai/new";
    const params = new URLSearchParams({ q: query });
    const finalUrl = `${base}?${params.toString()}`;
    gBrowser.addTrustedTab(finalUrl, { inBackground: false });
}

export const commandsList = {
    preferences: {
        string: "Preferences: open",
        fn: openPreferences,
    },
    glance: {
        string: "Glance: preview a page",
        fn: glance,
        takesArgs: true,
    },
    split: {
        string: "Split: open a new page in the split view",
        fn: split,
        takesArgs: true,
    },
    theme: {
        string: "Theme: toggle mode",
        fn: toggleTheme,
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
    },
};
