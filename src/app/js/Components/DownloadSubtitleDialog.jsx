import React from 'react';
import Select from 'react-select';
import NumericInput from 'react-numeric-input';
import { remote } from 'electron';

const i18n = remote.require('./i18n');

const options = [
    { value: 'eng', label: 'English' },
    { value: 'chi', label: 'Simplified Chinese' },
    { value: 'zho', label: 'Traditional Chinese' },
    { value: 'jpn', label: 'Japanese' },
    { value: 'kor', label: 'Korean' },
    { value: 'pol', label: 'Polish' },
    { value: 'rus', label: 'Russian' }
];

const customStyles = {
    control: (base, state) => ({
        ...base,
        height: '38px',
        'min-height': '38px'
    })
};

export default class DownloadSubtitleDialog extends React.Component {
    state = {
        selectedLanguages: [options[0]],
        url: this.props.defaultValue,
        limit: 10
    };

    constructor(props) {
        super(props);

        /*this.state = {
        url: this.props.defaultValue
      }*/
    }

    componentDidMount() {
        this.refs.urlInput.select();
    }

    handlePromptOk = () => {
        this.props.onPromptOk(this.state.url, this.getLanguages(), this.state.limit);
    };

    handlePromptCancel = () => {
        this.props.onPromptCancel(this.state.url);
    };

    handleUrlChange = v => {
        this.setState({
            url: v.target.value
        });
    };

    handleChangeLimit = v => {
        this.setState({ limit: v });
    };

    getLanguages() {
        return this.state.selectedLanguages.map(l => l.value);
    }

    handleChangeLanguages = selectedLanguages => {
        this.setState({ selectedLanguages: selectedLanguages });
        console.log(`Option selected:`, selectedLanguages);
    };

    render() {
        const { selectedLanguages } = this.state;
        return (
            <div className="k-download-subtitle-dialog not-draggable">
                <div className="form-group">
                    <label className="k-label">{i18n.t('query.string')}</label>
                    <input
                        ref="urlInput"
                        className="form-control"
                        type="url"
                        value={this.state.url}
                        onChange={this.handleUrlChange}
                        style={{
                            height: '38px'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', marginBottom: '10px' }}>
                    <div style={{ display: 'inline-block', width: '390px' }}>
                        <label className="k-label"> {i18n.t('languages')} </label>
                        <Select isMulti value={selectedLanguages} onChange={this.handleChangeLanguages} options={options} styles={customStyles} />
                    </div>
                    <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                        <label className="k-label"> {i18n.t('download.limit')}</label>
                        <div>
                            <NumericInput
                                step={1}
                                value={this.state.limit}
                                onChange={this.handleChangeLimit}
                                style={{
                                    wrap: {
                                        borderRadius: '6px'
                                    },
                                    input: {
                                        width: '100px',
                                        height: '38px'
                                    },
                                    'input:not(.form-control)': {
                                        borderRadius: 4
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

                <div className="k-bottom-button-container">
                    <button className="btn k-dark-button" onClick={this.handlePromptCancel} style={{ width: 110, height: 26 }}>
                        {' '}
                        {i18n.t('cancel')}{' '}
                    </button>
                    <button className="btn k-dark-button" onClick={this.handlePromptOk} style={{ width: 110, height: 26 }}>
                        {' '}
                        {i18n.t('download')}{' '}
                    </button>
                </div>
            </div>
        );
    }
}
