import { updateBrowserAction, openInBeyondPlayer } from "./common.js";

let showForPages = ["https://*.youtube.com/*"];

updateBrowserAction();

[
    ["page", "pageUrl"],
    ["link", "linkUrl"],
    ["video", "srcUrl"]
].forEach(([item, linkType]) => {
    chrome.contextMenus.create({
        title: `Open in BeyondPlayer Pro`,
        id: `open${item}inbeyondplayer`,
        contexts: [item],
        documentUrlPatterns: showForPages,
        onclick: (info, tab) => {
            console.log("info:" + JSON.stringify(info));
            openInBeyondPlayer(tab.id, info[linkType]);
        }
    });
});
