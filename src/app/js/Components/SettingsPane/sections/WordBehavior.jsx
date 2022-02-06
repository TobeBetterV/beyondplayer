import React from 'react';
import { onValueChange } from './hooks';
import Settings from '../../../Model/Settings';

const WordBehavior = ({ i18n, onChange, value }) => {
    const onChangeWordBehavior = onValueChange(Settings.SKEY_CWB, onChange);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('click.word.behaviour')}</b>
            </label>
            <div style={{ paddingLeft: 30 }}>
                <div className="radio">
                    <label>
                        <input
                            type="radio"
                            name={Settings.SKEY_CWB}
                            value={Settings.CWB_POPUP_DIC}
                            checked={value === Settings.CWB_POPUP_DIC}
                            onChange={onChangeWordBehavior}
                        />
                        {i18n.t('search.word.in.popup')}
                    </label>
                </div>
                <div className="radio">
                    <label>
                        <input
                            type="radio"
                            name={Settings.SKEY_CWB}
                            value={Settings.CWB_WEB_DIC}
                            checked={value === Settings.CWB_WEB_DIC}
                            onChange={onChangeWordBehavior}
                        />
                        {i18n.t('search.word.in.web')}
                    </label>
                </div>
                <div className="radio">
                    <label>
                        <input
                            type="radio"
                            name={Settings.SKEY_CWB}
                            value={Settings.CWB_EXT_DIC}
                            data-id={Settings.SKEY_CWB}
                            checked={value === Settings.CWB_EXT_DIC}
                            onChange={onChangeWordBehavior}
                        />
                        {i18n.t('search.word.in.external')}
                    </label>
                </div>
            </div>
        </div>
    );
};

export { WordBehavior };
