import 'photonkit/dist/css/photon.css';
import React from 'react';
import ReactDOM from 'react-dom';
import log from 'electron-log';
import unhandled from 'electron-unhandled';
import App from './Containers/App.jsx';
import Settings from './Model/Settings';
import { initFFmpegPath } from './Model/FFmpegHelper';

initFFmpegPath();

window.addEventListener('error', event => {
    event.preventDefault();
    if (event.message?.includes('ResizeObserver')) {
        event.stopImmediatePropagation();
        return false;
    }
});

unhandled({
    logger: error => {
        log.error(error);
    }
});

Settings.load(() => {
    ReactDOM.render(<App />, document.querySelector('app'));
});

document.ondragover = ev => {
    ev.preventDefault();
    ev.stopPropagation();
};

document.ondrop = ev => {
    ev.preventDefault();
};

document.body.ondrop = ev => {
    ev.preventDefault();
};
