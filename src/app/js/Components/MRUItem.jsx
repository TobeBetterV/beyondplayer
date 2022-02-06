import React from 'react';
import _ from 'lodash';
import path from 'path-extra';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faYoutube } from '@fortawesome/free-brands-svg-icons';
import { faHdd } from '@fortawesome/free-solid-svg-icons';

export default class MRUItem extends React.Component {
    handleOnClickOpen = e => {
        if (_.isString(this.props.file)) {
            this.props.onOpenRecentFile(this.props.file);
        } else {
            this.props.onOpenRecentURL(this.props.file.url);
        }
    };

    getTitle = mruItem => {
        if (_.isString(mruItem)) {
            return path.basename(mruItem);
        } else {
            return mruItem.title;
        }
    };

    render() {
        return (
            <div className="k-mru-item" onClick={this.handleOnClickOpen}>
                {_.isString(this.props.file) ? (
                    <FontAwesomeIcon icon={faHdd} style={{ marginRight: '10px', color: 'white' }} />
                ) : (
                    <FontAwesomeIcon icon={faYoutube} style={{ marginRight: '10px', color: 'white' }} />
                )}
                {this.getTitle(this.props.file)}
            </div>
        );
    }
}
