import React, { useCallback, useEffect, useState } from 'react';
import Settings from '../../../Model/Settings';
import Dictionary from '../../../Model/Dictionary';

const Voices = ({ i18n, onChange, value }) => {
    const [voices, setVoices] = useState([
        {
            name: i18n.t('voice.off'),
            key: 'Off'
        },
        {
            name: i18n.t('system.voice'),
            key: ''
        }
    ]);

    useEffect(() => {
        const processVoices = speechVoices => {
            const items = speechVoices.map(({ name, lang }) => ({ name: `${name} [${lang}]`, key: name }));

            setVoices([...voices, ...items]);
        };

        const speechVoices = window.speechSynthesis.getVoices();

        if (speechVoices.length) {
            processVoices(speechVoices);
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.onvoiceschanged = undefined;
                processVoices(window.speechSynthesis.getVoices());
            };
        }
    }, [setVoices]);

    const onChangeVoice = useCallback(
        ({ target }) => {
            const { value } = target;

            if (!value) {
                Dictionary.pronounceDefault('Hello, this is the default system voice.');
            } else if (value !== 'Off') {
                Dictionary.pronounce(`Hello, this is ${value}. I hope you like my voice.`, value);
            }

            onChange(Settings.SKEY_VOICE, value);
        },
        [onChange]
    );

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('voice')}</b>
            </label>
            <div style={{ marginTop: '5px', textAlign: 'center' }}>
                <select className="k-select" onChange={onChangeVoice} value={value}>
                    {voices.map(({ key, name }) => (
                        <option key={key} value={key}>
                            {name}
                        </option>
                    ))}
                </select>
                <div>
                    <br />
                    {i18n.t('hint.install.voice.before.change')}
                </div>
            </div>
        </div>
    );
};

export { Voices };
