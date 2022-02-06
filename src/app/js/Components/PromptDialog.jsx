import React from 'react';
import { remote } from 'electron';

const i18n = remote.require('./i18n');

export default class PromptDialog extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            url: this.props.defaultValue
        };
    }

    componentDidMount() {
        this.refs.urlInput.select();
    }

    handlePromptOk = () => {
        this.props.onPromptOk(this.state.url);
    };

    handlePromptCancel = () => {
        this.props.onPromptCancel(this.state.url);
    };

    handleUrlChange = v => {
        this.setState({
            url: v.target.value
        });
    };

    render() {
        return (
            <div className="k-prompt-dialog not-draggable">
                <div className="form-group">
                    <label className="k-label"> {this.props.promptInfo} </label>
                    <input ref="urlInput" className="form-control" type="url" value={this.state.url} onChange={this.handleUrlChange} />
                </div>
                <div className="k-bottom-button-container">
                    <button className="btn btn-default" onClick={this.handlePromptCancel}>
                        {' '}
                        {i18n.t('cancel')}{' '}
                    </button>
                    <button className="btn btn-default" onClick={this.handlePromptOk}>
                        {' '}
                        {i18n.t('ok')}{' '}
                    </button>
                </div>
            </div>
        );
    }
}
