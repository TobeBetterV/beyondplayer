import React from 'react';
import Loader from 'react-loader-spinner';

export default class MessageDialog extends React.Component {
    render() {
        return (
            <div className="k-message-dialog not-draggable">
                <div className="k-message" ref={ref => (this.message = ref)}>
                    {this.props.message}
                </div>
                <div style={{ marginLeft: '183px', marginTop: '15px' }}>
                    <Loader type="Oval" color="#127BC8" height="50" width="50" />
                </div>
            </div>
        );
    }
}
