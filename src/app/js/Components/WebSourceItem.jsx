import React from 'react';
import { remote } from 'electron';
const i18n = remote.require('./i18n');

export default class WebSourceItem extends React.Component {
    handleChangeHomeUrl = e => {
        this.props.onChangeHomeUrl(this.props.index, e.target.value);
    };

    handleChangeSearchUrl = e => {
        this.props.onChangeSearchUrl(this.props.index, e.target.value);
    };

    handleChangeName = e => {
        this.props.onChangeName(this.props.index, e.target.value);
    };

    handleChangeEnabled = e => {
        this.props.onChangeEnabled(this.props.index, e.target.checked);
    };

    handleChangeSeparator = e => {
        this.props.onChangeSeparator(this.props.index, e.target.value);
    };

    collectValue() {
        return {
            name: this.state.name,
            homeUrl: this.state.homeUrl,
            searchUrl: this.state.searchUrl,
            enabled: this.state.enabled
        };
    }

    render() {
        return (
            <div className="k-web-source-item">
                <div style={{ gridColumn: '1', gridRow: '1' }} className="k-web-source-item-label">
                    {i18n.t('web.source.name')}
                </div>
                <div style={{ gridColumn: '2', gridRow: '1' }}>
                    <input value={this.props.name} type="text" className="k-web-source-item-input" onChange={this.handleChangeName} />
                </div>
                <div style={{ gridColumn: '1', gridRow: '2' }} className="k-web-source-item-label">
                    {i18n.t('web.source.search.url')}
                </div>
                <div style={{ gridColumn: '2', gridRow: '2' }}>
                    <input value={this.props.searchUrl} type="url" className="k-web-source-item-input" onChange={this.handleChangeSearchUrl} />
                </div>
                <div style={{ gridColumn: '1', gridRow: '3' }} className="k-web-source-item-label">
                    {i18n.t('web.source.home.url')}
                </div>
                <div style={{ gridColumn: '2', gridRow: '3' }}>
                    <input value={this.props.homeUrl} type="url" className="k-web-source-item-input" onChange={this.handleChangeHomeUrl} />
                </div>
                <div style={{ gridColumn: '1', gridRow: '4' }} className="k-web-source-item-label">
                    {i18n.t('web.source.separator')}
                </div>
                <div style={{ gridColumn: '2', gridRow: '4' }}>
                    <input value={this.props.separator} type="text" className="k-web-source-item-input" onChange={this.handleChangeSeparator} />
                </div>

                <div style={{ gridColumn: '3', gridRow: '1 / 4' }}>
                    <input
                        checked={this.props.enabled}
                        onChange={this.handleChangeEnabled}
                        type="checkbox"
                        style={{ marginTop: '55px', marginLeft: '10px' }}
                    />
                </div>
            </div>
        );
    }
}
