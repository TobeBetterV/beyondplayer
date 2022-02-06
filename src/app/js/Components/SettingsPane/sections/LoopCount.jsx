import React from 'react';
import { onValueChange } from './hooks';
import Settings from '../../../Model/Settings';

const LOOP_COUNTS = [
    {
        name: '2',
        key: 2
    },
    {
        name: '3',
        key: 3
    },
    {
        name: '4',
        key: 4
    },
    {
        name: '5',
        key: 5
    },
    {
        name: '6',
        key: 6
    },
    {
        name: '7',
        key: 7
    },
    {
        name: '8',
        key: 8
    },
    {
        name: '9',
        key: 9
    }
];

const LoopCount = ({ i18n, onChange, value }) => {
    const onChangeLoopCount = onValueChange(Settings.SKEY_SINGLE_LINE_LOOP_COUNT, onChange);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('loop.count')}</b>
            </label>
            <div style={{ marginTop: '5px', textAlign: 'center' }}>
                <select className="k-select" onChange={onChangeLoopCount} value={value}>
                    {LOOP_COUNTS.map(({ key, name }) => (
                        <option key={key} value={key}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export { LoopCount };
