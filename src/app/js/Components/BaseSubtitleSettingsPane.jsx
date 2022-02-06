import React from 'react';
import { remote } from 'electron';

export default class BaseSubtitleSettingsPane extends React.Component {
    simulateClickElement(e) {
        const offset = this.getOffset(e);
        offset.x += 10;
        offset.y += 10;
        const wc = remote.getCurrentWindow().webContents;
        wc.sendInputEvent({ type: 'mouseDown', x: offset.x, y: offset.y, button: 'left', clickCount: 1 });
        wc.sendInputEvent({ type: 'mouseUp', x: offset.x, y: offset.y, button: 'left', clickCount: 1 });
    }

    getOffset(el) {
        let x = 0;
        let y = 0;

        while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
            x += el.offsetLeft - el.scrollLeft;
            y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }

        return { y, x };
    }
}
