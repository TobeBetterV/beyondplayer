const { ipcRenderer } = require('electron');

ipcRenderer.on('videoId', function(event, data) {
    global.videoId = data;
});

ipcRenderer.on('loadVideo', function(event, data) {
    global.loadVideo(data);
});

ipcRenderer.on('playVideo', function(event, data) {
    global.player.playVideo();
});

ipcRenderer.on('pauseVideo', function(event, data) {
    global.player.pauseVideo();
});

ipcRenderer.on('startProgress', function(event, data) {
    global.startProgress();
});

ipcRenderer.on('seek', function(event, time) {
    global.player.seekTo(time);
});

ipcRenderer.on('speed', function(event, speed) {
    global.player.setPlaybackRate(speed);
});

ipcRenderer.on('checkSubtitleAndAd', function(event) {
    global.checkSubtitleAndAd();
});

ipcRenderer.on('openSubtitle', function(event) {
    global.openSubtitle();
});

ipcRenderer.on('checkAndHideControls', function(event, delay, hideControls) {
    global.checkAndHideControls();
});

ipcRenderer.on('hideSubtitle', function(event) {
    global.hideSubtitle();
});

global.sendToHost = (channel, data) => {
    ipcRenderer.sendToHost(channel, data);
};
