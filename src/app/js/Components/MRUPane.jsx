import React from 'react';
import MRUItem from './MRUItem.jsx';
import MRUFiles from '../Model/MRUFiles';

export default class MRUPane extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            mru: []
        };

        MRUFiles.load(files => {
            this.setState({ mru: files });
        });
    }

    render() {
        return (
            <div className="k-mru">
                <div className="k-mru-top">
                    <div className="k-mru-item" onClick={this.props.onOpenFile}>
                        {' '}
                        Open Movie File ...{' '}
                    </div>
                    <div className="k-mru-item" onClick={this.props.onOpenYoutubeVideo}>
                        {' '}
                        Open Youtube Video ...{' '}
                    </div>
                </div>
                <div className="k-mru-bottom">
                    <div className="k-mru-list not-draggable">
                        {this.state.mru.map((file, i) => (
                            <MRUItem
                                file={file}
                                key={i}
                                onOpenRecentFile={this.props.onOpenRecentFile}
                                onOpenRecentURL={this.props.onOpenRecentURL}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}
