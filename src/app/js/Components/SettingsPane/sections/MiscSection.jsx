import React from 'react';
import { onValueChange, extractors } from './hooks';
import Settings from '../../../Model/Settings';

const { checked } = extractors;

const MiscSection = ({ i18n, onChange, fastForwardPause, fixedSubtitlePosition, displaySubtitleBackground, wordNotification, autoPauseResume }) => {
    const onToggleFastForwardPause = onValueChange(Settings.SKEY_PWFF, onChange, checked);
    const onToggleFixedSubtitlePosition = onValueChange(Settings.SKEY_FSP, onChange, checked);
    const onToggleDisplaySubtitleBackground = onValueChange(Settings.SKEY_DSB, onChange, checked);
    const onToggleWordNotification = onValueChange(Settings.SKEY_DWN, onChange, checked);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('misc')}</b>
            </label>
            <div className="radio">
                <div className="k-settings-prefix">{i18n.t('pause.playback.when.fast.forward')} </div>
                <input type="checkbox" checked={fastForwardPause} onChange={onToggleFastForwardPause} />
            </div>
            <div className="radio">
                <div className="k-settings-prefix">{i18n.t('fixed.subtitle.position')} </div>
                <input type="checkbox" checked={fixedSubtitlePosition} onChange={onToggleFixedSubtitlePosition} />
            </div>
            <div className="radio">
                <div className="k-settings-prefix">{i18n.t('display.subtitle.background')} </div>
                <input type="checkbox" checked={displaySubtitleBackground} onChange={onToggleDisplaySubtitleBackground} />
            </div>
            <div className="radio">
                <div className="k-settings-prefix">{i18n.t('enable.word.notification')} </div>
                <input type="checkbox" checked={wordNotification} onChange={onToggleWordNotification} />
            </div>
        </div>
    );
};

export { MiscSection };
