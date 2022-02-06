import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faYoutube } from '@fortawesome/free-brands-svg-icons';
import { faHdd, faCompass } from '@fortawesome/free-solid-svg-icons';
import { remote } from 'electron';

const i18n = remote.require('./i18n');

export default class OpenMediaPane extends React.Component {
    render() {
        return (
            <div className="k-media-pane">
                <div className="k-media-item" onClick={this.props.onOpenFile}>
                    <button className={'k-big-icon-button'} title={i18n.t('open.file')}>
                        <FontAwesomeIcon icon={faHdd} />
                    </button>
                    <div> {i18n.t('open.file')} </div>
                </div>
                {PRO_VERSION ? (
                    <div className="k-media-item" onClick={this.props.onOpenYouTubeVideo}>
                        <button className={'k-big-icon-button'} title={i18n.t('open.youtube.video')}>
                            <FontAwesomeIcon icon={faYoutube} />
                        </button>
                        <div> {i18n.t('open.youtube.video')} </div>
                    </div>
                ) : null}
                <div className="k-media-item" onClick={this.props.onOpenTutorial}>
                    <button className={'k-big-icon-button'}>
                        <FontAwesomeIcon icon={faCompass} />
                    </button>
                    <div> {i18n.t('tutorial')} </div>
                </div>
            </div>
        );
    }
}
