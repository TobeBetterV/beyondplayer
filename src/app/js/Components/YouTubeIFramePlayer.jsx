import React from 'react';
import getVideoId from 'get-video-id';
import isDev from 'electron-is-dev';
import { remote } from 'electron';
import YoutubeSubtitle from '../Model/YoutubeSubtitle';
import Settings from '../Model/Settings';

const log = require('electron-log');

export default class YouTubeIFramePlayer extends React.Component {
    static filter = { urls: ['https://www.youtube.com/*'] };

    constructor(props) {
        super(props);
        this.baseTimedTextUrl = null;
        this.needClickAgain = false;
        this.lang = 'en';
    }

    componentDidMount() {
        const videoId = getVideoId(this.props.videoUrl).id;
        this.initYoutubePlayer(videoId);
        this.requestCCList(videoId);
        remote.getCurrentWindow().webContents.session.webRequest.onResponseStarted(YouTubeIFramePlayer.filter, this.handleGotResponse);
    }

    seek(time) {
        this.refs.youtubeWebview.send('seek', time);
    }

    setSpeed(speed) {
        this.refs.youtubeWebview.send('speed', speed);
    }

    setPause(v) {
        if (v) {
            this.refs.youtubeWebview.send('pauseVideo');
        } else {
            this.refs.youtubeWebview.send('playVideo');
        }
    }

    getVideoListId = url => {
        const m = url.match(/list=(.+)$/);
        if (m) {
            return m[1];
        }
        return null;
    };

    isBaseLangReady = () => {
        return this.baseTimedTextUrl;
    };

    componentDidUpdate(prevProps) {
        if (this.props.playing !== prevProps.playing) {
            if (this.props.playing) {
                this.refs.youtubeWebview.send('playVideo');
            } else {
                this.refs.youtubeWebview.send('pauseVideo');
            }
        }
        if (this.props.videoUrl !== prevProps.videoUrl) {
            var videoId = getVideoId(this.props.videoUrl).id;
            this.baseTimedTextUrl = null;
            this.needClickAgain = false;
            this.refs.youtubeWebview.send('loadVideo', videoId);
            this.requestCCList(videoId);
            remote.getCurrentWindow().webContents.session.webRequest.onResponseStarted(YouTubeIFramePlayer.filter, this.handleGotResponse);
        }
    }

    downloadSubtitle = async () => {
        const { videoUrl } = this.props;
        if (this.baseTimedTextUrl) {
            const videoId = getVideoId(videoUrl).id;
            const filePath = await YoutubeSubtitle.downloadSubtitleFromUrl(this.baseTimedTextUrl, videoId, this.lang);
            return filePath;
        }
        return '';
    };

    changeLang = async lang => {
        this.lang = lang;
        const { onLinesReady, videoUrl } = this.props;
        if (this.lang === 'none') {
            onLinesReady([]);
        } else if (this.baseTimedTextUrl) {
            const videoId = getVideoId(videoUrl).id;
            const lines = await YoutubeSubtitle.getSubtitleFromUrl(this.baseTimedTextUrl, videoId, this.lang);
            onLinesReady(lines);
        }
    };

    changeSecondaryLang = async lang => {
        this.secondaryLang = lang;

        const { onSecondaryLinesReady, videoUrl } = this.props;

        if (this.secondaryLang === 'none') {
            onSecondaryLinesReady([]);
        } else if (this.baseTimedTextUrl) {
            const videoId = getVideoId(videoUrl).id;
            const lines = await YoutubeSubtitle.getSubtitleFromUrl(this.baseTimedTextUrl, videoId, this.secondaryLang);
            onSecondaryLinesReady(lines);
        }
    };

    handleGotResponse = async details => {
        const { onLinesReady, videoUrl } = this.props;
        if (details.url.includes('timedtext')) {
            // console.log("timedtext:" + details.url)
            remote.getCurrentWindow().webContents.session.webRequest.onResponseStarted(YouTubeIFramePlayer.filter, null);
            const videoId = getVideoId(videoUrl).id;
            const lines = await YoutubeSubtitle.getSubtitleFromUrl(details.url, videoId, this.lang);
            this.baseTimedTextUrl = details.url;
            onLinesReady(lines);
            this.refs.youtubeWebview.send('checkSubtitleAndAd');
        } else if (details.url.includes('youtubei/v1/player')) {
            log.info(`get video info:${details.url}`);
            this.refs.youtubeWebview.send('checkAndHideControls');
        }
    };

    initYoutubePlayer = videoId => {
        this.refs.youtubeWebview.addEventListener('ipc-message', event => {
            switch (event.channel) {
                case 'onError':
                    this.props.onError();
                    break;
                case 'onPlayerReady':
                    if (this.props.playing) {
                        this.refs.youtubeWebview.sendInputEvent({ type: 'mouseDown', x: 300, y: 230, button: 'left', clickCount: 1 });
                        this.refs.youtubeWebview.sendInputEvent({ type: 'mouseUp', x: 300, y: 230, button: 'left', clickCount: 1 });
                        this.refs.youtubeWebview.send('playVideo');
                    }
                    this.refs.youtubeWebview.send('startProgress');
                    this.props.onReady();
                    break;
                case 'onDuration':
                    this.props.onDuration(event.args[0]);
                    break;
                case 'onVideoTitle':
                    this.props.onVideoTitle(event.args[0]);
                    break;
                case 'onPlayerPause':
                    this.props.onPause(event.args[0]);
                    break;
                case 'onProgress':
                    this.props.onProgress(event.args[0]);
                    break;
                case 'onDropFile':
                    this.props.onDropFile(event.args[0]);
                    break;
                case 'onDropUrl':
                    this.props.onDropUrl(event.args[0]);
                    break;
                case 'onControlsReady':
                    if (!this.baseTimedTextUrl) {
                        this.refs.youtubeWebview.send('openSubtitle');
                    }
                    break;
            }
        });

        this.refs.youtubeWebview.addEventListener('dom-ready', () => {
            this.refs.youtubeWebview.send('videoId', videoId);
            this.hasGotInfo = false;
            if (isDev) {
                this.refs.youtubeWebview.openDevTools();
            }
        });

        this.checkWebviewReady(() => {
            var socks5 = Settings.getSocks5();
            if (socks5) {
                const ses = this.refs.youtubeWebview.getWebContents().session;
                ses.setProxy(
                    {
                        proxyRules: socks5,
                        proxyBypassRules: 'localhost'
                    },
                    () => {
                        this.refs.youtubeWebview.src = `http://localhost:${this.props.port}/youtube.html`;
                    }
                );
            } else {
                this.refs.youtubeWebview.src = `http://localhost:${this.props.port}/youtube.html`;
            }
        });
    };

    checkWebviewReady = callback => {
        if (this.refs.youtubeWebview.getWebContents) {
            callback();
        } else {
            requestAnimationFrame(() => {
                this.checkWebviewReady(callback);
            });
        }
    };

    render() {
        return (
            <div
                style={{
                    marginLeft: this.props.offset,
                    width: this.props.zoom,
                    height: '100%'
                }}
                onMouseDown={this.props.onMouseDown}
                onMouseUp={this.props.onMouseUp}>
                <webview
                    useragent={__YOUTUBE_USER_AGENT__}
                    ref="youtubeWebview"
                    disablewebsecurity="on"
                    preload="./inter_op_youtube.js"
                    nodeintegration="true"
                    style={{
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                    }}
                />
            </div>
        );
    }

    requestCCList = async videoId => {
        const ccList = await YoutubeSubtitle.getCCListFromId(videoId);
        this.props.onGotCCList(ccList);
    };
}
