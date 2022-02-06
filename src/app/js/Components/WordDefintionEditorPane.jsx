import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUndo, faTimes } from '@fortawesome/free-solid-svg-icons';
import Dictionary from '../Model/Dictionary';
import { remote } from 'electron';
const i18n = remote.require('./i18n');

export default class WordDefinitionEditorPane extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            definition: props.definition
        };
    }

    handleChange = e => {
        this.setState({
            definition: e.target.value
        });
    };

    handleOK = e => {
        this.props.onOK(this.props.word, this.state.definition);
    };

    handleCancel = e => {
        this.props.onCancel();
    };

    handleClickDelete = e => {
        if (confirm(i18n.t('confirm.delete.word.annotation'))) {
            this.props.onDeleteWordDefinition(this.props.word);
        }
    };

    handleClickReload = e => {
        Dictionary.lookup(this.props.word, str => {
            this.setState({
                definition: str
            });
        });
    };

    render() {
        return (
            <div className="k-word-def-editor">
                <div style={{ marginBottom: 10 }}>
                    <span>{this.props.word}</span>
                    {this.props.isEditing ? (
                        <div className="btn-group pull-right">
                            <button
                                title={i18n.t('tip.remove.annotation')}
                                className="btn btn-mini btn-default"
                                style={{ color: 'red' }}
                                onClick={this.handleClickDelete}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                            <button
                                title={i18n.t('tip.reload.defintion.from.dictionary')}
                                className="btn btn-mini btn-default"
                                onClick={this.handleClickReload}>
                                <FontAwesomeIcon icon={faUndo} />
                            </button>
                        </div>
                    ) : null}
                </div>
                <textarea
                    style={{ width: '100%', height: 165, color: 'black' }}
                    value={this.state.definition}
                    onChange={this.handleChange}></textarea>
                <div className="k-bottom-button-container">
                    <button className="btn k-dark-button" onClick={this.handleCancel} style={{ width: 110, height: 26 }}>
                        {' '}
                        {i18n.t('cancel')}{' '}
                    </button>
                    <button className="btn k-dark-button" onClick={this.handleOK} style={{ width: 110, height: 26 }}>
                        {' '}
                        {i18n.t('ok')}{' '}
                    </button>
                </div>
            </div>
        );
    }
}
