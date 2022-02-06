export function openInBeyondPlayer(tabId, url) {
    const baseURL = `beyondplayer://open?`;
    const params = [`url=${encodeURIComponent(url)}`];
    const code = `
        var link = document.createElement('a');
        link.href='${baseURL}${params.join("&")}';
        document.body.appendChild(link);
        link.click();
        `;
    chrome.tabs.executeScript(tabId, { code });
}

export function updateBrowserAction() {
    chrome.browserAction.setPopup({ popup: "" });
    chrome.browserAction.onClicked.addListener(() => {
        // get active window
        chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
            if (tabs.length === 0) return;
            // TODO: filter url
            const tab = tabs[0];
            if (tab.id === chrome.tabs.TAB_ID_NONE) return;
            openInBeyondPlayer(tab.id, tab.url);
        });
    });
}
