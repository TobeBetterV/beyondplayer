const { ipcRenderer } = require('electron');
const getVideoId = require('get-video-id');

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener(
        'click',
        function(e) {
            let a;
            if (e.target.nodeNmae == 'A') {
                a = e.target;
            } else {
                a = e.target.closest('a');
            }
            if (!a) return true;

            let path = a.href;
            let id;

            if (!path.includes('/user/')) {
                id = getVideoId(path).id;
            }

            if (id) {
                //e.preventDefault();
                //e.stopPropagation();
                setTimeout(function() {
                    ipcRenderer.sendToHost('click-video', path);
                }, 100);
                return false;
            } else {
                return true;
            }
        },
        true
    );

    setInterval(() => {
        if (document.activeElement && document.activeElement.nodeName == 'INPUT') {
            ipcRenderer.sendToHost('is-focus', true);
        } else {
            ipcRenderer.sendToHost('is-focus', false);
        }
    }, 1000);

    document.ondragover = document.ondrop = ev => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    document.body.ondrop = ev => {
        ev.preventDefault();
        ev.stopPropagation();
    };
});

ipcRenderer.on('pause', function(event) {
    var video = document.getElementsByTagName('video')[0];
    if (video) {
        setTimeout(() => {
            video.pause();
        }, 5000);
    }
});

global.sendToHost = (channel, data) => {
    ipcRenderer.sendToHost(channel, data);
};
