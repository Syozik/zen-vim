# zen-vim

Vim motions for Zen Browser tabs and splits, using [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig).

### Install

1. Clone this repo as the `chrome` folder of your Zen profile (`about:profiles` shows the path):

   ```sh
   git clone <repo-url> ~/.config/zen/<profile>/chrome
   ```

2. Copy the two loader files from fx-autoconfig's `program/` folder into the Zen install directory (e.g. `/opt/zen-browser-bin`):

   - `config.js` next to the `zen-bin` executable
   - `defaults/pref/config-prefs.js`

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

In tab browsing mode:

| Key | Action |
|-----|--------|
| `j` / `l` | Next tab |
| `k` / `h` | Previous tab |
| `Enter` | Select tab |
| `d` | Close tab |
| `v` | Split tab with current (or unsplit if already in a split) |
| `g` | Glance tab |
| `Escape` | Exit |

More to be added ...
