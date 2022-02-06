import React, { useCallback } from 'react';
import { shell } from 'electron';
import { onValueChange } from './hooks';
import Settings from '../../../Model/Settings';

const SubtitleFont = ({ i18n, onChange, value }) => {
    const onChangeFont = onValueChange(Settings.SKEY_PLAYER_SUB_FONT, onChange);
    const onCredit = useCallback(credit => {
        return () => shell.openExternal(credit);
    }, []);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('player.subtitle.font')}</b>
            </label>
            <div style={{ paddingLeft: 30 }}>
                {Settings.FONTS.map((font, index) => (
                    <div className="radio" key={index}>
                        <label>
                            <input
                                type="radio"
                                value={index + 1}
                                name={Settings.SKEY_PLAYER_SUB_FONT}
                                checked={value == index + 1}
                                onChange={onChangeFont}
                            />
                            <span style={{ fontFamily: font.fontFamily, fontSize: 15 }}>{font.name}</span>
                            <span className="k-credit-link" onClick={onCredit(font.credit)}>
                                Credit
                            </span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export { SubtitleFont };
