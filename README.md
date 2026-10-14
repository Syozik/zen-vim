# zen-vim

Vim motions for Zen Browser tabs and splits. This mode also transforms the tab sidebar into a tree view - meaning tabs are grouped by a parent from which they were opened. 

It's packaged for [Sine](https://github.com/CosmoCreeper/Sine) with a manual [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) option.

This works best when combined with vim motions extension for pages: https://github.com/philc/vimium


Unfortunately, vimium extension is great, but it works only with pages, so you can't really interact with
the browser UI with it, that's why I needed this project to closes that gap.

https://github.com/user-attachments/assets/9e922b98-6b9d-4f98-b425-3985986a3a22

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

*Note*: most likely (happened on my 2 machines) zen won't apply styles from userChrome.css if your `toolkit.legacyUserProfileCustomizations.stylesheets` is false. You may set it to true in about:config.

### Keys

| Key | Action |
|-----|--------|
| `Ctrl-W` | Close current tab (pinned tabs are reset instead) |
| `Ctrl-W h/j/k/l` | Focus split in that direction |
| `Ctrl-W h` (no split to the left) | Enter tab browsing mode |
| `Ctrl-W c` | Close current tab |
| `Ctrl-W v` | Open current tab in the split view |
| `Ctrl-W m` | Maximize current tab (if in the split view) |

In tab browsing mode:

| Key | Action |
|-----|--------|
| `j` / `l` | Next tab |
| `k` / `h` | Previous tab |
| `Enter` | Select tab |
| `r` | Rename tab |
| `d` | Close tab |
| `u` | Reopen previous closed tab |
| `v` | Split tab with current (or unsplit if already in a split) |
| `g` | Glance tab |
| `Escape` | Exit |

More to be added ...
