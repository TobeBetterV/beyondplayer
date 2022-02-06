import React from 'react';
import { onValueChange, extractors } from './hooks';
import Settings from '../../../Model/Settings';

const Socks5Proxy = ({ i18n, onChange, port, ipAddress, enabled }) => {
    const onChangePort = onValueChange(Settings.SKEY_SOCKS5_PORT, onChange);
    const onToggleEnabled = onValueChange(Settings.SKEY_ENABLE_SOCKS5, onChange, extractors.checked);
    const onChangeIpAddress = onValueChange(Settings.SKEY_SOCKS5_IP, onChange);

    return (
        <div className="k-form-section">
            <label>
                <b>{i18n.t('socks5.proxy')}</b>
            </label>
            <div style={{ marginTop: '5px', textAlign: 'left', width: '100%' }}>
                <label style={{ width: '100%' }}>
                    {' '}
                    <b className="k-settings-prefix">{i18n.t('enable.proxy')}</b>
                    <input type="checkbox" checked={enabled} onChange={onToggleEnabled} />
                </label>
            </div>
            <div style={{ marginTop: '5px', textAlign: 'left', width: '100%' }}>
                <label>
                    {' '}
                    <b className="k-settings-prefix">{i18n.t('ip.address')}</b>
                    <input type="text" className="k-settings-text" value={ipAddress} onChange={onChangeIpAddress} />
                </label>
            </div>
            <div style={{ marginTop: '5px', textAlign: 'left', width: '100%' }}>
                <label>
                    <b className="k-settings-prefix">{i18n.t('port.number')}</b>
                    <input type="text" className="k-settings-text" value={port} onChange={onChangePort} />
                </label>
            </div>
            <ul>
                <li> {i18n.t('hint.proxy.1')} </li>
                <li> {i18n.t('hint.proxy.2')} </li>
            </ul>
        </div>
    );
};

export { Socks5Proxy };
