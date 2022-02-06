import React from 'react';
import WindowButtons from './WindowButtons.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';
import Settings from '../Model/Settings';

export default class YouTubeBrowser extends React.Component {
    HOME = 'https://www.youtube.com';

    constructor(props) {
        super(props);
        this.isReady = false;
    }

    componentDidMount() {
        this.refs.youtubeWebview.addEventListener('dom-ready', () => {
            this.updateMute();
            this.isReady = true;
        });
        this.refs.youtubeWebview.addEventListener('ipc-message', event => {
            switch (event.channel) {
                case 'click-video':
                    this.props.onClickYouTubeVideo(event.args[0]);
                    break;
                case 'is-focus':
                    this.isFocused = event.args[0];
                    break;
            }
        });
        this.refs.youtubeWebview.addEventListener('did-navigate-in-page', event => {
            this.refs.youtubeWebview.send('pause');
        });

        this.checkWebviewReady(() => {
            var socks5 = Settings.getSocks5();
            if (socks5) {
                const ses = this.refs.youtubeWebview.getWebContents().session;
                ses.setProxy({ proxyRules: socks5 }, () => {
                    this.refs.youtubeWebview.src = this.HOME;
                });
            } else {
                this.refs.youtubeWebview.src = this.HOME;
            }
        });
    }

    checkWebviewReady = callback => {
        if (this.refs.youtubeWebview.getWebContents) {
            callback();
        } else {
            requestAnimationFrame(() => {
                this.checkWebviewReady(callback);
            });
        }
    };

    checkDomReady = callback => {
        if (this.isReady) {
            callback();
        } else {
            requestAnimationFrame(() => {
                this.checkDomReady(callback);
            });
        }
    };

    componentDidUpdate(prevProps) {
        if (this.isReady) {
            if (prevProps.isFullSize != this.props.isFullSize) {
                this.updateMute();
            }
        }
    }

    updateMute = () => {
        this.refs.youtubeWebview.setAudioMuted(!this.props.isFullSize);
    };

    handleClickBack = () => {
        this.refs.youtubeWebview.goBack();
    };

    handleClickForward = () => {
        this.refs.youtubeWebview.goForward();
    };

    handleClickHome = () => {
        if (this.refs.youtubeWebview.src != this.HOME) {
            this.refs.youtubeWebview.src = this.HOME;
        } else {
            setTimeout(() => {
                this.refs.youtubeWebview.reload();
            }, 500);
        }
    };

    openUrl = url => {
        this.checkWebviewReady(() => {
            this.refs.youtubeWebview.src = url;
            this.checkDomReady(() => {
                this.updateMute();
            });
        });
    };

    handleClickReload = () => {
        this.refs.youtubeWebview.reload();
    };

    handleClickToggleResize = () => {
        this.props.onClickToggleFullSize();
    };

    isFocusOnInput = () => {
        var webContents = this.refs.youtubeWebview.getWebContents();
        return this.props.show && webContents.isFocused() && this.isFocused;
    };

    render() {
        return (
            <div className={'k-youtube-browser ' + (this.props.isFullSize ? 'k-max' : '')} style={{ display: this.props.show ? 'block' : 'none' }}>
                <div className="k-youtube-browser-toolbar draggable" style={{ paddingLeft: this.props.isFullSize ? '75px' : '5px' }}>
                    {this.props.isFullSize && (
                        <div style={{ position: 'absolute', top: 0, left: 3, width: 60, height: 20, marginTop: 14 }}>
                            {' '}
                            <WindowButtons />{' '}
                        </div>
                    )}
                    <button className="k-control" onClick={this.handleClickBack} style={{ color: '#676767' }}>
                        <span className="icon icon-left"></span>
                    </button>
                    <button className="k-control" onClick={this.handleClickForward} style={{ color: '#676767' }}>
                        <span className="icon icon-right"></span>
                    </button>
                    <button className="k-control" onClick={this.handleClickReload} style={{ color: '#676767' }}>
                        <span className="icon icon-cw"></span>
                    </button>
                    <button className="k-control" onClick={this.handleClickHome} style={{ color: '#676767' }}>
                        <span className="icon icon-home"></span>
                    </button>
                    <button className="k-control pull-left" onClick={this.handleClickToggleResize} style={{ color: '#303030' }}>
                        {this.props.isFullSize ? <FontAwesomeIcon icon={faAngleDoubleRight} /> : <FontAwesomeIcon icon={faAngleDoubleLeft} />}
                    </button>
                </div>
                <webview
                    useragent={__YOUTUBE_USER_AGENT__}
                    partition="persist:youtube"
                    ref="youtubeWebview"
                    preload="./inter_op_youtube_browser.js"
                    nodeintegration="true"
                />
            </div>
        );
    }
}
