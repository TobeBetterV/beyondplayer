import React from 'react';
import { remote } from 'electron';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Settings from '../Model/Settings';
import './PopupPane.less';
import './TunerPane.less';

const i18n = remote.require('./i18n');

export default class TunerPane extends React.Component {
    NO_MASK_HEIGHT = 270;
    LITE_HEIGHT = 190;

    constructor(props) {
        super(props);
        this.state = {
            mainSubtitleSize: Settings.getPlayerSubtitleSize(),
            sidePaneSubtitleSize: Settings.getSidePaneSubtitleSize(),
            height: null
        };

        if (!PRO_VERSION) {
            this.state.height = this.LITE_HEIGHT;
        } else {
            if (!this.props.showMaskHeight) {
                this.state.height = this.NO_MASK_HEIGHT;
            }
        }
    }

    handleOnChange = v => {
        this.props.onChangeSpeed(v);
    };

    handleOnChangePlayerSubtitleSize = v => {
        this.setState(
            {
                mainSubtitleSize: v
            },
            () => {
                Settings.setPlayerSubtitleSize(v);
                this.props.onChangePlayerSubtitleSize();
            }
        );
    };

    handleOnChangeSidePaneSubtitleSize = v => {
        this.setState(
            {
                sidePaneSubtitleSize: v
            },
            () => {
                Settings.setSidePaneSubtitleSize(v);
                this.props.onChangeSidePaneSubtitleSize();
            }
        );
    };

    handleOnChangeMaskHeight = v => {
        this.props.onChangeMaskHeight(v);
    };

    handleOnChangeClipMaskArea = e => {
        this.props.onChangeClipMaskArea(e.target.checked);
    };

    speedMarks = {
        0: '0',
        0.25: '0.25',
        0.5: '0.5',
        0.75: '0.75',
        1: '1',
        1.25: '1.25',
        1.5: '1.5',
        1.75: '1.75',
        2: '2'
    };

    sizeMarks = {
        0.7: '70%',
        1.0: '100%',
        1.5: '150%',
        2.0: '200%',
        2.5: '250%'
    };

    sidePaneSizeMarks = {
        1: 'S',
        2: 'M',
        3: 'L'
    };

    heightMarks = {
        0: '0%',
        10: '10%',
        20: '20%',
        30: '30%',
        40: '40%',
        50: '50%'
    };

    componentDidUpdate = prevProps => {
        if (prevProps.showMaskHeight != this.props.showMaskHeight) {
            this.setState({
                height: !this.props.showMaskHeight ? this.NO_MASK_HEIGHT : null
            });
        }
    };

    containsElement = element => {
        return this.container.contains(element);
    };

    updateSettings = () => {
        this.setState({
            mainSubtitleSize: Settings.getPlayerSubtitleSize(),
            sidePaneSubtitleSize: Settings.getSidePaneSubtitleSize()
        });
    };

    render() {
        return (
            <div className="byp-tuner-pane not-draggable" style={{ height: this.state.height }} ref={r => (this.container = r)}>
                <div style={{ marginBottom: '10px', marginLeft: '-12px' }}>{i18n.t('player.subtitle.size')}</div>
                <Slider
                    style={{ cursor: 'pointer', marginBottom: '35px' }}
                    marks={this.sizeMarks}
                    min={Settings.MIN_PLAYER_SUBTITLE_SIZE}
                    max={Settings.MAX_PLAYER_SUBTITLE_SIZE}
                    value={this.state.mainSubtitleSize}
                    step={Settings.PLAYER_SUBTITLE_STEP}
                    onChange={this.handleOnChangePlayerSubtitleSize}
                    included={false}
                    handleStyle={[
                        {
                            borderColor: 'white',
                            height: 14,
                            width: 4,
                            marginLeft: -2,
                            marginTop: -5,
                            backgroundColor: 'white',
                            borderRadius: 0
                        }
                    ]}
                    trackStyle={{ backgroundColor: 'white', height: 4, borderRadius: 0 }}
                    railStyle={{ backgroundColor: 'rgba(211, 211, 211, 0.2)', height: 4, borderRadius: 0 }}
                    dotStyle={{ borderColor: 'gray', border: '1px', width: '1px', borderRadius: '0', marginLeft: '-1px' }}
                    activeDotStyle={{ borderColor: 'gray', color: 'white' }}
                    tipFormatter={value => `${value}`}
                />
                <div style={{ marginBottom: '10px', marginLeft: '-12px' }}>{i18n.t('side.pane.subtitle.size')}</div>
                <Slider
                    style={{ cursor: 'pointer', marginBottom: '35px' }}
                    marks={this.sidePaneSizeMarks}
                    min={1}
                    max={3}
                    value={this.state.sidePaneSubtitleSize}
                    step={1}
                    onChange={this.handleOnChangeSidePaneSubtitleSize}
                    included={false}
                    handleStyle={[
                        {
                            borderColor: 'white',
                            height: 14,
                            width: 4,
                            marginLeft: -2,
                            marginTop: -5,
                            backgroundColor: 'white',
                            borderRadius: 0
                        }
                    ]}
                    trackStyle={{ backgroundColor: 'white', height: 4, borderRadius: 0 }}
                    railStyle={{ backgroundColor: 'rgba(211, 211, 211, 0.2)', height: 4, borderRadius: 0 }}
                    dotStyle={{ borderColor: 'gray', border: '1px', width: '1px', borderRadius: '0', marginLeft: '-1px' }}
                    activeDotStyle={{ borderColor: 'gray', color: 'white' }}
                    tipFormatter={value => `${value}`}
                />

                {PRO_VERSION ? <div style={{ marginBottom: '10px', marginLeft: '-12px' }}>{i18n.t('playback.speed')}</div> : null}
                {PRO_VERSION ? (
                    <Slider
                        style={{ cursor: 'pointer', marginBottom: '35px' }}
                        marks={this.speedMarks}
                        min={0}
                        max={2}
                        value={this.props.speed}
                        step={0.05}
                        onChange={this.handleOnChange}
                        included={false}
                        handleStyle={[
                            {
                                borderColor: 'white',
                                height: 14,
                                width: 4,
                                marginLeft: -2,
                                marginTop: -5,
                                backgroundColor: 'white',
                                borderRadius: 0
                            }
                        ]}
                        trackStyle={{ backgroundColor: 'white', height: 4, borderRadius: 0 }}
                        railStyle={{ backgroundColor: 'rgba(211, 211, 211, 0.2)', height: 4, borderRadius: 0 }}
                        dotStyle={{ borderColor: 'gray', border: '1px', width: '1px', borderRadius: '0', marginLeft: '-1px' }}
                        activeDotStyle={{ borderColor: 'gray', color: 'white' }}
                        tipFormatter={value => `${value}`}
                    />
                ) : null}
                {PRO_VERSION ? (
                    this.props.showMaskHeight ? (
                        <div style={{ marginBottom: '10px', marginLeft: '-12px' }}>{i18n.t('mask.height')}</div>
                    ) : null
                ) : null}
                {PRO_VERSION ? (
                    this.props.showMaskHeight ? (
                        <Slider
                            style={{ cursor: 'pointer', marginBottom: '35px' }}
                            marks={this.heightMarks}
                            min={0}
                            max={50}
                            value={this.props.maskHeight}
                            step={1}
                            onChange={this.handleOnChangeMaskHeight}
                            included={false}
                            handleStyle={[
                                {
                                    borderColor: 'white',
                                    height: 14,
                                    width: 4,
                                    marginTop: -5,
                                    marginLeft: -2,
                                    backgroundColor: 'white',
                                    borderRadius: 0
                                }
                            ]}
                            trackStyle={{ backgroundColor: 'white', height: 4, borderRadius: 0 }}
                            railStyle={{ backgroundColor: 'rgba(211, 211, 211, 0.2)', height: 4, borderRadius: 0 }}
                            dotStyle={{ borderColor: 'gray', border: '1px', width: '1px', borderRadius: '0', marginLeft: '-1px' }}
                            activeDotStyle={{ borderColor: 'gray', color: 'white' }}
                            tipFormatter={value => `${value}%`}
                        />
                    ) : null
                ) : null}
            </div>
        );
    }
}
