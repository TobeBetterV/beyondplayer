import React from 'react';
import lerp from 'lerp';
import ReactTimeout from 'react-timeout';

class WordNotifierItem extends React.Component {
    static ANIM_TIME = 300;
    static REMOVE_TIME = 10000;

    constructor(props) {
        super(props);
        this.rootDOM = React.createRef();
        this.state = {
            height: 0,
            opacity: 1
        };
    }

    componentDidMount() {
        this.resetHeight();
        if (!this.props.pause) {
            this.countTimeRemove();
        }
    }

    countTimeRemove() {
        this.timer = this.props.setTimeout(() => {
            //this.hide();
            this.props.onSelfRemove(this.props.notification);
        }, WordNotifierItem.REMOVE_TIME);
    }

    componentDidUpdate(preProps) {
        if (preProps.pause != this.props.pause) {
            if (this.props.pause) {
                clearTimeout(this.timer);
            } else {
                this.countTimeRemove();
            }
        }
    }

    resetHeight() {
        this.setState({ height: this.rootDOM.current.scrollHeight });
    }

    truncate(content) {
        const MAX = 120;
        if (content.length > MAX) {
            content = content.substring(0, MAX - 3) + '...';
        }
        var lines = content.split('\n');

        return lines.map((line, index) => <div key={index}> {line} </div>);
    }

    onClickClose = e => {
        e.stopPropagation();
        e.preventDefault();
        this.props.onClickClose(this.props.notification);
    };

    onClickEdit = e => {
        e.stopPropagation();
        e.preventDefault();
        this.props.onClickEdit(this.props.notification);
    };

    hide() {
        this.start = 0;
        this.playAnim = true;
        window.requestAnimationFrame(this.hideUpdate);
    }

    hideUpdate = timestamp => {
        if (!this.playAnim) return;

        if (!this.start) this.start = timestamp;
        let progress = timestamp - this.start;

        this.setState({
            opacity: lerp(1, 0, progress / WordNotifierItem.ANIM_TIME)
        });

        if (progress < WordNotifierItem.ANIM_TIME) {
            window.requestAnimationFrame(this.hideUpdate);
        } else {
            this.start = 0;
            this.props.onSelfRemove(this.props.notification);
        }
    };

    render() {
        const { notification } = this.props;
        let { childElementStyle } = this.state;

        let fontSize = 14;

        if (this.props.containerSize > 600) {
            fontSize = 20;
        }

        const toolbar = (
            <div className="notification-toolbar">
                <span className="icon icon-pencil" onClick={this.onClickEdit}></span>
                <span className="icon icon-minus-circled" onClick={this.onClickClose}></span>
            </div>
        );

        return (
            <div
                className="notification-item-root"
                ref={this.rootDOM}
                style={{
                    height: this.state.height,
                    overflow: 'hidden',
                    fontSize,
                    opacity: this.state.opacity
                }}>
                <div className="notification-default notification-item" style={childElementStyle}>
                    <div className="notification-content">
                        {toolbar}
                        <h4 className="notification-title">{notification.word}</h4>
                        <div className="notification-message">{this.truncate(notification.definition)}</div>
                    </div>
                </div>
            </div>
        );
    }
}

export default ReactTimeout(WordNotifierItem);
