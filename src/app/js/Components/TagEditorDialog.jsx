import React from 'react';
import TagEditor from './TagEditor/TagEditor.jsx';
import VidLib from '../Model/VidLib';
import { remote } from 'electron';
const i18n = remote.require('./i18n');

export default class TagEditorDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tags: this.props.tags.map(tag => {
                return { name: tag };
            }),
            suggestions: VidLib.getAllTags().map(tag => {
                return { name: tag };
            })
        };
    }

    handleDelete = i => {
        const tags = this.state.tags.slice(0);
        tags.splice(i, 1);
        this.setState({ tags });
    };

    handleAddition = tag => {
        const tags = [].concat(this.state.tags, tag);
        this.setState({ tags });
    };

    handleClickOK = () => {
        let query = this.tagEditor.getQuery();
        if (query) {
            const tags = [].concat(this.state.tags, { name: query });
            this.setState({ tags }, () => {
                this.props.onClickOK(
                    this.state.tags.map(tag => {
                        return tag.name;
                    })
                );
            });
        } else {
            this.props.onClickOK(
                this.state.tags.map(tag => {
                    return tag.name;
                })
            );
        }
    };

    handleAddRecentTag = tag => {
        return e => {
            this.handleAddition({ name: tag });
        };
    };

    render() {
        const { tags, suggestions } = this.state;
        return (
            <div className="k-tag-editor-dialog">
                <div style={{ marginBottom: 10 }}>
                    <div>{i18n.t('editing.tags')}</div>
                </div>
                <TagEditor
                    tags={tags}
                    suggestions={suggestions}
                    handleDelete={this.handleDelete}
                    handleAddition={this.handleAddition}
                    placeholder={i18n.t('add.new.tag')}
                    allowNew={true}
                    ref={r => {
                        this.tagEditor = r;
                    }}
                />
                <div className="k-recent-tags">
                    {this.props.recentTags.reverse().map((tag, i) => (
                        <button type="button" className="" title="Click to add tag" onClick={this.handleAddRecentTag(tag)} key={i}>
                            <span>{tag}</span>
                        </button>
                    ))}
                </div>
                <div className="k-bottom-button-container" style={{ paddingTop: 0 }}>
                    <button className="btn k-dark-button" onClick={this.props.onClickCancel} style={{ width: 110, height: 26 }}>
                        {' '}
                        {i18n.t('cancel')}{' '}
                    </button>
                    <button className="btn k-dark-button" onClick={this.handleClickOK} style={{ width: 110, height: 26 }}>
                        {' '}
                        {i18n.t('ok')}{' '}
                    </button>
                </div>
            </div>
        );
    }
}
