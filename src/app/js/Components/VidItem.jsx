import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { remote, clipboard } from 'electron';
import VidLineItem from './VidLineItem.jsx';
import { select, getSelectedText } from '../Model/KUtils';
import VidLib from '../Model/VidLib';
import PlayMode from '../Model/PlayMode';
import Settings from '../Model/Settings';
import { videoNum } from './VidItem.module.less';

const { Menu, MenuItem } = remote;

const i18n = remote.require('./i18n');
const log = require('electron-log');
const KEY_SPACEBAR = 23;

export default class VidItem extends React.Component {
    static CHARS_PER_LINE = 38;
    static ROW_HEIGHT = 23;
    lines;
    ended = false;
    mouseDown = false;
    autoPauseLineIndex = -1;
    autoRepeatLineIndex = -1;

    constructor(props) {
        super(props);
        this.state = {
            lineIndex: 0
        };
        this.lines = this.processLines(this.props.vidInfo.linesCombined);
        this.menuOnVideo = new Menu();
        this.menuOnVideo.append(
            new MenuItem({
                label: i18n.t('reveal.vid.in.finder'),
                click: () => {
                    this.handleRevealVid();
                }
            })
        );
        this.menu = new Menu();
        this.menu.append(
            new MenuItem({
                label: i18n.t('add.to.word.book'),
                click: () => {
                    this.props.onAddWord(getSelectedText());
                }
            })
        );
        this.menu.append(
            new MenuItem({
                label: i18n.t('annotate.for.automatic.notification'),
                click: () => {
                    this.props.onMarkWord(getSelectedText());
                }
            })
        );
        this.menu.append(new MenuItem({ type: 'separator' }));
        this.menu.append(
            new MenuItem({
                label: i18n.t('search.in.web'),
                click: () => {
                    this.props.onSearchWeb(getSelectedText());
                }
            })
        );
        this.menu.append(
            new MenuItem({
                label: i18n.t('search.in.vidlib'),
                click: () => {
                    this.props.onSearchVidLib(getSelectedText());
                }
            })
        );
        this.menu.append(
            new MenuItem({
                id: 'lookup',
                label: i18n.t('search.in.dictionary'),
                click: () => {
                    this.props.onOpenDictionary(getSelectedText());
                }
            })
        );
        this.menu.append(new MenuItem({ type: 'separator' }));
        this.menu.append(
            new MenuItem({
                id: 'lookup',
                label: i18n.t('copy'),
                click: () => {
                    clipboard.writeText(getSelectedText(), 'selection');
                }
            })
        );
    }

    componentDidUpdate(prevProps) {
        if (prevProps.speed != this.props.speed) {
            this.video.playbackRate = this.props.speed;
        }
        if (prevProps.searchTermWords != this.props.searchTermWords) {
            this.lines = this.processLines(this.props.vidInfo.linesCombined);
        }
    }

    processLines = lines => {
        const newLines = [];
        let lastStart = -1;
        for (let index = lines.length - 1; index >= 0; index--) {
            const originalLine = lines[index];
            const line = this.buildLineFromSentences(originalLine.sentences);
            line.start = originalLine.start / 1000;
            if (lastStart !== -1) {
                line.end = lastStart;
            } else {
                line.end = originalLine.end / 1000;
            }
            line.duration = line.end - line.start;
            lastStart = line.start;
            line.index = originalLine.index;
            newLines.unshift(line);
        }
        return newLines;
    };

    handleVideoContextMenu = e => {
        this.menuOnVideo.popup({ x: this.clientX, y: this.clientY });
    };

    handleRevealVid = e => {
        VidLib.reveal(this.props.vidInfo.id);
    };

    handleClickVideo = () => {
        const { onClickVideo, index } = this.props;
        onClickVideo(index);

        if (this.video.paused) {
            this.play();
            if (this.ended) {
                this.ended = false;
                for (let i = this.state.lineIndex; i < this.lines.length; i++) {
                    if (i >= 0) this.lineElements[i].updateProgress(0);
                }
            }
        } else {
            this.pause();
        }
    };

    handleContextMenu = e => {
        if (getSelectedText()) {
            this.menu.popup({ x: this.clientX, y: this.clientY });
        }
    };

    findIndexBySecs = secs => {
        return this.lines.findIndex(line => secs >= line.start && secs <= line.end);
    };

    autoPause(v) {
        if (v) {
            this.pause();
        } else {
            this.play();
        }
    }

    handleTimeUpdate = () => {
        const secs = this.video.currentTime;
        const { playMode, repeatRemainCount, onResetRepeatRemainCount, onDecreaseRepeatRemainCount } = this.props;
        const { lineIndex } = this.state;
        const index = this.findIndexBySecs(secs);
        const line = this.lines[lineIndex];

        switch (playMode) {
            case PlayMode.NORMAL:
                break;
            case PlayMode.AUTO_PAUSE:
                if (this.autoPauseLineIndex !== lineIndex) {
                    if (secs >= line.end) {
                        this.autoPauseLineIndex = lineIndex;
                        this.autoPause(true);
                        this.video.currentTime = line.end - 0.003;
                        if (lineIndex === this.lines.length - 1) {
                            // skip the end handler
                            this.skipEndHandler = true;
                        }
                        return;
                    }
                }
                break;
            case PlayMode.AUTO_REPEAT: {
                if (this.autoRepeatLineIndex !== lineIndex) {
                    if (secs >= line.end) {
                        if (repeatRemainCount <= 1) {
                            this.autoRepeatLineIndex = lineIndex;
                            onResetRepeatRemainCount();
                            if (index != -1) {
                                this.setState({ lineIndex: index });
                            } else {
                                this.onEnd(true);
                            }
                        } else {
                            this.gotoLine(lineIndex, true);
                            onDecreaseRepeatRemainCount();
                        }
                        return;
                    }
                }
                break;
            }
        }

        if (index != -1) {
            if (index !== lineIndex) {
                this.setState({ lineIndex: index });
            } else {
                this.updateLineProgress(secs, line, index);
            }
        }
    };

    updateLineProgress = (secs, line, index) => {
        const percent = Math.round(((secs - line.start) / line.duration) * 100);
        this.lineElements[index].updateProgress(percent);
    };

    handleKeyDown = e => {
        const charCode = e.keyCode || e.which;
        if (charCode === KEY_SPACEBAR) {
            e.preventDefault();
            return false;
        }
        return true;
    };

    handleEnded = () => {
        const { playMode } = this.props;
        const { lineIndex } = this.state;

        if (this.skipEndHandler) {
            this.skipEndHandler = false;
            return;
        }

        switch (playMode) {
            case PlayMode.NORMAL:
                this.onEnd(true);
                break;
            case PlayMode.AUTO_PAUSE:
                if (lineIndex !== -1 && this.autoPauseLineIndex !== lineIndex) {
                    this.autoPause(true);
                    this.autoPauseLineIndex = lineIndex;
                } else {
                    this.onEnd(true);
                }
                break;
            case PlayMode.AUTO_REPEAT:
                //if (this.props.repeatRemainCount == 1) {
                //    this.onEnd();
                //}
                break;
        }
    };

    onEnd = playNext => {
        this.ended = true;
        this.lineElements[this.lines.length - 1].updateProgress(100);
        this.props.onEnd(this.props.index, playNext);
    };

    nextLine = loop => {
        let newIndex = this.state.lineIndex + 1;

        if (newIndex > this.lines.length - 1) {
            if (loop) newIndex = 0;
            else return false;
        }
        this.gotoLine(newIndex, true);
        return true;
    };

    prevLine = loop => {
        let newIndex = this.state.lineIndex - 1;
        if (newIndex < 0) {
            if (loop) newIndex = this.lines.length - 1;
            else return false;
        }
        this.gotoLine(newIndex, true);
        return true;
    };

    handleClickLine = (index, play) => {
        const { props } = this;
        props.onResetRepeatRemainCount();
        this.autoRepeatLineIndex = -1;
        this.gotoLine(index, play);
    };

    gotoLine = (index, play) => {
        for (let i = index + 1; i < this.lines.length; i++) {
            this.lineElements[i].updateProgress(0);
        }
        select(null);

        this.setState(
            {
                lineIndex: index
            },
            () => {
                const line = this.lines[index];
                this.video.currentTime = line.start + 0.001;
                if (play) {
                    this.safePlayVideo(() => {
                        this.props.onPlay(this.props.index, true);
                    });
                }
            }
        );
    };

    buildLineFromSentences(sentences) {
        const line = {
            highightEnd: -1,
            highlightStart: 99999,
            words: [],
            breaks: 0
        };

        let first = true;
        sentences.forEach(sentence => {
            if (first) {
                first = false;
            } else {
                line.words.push('\n');
            }
            this.buildWords(sentence, line);
            line.breaks++;
        });

        line.height = line.breaks * VidItem.ROW_HEIGHT + 10;
        return line;
    }

    buildWords(words, line) {
        let charCount = 0;
        let terms = this.props.searchTermWords || [];
        let tIndex = 0;
        let highlightStart = -1;
        let highlightEnd = -1;
        let found = false;
        for (var i = 0; i < words.length; i++) {
            charCount += words[i].length;
            if (charCount > VidItem.CHARS_PER_LINE) {
                line.words.push('\n');
                line.breaks++;
                charCount = words[i].length;
            }
            line.words.push(words[i]);
            if (terms.length > 0 && !found) {
                if (words[i].toLowerCase().includes(terms[tIndex].toLowerCase())) {
                    if (tIndex == 0) {
                        highlightStart = line.words.length - 1;
                    }
                    tIndex++;
                    if (tIndex >= terms.length) {
                        highlightEnd = line.words.length - 1;
                        found = true;
                    }
                } else {
                    tIndex = 0;
                }
            }
        }

        if (line.highlightStart == 99999) {
            if (highlightEnd != -1) {
                line.highlightEnd = highlightEnd;
                line.highlightStart = highlightStart;
            }
        }
    }

    hitchedHandleClickTag = tag => {
        return e => {
            this.props.onClickTag(tag);
        };
    };

    handleClickDelete = e => {
        e.stopPropagation();
        const r = confirm(i18n.t('are.you.sure.to.delete.this.vid'));
        if (r) {
            this.props.onDelete(this.props.vidInfo.id);
        }
    };

    handleClickEditTag = e => {
        e.stopPropagation();
        this.props.onEditVidTags(this.props.vidInfo.id, this.props.vidInfo.tags);
    };

    safePlayVideo = callback => {
        this.video
            .play()
            .then(() => {
                if (callback) callback();
            })
            .catch(error => {
                if (
                    error &&
                    error
                        .toString()
                        .toLowerCase()
                        .includes('the play() request was interrupted by a call to pause()')
                ) {
                } else {
                    throw error;
                }
            });
    };

    play = (rewind = false) => {
        this.skipEndHandler = false;
        if (rewind) {
            this.gotoLine(0, true);
        } else {
            this.safePlayVideo(() => {
                this.props.onPlay(this.props.index, true);
            });
        }
    };

    rewind = play => {
        this.gotoLine(0, play);
    };

    pause = () => {
        if (!this.video.paused) {
            this.video.pause();
        }
        this.props.onPlay(this.props.index, false);
    };

    isFullyVisible = () => {
        var el = this.domRef;
        var container = el.offsetParent;
        let childTop = el.offsetTop;
        let childBottom = el.offsetTop + el.clientHeight;
        let parentTop = container.scrollTop;
        let parentBottom = parentTop + container.clientHeight;
        return childTop >= parentTop && childBottom <= parentBottom;
    };

    handleClickWord = (word, target) => {
        this.pause();
        this.props.onClickWord(word, target);
    };

    handleMouseDown = e => {
        this.mouseDown = true;
    };

    handleMouseMove = e => {
        if (this.mouseDown) {
            //this.props.onSelectWords();
            this.pause();
        }
    };

    handleMouseUp = e => {
        this.mouseDown = false;

        if (!getSelectedText()) {
            if (e.target && e.target.nodeName == 'SPAN') return;
            //this.props.onClickNothing();
        } else {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    handleMouseLeave = e => {
        this.mouseDown = false;
    };

    clearState = () => {
        this.autoPauseLineIndex = -1;
        this.autoRepeatLineIndex = -1;
        this.setState({ lineIndex: 0 });
        this.video.currentTime = 0;

        this.lineElements.forEach(line => {
            line.updateProgress(0);
        });
    };

    render() {
        this.lineElements = [];
        const { vidInfo, index } = this.props;
        return (
            <div
                className="k-vid-item"
                ref={ref => {
                    this.domRef = ref;
                }}>
                <div className={videoNum}>{index + 1}</div>
                <div className="k-vid-item__toolbar" style={{ backgroundColor: 'transparent' }}>
                    <div title={i18n.t('tip.editing.tag')} className="k-vid-item__minibt" onClick={this.handleClickEditTag}>
                        <span className="icon icon-tag" />
                    </div>
                    <div title={i18n.t('tip.delete.clip')} className="k-vid-item__minibt" onClick={this.handleClickDelete}>
                        <FontAwesomeIcon icon={faTimes} />
                    </div>
                </div>
                <video
                    style={{ padding: 0, margin: 0, outline: 'none' }}
                    preload="none"
                    width={vidInfo.meta.size.width}
                    height={vidInfo.meta.size.height}
                    onClick={this.handleClickVideo}
                    onContextMenu={this.handleVideoContextMenu}
                    onTimeUpdate={this.handleTimeUpdate}
                    onEnded={this.handleEnded}
                    onKeyDown={this.handleKeyDown}
                    tabIndex="0"
                    poster={vidInfo.thumbnail}
                    ref={ref => {
                        this.video = ref;
                    }}>
                    <source src={vidInfo.vid} type="video/mp4" />
                </video>
                <div
                    className="k-vid-lines"
                    onMouseDown={this.handleMouseDown}
                    onMouseMove={this.handleMouseMove}
                    onMouseUp={this.handleMouseUp}
                    onMouseLeave={this.handleMouseLeave}
                    onContextMenu={this.handleContextMenu}
                    onScroll={this.handleScroll}>
                    {this.lines.map((line, index) => (
                        <VidLineItem
                            key={index}
                            currentIndex={this.state.lineIndex}
                            highlighted={this.props.highlighted}
                            ref={ref => {
                                if (ref) {
                                    this.lineElements.push(ref);
                                }
                            }}
                            line={line}
                            onClickWord={this.handleClickWord}
                            onClickLine={this.handleClickLine}
                            onAddWord={this.props.onAddWord}
                        />
                    ))}
                </div>
                {vidInfo.tags.length > 0 ? (
                    <div className="k-vid-item-tag-container" style={{ textAlign: 'right', paddingRight: 10 }}>
                        {vidInfo.tags.map((tag, i) => (
                            <span key={i} className="k-vid-item-tag" onClick={this.hitchedHandleClickTag(tag)}>
                                {'#' + tag}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }
}
