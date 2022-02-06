import React from 'react';

export default class TitlePane extends React.Component {
    render() {
        return <div className="k-title-pane">{this.props.title}</div>;
    }
}
