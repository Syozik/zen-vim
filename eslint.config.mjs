import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["JS/**/*.mjs"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                // Firefox/Zen chrome globals
                gBrowser: "readonly",
                gReduceMotionOverride: true,
                gZenCompactModeManager: "readonly",
                gZenViewSplitter: "readonly",
                gZenWorkspaces: "readonly",
                gZenPinnedTabManager: "readonly",
                gZenUIManager: "readonly",
                gZenGlanceManager: "readonly",
                TranslationsParent: "readonly",
                SessionWindowUI: "readonly",
                SessionStore: "readonly",
                Services: "readonly",
                ChromeUtils: "readonly",
                Components: "readonly",
                Cc: "readonly",
                Ci: "readonly",
                Cu: "readonly",
            },
        },
    },
];
