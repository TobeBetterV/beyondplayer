import React from 'react';
import { remote } from 'electron';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';
import ReactPaginate from 'react-paginate';
import { TagCloud } from 'react-tagcloud';
import SearchInput from './SearchInput.jsx';
import MansonryLayout from '../Model/MansonryLayout';
import VidItem from './VidItem.jsx';
import PlayMode from '../Model/PlayMode';
import Settings from '../Model/Settings';
import VidLib from '../Model/VidLib';
import WindowButtons from './WindowButtons.jsx';
import Suggestions from './TagEditor/Suggestions.jsx';
import { iconNormal, iconAutoRepeat, iconAutoPause, toolbar, toolbarButton, toolbarSeparator, loopCounter } from './VidLibPane.module.less';
import './Common.less';

const i18n = remote.require('./i18n');
const log = remote.require('electron-log');

const KEYS = {
    ENTER: 13,
    TAB: 9,
    BACKSPACE: 8,
    SPACEBAR: 32,
    UP_ARROW: 38,
    DOWN_ARROW: 40
};

const cloudOptions = {
    luminosity: 'light',
    hue: 'blue'
};

const cloudRenderer = (tag, size, color) => (
    <span
        key={tag.value}
        style={{
            fontSize: `${size}px`,
            margin: '3px',
            padding: '4px',
            display: 'inline-block',
            color
        }}>
        {tag.value}
    </span>
);

export default class VidLibPane extends React.Component {
    static PER_PAGE = 30;

    items = [];
    ignoreSuggestion = false;

    constructor(props) {
        super(props);
        this.state = {
            loop: false,
            searchTerm: '',
            vidList: [],
            ids: [],
            isPlay: false,
            currentVidIndex: 0,
            pageNum: 0, // start from 1, 0 is invalid
            pageCount: 0,
            suggestionExpandable: false,
            selectedSuggestionIndex: -1,
            tagQuery: '',
            query: [],
            playMode: PlayMode.NORMAL,
            repeatTotalCount: Settings.getSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT),
            repeatRemainCount: Settings.getSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT),
            suggestions: VidLib.getAllTags().map(tag => {
                return { name: tag };
            }),
            showTagCloud: false,
            sortInAscending: false
        };
    }

    updateIds = callback => {
        let ids;
        let tags;
        let query;
        const { state } = this;
        if (!state.searchTerm) {
            ids = VidLib.retrieveAll(state.sortInAscending);
            tags = [];
            query = [];
        } else {
            ({ ids, tags, query } = VidLib.search(state.searchTerm, state.sortInAscending));
            if (query) {
                query = query.split(' ');
            } else {
                query = [];
            }
        }
        const pageCount = Math.ceil(ids.length / VidLibPane.PER_PAGE);
        this.setState({ ids, pageCount, query, tags }, () => {
            if (callback) callback();
        });
    };

    componentDidUpdate(preProps) {
        if (!preProps.show) {
            if (this.props.show) {
                this.updateIds(() => {
                    this.genPage(1);
                });
            }
        } else if (!this.props.show) {
            this.changeIsPlay(false);
        }
    }

    refreshCurrentPage = () => {
        this.updateIds(() => {
            if (this.state.pageNum <= this.state.pageCount) {
                this.genPage(this.state.pageNum);
            } else if (this.state.pageNum > 1) {
                this.genPage(this.state.pageNum - 1);
            } else {
                this.genPage(1);
            }
        });
    };

    resetRepeatTimes() {
        this.setState({
            repeatTotalCount: Settings.getSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT),
            repeatRemainCount: Settings.getSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT),
            playMode: PlayMode.AUTO_REPEAT
        });
    }

    genPage = pageNum => {
        const start = (pageNum - 1) * VidLibPane.PER_PAGE;
        const { ids } = this.state;
        const end = Math.min(start + VidLibPane.PER_PAGE, ids.length);
        const pageIds = ids.slice(start, end);
        const vidList = VidLib.genVids(pageIds);

        const item = this.items[this.state.currentVidIndex];
        if (item) {
            item.pause();
            item.clearState();
        }

        this.setState(
            {
                vidList,
                pageNum,
                isPlay: false,
                currentVidIndex: 0
            },
            () => {
                this.paging.setState({ selected: this.state.pageNum - 1 });
                if (this.packer) this.packer.pack();
            }
        );
    };

    componentDidMount() {
        this.packer = new MansonryLayout({
            container: this.container,
            size: {
                columnWidth: 375,
                gap: 5,
                vgap: 10
            },
            packed: 'data-packed'
        });
    }

    handleClickToggleResize = e => {
        this.container.focus();
        this.props.onClickToggleFullSize(() => {
            this.resize();
        });
    };

    handleClickFastForward = () => {
        if (this.state.pageNum < this.state.pageCount) {
            this.genPage(this.state.pageNum + 1);
        }
    };

    handleClickFastBackward = () => {
        if (this.state.pageNum > 1) {
            this.genPage(this.state.pageNum - 1);
        }
    };

    handleClickPlay = () => {
        this.changeIsPlay(!this.state.isPlay);
    };

    changeIsPlay = v => {
        if (this.state.currentVidIndex >= this.items.length) return;

        this.setState(
            {
                isPlay: v
            },
            () => {
                var item = this.items[this.state.currentVidIndex];
                if (item) {
                    if (this.state.isPlay) {
                        item.play();
                    } else {
                        item.pause();
                    }
                }
            }
        );
    };

    togglePause = () => {
        this.handleClickPlay();
    };

    toggleLoop = () => {
        this.handleClickLoop();
    };

    handleClickLoop = () => {
        this.setState({
            loop: !this.state.loop
        });
    };

    handleClickSort = () => {
        this.setState(
            {
                sortInAscending: !this.state.sortInAscending
            },
            () => {
                this.updateIds(() => {
                    this.genPage(1);
                });
            }
        );
    };

    handleClickPrev = () => {
        this.playPrev();
    };

    handleClickNext = () => {
        this.playNext(true);
    };

    handlePageClick = data => {
        this.genPage(data.selected + 1);
    };

    search = searchTerm => {
        this.handleSearchUpdated(searchTerm);
    };

    handleAddTag = tag => {
        const { tagQuery } = this.state;
        var replaced = this.state.searchTerm.replace(`#${tagQuery}`, `#${tag.name}`);
        this.ignoreSuggestion = true;
        this.setState({
            searchTerm: replaced,
            suggestionExpandable: false
        });
    };

    resize = () => {
        if (this.packer && this.props.show) {
            this.packer.pack();
        }
    };

    handleSearchUpdated = term => {
        this.setState({ searchTerm: term }, () => {
            this.updateIds(() => {
                this.genPage(1);
            });
            if (!this.ignoreSuggestion) {
                var indexOfSharp = this.state.searchTerm.indexOf('#');
                if (indexOfSharp != -1) {
                    var tagString = this.state.searchTerm.substr(indexOfSharp, this.state.searchTerm.length);
                    let tags = tagString.split('#').filter(tag => {
                        return tag;
                    });
                    if (tags.length >= 1) {
                        tags = tags.map(tag => {
                            return tag.trim();
                        });
                        this.setState({ tagQuery: tags[tags.length - 1], suggestionExpandable: true });
                    } else {
                        this.setState({ tagQuery: '', suggestionExpandable: false });
                    }
                } else {
                    this.setState({ tagQuery: '', suggestionExpandable: false });
                }
            } else {
                this.ignoreSuggestion = false;
            }
        });
    };

    handleKeyDown = e => {
        const { tagQuery, selectedSuggestionIndex } = this.state;

        if (e.keyCode === KEYS.ENTER) {
            if (tagQuery || selectedSuggestionIndex > -1) {
                e.preventDefault();
            }

            if (tagQuery.length >= 2) {
                // Check if the user typed in an existing suggestion.
                const match = this.suggestionsUI.state.options.findIndex(suggestion => {
                    return suggestion.name.search(new RegExp(`^${tagQuery}$`, 'i')) === 0;
                });

                const index = selectedSuggestionIndex === -1 ? match : selectedSuggestionIndex;

                if (index > -1) {
                    let toReplace = this.suggestionsUI.state.options[index].name;
                    var replaced = this.state.searchTerm.replace(`#${tagQuery}`, `#${toReplace}`);
                    this.ignoreSuggestion = true;
                    this.setState({
                        searchTerm: replaced,
                        suggestionExpandable: false
                    });
                }
            }
        }

        // when backspace key is pressed and query is blank, delete the last tag
        /*if (e.keyCode === KEYS.BACKSPACE && query.length === 0 && this.props.allowBackspace) {
            this.deleteTag(this.props.tags.length - 1)
        }*/

        if (e.keyCode === KEYS.UP_ARROW) {
            e.preventDefault();

            // if last item, cycle to the bottom
            if (selectedSuggestionIndex <= 0) {
                this.setState({ selectedSuggestionIndex: this.suggestionsUI.state.options.length - 1 });
            } else {
                this.setState({ selectedSuggestionIndex: selectedSuggestionIndex - 1 });
            }
        }

        if (e.keyCode === KEYS.DOWN_ARROW) {
            e.preventDefault();
            this.setState({ selectedSuggestionIndex: (selectedSuggestionIndex + 1) % this.suggestionsUI.state.options.length });
        }
    };

    handleClickClear = () => {
        this.setState({
            searchTerm: '',
            suggestionExpandable: false
        });
    };

    handleClickTag = tag => {
        this.setState({
            searchTerm: `#${tag}`
        });
        this.ignoreSuggestion = true;
    };

    handleDecreaseRepeatRemainCount = () => {
        const { repeatRemainCount } = this.state;
        this.setState({ repeatRemainCount: repeatRemainCount - 1 });
    };

    handleResetRepeatRemainCount = () => {
        const { repeatTotalCount } = this.state;
        this.setState({ repeatRemainCount: repeatTotalCount });
    };

    handlePlayVidItem = (index, play) => {
        if (play) {
            this.setState({ isPlay: true });
            if (index !== this.state.currentVidIndex) {
                this.selectVideoItem(index);
            }
        } else {
            if (index === this.state.currentVidIndex) {
                this.setState({ isPlay: false });
            }
        }
    };

    selectVideoItem = index => {
        const { currentVidIndex, repeatTotalCount } = this.state;
        if (index !== currentVidIndex) {
            const oldIndex = currentVidIndex;
            this.setState({ currentVidIndex: index, repeatRemainCount: repeatTotalCount }, () => {
                const item = this.items[oldIndex];
                if (item) {
                    item.pause();
                    item.clearState();
                }
            });
        }
    };

    handleClickVidItem = index => {
        this.selectVideoItem(index);
    };

    handleVidEnd = (index, play) => {
        if (this.state.loop) {
            this.items[index].rewind(play);
        } else {
            this.playNext(play);
        }
    };

    nextLine = () => {
        if (this.state.currentVidIndex >= 0) {
            var item = this.items[this.state.currentVidIndex];
            if (!item.nextLine(this.state.loop)) {
                this.playNext(true);
            }
        }
    };

    prevLine = () => {
        if (this.state.currentVidIndex >= 0) {
            var item = this.items[this.state.currentVidIndex];
            if (!item.prevLine(this.state.loop)) {
                this.playPrev();
            }
        }
    };

    playNext = play => {
        if (this.state.vidList.length <= 0) return;

        var newIndex = this.state.currentVidIndex + 1;
        if (newIndex > this.state.vidList.length - 1) {
            newIndex = 0;
        }
        var item = this.items[newIndex];
        if (!item.isFullyVisible()) {
            item.domRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (!play) {
            this.handleClickVidItem(newIndex);
        } else {
            item.handleClickVideo();
        }
    };

    playPrev = () => {
        if (this.state.vidList.length <= 0) return;

        var newIndex = this.state.currentVidIndex - 1;
        if (newIndex < 0) {
            newIndex = this.state.vidList.length - 1;
        }
        var item = this.items[newIndex];
        if (!item.isFullyVisible()) {
            item.domRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        item.play(true);
    };

    nextPage = () => {
        if (this.state.pageNum < this.state.pageCount) {
            this.paging.setState({ selected: this.state.pageNum });
            this.paging.callCallback(this.state.pageNum);
        }
    };

    prevPage = () => {
        if (this.state.pageNum > 1) {
            this.paging.setState({ selected: this.state.pageNum - 2 });
            this.paging.callCallback(this.state.pageNum - 2);
        }
    };

    updateTags = (id, tags) => {
        var vidList = [...this.state.vidList];
        for (let index = 0; index < vidList.length; index++) {
            const vidInfo = vidList[index];
            if (vidInfo.id === id) {
                vidInfo.tags = tags;
            }
        }
        this.setState({ vidList }, () => {
            if (this.packer) this.packer.pack();
        });
    };

    handleScrollKeyDown = e => {
        const charCode = e.keyCode || e.which;
        if (charCode === KEYS.SPACEBAR) {
            e.preventDefault();
            this.togglePause();
            return false;
        }
    };

    handleClickTagCloud = () => {
        this.setState(
            {
                showTagCloud: !this.state.showTagCloud
            },
            () => {
                if (this.state.showTagCloud) {
                    this.changeIsPlay(false);
                }
            }
        );
    };

    getTags = () => {
        return VidLib.getAllTagCounts();
    };

    handleClickCloudTag = tag => {
        this.setState({ showTagCloud: false });
        this.handleClickTag(tag.value);
    };

    handleClickNextPlayMode = () => {
        this.setState(state => {
            return { playMode: (state.playMode + 1) % 3 };
        });
    };

    handleToolbarKeyDown = e => {
        if (e.keyCode === KEYS.SPACEBAR) {
            this.togglePause();
            // not to trigger toggle play/pause for main player
            e.preventDefault();
        }
    };

    changePlayMode = playMode => {
        this.setState({ playMode });
    };

    render() {
        const listboxId = 'ReactTags-listbox';
        this.items = [];
        const { playMode, repeatRemainCount, showTagCloud, loop, isPlay, searchTerm, sortInAscending } = this.state;
        const { isFullSize, show } = this.props;

        return (
            <div className={`k-vidlib-pane${isFullSize ? ' k-max' : ''}`} style={{ display: show ? 'flex' : 'none' }}>
                {isFullSize && showTagCloud && (
                    <div className="k-tag-cloud-overlay">
                        <div className="k-tag-cloud">
                            <button className="k-tiny-close-button" onClick={e => this.setState({ showTagCloud: false })}>
                                <span className="icon icon-cancel-circled"></span>
                            </button>
                            <TagCloud
                                minSize={12}
                                maxSize={35}
                                tags={this.getTags()}
                                colorOptions={cloudOptions}
                                onClick={this.handleClickCloudTag}
                                className="k-tag-cloud-container"
                                renderer={cloudRenderer}
                            />
                        </div>
                    </div>
                )}
                <div className={`draggable ${toolbar}`} style={{ paddingLeft: isFullSize ? '75px' : '5px' }}>
                    {isFullSize ? (
                        <div style={{ position: 'absolute', top: 0, left: 3, width: 60, height: 20, marginTop: 14 }}>
                            {' '}
                            <WindowButtons />{' '}
                        </div>
                    ) : null}
                    <button className="k-control pull-left" onClick={this.handleClickToggleResize} style={{ color: '#a0a0a0' }}>
                        {isFullSize ? <FontAwesomeIcon icon={faAngleDoubleRight} /> : <FontAwesomeIcon icon={faAngleDoubleLeft} />}
                    </button>
                    <div style={{ width: isFullSize ? 595 : 360 }} className="pull-right">
                        {isFullSize ? (
                            <div style={{ width: 225, marginRight: 5, display: 'inline-block' }}>
                                <div style={{ width: '100%', display: 'flex', outline: 'none' }} tabIndex="0" onKeyDown={this.handleToolbarKeyDown}>
                                    <div className={toolbarButton} onClick={this.handleClickSort}>
                                        <span className={`icon ${sortInAscending ? 'icon-up' : 'icon-down'} in`} />
                                    </div>
                                    <div className={toolbarButton}>
                                        <span className={toolbarSeparator} />
                                    </div>
                                    <div className={toolbarButton} onClick={this.handleClickLoop}>
                                        <span className="icon icon-arrows-ccw" style={{ color: loop ? 'rgb(4, 117, 192)' : 'inherit' }} />
                                    </div>
                                    <div className={toolbarButton} onClick={this.handleClickNextPlayMode} title={i18n.t('next.play.mode')}>
                                        <span className={this.renderPlayModeIcon(playMode)}>
                                            {playMode === PlayMode.AUTO_REPEAT && <span className={loopCounter}> {`${repeatRemainCount}`}</span>}
                                        </span>
                                    </div>
                                    <div className={toolbarButton}>
                                        <span className={toolbarSeparator} />
                                    </div>
                                    <div className={toolbarButton} onClick={this.handleClickPrev}>
                                        <span className="icon icon-fast-backward" />
                                    </div>
                                    <div className={toolbarButton} onClick={this.handleClickPlay}>
                                        <span className={`icon ${isPlay ? ' icon-pause' : ' icon-play'}`} />
                                    </div>
                                    <div className={toolbarButton} onClick={this.handleClickNext}>
                                        <span className="icon icon-fast-forward" />
                                    </div>
                                    <div className={toolbarButton}>
                                        <span className={toolbarSeparator} />
                                    </div>
                                    <div className={toolbarButton} onClick={this.handleClickTagCloud} style={{ color: 'white' }}>
                                        <span className="icon icon-tag" />
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        <div style={{ width: 360, display: 'inline-block', position: 'relative' }} onKeyDown={this.handleKeyDown}>
                            <SearchInput
                                placeholder={i18n.t('search.word.or.tag')}
                                onChange={this.handleSearchUpdated}
                                value={searchTerm}
                                onClickClear={this.handleClickClear}
                            />
                            <Suggestions
                                ref={c => {
                                    this.suggestionsUI = c;
                                }}
                                listboxId={listboxId}
                                query={this.state.tagQuery}
                                expandable={this.state.suggestionExpandable}
                                suggestions={this.state.suggestions}
                                selectedIndex={this.state.selectedSuggestionIndex}
                                addTag={this.handleAddTag}
                            />
                        </div>
                    </div>
                </div>
                <div
                    className="k-vid-list not-draggable"
                    ref={ref => {
                        this.container = ref;
                    }}
                    onKeyDown={this.handleScrollKeyDown}
                    tabIndex="0"
                    style={{ outline: 'none' }}>
                    {!this.state.searchTerm && this.state.vidList.length === 0 ? (
                        <div className="k-word-pane-hint">
                            <ul>
                                <li dangerouslySetInnerHTML={{ __html: i18n.t('hint.clip.lib.1') }} />
                                <li dangerouslySetInnerHTML={{ __html: i18n.t('hint.clip.lib.2') }} />
                            </ul>
                        </div>
                    ) : (
                        this.state.vidList.map((itemInfo, i) => (
                            <VidItem
                                key={itemInfo.id}
                                vidInfo={itemInfo}
                                onClickTag={this.handleClickTag}
                                onDelete={this.props.onDeleteVid}
                                onPlay={this.handlePlayVidItem}
                                onClickVideo={this.handleClickVidItem}
                                onEnd={this.handleVidEnd}
                                speed={this.props.speed}
                                playMode={playMode}
                                index={i}
                                highlighted={i === this.state.currentVidIndex}
                                searchTermWords={this.state.query}
                                repeatRemainCount={this.state.repeatRemainCount}
                                repeatTotalCount={this.state.repeatTotalCount}
                                onResetRepeatRemainCount={this.handleResetRepeatRemainCount}
                                onDecreaseRepeatRemainCount={this.handleDecreaseRepeatRemainCount}
                                ref={ref => {
                                    if (ref) this.items.push(ref);
                                }}
                                {...this.props}
                            />
                        ))
                    )}
                </div>
                <div style={{ margin: 0, backgroundColor: 'rgb(40, 40, 40)', marginBlockStart: 0, marginBlockEnd: 0 }}>
                    <div style={{ display: 'inline-block', marginTop: 15, textAlign: 'center', width: '100%' }}>
                        <ReactPaginate
                            previousLabel={i18n.t('previous')}
                            nextLabel={i18n.t('next')}
                            breakLabel={'...'}
                            breakClassName={'break-me'}
                            pageCount={this.state.pageCount}
                            marginPagesDisplayed={2}
                            pageRangeDisplayed={5}
                            onPageChange={this.handlePageClick}
                            containerClassName={'k-vid-pagination'}
                            subContainerClassName={'pages pagination'}
                            activeClassName={'k-vid-active-page'}
                            ref={ref => {
                                this.paging = ref;
                            }}
                        />
                    </div>
                    <div
                        style={{
                            display: 'inline-block',
                            width: 100,
                            textAlign: 'right',
                            position: 'absolute',
                            right: 10,
                            paddingTop: 13,
                            color: 'gray'
                        }}>
                        {this.state.ids.length} {i18n.t('clips')}
                    </div>
                </div>
            </div>
        );
    }

    renderPlayModeIcon = playMode => {
        let icon;

        switch (playMode) {
            case PlayMode.NORMAL:
                icon = iconNormal;
                break;
            case PlayMode.AUTO_REPEAT:
                icon = iconAutoRepeat;
                break;
            case PlayMode.AUTO_PAUSE:
                icon = iconAutoPause;
                break;
        }
        return `byp-icon ${icon}`;
    };
}
