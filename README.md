# zen-vim

Vim motions for Zen Browser tabs and splits.
This mod also features:

- Transform the tab sidebar into a tree view - meaning tabs are grouped by a parent from which they were opened
- Command palette (ctrl-shift-:)

It's packaged for [Sine](https://github.com/CosmoCreeper/Sine) with a manual [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) option.

This works best when combined with vim motions extension for pages: https://github.com/philc/vimium

Unfortunately, vimium extension is great, but it works only with pages, so you can't really interact with
the browser UI with it, that's why I needed this project to close that gap.

https://github.com/user-attachments/assets/5b780c4b-b60b-4100-a27a-3cfde0032074

## Install

### Sine

1. Install [Sine](https://github.com/CosmoCreeper/Sine) and restart Zen.
2. Open `Zen Settings` >> `Sine Mods` and enable JavaScript from unofficial sources.
3. Install the repository:

    ```text
    https://github.com/syozik/zen-vim/tree/master
    ```

4. Restart Zen.

### Manual (without Sine, using fx-autoconfig)

1. Clone this repo as the `chrome` folder of your Zen profile (`about:profiles` shows the path):

    ```sh
    git clone https://github.com/Syozik/zen-vim.git ~/.config/zen/<profile>/chrome
    ```

2. Move the two loader files from `program/` folder into the Zen install directory (e.g. `/opt/zen-browser-bin`):

    - `config.js` next to the `zen-bin` executable
    - `config-prefs.js` inside of the `defaults/pref` folder

3. Restart Zen. If scripts don't load, clear the startup cache from `about:support` ("Clear startup cache...").

_Note_: most likely (happened on my 2 machines) zen won't apply styles from userChrome.css if your `toolkit.legacyUserProfileCustomizations.stylesheets` is false. You may set it to true in about:config.

### Keys

| Key                               | Action                                            |
| --------------------------------- | ------------------------------------------------- |
| `Ctrl-W`                          | Close current tab (pinned tabs are reset instead) |
| `Ctrl-W h/j/k/l`                  | Focus split in that direction                     |
| `Ctrl-W h` (no split to the left) | Enter tab browsing mode                           |
| `Ctrl-W c`                        | Close current tab                                 |
| `Ctrl-W v`                        | Open current tab in the split view                |
| `Ctrl-W m`                        | Maximize current tab (if in the split view)       |
| `Ctrl-:`                          | Open command palette                              |

In tab browsing mode:

| Key       | Action                                                    |
| --------- | --------------------------------------------------------- |
| `j` / `l` | Next tab                                                  |
| `k` / `h` | Previous tab                                              |
| `g g`     | Go to the first tab                                       |
| `G`       | Go to the last tab                                        |
| `Enter`   | Select tab                                                |
| `r`       | Rename tab                                                |
| `d`       | Close tab (promoting its nested tabs)                     |
| `D`       | Close tab (together with its nested tabs)                 |
| `c`       | Promote tab's children                                    |
| `u`       | Reopen previously closed tab                              |
| `y`       | Copy the tab's url                                        |
| `v`       | Split tab with current (or unsplit if already in a split) |
| `space`   | Glance tab                                                |
| `z`       | Fold / unfold tab group                                   |
| `Escape`  | Exit                                                      |
| `p`       | Move nested tab one level higher                          |
| `t`       | Move nested tab to the top                                |
| `q`       | Hide sidebar (toggle compact mode)                        |

By default, the normal click to close a tab doesn't close its children.
To close children as well - hold Shift while closing the tab.

Available commands in the palette:

| Command                | Description                               | Shortcut   |
| ---------------------- | ----------------------------------------- | ---------- |
| Glance                 | Open a new glance                         | ctrl-w g   |
| Split view             | Open a new split view                     | ctrl-w v   |
| Claude                 | Open a new claude chat with your question | ctrl-w a i |
| Preferences            | Go to the settings                        |            |
| Translation            | Toggle the page translation               | ctrl-w t   |
| Theme                  | Toggle the current theme                  |            |
| Compact mode           | Toggle the sidebar mode                   | ctrl-w s   |
| Essentials             | Add current tab to essentials             |            |
| Promote tab            | Move current nested tab one level higher  |            |
| Promote tab to root    | Move current nested tab to the top        |            |
| Promote tab's children | Move current nested tab to the top        |            |

To move between commands in the palette use arrows or ctrl-n/ctrl-p.
Commands in the palette are ordered: you last used command is at the top. 

Shortcuts when glance is open:

| Command       | Description                   |
| ------------- | ----------------------------- |
| ctrl-w Escape | Closes the glance             |
| ctrl-w Enter  | Opens the glance as a new tab |

More keybindings and commands to be added ...

**Contributions, ideas, thoughts will be highly appreciated! Feel free to open an issue or a pull request.**
