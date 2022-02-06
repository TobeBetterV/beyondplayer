import React from 'react';
import { remote } from 'electron';
import path from 'path-extra';
import NumericInput from 'react-numeric-input';
import BaseSubtitleSettingsPane from './BaseSubtitleSettingsPane.jsx';
const i18n = remote.require('./i18n');

export default class LocalSubtitleSettingsPane extends BaseSubtitleSettingsPane {
    handleClickSelectSecondaryContainer = e => {
        if (e.target.nodeName == 'DIV') {
            this.simulateClickElement(this.selectSecondary);
        }
    };

    handleChangePrimary = e => {
        //alert(e.target.value);
        this.props.onSelectSubtitle(parseInt(e.target.value));
    };

    handleChangeSecondary = e => {
        this.props.onSelectSecondarySubtitle(parseInt(e.target.value));
    };

    handleClickSelectPrimaryContainer = e => {
        if (e.target.nodeName == 'DIV') {
            this.simulateClickElement(this.selectPrimary);
        }
    };

    handleTimeOffsetChange = value => {
        var parsedValue = Math.round(parseFloat(value) * 100) / 100;
        this.props.onChangeTimeOffset(parsedValue);
    };

    handleSecondaryTimeOffsetChange = value => {
        var parsedValue = Math.round(parseFloat(value) * 100) / 100;
        this.props.onChangeSecondaryTimeOffset(parsedValue);
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
                                value={this.props.secondarySubtitleIndex}>
                                {this.props.subtitles.map((subtitle, i) => (
                                    <option key={i} value={i}>
                                        {path.basename(subtitle)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="k-settings-row">
                        <div className="k-select-label">{i18n.t('time.shift')}</div>
                        <div className="k-numeric-container">
                            <NumericInput
                                step={0.1}
                                value={this.props.secondaryTimeOffset}
                                onChange={this.handleSecondaryTimeOffsetChange}
                                style={{
                                    input: {
                                        background: '#ddd',
                                        width: '125px'
                                    },
                                    arrowUp: {
                                        width: '5px'
                                    },
                                    arrowDown: {
                                        width: '5px'
                                    }
                                }}
                            />
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
                                value={this.props.subtitleIndex}>
                                {this.props.subtitles.map((subtitle, i) => (
                                    <option key={i} value={i}>
                                        {path.basename(subtitle)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="k-settings-row">
                        <div className="k-select-label">{i18n.t('time.shift')}</div>
                        <div className="k-numeric-container">
                            <NumericInput
                                step={0.1}
                                value={this.props.timeOffset}
                                onChange={this.handleTimeOffsetChange}
                                style={{
                                    input: {
                                        background: '#ddd',
                                        width: '125px'
                                    },
                                    arrowUp: {
                                        width: '5px'
                                    },
                                    arrowDown: {
                                        width: '5px'
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ padding: '0px 5px 10px 5px', textAlign: 'center' }}>
                    <button
                        className="btn btn-mini k-dark-button"
                        onClick={this.props.onClickDownload}
                        style={{ width: '185px', marginRight: '10px' }}>
                        <span className="icon icon-download" style={{ color: '#fff', margin: '0px 3px' }}></span>
                        <span>{i18n.t('download.online.subtitles')}</span>
                    </button>
                    <button
                        className="btn btn-mini k-dark-button"
                        onClick={this.props.onAddExtenalSubtitle}
                        style={{ width: '185px', margeinLeft: '10px' }}>
                        <span className="icon icon-plus-circled" style={{ color: '#fff', margin: '0px 3px' }}></span>
                        <span>{i18n.t('add.external.subtitle')}</span>
                    </button>
                </div>
            </div>
        );
    }
}
