import React from 'react';
import lerp from 'lerp';

export default class MessagePane extends React.Component {
    static ANIM_TIME = 300;
    constructor(props) {
        super(props);
        this.state = {
            opacity: 0,
            show: false
        };
        this.start = 0;
    }

    showMessage(message, ms) {
        this.setState({ opacity: 1, show: true }, () => {
            this.refs.message.innerHTML = message;
            this.playAnim = false;
            clearTimeout(this.timer);
            if (ms) {
                this.timer = setTimeout(() => {
                    this.hide();
                }, ms);
            }
        });
    }

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
            opacity: lerp(1, 0, progress / MessagePane.ANIM_TIME)
        });

        if (progress < MessagePane.ANIM_TIME) {
            window.requestAnimationFrame(this.hideUpdate);
        } else {
            this.start = 0;
            this.setState({ show: false });
        }
    };

    render() {
        return (
            <div className="k-message-pane" style={{ opacity: this.state.opacity, display: this.state.show ? 'inline-block' : 'none' }}>
                <p ref="message" className="k-message-pane-text">
                    Message form
                </p>
            </div>
        );
    }
}
