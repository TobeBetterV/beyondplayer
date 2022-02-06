import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';
import { faYoutubeSquare } from '@fortawesome/free-brands-svg-icons';
import { remote } from 'electron';
import Settings from '../Model/Settings';
import { formatTime } from '../Model/KUtils';
import './PlayerControls.less';
import './Common.less';
import PlayMode from '../Model/PlayMode';

const i18n = remote.require('./i18n');
const log = require('electron-log');

const { createSliderWithTooltip } = Slider;
const TippedSlider = createSliderWithTooltip(Slider);

export default class PlayerControls extends React.Component {
    constructor(props) {
        super(props);
        this.timeBar = null;
        this.state = {
            timePos: props.initialTimePos
        };
    }

    render() {
        const {
            visible,
            duration,
            pause,
            isRepeating,
            singleLineRepeatRemainCount,
            singleLineRepeatTotalCount,
            fullScreen,
            showSubtitlePane,
            showVidLibPane,
            showWordListPane,
            showYouTubeBrowser,
            showWebPane,
            showSidePane,
            playMode
        } = this.props;
        const {
            onClickPlay,
            onClickNextPlayMode,
            onClickToggleRepeat,
            onToggleTuner,
            onToggleSwitchesPane,
            onToggleSubtitlePane,
            onToggleWordListPane,
            onShowVidLibPane,
            onShowYouTubeBrowser,
            onToggleWebPane
        } = this.props;
        const { timePos } = this.state;
        return (
            <div
                className="byp-player-controls-container"
                ref={r => (this.container = r)}
                style={{
                    visibility: visible ? 'visible' : 'hidden',
                    display: !visible && !Settings.getSettings(Settings.SKEY_FSP) ? 'none' : 'flex'
                }}>
                <div className="byp-seek not-draggable">
                    <TippedSlider
                        ref={ref => (this.timeBar = ref)}
                        style={{ padding: '7px 0px 0px 0px', height: '20px' }}
                        min={0}
                        max={duration}
                        value={timePos}
                        step={0.1}
                        onChange={this.onSeek}
                        handleStyle={[
                            {
                                height: 16,
                                width: 0,
                                border: '0px',
                                marginLeft: -2,
                                marginTop: -6,
                                backgroundColor: 'white',
                                borderRadius: 8
                            }
                        ]}
                        trackStyle={{ backgroundColor: 'white', height: 3, borderRadius: 0 }}
                        railStyle={{ backgroundColor: 'rgba(231, 231, 231, 0.3)', height: 3, borderRadius: 0 }}
                        tipFormatter={() => `${formatTime(timePos)}`}
                        tipProps={{ overlayStyle: { zIndex: 10 } }}
                    />
                </div>
                <div className="byp-player-controls">
                    <div className="byp-player-button" onClick={onClickPlay} style={{ textAlign: 'center' }}>
                        <span className={`byp-icon ${pause ? 'byp-icon-play' : 'byp-icon-pause'}`} />
                    </div>
                    <div className="byp-player-button" onClick={onClickToggleRepeat}>
                        <div style={{ width: '100%', height: '100%', paddingTop: 3 }} className={isRepeating ? 'byp-anim' : ''}>
                            <span className="byp-icon byp-icon-loop" />
                        </div>
                    </div>
                    <div className="byp-player-button" onClick={onClickNextPlayMode} title={i18n.t('next.play.mode')}>
                        <span className={this.renderPlayModeIcon(playMode)}>
                            {playMode === 1 && <span className="byp-loop-counter"> {`${singleLineRepeatRemainCount}`}</span>}
                        </span>
                    </div>
                    <div className="byp-player-button" onClick={onToggleTuner}>
                        <span className="byp-icon byp-icon-equalizer" />
                    </div>
                    <div className="byp-player-button" onClick={onToggleSwitchesPane}>
                        <span className="byp-icon byp-icon-switches" />
                    </div>
                    <span className="byp-timer-current"> {this.formatTimeLabel(timePos)}</span>
                    {PRO_VERSION ? (
                        <div className="byp-player-controls-toolbar">
                            <button
                                type="button"
                                className={`byp-toolbar-button${showSubtitlePane ? ' byp-active' : ''}`}
                                style={{ borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }}
                                onClick={onToggleSubtitlePane}
                                title={i18n.t('subtitle.panel')}>
                                <span className="icon icon-menu" />
                            </button>
                            <button
                                type="button"
                                className={`byp-toolbar-button${showWordListPane ? ' byp-active' : ''}`}
                                onClick={onToggleWordListPane}
                                title={i18n.t('word.book')}>
                                <span className="icon icon-book" />
                            </button>
                            <button
                                type="button"
                                className={`byp-toolbar-button${showVidLibPane ? ' byp-active' : ''}`}
                                onClick={onShowVidLibPane}
                                title={i18n.t('clip.library')}>
                                <span className="icon icon-archive" />
                            </button>
                            <button
                                type="button"
                                className={`byp-toolbar-button${showYouTubeBrowser ? ' byp-active' : ''}`}
                                onClick={onShowYouTubeBrowser}
                                title={i18n.t('youtube.browser')}>
                                <FontAwesomeIcon icon={faYoutubeSquare} style={{ paddingTop: 3, fontSize: 25 }} />
                            </button>
                            <button
                                type="button"
                                className={`byp-toolbar-button${showWebPane ? ' byp-active' : ''}`}
                                onClick={onToggleWebPane}
                                style={{ borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
                                title={i18n.t('web.dictionary')}>
                                <span className="icon icon-globe" />
                            </button>
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className="byp-player-button"
                        onClick={this.handleToggleSidePane}
                        ref={r => (this.toggleButton = r)}
                        title={i18n.t('toggle.side.panel')}>
                        {showSidePane ? <FontAwesomeIcon icon={faAngleDoubleRight} /> : <FontAwesomeIcon icon={faAngleDoubleLeft} />}
                    </button>
                </div>
            </div>
        );
    }

    setTimeBarValue(v) {
        this.setState({
            timePos: v
        });
    }

    formatTimeLabel(current) {
        const { isPlaying, duration } = this.props;
        return isPlaying ? `${formatTime(current)} / ${formatTime(duration)}` : '';
    }

    onSeek = v => {
        const { onSeek } = this.props;
        this.setState({
            timePos: v
        });
        onSeek(v);
    };

    containsElement = element => {
        return this.container.contains(element);
    };

    handleToggleSidePane = e => {
        const { onToggleSidePane } = this.props;
        this.toggleButton.blur();
        onToggleSidePane(e);
    };

    renderPlayModeIcon = playMode => {
        let icon;

        switch (playMode) {
            case PlayMode.NORMAL:
                icon = 'byp-icon-pm-normal';
                break;
            case PlayMode.AUTO_REPEAT:
                icon = 'byp-icon-pm-auto-repeat';
                break;
            case PlayMode.AUTO_PAUSE:
                icon = 'byp-icon-pm-auto-pause';
                break;
            default:
                icon = 'byp-icon-pm-normal';
                break;
        }
        return `byp-icon ${icon}`;
    };
}
