import React from 'react';
import { remote } from 'electron';
import BaseSubtitleSettingsPane from './BaseSubtitleSettingsPane.jsx';
const i18n = remote.require('./i18n');

export default class YouTubeSubtitleSettingsPane extends BaseSubtitleSettingsPane {
    LANGS = [
        {
            name: 'English',
            key: 'en'
        },
        {
            name: 'Simplified Chinese',
            key: 'zh-Hans'
        },
        {
            name: 'Traditional Chinese',
            key: 'zh-Hant'
        },
        {
            name: 'Japanese',
            key: 'ja'
        },
        {
            name: 'Korean',
            key: 'ko'
        },
        {
            name: 'Polish',
            key: 'pl'
        },
        {
            name: 'Russian',
            key: 'ru'
        },
        {
            name: 'Spanish',
            key: 'es'
        },
        {
            name: 'External Subtitle',
            key: 'external'
        },
        {
            name: 'None',
            key: 'none'
        }
    ];

    constructor(props) {
        super(props);
        this.state = {
            langs: this.LANGS.concat([])
        };
        this.needClickAgain = false;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.ccList != this.props.ccList) {
            this.setState({
                //langs: this.LANGS.concat(this.props.ccList)
                langs: this.props.ccList.concat(this.LANGS)
            });
        }
    }

    handleClickSelectSecondaryContainer = e => {
        if (e.target.nodeName == 'DIV') {
            this.simulateClickElement(this.selectSecondary);
        }
    };

    handleChangePrimary = e => {
        this.props.onChangeLang(e.target.value);
    };

    handleChangeSecondary = e => {
        this.props.onChangeSecondaryLang(e.target.value);
    };

    handleClickSelectPrimaryContainer = e => {
        if (e.target.nodeName == 'DIV') {
            this.simulateClickElement(this.selectPrimary);
        }
    };

    render() {
        return (
            <div className="k-subtitle-settings">
                <div className="k-form-section">
                    <div className="k-settings-row">
                        <div className="k-select-label">{i18n.t('second.subtitle')}</div>
                        <div className="k-subtitle-select-container" onClick={this.handleClickSelectSecondaryContainer}>
                            <select
                                ref={ref => (this.selectSecondary = ref)}
                                className="k-subtitle-select"
                                onChange={this.handleChangeSecondary}
                                value={this.props.secondaryLang}>
                                {this.state.langs.map((lang, i) => (
                                    <option key={i} value={lang.key}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="k-form-section">
                    <div className="k-settings-row">
                        <div className="k-select-label">{i18n.t('primary.subtitle')}</div>
                        <div className="k-subtitle-select-container" onClick={this.handleClickSelectPrimaryContainer}>
                            <select
                                ref={ref => (this.selectPrimary = ref)}
                                className="k-subtitle-select"
                                onChange={this.handleChangePrimary}
                                value={this.props.lang}>
                                {this.state.langs.map((lang, i) => (
                                    <option key={i} value={lang.key}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div style={{ padding: '0px 5px 10px 5px', textAlign: 'center' }}>
                    <button
                        className="btn btn-mini k-dark-button"
                        onClick={this.props.onAddExtenalSubtitle}
                        style={{ width: '210px', margeinLeft: '10px' }}>
                        <span className="icon icon-plus-circled" style={{ color: '#fff', margin: '0px 3px' }}></span>
                        <span>{i18n.t('add.external.subtitle')}</span>
                    </button>
                </div>
            </div>
        );
    }
}
