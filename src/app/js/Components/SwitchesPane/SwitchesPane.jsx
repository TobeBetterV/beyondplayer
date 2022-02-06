import React from 'react';
import { remote } from 'electron';
import './SwitchesPane.less';
import { Switch } from 'antd';

const i18n = remote.require('./i18n');

export default class SwitchesPane extends React.Component {
    render() {
        const { fullScreen, skipNoDialogueClips, onToggleFullScreen, onToggleSkipNoDialogueClips } = this.props;
        return (
            <div className="byp-switches-pane not-draggable" ref={r => (this.container = r)}>
                <div>
                    <label className="byp-switches-pane-prefix">{i18n.t('fit.video.to.window.height')} </label>
                    <Switch checked={fullScreen} onChange={onToggleFullScreen} />
                </div>
                <div>
                    <label className="byp-switches-pane-prefix">{i18n.t('skip.no.dialogue.clips')} </label>
                    <Switch checked={skipNoDialogueClips} onChange={onToggleSkipNoDialogueClips} />
                </div>
            </div>
        );
    }

    containsElement = element => {
        return this.container.contains(element);
    };
}
