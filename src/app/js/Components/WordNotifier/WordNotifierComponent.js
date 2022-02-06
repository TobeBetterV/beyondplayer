import React from 'react';
import ReactNotification from './WordNotifierItem';

import { getNotificationOptions } from './helpers';

import './notification.css';

class WordNotifierComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = { notifications: [] };
    }

    componentDidUpdate() {
        requestAnimationFrame(() => {
            var clientHeight = this.rootDOM.clientHeight;
            var contentHeight = this.contentDOM.clientHeight;
            if (contentHeight > clientHeight) {
                this.removeOldestNotification();
            }
        });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    addNotification = object => {
        const index = this.state.notifications.findIndex(item => {
            return item.word == object.word;
        });
        let notification = getNotificationOptions(object);
        if (index == -1) {
            this.setState(prevState => ({
                notifications: [...prevState.notifications, notification]
            }));
        } else {
            let newNotifications = [...this.state.notifications];
            newNotifications.splice(index, 1);
            this.setState({
                notifications: [...newNotifications, notification]
            });
        }

        return notification.id;
    };

    updateNotification = object => {
        const index = this.state.notifications.findIndex(item => {
            return item.word == object.word;
        });
        if (index == -1) return -1;

        let notification = getNotificationOptions(object);
        let newNotifications = [...this.state.notifications];
        newNotifications.splice(index, 1);
        this.setState({
            notifications: [notification, ...newNotifications]
        });
        return notification.id;
    };

    onCloseNotification = notification => {
        requestAnimationFrame(() => {
            this.setState({
                notifications: this.state.notifications.filter(item => {
                    return item.id !== notification.id;
                })
            });
        });
    };

    onNotificationSelfRemove = notification => {
        requestAnimationFrame(() => {
            this.setState({
                notifications: this.state.notifications.filter(item => {
                    return item.id !== notification.id;
                })
            });
        });
    };

    onEditNotification = notification => {
        this.props.onEditWordDefinition(notification.word);
    };

    removeOldestNotification = () => {
        if (this.state.notifications.length > 0) {
            this.setState({
                notifications: this.state.notifications.slice(1)
            });
        }
    };

    removeNotification = word => {
        const index = this.state.notifications.findIndex(item => {
            return item.word == word;
        });
        if (index != -1) {
            var newNotifications = [...this.state.notifications];
            newNotifications.splice(index, 1);
            this.setState({
                notifications: newNotifications
            });
        }
    };

    resize() {
        var notifications = [...this.state.notifications];
        this.setState(
            {
                notifications: []
            },
            () => {
                this.setState({ notifications: notifications });
            }
        );
    }

    renderReactNotifications = notifications => {
        return notifications.map(notification => (
            <ReactNotification
                key={notification.id}
                notification={notification}
                onClickClose={this.onCloseNotification}
                onSelfRemove={this.onNotificationSelfRemove}
                onClickEdit={this.onEditNotification}
                pause={this.props.pause}
                containerSize={this.rootDOM.clientHeight}
            />
        ));
    };

    render() {
        const { state } = this;

        return (
            <div className="notification-container-root" ref={ref => (this.rootDOM = ref)}>
                <div className="notification-container" ref={ref => (this.contentDOM = ref)}>
                    {this.renderReactNotifications(state.notifications)}
                </div>
            </div>
        );
    }
}

export default WordNotifierComponent;
