import React from 'react';
import { remote } from 'electron';
import Settings from '../../Model/Settings';
import { Voices } from './sections/Voices.jsx';
import { MiscSection } from './sections/MiscSection.jsx';
import { SubtitleFont } from './sections/SubtitleFont.jsx';
import { WordBehavior } from './sections/WordBehavior.jsx';
import { Socks5Proxy } from './sections/Socks5Proxy.jsx';
import { ExternalDictionary } from './sections/ExternalDictionary.jsx';
import { Language } from './sections/Language.jsx';
import { PlayerSubtitleColor } from './sections/PlayerSubtitleColor.jsx';

const i18n = remote.require('./i18n');
const subtitleRefreshSet = new Set([Settings.SKEY_PLAYER_SUB_FONT, Settings.SKEY_PLAYER_SUB_COLOR, Settings.SKEY_DSB]);

export default class SettingsPane extends React.Component {
    constructor(props) {
        super(props);
        this.state = { settings: JSON.parse(JSON.stringify(Settings.getAllSettings())) };
    }

    render() {
        const { settings } = this.state;

        return (
            <div className="k-settings-pane">
                <div style={{ height: 380, overflowY: 'auto', padding: '0px 10px 0px 0px', display: 'flex', flexDirection: 'column' }}>
                    <form>
                        <Language i18n={i18n} value={settings[Settings.UI_LNG]} onChange={this.onChangeSetting} />
                        <PlayerSubtitleColor i18n={i18n} value={settings[Settings.SKEY_PLAYER_SUB_COLOR]} onChange={this.onChangeSetting} />
                        <SubtitleFont i18n={i18n} value={settings[Settings.SKEY_PLAYER_SUB_FONT]} onChange={this.onChangeSetting} />
                        {PRO_VERSION ? <WordBehavior i18n={i18n} value={settings[Settings.SKEY_CWB]} onChange={this.onChangeSetting} /> : null}
                        {PRO_VERSION ? (
                            <ExternalDictionary i18n={i18n} value={settings[Settings.SKEY_EXT_DIC]} onChange={this.onChangeSetting} />
                        ) : null}
                        <Voices i18n={i18n} value={settings[Settings.SKEY_VOICE]} onChange={this.onChangeSetting} />

                        {PRO_VERSION ? (
                            <Socks5Proxy
                                i18n={i18n}
                                onChange={this.onChangeSetting}
                                port={settings[Settings.SKEY_SOCKS5_PORT]}
                                ipAddress={settings[Settings.SKEY_SOCKS5_IP]}
                                enabled={settings[Settings.SKEY_ENABLE_SOCKS5]}
                            />
                        ) : null}

                        <MiscSection
                            i18n={i18n}
                            onChange={this.onChangeSetting}
                            wordNotification={settings[Settings.SKEY_DWN]}
                            fastForwardPause={settings[Settings.SKEY_PWFF]}
                            fixedSubtitlePosition={settings[Settings.SKEY_FSP]}
                            displaySubtitleBackground={settings[Settings.SKEY_DSB]}
                        />
                    </form>
                </div>
                <div style={{ height: '70px' }} className="k-bottom-button-container">
                    <button type="button" className="btn btn-default" onClick={this.handleClickRestore}>
                        {i18n.t('reset.to.default.settings')}
                    </button>
                    <button type="button" className="btn btn-default" onClick={this.handleClose}>
                        {i18n.t('close')}
                    </button>
                </div>
            </div>
        );
    }

    onChangeSetting = (key, value) => {
        this.setState(
            ({ settings }) => ({ settings: { ...settings, [key]: value } }),
            () => {
                const { state, props } = this;
                // eslint-disable-next-line react/destructuring-assignment
                Settings.save(state.settings);

                if (subtitleRefreshSet.has(key)) {
                    props.onPlayerSubtitleStyleChanged();
                } else if (key === Settings.UI_LNG) {
                    alert(i18n.t('please.reload.app'));
                }
            }
        );
    };

    handleClickRestore = e => {
        e.preventDefault();
        Settings.restore();

        this.setState({
            settings: JSON.parse(JSON.stringify(Settings.getAllSettings()))
        });

        this.props.onPlayerSubtitleStyleChanged();
    };

    handleClose = () => this.props.onClose();
}
