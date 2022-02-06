import React from 'react';
import { onValueChange } from './hooks';
import Settings from '../../../Model/Settings';

const languages = [
    {
        key: 'en',
        name: 'English'
    },
    {
        key: 'zh-CN',
        name: '简体中文'
    },
    {
        key: 'zh-TW',
        name: '傳統中文'
    },
    {
        key: 'uk',
        name: 'Українська'
    },
    {
        key: 'ru',
        name: 'Русский'
    }
];
const Language = ({ i18n, onChange, value }) => {
    const onChangeLanguage = onValueChange(Settings.UI_LNG, onChange);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('ui.language')}</b>
            </label>
            <div style={{ paddingLeft: 30 }}>
                <select className="k-select" onChange={onChangeLanguage} value={value}>
                    {languages.map(({ key, name }) => (
                        <option key={key} value={key}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export { Language };
