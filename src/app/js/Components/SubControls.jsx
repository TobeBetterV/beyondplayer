import React from 'react';
import { remote } from 'electron';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import './Common.less';
import './SubControls.less';

const i18n = remote.require('./i18n');
const { Menu, MenuItem } = remote;

export default class SubControls extends React.Component {
    constructor(props) {
        super(props);

        const { onOpenYouTubeVideo, onOpenFile, onSettings } = this.props;

        this.menu = new Menu();
        this.menu.append(
            new remote.MenuItem({
                label: i18n.t('open.file'),
                click: () => {
                    onOpenFile();
                }
            })
        );
        if (PRO_VERSION) {
            this.menu.append(
                new MenuItem({
                    label: i18n.t('open.youtube.video'),
                    click: () => {
                        onOpenYouTubeVideo();
                    }
                })
            );
        }
        this.menu.append(new MenuItem({ type: 'separator' }));
        this.menu.append(
            new MenuItem({
                role: 'recentDocuments',
                label: i18n.t('open.recent'),
                submenu: [
                    {
                        label: i18n.t('clear.recent'),
                        click() {
                            remote.app.clearRecentDocuments();
                        }
                    }
                ]
            })
        );
        this.menu.append(new MenuItem({ type: 'separator' }));
        this.menu.append(
            new MenuItem({
                label: i18n.t('settings'),
                click: () => {
                    onSettings();
                }
            })
        );
        this.menu.append(
            new MenuItem({
                label: i18n.t('quit'),
                click: () => {
                    remote.app.quit();
                }
            })
        );
    }

    render() {
        return (
            <div className="byp-sub-controls">
                <button type="button" className="byp-toolbar-button" style={{ fontSize: 15 }} onClick={this.handleClickMenu}>
                    <FontAwesomeIcon icon={faEllipsisV} />
                </button>
            </div>
        );
    }

    handleClickMenu = e => {
        e.stopPropagation();
        this.menu.popup({
            x: e.clientX - 180,
            y: e.clientY
        });
    };
}
