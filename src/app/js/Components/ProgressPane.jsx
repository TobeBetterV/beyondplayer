import React from 'react';
import Loader from 'react-loader-spinner';

export default class ProgressPane extends React.Component {
    render() {
        return (
            <div className="k-progress-pane">
                <Loader type="Oval" color="white" height="100%" width="100%" />
            </div>
        );
    }
}
