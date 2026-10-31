function isValidUrl(string) {
    if (!/\w+\.\w+/.test(string)) return false;
    try {
        if (!string.startsWith("http")) string = "https://" + string;
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

export function getUrl(string) {
    let url = string;
    if (isValidUrl(url)) {
        if (!url.startsWith("http")) url = "https://" + url;
    } else {
        const base = "https://google.com/search";
        const params = new URLSearchParams({ q: string });
        url = `${base}?${params.toString()}`;
    }
    return url;
}

export const triggeringPrincipal =
    Services.scriptSecurityManager.getSystemPrincipal();
