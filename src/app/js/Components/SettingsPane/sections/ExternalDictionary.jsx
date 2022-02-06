import React from 'react';
import { onValueChange } from './hooks';
import Settings from '../../../Model/Settings';

const ExternalDictionary = ({ i18n, onChange, value }) => {
    const onChangeExternalDictionary = onValueChange(Settings.SKEY_EXT_DIC, onChange);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('external.dictionary')}</b>
            </label>
            <div style={{ paddingLeft: 30 }}>
                <div className="radio">
                    <label>
                        <input
                            type="radio"
                            name={Settings.SKEY_EXT_DIC}
                            value={Settings.EXD_APPLE_DIC}
                            checked={value == Settings.EXD_APPLE_DIC}
                            onChange={onChangeExternalDictionary}
                        />
                        {i18n.t('system.dictionary')}
                    </label>
                </div>
                <div className="radio">
                    <label>
                        <input
                            type="radio"
                            name={Settings.SKEY_EXT_DIC}
                            value={Settings.EXD_EUDIC}
                            checked={value == Settings.EXD_EUDIC}
                            onChange={onChangeExternalDictionary}
                        />
                        {i18n.t('eudic')}
                    </label>
                </div>
            </div>
        </div>
    );
};

export { ExternalDictionary };
