const { ipcRenderer } = require('electron');

document.addEventListener(
    'contextmenu',
    function(e) {
        e = e || window.event;
        var selection = window.getSelection();
        if (selection) {
            var msg = {
                text: selection.toString(),
                x: e.clientX,
                y: e.clientY
            };
            ipcRenderer.sendToHost('right-click-selection', msg);
        }
    },
    false
);

document.addEventListener(
    'mouseup',
    function(e) {
        e = e || window.event;
        var selection = window.getSelection();
        if (selection) {
            ipcRenderer.sendToHost('change-selection', selection.toString());
        }
    },
    false
);
