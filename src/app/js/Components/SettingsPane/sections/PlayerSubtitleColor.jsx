import React from 'react';
import { onValueChange } from './hooks';
import Settings from '../../../Model/Settings';

const PlayerSubtitleColor = ({ i18n, value, onChange }) => {
    const onChangeColor = onValueChange(Settings.SKEY_PLAYER_SUB_COLOR, onChange);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('player.subtitle.color')}</b>
            </label>
            <div style={{ paddingLeft: 30 }}>
                {Settings.COLORS.map((color, index) => (
                    <div className="radio" key={color}>
                        <label>
                            <input
                                type="radio"
                                name={Settings.SKEY_PLAYER_SUB_COLOR}
                                value={index + 1}
                                checked={value == index + 1}
                                onChange={onChangeColor}
                            />
                            <span style={{ color }}>{color}</span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export { PlayerSubtitleColor };
