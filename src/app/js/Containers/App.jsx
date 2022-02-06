/* eslint-disable no-alert */

import React, { lazy, Suspense } from 'react';
import { remote, ipcRenderer, clipboard, shell } from 'electron';
import { ReactMPV } from 'mpv.js';
import path from 'path-extra';
import fs from 'fs-extra';
import key from 'keymaster';
import Modal from 'react-modal';
import getVideoId from 'get-video-id';
import sleep from 'sleep-promise';
import PlayMode from '../Model/PlayMode';
import WordNotifierComponent from '../Components/WordNotifier/WordNotifierComponent';
import SubtitlePane from '../Components/SubtitlePane.jsx';
import WordListPane from '../Components/WordListPane.jsx';
import WebPane from '../Components/WebPane.jsx';
import YouTubeBrowser from '../Components/YouTubeBrowser.jsx';
import VidLibPane from '../Components/VidLibPane.jsx';
import SettingsPane from '../Components/SettingsPane';
import SubControls from '../Components/SubControls.jsx';
import OpenMediaPane from '../Components/OpenMediaPane.jsx';
import MessagePane from '../Components/MessagePane.jsx';
import TitlePane from '../Components/TitlePane.jsx';
import TunerPane from '../Components/TunerPane.jsx';
import SwitchesPane from '../Components/SwitchesPane/SwitchesPane.jsx';
import ProgressPane from '../Components/ProgressPane.jsx';
import Dictionary from '../Model/Dictionary';
import WordBook from '../Model/WordBook';
import WebSearch from '../Model/WebSearch';
import Settings from '../Model/Settings';
import PlayerSubtitle from '../Components/PlayerSubtitle.jsx';
import PlayerControls from '../Components/PlayerControls.jsx';
import MessageDialog from '../Components/MessageDialog.jsx';
import PromptDialog from '../Components/PromptDialog.jsx';
import TagEditorDialog from '../Components/TagEditorDialog.jsx';
import DownloadSubtitleDialog from '../Components/DownloadSubtitleDialog.jsx';
import YouTubeIFramePlayer from '../Components/YouTubeIFramePlayer.jsx';
import Caption from '../Model/Caption';
import { subtitleExtractor } from '../Model/SubExtractor';
import { convertToSrt } from '../Model/FFmpegHelper';
import SubStore from '../Model/SubStore';
import VidLib from '../Model/VidLib';
import { Loader } from '../Components/Loader';
import { parseLinesFromFile, checkNeedUpgrade, doUpgrade, showGetFullVersion } from '../Model/KUtils';
import WindowButtons from '../Components/WindowButtons.jsx';
import WordDefinitionEditorPane from '../Components/WordDefintionEditorPane.jsx';
import './App.less';

const isDev = require('electron-is-dev');

const CLEAR_DELAY_MS = 6000;
const { Menu, MenuItem } = remote;
const i18n = remote.require('./i18n');

const waitFrame = () => new Promise(requestAnimationFrame);

const customDialogStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)'
    }
};

Modal.setAppElement('#app');

ipcRenderer.send('is-pro', PRO_VERSION);

class App extends React.Component {
    PLAYER_TYPE_NONE = 0;
    PLAYER_TYPE_MPV = 1;
    PLAYER_TYPE_YOUTUBE = 2;

    SP_SUB = 1;
    SP_WORD = 2;
    SP_WEB = 3;
    SP_YOUTUBE = 4;
    SP_VIDLIB = 5;

    SIDE_PANE_WIDTH_MIN = 405;
    SIDE_PANE_WIDTH_MAX = 490;

    constructor(props) {
        super(props);

        this.mpv = null;
        this.subtitlePane = null;
        this.playerSubtitle = null;
        this.secondaryPlayerSubtitle = null;
        this.playerControls = null;
        this.videoWidth = 0;
        this.videoHeight = 0;

        this.hidePlayerControlsTimer = -1;
        this.lastClick = 0;
        this.psbId = -1;

        if (PRO_VERSION) {
            this.YouTubePlayerMenu = new Menu();
            this.YouTubePlayerMenu.append(
                new MenuItem({
                    label: i18n.t('reload.video'),
                    click: () => {
                        const url = this.state.originalMovieUrl;
                        this.closeVideo(() => {
                            this.handlePromptUrlOk(url);
                        });
                    }
                })
            );
            this.YouTubePlayerMenu.append(
                new MenuItem({
                    label: i18n.t('copy.video.url'),
                    click: () => {
                        clipboard.writeText(this.state.originalMovieUrl);
                    }
                })
            );
            this.YouTubePlayerMenu.append(
                new MenuItem({
                    label: i18n.t('open.video.in.default.browser'),
                    click: () => {
                        shell.openExternal(this.state.originalMovieUrl);
                    }
                })
            );
            this.YouTubePlayerMenu.append(
                new MenuItem({
                    label: i18n.t('open.video.in.side.panel'),
                    click: () => {
                        this.setState(
                            {
                                sidePaneType: this.SP_YOUTUBE,
                                sidePaneWidth: this.SIDE_PANE_WIDTH_MAX,
                                isShowSidePane: true
                            },
                            () => {
                                this.youtubeBrowser.openUrl(this.state.originalMovieUrl);
                            }
                        );
                    }
                })
            );
        }

        this.MPVMenu = new Menu();
        this.MPVMenu.append(
            new MenuItem({
                label: i18n.t('reload.video'),
                click: () => {
                    this.reloadVideo();
                }
            })
        );

        this.state = {
            pause: true,
            duration: 0,
            speed: 1.0,
            maskHeight: 0,
            subtitles: ['None'],
            subtitleIndex: 0,
            secondarySubtitleIndex: 0,
            movieUrl: '',
            originalMovieUrl: '',
            title: '',
            lines: [],
            secondaryLines: [],
            externalLines: [],
            lineIndex: -1,
            prevLineIndex: -1,
            wordToLines: {},
            secondaryWordToLines: {},
            wordGroup: { words: [] },
            wordGroups: [],
            currentWordGroup: 0,
            showPlayerSubtitle: true,
            showSecondPlayerSubtitle: true,
            autoHidePlayerSubtitle: false,
            autoHideSecondPlayerSubtitle: false,
            showTuner: false,
            showSwitchesPane: false,
            sidePaneType: this.SP_SUB,
            sidePaneWidth: Settings.getSidePaneSubtitleSize() <= 2 ? this.SIDE_PANE_WIDTH_MIN : this.SIDE_PANE_WIDTH_MAX,
            showMediaPane: true,
            singleLineRepeatRemainCount: Settings.getSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT),
            singleLineRepeatTotalCount: Settings.getSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT),
            repeatingLineBeginIndex: -1,
            repeatingLineEndIndex: -1,
            isPlayerControlsVisible: true,
            showProgressPane: false,
            focusedWord: '',
            zoom: '100%',
            playerLeftOffset: 0,
            fullScreen: true,
            skipNoDialogueClips: false,
            playerType: this.PLAYER_TYPE_NONE,
            playMode: PlayMode.NORMAL,
            timeOffset: 0, // in seconds
            secondaryTimeOffset: 0,
            filterBySearchTerm: true,
            isShowSidePane: true,
            isYouTubeBrowserFullSize: false,
            isVidLibPaneFullSize: false,
            lang: 'en',
            secondaryLang: 'none',
            showWordDefEditor: false,
            isEditingWordDefinition: false,
            isTagEditorShow: false,
            isEditingTags: false,
            editingVid: '',
            vidTags: [],
            saveToVidLibBegin: -1,
            saveToVidLibEnd: -1,
            recentTags: [],
            webSourceIndex: 0
        };

        this.timePos = 0;
        this.aid = 1;

        this.messageDialog = null;
        this.resolveSubtitleDialogOpen;

        if (isDev) {
            key('⌘+option+i', function() {
                remote.getCurrentWebContents().toggleDevTools();
            });
        }
        key('esc', function() {
            remote.getCurrentWindow().setFullScreen(false);
        });

        key('a', this.handleFastBackward);
        key('d', this.handleFastForward);
        key('s', () => this.handleToggleRepeat());
        key('q', () => this.changePlayMode(PlayMode.NORMAL));
        key('w', () => this.changePlayMode(PlayMode.AUTO_REPEAT));
        key('e', () => this.changePlayMode(PlayMode.AUTO_PAUSE));

        WordBook.load(() => {
            setTimeout(() => {
                this.setState({
                    wordGroup: WordBook.getCurrentGroup(),
                    wordGroups: WordBook.getGroups(),
                    currentWordGroupIndex: WordBook.getCurrentGroupIndex()
                });
            }, 1000);
        });

        WebSearch.load();

        ipcRenderer.on('speed-up', () => this.setSpeed(this.state.speed + 0.25));
        ipcRenderer.on('speed-down', () => this.setSpeed(this.state.speed - 0.25));
        ipcRenderer.on('speed-reset', () => this.setSpeed(1.0));

        ipcRenderer.on('toggle-pause', () => {
            if (document.activeElement?.nodeName == 'INPUT') return;
            if (this.youtubeBrowser?.isFocusOnInput()) return;
            if (this.state.showWordDefEditor) return;

            this.playerSubtitle?.clearAutoPauseLine();
            this.togglePause();
        });
        ipcRenderer.on('fast-forward', this.handleFastForward);
        ipcRenderer.on('fast-backward', this.handleFastBackward);
        ipcRenderer.on('toggle-loop', () => {
            if (document.activeElement?.nodeName == 'INPUT') return;
            if (this.state.showWordDefEditor) return;
            this.handleToggleRepeat();
        });
        ipcRenderer.on('extend-loop-prev', () => {
            if (document.activeElement?.nodeName == 'INPUT') return;
            if (this.state.showWordDefEditor) return;
            this.handleChangeLoopRange(true, -1);
        });
        ipcRenderer.on('extend-loop-next', () => {
            if (document.activeElement?.nodeName == 'INPUT') return;
            if (this.state.showWordDefEditor) return;
            this.handleChangeLoopRange(false, 1);
        });
        ipcRenderer.on('shrink-loop-prev', () => {
            if (document.activeElement?.nodeName == 'INPUT') return;
            if (this.state.showWordDefEditor) return;
            this.handleChangeLoopRange(true, 1);
        });
        ipcRenderer.on('shrink-loop-next', () => {
            if (document.activeElement?.nodeName == 'INPUT') return;
            if (this.state.showWordDefEditor) return;
            this.handleChangeLoopRange(false, -1);
        });
        ipcRenderer.on('loop-times', (event, arg) => {
            if (document.activeElement?.nodeName == 'INPUT') return;
            if (this.state.showWordDefEditor) return;
            this.handleRepeatCurrentWithTimes(arg);
        });

        ipcRenderer.on('open-mru', this.handleOpenMRU);
        ipcRenderer.on('open-file', this.handleLoadMovieFile);
        ipcRenderer.on('open-url', this.handleLoadYoutubeVideo);

        ipcRenderer.on('toggle-full-screen', () => {
            const win = remote.getCurrentWindow();
            win.setFullScreen(!win.isFullScreen());
        });

        ipcRenderer.on('toggle-expand-view', this.handleClickFullScreen);
        ipcRenderer.on('toggle-side-bar', this.handleToggleSidePane);
        ipcRenderer.on('open-subtitle-pane', this.handleToggleSubtitlePane);
        ipcRenderer.on('open-word-pane', this.handleToggleWordListPane);
        ipcRenderer.on('open-vid-lib-pane', this.handleShowVidLibPane);
        ipcRenderer.on('open-web-pane', this.handleToggleWebPane);
        ipcRenderer.on('open-youtube-pane', this.handleShowYouTubeBrowser);
        ipcRenderer.on('download-subtitles', this.handleClickDownload);
        ipcRenderer.on('reveal-subtitles', async () => {
            const { movieUrl } = this.state;
            if (movieUrl.startsWith('http')) {
                const filePath = await this.refs.YouTubePlayer.downloadSubtitle();
                shell.openItem(path.dirname(filePath));
            } else {
                SubStore.revealSubtitleFolder(movieUrl);
            }
        });
        ipcRenderer.on('save-youtube-subtitle', async () => {
            const { movieUrl } = this.state;
            if (movieUrl.startsWith('http') && this.refs.YouTubePlayer) {
                await this.refs.YouTubePlayer.downloadSubtitle();
                // shell.openItem(path.dirname(filePath));
            }
        });
        ipcRenderer.on('clear-subtitles', () => {
            SubStore.clearSubtitles(this.state.movieUrl, () => {
                this.closeVideo();
            });
        });

        ipcRenderer.on('reveal-log-file', () => {
            const basePath = path.resolve(remote.app.getPath('userData'), '..', '..');
            const logPath = path.resolve(basePath, 'Logs', 'BeyondPlayer');
            if (fs.existsSync(logPath)) {
                shell.openItem(logPath);
            }
        });

        ipcRenderer.on('add-external-subtitle', this.handleAddExternalSubtitle);

        ipcRenderer.on('add-subtitle-shift', () => {
            this.handleChangeTimeOffset(this.state.timeOffset + 0.5);
        });

        ipcRenderer.on('reduce-subtitle-shift', () => {
            this.handleChangeTimeOffset(this.state.timeOffset - 0.5);
        });

        ipcRenderer.on('reset-subtitle-shift', () => {
            this.handleChangeTimeOffset(0);
        });

        ipcRenderer.on('toggle-subtitle', this.handleTogglePlayerSubtitle);
        ipcRenderer.on('toggle-second-subtitle', this.handleToggleSecondPlayerSubtitle);
        ipcRenderer.on('toggle-auto-hide-subtitle', event => {
            event.sender.send('change-auto-hide-player-subtitle', !this.state.autoHidePlayerSubtitle);
            this.handleToggleAutoHidePlayerSubtitle();
        });
        ipcRenderer.on('toggle-auto-hide-second-subtitle', event => {
            event.sender.send('change-auto-hide-second-player-subtitle', !this.state.autoHideSecondPlayerSubtitle);
            this.handleToggleAutoHideSecondPlayerSubtitle();
        });
        ipcRenderer.on('toggle-filter-by-search-term', this.handleToggleFilterBySearchTerm);

        ipcRenderer.on('open-file-with', (event, arg) => {
            this.openFile(arg);
        });

        ipcRenderer.on('open-url-with', (event, url) => {
            this.closeVideo(() => {
                if (url.indexOf('watch') != -1) {
                    this.handlePromptUrlOk(url);
                } else {
                    this.openYouTubePage(url);
                }
            });
        });

        ipcRenderer.on('copy-word-book', (event, arg) => {
            WordBook.copyToClipboard();
        });

        ipcRenderer.on('reveal-work-book-in-finder', (event, arg) => {
            WordBook.revealInFinder();
        });

        ipcRenderer.on('user-close', (event, arg) => {
            let answer;
            let forceQuit = arg;
            if (!forceQuit) {
                if (PRO_VERSION) {
                    answer = confirm(i18n.tf('do.you.really.want.to.close', 'BeyondPlayer Pro'));
                } else {
                    answer = confirm(i18n.tf('do.you.really.want.to.close', 'BeyondPlayer Lite'));
                }
            }
            if (answer || forceQuit) {
                this.saveTimePos(this.state.movieUrl);
                remote.getCurrentWindow().destroy();
            }
        });

        ipcRenderer.on('add-selection-to-word-book', event => {
            if (this.playerSubtitle) {
                var text = this.playerSubtitle.getSelectedText();
                if (text) {
                    this.handleAddWord(text);
                } else {
                    alert(i18n.t('how.to.add.word'));
                }
            }
        });
        ipcRenderer.on('annotate-selected-text', event => {
            if (this.playerSubtitle) {
                var text = this.playerSubtitle.getSelectedText();
                if (text) {
                    this.handleMarkWord(text);
                } else {
                    alert(i18n.t('how.to.annotate.word'));
                }
            }
        });
        ipcRenderer.on('annotate-from-web-pane', event => {
            if (this.webPane?.getSelectedText()) {
                this.webPane.addSelectionToWordDefinition();
            } else {
                alert(i18n.t('select.search.result.first'));
            }
        });
        ipcRenderer.on('search-selection-in-dictionary', event => {
            if (this.playerSubtitle) {
                var text = this.playerSubtitle.getSelectedText();
                if (text) {
                    this.handleOpenDictionary(text);
                } else {
                    alert(i18n.t('how.to.search.word'));
                }
            }
        });
        ipcRenderer.on('search-selection-in-web-dictionary', event => {
            if (this.playerSubtitle) {
                var text = this.playerSubtitle.getSelectedText();
                if (text) {
                    this.handleSearchWeb(text);
                } else {
                    alert(i18n.t('how.to.search.word'));
                }
            }
        });
        ipcRenderer.on('remove-selected-word', event => {
            if (this.wordListPane) {
                var text = this.wordListPane.getSelectedWord();
                if (text) {
                    this.wordListPane.handleRemoveWord(text);
                }
            }
        });
        ipcRenderer.on('reload', event => {
            this.reloadVideo();
        });

        ipcRenderer.on('port', (event, arg) => {
            this.port = arg;
        });

        ipcRenderer.on('toggle-skip-no-dialogue-clips', event => {
            this.handleClickToggleSkipNoDialogueClips();
        });

        ipcRenderer.on('get-full-version', event => {
            showGetFullVersion();
        });

        if (PRO_VERSION) {
            ipcRenderer.on('reload-youtube', event => {
                var url = this.state.movieUrl;
                this.closeVideo(() => {
                    this.handlePromptUrlOk(url);
                });
            });
            ipcRenderer.on('copy-youtube-url', event => {
                clipboard.writeText(this.state.movieUrl);
            });
            ipcRenderer.on('open-youtube-in-default-browser', event => {
                shell.openExternal(this.state.movieUrl);
            });
            ipcRenderer.on('open-youtube-in-side-panel', event => {
                this.setState(
                    {
                        sidePaneType: this.SP_YOUTUBE,
                        isShowSidePane: true
                    },
                    () => {
                        this.youtubeBrowser.openUrl(this.state.movieUrl);
                    }
                );
            });
            ipcRenderer.on('next-audio-track', (event, arg) => {
                this.nextAudioTrack(arg);
            });
            ipcRenderer.on('save-current-line', (event, arg) => {
                if (
                    this.state.movieUrl &&
                    !this.state.movieUrl.startsWith('http') &&
                    this.state.lineIndex != -1 &&
                    !this.state.isVidLibPaneFullSize
                ) {
                    this.pause(true);
                    if (this.state.repeatingLineBeginIndex !== -1 && this.state.repeatingLineEndIndex !== -1) {
                        this.handleSaveRepeatingLinesToVidLib();
                    } else {
                        this.handleSaveLineToVidLib(this.state.lineIndex);
                    }
                }
            });
            ipcRenderer.on('save-current-line-with-tags', (event, arg) => {
                if (
                    this.state.movieUrl &&
                    !this.state.movieUrl.startsWith('http') &&
                    this.state.lineIndex != -1 &&
                    !this.state.isVidLibPaneFullSize
                ) {
                    this.pause(true);
                    if (this.state.repeatingLineBeginIndex !== -1 && this.state.repeatingLineEndIndex !== -1) {
                        this.handleSaveRepeatingLinesToVidLib(true);
                    } else {
                        this.handleSaveLineToVidLib(this.state.lineIndex, true);
                    }
                }
            });

            ipcRenderer.on('next-video-clip', (event, arg) => {
                if (this.state.isVidLibPaneFullSize) {
                    this.vidLibPane.playNext();
                }
            });

            ipcRenderer.on('next-video-clip', (event, arg) => {
                if (this.state.isVidLibPaneFullSize) {
                    this.vidLibPane.playNext();
                }
            });
            ipcRenderer.on('prev-video-clip', (event, arg) => {
                if (this.state.isVidLibPaneFullSize) {
                    this.vidLibPane.playPrev();
                }
            });
            ipcRenderer.on('prev-page', (event, arg) => {
                if (this.state.isVidLibPaneFullSize) {
                    this.vidLibPane.prevPage();
                }
            });
            ipcRenderer.on('next-page', (event, arg) => {
                if (this.state.isVidLibPaneFullSize) {
                    this.vidLibPane.nextPage();
                }
            });

            ipcRenderer.on('export-clip-library', this.handleExportClipLibrary);
            ipcRenderer.on('import-clip-library', this.handleImportClipLibrary);
            ipcRenderer.on('export-anki-dialog', async () => {
                const ExportAnkiDialog = lazy(() => {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            const { ExportAnkiDialog } = require('../Components/ExportAnkiDialog');

                            resolve({ default: ExportAnkiDialog });
                        }, 0);
                    });
                });

                this.setState({ showAnkiDialog: true, AnkiExportAnkiDialog: ExportAnkiDialog });
            });
            ipcRenderer.on('export-word-book', this.handleExportWordBook);
            ipcRenderer.on('import-word-book', this.handleImportWordBook);

            ipcRenderer.on('switch-web-dict', (_, arg) => {
                this.pause(true);
                this.setState(
                    {
                        isShowSidePane: true,
                        isVidLibPaneFullSize: false,
                        sidePaneType: this.SP_WEB,
                        sidePaneWidth: this.SIDE_PANE_WIDTH_MAX
                    },
                    () => {
                        if (this.webPane.state.enabledSources.length > arg) {
                            this.setState(
                                {
                                    webSourceIndex: arg
                                },
                                () => {
                                    this.webPane.reload();
                                }
                            );
                        }
                    }
                );
            });
        }

        ipcRenderer.on('settings', (event, arg) => {
            this.handleOpenSettings();
        });

        ipcRenderer.on('player-subtitle-bigger', (event, arg) => {
            Settings.stepPlayerSubtitleSize(true);
            this.handleChangePlayerSubtitleSize();
            this.tunerPane?.updateSettings();
        });

        ipcRenderer.on('player-subtitle-smaller', (event, arg) => {
            Settings.stepPlayerSubtitleSize(false);
            this.handleChangePlayerSubtitleSize();
            this.tunerPane?.updateSettings();
        });

        if (!PRO_VERSION) {
            setTimeout(() => {
                showGetFullVersion();
            }, 2000);
        }

        ipcRenderer.send('app-ready', true);

        // observe resize
        this.playerResizeObserver = new ResizeObserver(_.debounce(this._handleResizePlayer, 200));

        // throttled handlers
        this.handleWheelThrottled = _.throttle(this.handleWheel, 1000, { trailing: false, leading: true });
        this.handlePlayerMouseMoveThrottled = _.throttle(this.handlePlayerMouseMove, 1000, { trailing: false, leading: true });
    }

    _handleResizePlayer = entries => {
        var resizeRect = entries[0].contentRect;
        this.handleResizePlayer(resizeRect);
    };

    componentDidUpdate(preProps, preState) {
        if (preState.isVidLibPaneFullSize != this.state.isVidLibPaneFullSize) {
            ipcRenderer.send('vid-lib-pane-fullsize-changed', this.state.isVidLibPaneFullSize);
        }
    }

    componentDidMount = () => {
        if (checkNeedUpgrade()) {
            this.upgrade();
        }
        this.playerResizeObserver.observe(this.playerContainer);
    };

    upgrade = async () => {
        alert(i18n.t('upgrade.notice'));
        await this.showMessage(i18n.t('upgrading.now'));
        await doUpgrade();
        this.hideMessageDialog();
        await new Promise(resolve => setTimeout(resolve, 500));
        alert(i18n.t('reboot.notice'));
        remote.getCurrentWindow().destroy();
    };

    waitMessageDialog = () =>
        new Promise((resolve, reject) => {
            this.resolveSubtitleDialogOpen = resolve;
        });

    closeVideo = callback => {
        this.setState(
            {
                playerType: this.PLAYER_TYPE_NONE,
                lines: [],
                secondaryLines: [],
                externalLines: [],
                wordToLines: {},
                lineIndex: -1,
                prevLineIndex: -1,
                subtitles: ['None'],
                movieUrl: '',
                duration: 0,
                lang: 'en',
                secondaryLang: 'none',
                title: ''
            },
            () => {
                this.mpv = null;
                ipcRenderer.send('enable-youtube-player', false);
                if (callback) callback();
            }
        );
    };

    handleOpenTutorial = () => {
        ipcRenderer.send('open-tutorial');
    };

    handleMPVReady = mpv => {
        this.mpv = mpv;
        this.mpv.property('sub', false);
        this.mpv.property('pause', this.state.pause);
        //this.mpv.property("hwdec", Settings.getSettings(Settings.SKEY_HWDD));
        //this.mpv.property('background', "#1E1E1E");
        //this.mpv.command('vf-add', "delogo=x=1:y=100:w=100:h=77:band=10");

        this.mpv.command('loadfile', this.state.movieUrl);

        //this.mpv.command('vf set', "flip");

        this.mpv.property('speed', this.state.speed);

        const observe = mpv.observe.bind(mpv);
        let properties = ['pause', 'time-pos', 'duration', 'eof-reached', 'dwidth', 'dheight', 'track-list/count', 'aid'];
        properties.forEach(observe);
    };

    observeTrackProperties(trackCount) {
        let props = [];
        for (let index = 0; index < trackCount; index++) {
            props.push(`track-list/${index}/id`);
            props.push(`track-list/${index}/type`);
            props.push(`track-list/${index}/title`);
        }
        const observe = this.mpv.observe.bind(this.mpv);
        props.forEach(observe);
    }

    handleYouTubePlayerProgress = progress => {
        this.updateTimePos(progress);
    };

    handleYouTubePlayerDuration = duration => {
        this.setState({ duration: duration });
    };

    handleYouTubePlayerTitle = title => {
        remote.getCurrentWindow().setTitle(title);
        this.setState({ title: title });
        this.showStatusMessage(`${title}`, 3000);
        //MRUFiles.add({url: this.state.movieUrl, title: title});
        //remote.app.addRecentDocument(this.state.movieUrl);
    };

    handleYouTubePlayerPause = v => {
        //this.setState({pause: v});
    };

    reloadVideo = () => {
        var url = this.state.movieUrl;
        this.pause(true);
        this.closeVideo(() => {
            if (url.startsWith('http')) {
                this.handlePromptUrlOk(this.state.originalMovieUrl);
            } else {
                this.timePos = 0;
                this.aid = 1;
                this.saveTimePos(url);
                this.openFile(url);
            }
        });
    };

    showLine(lineIndex, scroll) {
        if (scroll) {
            if (this.state.sidePaneType == this.SP_SUB && this.subtitlePane) {
                if (!this.isPause()) {
                    this.subtitlePane.scrollToSub(lineIndex);
                }
            }
        }
    }

    checkRepeatEnd = mst => {
        const { lines, repeatingLineBeginIndex, repeatingLineEndIndex } = this.state;

        const line = lines[repeatingLineEndIndex];
        if (line && mst >= line.end) {
            this.seekToLine(repeatingLineBeginIndex, false);
            return true;
        }
        return false;
    };

    updateTimePos(value) {
        if (this.seeking) return;

        const {
            playMode,
            speed,
            lines,
            lineIndex,
            timeOffset,
            secondaryTimeOffset,
            singleLineRepeatRemainCount,
            singleLineRepeatTotalCount
        } = this.state;

        this.timePos = value;
        const mst = (value + timeOffset) * 1000;
        const secondaryMst = (value + secondaryTimeOffset) * 1000;

        this.playerControls?.setTimeBarValue(value);

        if (lines.length > 0) {
            switch (playMode) {
                case PlayMode.NORMAL: {
                    if (this.checkRepeatEnd(mst)) return;
                    break;
                }
                case PlayMode.AUTO_PAUSE: {
                    if (lineIndex !== -1 && this.autoPauseLineIndex !== lineIndex) {
                        const line = lines[lineIndex];
                        if (mst >= line.end) {
                            this.autoPauseLineIndex = lineIndex;
                            this.autoPause(true);
                            this.playerSubtitle?.setAutoPauseLine(this.autoPauseLineIndex);
                            this.setTimePos((line.end - 45) / 1000);
                            return;
                        }
                    } else {
                        if (this.checkRepeatEnd(mst)) {
                            delete this.autoPauseLineIndex;
                        }
                    }
                    break;
                }
                case PlayMode.AUTO_REPEAT: {
                    if (lineIndex !== -1 && lineIndex !== this.autoRepeatLineIndex) {
                        const line = lines[lineIndex];
                        if (mst >= line.end) {
                            if (singleLineRepeatRemainCount <= 1) {
                                this.autoRepeatLineIndex = lineIndex;
                                this.setState({
                                    singleLineRepeatRemainCount: singleLineRepeatTotalCount
                                });
                            } else {
                                this.seekToLine(lineIndex);
                                this.setState(state => {
                                    return { singleLineRepeatRemainCount: state.singleLineRepeatRemainCount - 1 };
                                });
                            }
                            return;
                        }
                    }

                    if (this.checkRepeatEnd(mst)) return;

                    break;
                }
                default:
                    break;
            }
        }

        if (this.state.skipNoDialogueClips && lines.length > 0) {
            const line = lines[lineIndex];
            if (line && mst >= line.end) {
                if (lineIndex < lines.length - 1) {
                    const nextLine = lines[lineIndex + 1];
                    if (nextLine.start - mst > 2000) {
                        this.seekToLine(lineIndex + 1, true);
                        return;
                    }
                }
            }
        }
        this.seekLineToTime(mst);
        this.seekSecondaryLineToTime(secondaryMst);
    }

    handlePropertyChange = (name, value) => {
        if (name === 'time-pos') {
            this.updateTimePos(value);
        } else if (name === 'eof-reached' && value) {
            this.mpv.property('time-pos', 0);
        } else if (name === 'dheight') {
            this.videoHeight = value;
            var domRect = this.playerContainer.getBoundingClientRect();
            this.handleResizePlayer(domRect);
        } else if (name === 'dwidth') {
            this.videoWidth = value;
            var domRect = this.playerContainer.getBoundingClientRect();
            this.handleResizePlayer(domRect);
        } else if (name === 'duration') {
            //this.mpv.property('vf', "delogo=x=1:y=300:w=1000:h=187:band=10");
            //this.mpv.property('vf', "scale=iw/4:ih/4,scale=4*iw:4*ih:flags=neighbor");
            //this.mpv.property('vf', "select='gt(scene\,0.4)',scale=160:120");
            this.setState({ duration: value }, () => {
                setTimeout(() => {
                    let timePosObj = SubStore.getLocalTimePos(this.state.movieUrl);
                    this.setTimePos(timePosObj.timePos);
                    this.pause(false);
                }, 100);
            });
        } else if (name === 'track-list/count') {
            this.tracks = [];
            this.observeTrackProperties(value);
        } else if (name === 'aid') {
            this.aid = value;
        } else if (name.startsWith('track-list')) {
            this.processTrackProperty(name, value);
        } else {
            this.setState({ [name]: value });
        }
    };

    seekLineToTime(mst) {
        let lineIndex = _.findLastIndex(this.state.lines, item => {
            return item.start <= mst && mst <= item.end + CLEAR_DELAY_MS;
        });

        if (lineIndex !== -1) {
            if (lineIndex !== this.state.lineIndex) {
                this.setState({ lineIndex: lineIndex, prevLineIndex: -1 }, () => {
                    this.showLine(this.state.lineIndex, true);
                    this.playerSubtitle?.setLine(this.state.lineIndex);
                });
            }
        } else {
            if (this.state.lineIndex != -1) {
                this.setState({ lineIndex: -1, prevLineIndex: this.state.lineIndex });
                this.playerSubtitle?.clearLine();
            }
        }
    }

    seekSecondaryLineToTime(mst) {
        let lineIndex = _.findLastIndex(this.state.secondaryLines, item => {
            return item.start <= mst && mst <= item.end + CLEAR_DELAY_MS;
        });

        if (lineIndex !== -1) {
            if (lineIndex !== this.state.secondaryLineIndex) {
                this.setState({ secondaryLineIndex: lineIndex }, () => {
                    this.secondaryPlayerSubtitle.setLine(this.state.secondaryLineIndex);
                });
            }
        } else {
            if (this.state.secondaryLineIndex != -1) {
                this.setState({ secondaryLineIndex: -1 });
                this.secondaryPlayerSubtitle.clearLine();
            }
        }
    }

    handleChangeTimeOffset = v => {
        this.setState(
            {
                timeOffset: v
            },
            () => {
                this.seekLineToTime((this.state.timeOffset + this.timePos) * 1000);
                this.showStatusMessage(i18n.tf('message.set.time.shift', this.state.timeOffset), 2000);
            }
        );
    };

    handleChangeSecondaryTimeOffset = v => {
        this.setState(
            {
                secondaryTimeOffset: v
            },
            () => {
                this.seekSecondaryLineToTime((this.state.secondaryTimeOffset + this.timePos) * 1000);
                this.showStatusMessage(i18n.tf('message.set.second.time.shift', this.state.secondaryTimeOffset), 2000);
            }
        );
    };

    togglePause = e => {
        if (e?.stopPropagation) e.stopPropagation();
        if (this.state.showWordDefEditor) return;

        this.setState(state => {
            return { pause: !state.pause };
        }, this.onPauseChanged);
    };

    isPause() {
        return this.state.pause;
    }

    pause(v) {
        this.setState(
            {
                pause: v
            },
            this.onPauseChanged
        );
    }

    autoPause(v) {
        this.setState({ pause: v }, () => {
            if (this.state.playerType === this.PLAYER_TYPE_MPV && this.mpv) {
                this.mpv.property('pause', this.state.pause);
            }
        });
    }

    onPauseChanged = () => {
        if (this.state.playerType == this.PLAYER_TYPE_MPV && this.mpv) {
            this.mpv.property('pause', this.state.pause);
        }
        if (this.state.pause) {
            this.showPlayerControlsAndHideClearTimer();
        } else {
            this.delayHidePlayerControls();
        }

        ipcRenderer.send('change-pause', this.state.pause);

        /*
        if (remote.powerSaveBlocker) {
            if (this.state.playerType != this.PM_NONE) {
                if (!this.state.pause) {
                    this.psbId = remote.powerSaveBlocker.start('prevent-display-sleep');
                } else {
                    if (this.psbId != -1) {
                        remote.powerSaveBlocker.stop(this.psbId);
                        this.psbId = -1;
                    }
                }
            } else {
                if (this.psbId != -1) {
                    remote.powerSaveBlocker.stop(this.psbId);
                    this.psbId = -1;
                }
            }
        }*/
    };

    showPlayerControlsAndHideClearTimer() {
        clearTimeout(this.hidePlayerControlsTimer);
        this.hidePlayerControlsTimer = -1;
        this.showPlayerControls();
    }

    delayHidePlayerControls() {
        if (!this.state.showTuner && !this.state.showSwitchesPane) {
            clearTimeout(this.hidePlayerControlsTimer);
            this.hidePlayerControlsTimer = setTimeout(() => {
                this.hidePlayerControls();
            }, 5000);
        }
    }

    showPlayerControls() {
        this.setState({ isPlayerControlsVisible: true });
    }

    hidePlayerControls = () => {
        this.setState({ isPlayerControlsVisible: false, showTuner: false, showSwitchesPane: false });
    };

    handleContainerClick = e => {
        if (e && this.playerControls?.containsElement(e.target)) return;
        if (e && this.playerSubtitle?.containsElement(e.target)) return;
        if (e && this.tunerPane?.containsElement(e.target)) return;
        if (e && this.switchesPane?.containsElement(e.target)) return;

        this.playerSubtitle?.clearAutoPauseLine();

        if (this.state.playerType == this.PLAYER_TYPE_MPV) {
            this.showPlayerControlsAndHideClearTimer();
            this.delayHidePlayerControls();
            this.togglePause();
        }

        if (this.state.showMediaPane && this.state.movieUrl) {
            e.stopPropagation();
            this.setState({
                showMediaPane: false
            });
        }
    };

    handlePlayerDoubleClick = e => {
        e.stopPropagation();
        if (e.clientY < 20) {
            var win = remote.getCurrentWindow();
            win.setFullScreen(!win.isFullScreen());
        } else {
            this.handleToggleRepeat();
        }
    };

    handlePlayerMouseMove = e => {
        if (!this.state.isPlayerControlsVisible) {
            this.showPlayerControls();
            this.delayHidePlayerControls();
        }
    };

    handlePlayerClick = e => {
        this.setState({ showTuner: false, showSwitchesPane: false });

        if (this.startPos) {
            if (e.screenX == this.startPos[0] && e.screenY == this.startPos[1]) {
                this.togglePause();
            }
        }
    };

    handlePlayerMouseUp = e => {
        if (e.button != 0) return;

        this.handlePlayerClick(e);

        var now = Date.now();
        if (now - this.lastClick < 300) {
            this.handlePlayerDoubleClick(e);
        }
        this.lastClick = now;
    };

    handlePlayerMouseDown = e => {
        if (e.button != 0) return;
        this.startPos = [e.screenX, e.screenY];
    };

    enableDelogo(v) {
        if (this.state.playerType == this.PLAYER_TYPE_MPV) {
            try {
                if (v && this.state.maskHeight > 0) {
                    var w = this.videoWidth - 10;
                    var h = Math.round((this.videoHeight * this.state.maskHeight) / 100);
                    var y = this.videoHeight - h - 2;
                    this.mpv.property('vf', `delogo=x=1:y=${y}:w=${w}:h=${h}`);
                } else {
                    this.mpv.property('vf', '');
                }
            } catch (e) {}
        }
    }

    handleResizePlayer = rect => {
        if (PRO_VERSION) {
            this.vidLibPane?.resize();
        }
        if (this.videoHeight == 0 || this.videoWidth == 0) return;

        this.enableDelogo(true);
        this.resizePlayerSubtitleSize(rect);
        this.notification.resize();
    };

    resizePlayerSubtitleSize = rect => {
        let playerRatio = rect.height / rect.width;
        let videoRatio = this.videoHeight / this.videoWidth;
        let realVideoWidth;

        if (playerRatio > videoRatio && this.state.fullScreen) {
            let zoom = playerRatio / videoRatio;
            let offset = (rect.width * (zoom - 1)) / 2.0;

            let zoomStr = Math.round(zoom * 100) + '%';

            let offsetStr = -offset;
            this.setState({ zoom: zoomStr, playerLeftOffset: offsetStr });
            realVideoWidth = rect.width;
        } else {
            let zoomStr = '100%';
            let offsetStr = 0;
            this.setState({ zoom: zoomStr, playerLeftOffset: offsetStr });
            realVideoWidth = rect.width;
        }

        this.playerSubtitle?.setFontSizeByPaneWidth(realVideoWidth);
        this.secondaryPlayerSubtitle?.setFontSizeByPaneWidth(realVideoWidth);
    };

    handleSeekMouseDown = () => {
        this.seeking = true;
        this.stopRepeating();
    };

    handleSeek = v => {
        const timePos = +v;
        this.setTimePos(timePos);
        this.stopRepeating();
    };

    handleChangeSpeed = v => {
        this.setSpeed(v);
    };

    setSpeed(speed) {
        if (speed < 0 || speed > 2) return;

        this.setState(
            {
                speed
            },
            () => {
                if (this.state.playerType == this.PLAYER_TYPE_MPV) {
                    this.mpv.property('speed', speed);
                } else if (this.state.playerType == this.PLAYER_TYPE_YOUTUBE) {
                    this.refs.YouTubePlayer.setSpeed(speed);
                }
                this.showStatusMessage(i18n.tf('message.set.speed', speed), 2000);
            }
        );
    }

    handleChangeMaskHeight = v => {
        this.setState(
            {
                maskHeight: v
            },
            () => {
                var domRect = this.playerContainer.getBoundingClientRect();
                this.handleResizePlayer(domRect);
            }
        );
    };

    handleChangePlayerSubtitleSize = () => {
        var rect = this.playerContainer.getBoundingClientRect();
        this.resizePlayerSubtitleSize(rect);
    };

    handleChangeSidePaneSubtitleSize = v => {
        this.setState(
            {
                sidePaneWidth: Settings.getSidePaneSubtitleSize() <= 2 ? this.SIDE_PANE_WIDTH_MIN : this.SIDE_PANE_WIDTH_MAX
            },
            () => {
                this.subtitlePane?.updateSubtitleFontSize();
            }
        );
    };

    // seconds
    setTimePos(value) {
        if (this.state.playerType == this.PLAYER_TYPE_MPV) {
            this.mpv?.property('time-pos', value);
        } else {
            this.refs.YouTubePlayer?.seek(value);
        }
    }

    seekToLine(index, scroll, callback) {
        const { lines, timeOffset } = this.state;
        const line = lines[index];

        if (line) {
            const time = (line.start + 10) / 1000 - timeOffset;

            this.seeking = true;

            setTimeout(() => {
                this.seeking = false;
            }, 200);

            this.setState({ lineIndex: index, prevLineIndex: -1 }, () => {
                this.playerSubtitle.setLine(index);
                this.seekSecondaryLineToTime(time * 1000);
                this.showLine(index, scroll);
                this.setTimePos(time);
                if (callback) callback();
            });
        } else if (callback) callback();
    }

    handleSeekMouseUp = () => {
        this.seeking = false;
    };

    handleFast = (e, isForward) => {
        if (e?.stopPropagation) e.stopPropagation();

        const { lines, lineIndex, isVidLibPaneFullSize, showMediaPane, movieUrl, repeatingLineBeginIndex, repeatingLineEndIndex } = this.state;

        if (isVidLibPaneFullSize) {
            if (isForward) this.vidLibPane.nextLine();
            else this.vidLibPane.prevLine();
        } else {
            if (showMediaPane) return;
            if (!movieUrl) return;

            if (lines.length === 0) {
                this.setTimePos(this.timePos + (isForward ? 5.0 : -5.0));
            } else {
                if (isForward) {
                    if (lineIndex === lines.length - 1) return;
                } else if (lineIndex === 0) return;

                if (repeatingLineBeginIndex !== -1 && repeatingLineBeginIndex === repeatingLineEndIndex) {
                    this.stopRepeating(() => {
                        if (isForward) {
                            this.seekToLine(lineIndex + 1, true);
                        } else {
                            this.seekToLine(lineIndex - 1, true);
                        }
                    });
                } else if (
                    repeatingLineBeginIndex !== -1 &&
                    ((isForward && repeatingLineEndIndex === lineIndex) || (!isForward && repeatingLineBeginIndex === lineIndex))
                ) {
                    if (Settings.getSettings(Settings.SKEY_PWFF)) {
                        this.pause(true);
                    }
                    this.seekToLine(isForward ? repeatingLineBeginIndex : repeatingLineEndIndex, true);
                } else {
                    if (lineIndex === -1) {
                        const newLineIndex = _.findLastIndex(lines, item => {
                            return item.start <= this.timePos * 1000;
                        });
                        if (newLineIndex !== -1) {
                            this.seekToLine(newLineIndex + (isForward ? 1 : -1), true);
                        }
                    } else {
                        this.seekToLine(lineIndex + (isForward ? 1 : -1), true);
                    }

                    if (Settings.getSettings(Settings.SKEY_PWFF)) {
                        this.pause(true);
                    }
                }
            }
        }
    };

    handleFastForward = e => {
        this.handleFast(e, true);
    };

    handleFastBackward = e => {
        this.handleFast(e, false);
    };

    handleClickFullScreen = e => {
        if (e?.stopPropagation) e.stopPropagation();
        this.setState(
            prev => ({ fullScreen: !prev.fullScreen }),
            () => {
                const domRect = this.playerContainer.getBoundingClientRect();
                this.handleResizePlayer(domRect);
                this.showStatusMessage(i18n.tf('message.fit.video.to.window.height', this.state.fullScreen ? 'On' : 'Off'), 2000);
            }
        );
    };

    handleClickToggleSkipNoDialogueClips = e => {
        if (e?.stopPropagation) e.stopPropagation();

        this.setState(
            prev => ({ skipNoDialogueClips: !prev.skipNoDialogueClips }),
            () => {
                ipcRenderer.send('change-skip-no-dialogue-clips', this.state.skipNoDialogueClips);
                this.showStatusMessage(i18n.tf('message.skip.no.dialogue.clips', this.state.skipNoDialogueClips ? 'On' : 'Off'), 2000);
            }
        );
    };

    handleChangeLoopRange = (isLeft, delta) => {
        if (!this.state.movieUrl) return;
        if (this.state.lines.length === 0) return;
        if (this.state.lineIndex === -1) return;

        const { repeatingLineBeginIndex, repeatingLineEndIndex } = this.state;

        if (repeatingLineBeginIndex !== -1) {
            if (isLeft) {
                const newLeft = repeatingLineBeginIndex + delta;
                if (newLeft >= 0 && newLeft < this.state.lines.length && newLeft <= repeatingLineEndIndex) {
                    this.startRepeating(newLeft, repeatingLineEndIndex);
                }
            } else {
                let newRight = repeatingLineEndIndex + delta;
                if (newRight >= 0 && newRight < this.state.lines.length && newRight >= repeatingLineBeginIndex) {
                    this.startRepeating(repeatingLineBeginIndex, newRight);
                }
            }
        } else {
            if (isLeft) {
                if (delta < 0) {
                    let newLeft = this.state.lineIndex + delta;
                    if (newLeft >= 0) {
                        this.startRepeating(newLeft, this.state.lineIndex);
                    }
                }
            } else {
                if (delta > 0) {
                    let newRight = this.state.lineIndex + delta;
                    if (newRight < this.state.lines.length) {
                        this.startRepeating(this.state.lineIndex, newRight);
                    }
                }
            }
        }
    };

    showPlayModeChangeMessage = playMode => {
        const messageKey = `change.to.play.mode.${playMode}`;
        this.showStatusMessage(i18n.t(messageKey), 2000);
    };

    changePlayMode = playMode => {
        if (this.state.isVidLibPaneFullSize) {
            this.vidLibPane.changePlayMode(playMode);
        } else {
            if (this.state.playMode != playMode) {
                this.setState({ playMode });
                this.showPlayModeChangeMessage(playMode);
            }
        }
    };

    handleNextPlayMode = () => {
        this.setState(
            state => {
                return { playMode: (state.playMode + 1) % 3 };
            },
            () => {
                const { playMode, repeatingLineBeginIndex, repeatingLineEndIndex } = this.state;
                /*if (playMode === PlayMode.AUTO_REPEAT) {
                    if (repeatingLineBeginIndex !== -1 && repeatingLineBeginIndex === repeatingLineEndIndex) {
                        this.stopRepeating();
                    }
                }*/
                this.showPlayModeChangeMessage(playMode);
            }
        );
    };

    handleToggleRepeat = e => {
        if (e?.stopPropagation) e.stopPropagation();

        if (this.state.isVidLibPaneFullSize) {
            this.vidLibPane.toggleLoop();
        } else {
            if (!this.state.movieUrl) return;
            if (this.state.lines.length == 0) return;
            if (this.state.lineIndex == -1) return;

            const { repeatingLineBeginIndex } = this.state;

            if (repeatingLineBeginIndex === -1) {
                this.startRepeating(this.state.lineIndex, this.state.lineIndex);
                this.pause(false);
                this.seekToLine(this.state.lineIndex, false);
            } else {
                this.stopRepeating();
            }
        }
    };

    handleRepeatCurrentWithTimes = times => {
        Settings.setSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT, times);

        if (this.state.isVidLibPaneFullSize) {
            this.vidLibPane?.resetRepeatTimes();
        } else {
            this.setState({
                singleLineRepeatTotalCount: times,
                singleLineRepeatRemainCount: times,
                playMode: PlayMode.AUTO_REPEAT
            });
        }
    };

    handleClearRepeat = () => {
        this.stopRepeating();
    };

    handleRepeatLines = (start, end) => {
        this.startRepeating(start, end, () => {
            this.seekToLine(start, false, () => {
                this.pause(false);
            });
        });
    };

    downloadSubtitles = async (queryString, languages, limit) => {
        const ENGLISH = 'eng';

        this.pause(true);

        console.log('downloadSubtitles');

        this.showStatusMessage(i18n.t('message.start.downloading'));

        let langStr;

        if (languages.length == 0) {
            langStr = ENGLISH;
        } else {
            langStr = languages.join(' ');
        }

        let successCount = 0;
        let beforeDownloadSubCount = this.state.subtitles.length - 1;

        try {
            let subtitles = await Caption.searchByQuery(queryString, langStr, limit);

            this.showStatusMessage(i18n.tf('message.downloading.from.sources', subtitles.length));

            console.log(subtitles);

            let storePath = SubStore.getStorePath(this.state.movieUrl);

            let firstError = true;
            //for (let sub of subtitles) {
            for (var i = 0; i < subtitles.length; i++) {
                var message = i18n.tf('message.downloading.progress', i + 1, subtitles.length);
                this.showStatusMessage(message);
                let sub = subtitles[i];
                let srcFilePath = path.join(storePath, sub.name);
                if (!srcFilePath.toLocaleLowerCase().endsWith('srt')) {
                    srcFilePath = srcFilePath + '.srt';
                }
                console.log('start downloading from ' + sub.downloadUrl);
                console.log('download to ' + srcFilePath);
                try {
                    await Caption.download(sub, sub.source, srcFilePath);
                    await sleep(1000);
                    successCount++;
                    if (i == 0 && beforeDownloadSubCount == 0) {
                        let subs = SubStore.getLocalSubtitles(this.state.movieUrl);
                        if (subs.length > 1) {
                            this.setState({ subtitles: subs }, () => {
                                this.selectSubtitle(1);
                            });
                        }
                    }
                } catch (e) {
                    if (firstError) {
                        this.hideStatusMessage();
                        remote.dialog.showMessageBox(remote.getCurrentWindow(), {
                            message: i18n.tf('messagebox.download.from.source.errors', sub.source, e && e.message),
                            buttons: ['OK']
                        });
                        firstError = false;
                    }
                }
            }

            if (subtitles.length == 0) {
                alert(i18n.t('alert.subtitle.not.found'));
            }
        } catch (e) {
            remote.dialog.showMessageBox(remote.getCurrentWindow(), {
                message: i18n.t('messagebox.download.error') + e,
                buttons: ['OK']
            });
        } finally {
            this.hideStatusMessage();
            let subs = SubStore.getLocalSubtitles(this.state.movieUrl);
            if (subs.length > 1) {
                let subtitleFile;
                if (this.state.subtitleIndex != 0) {
                    subtitleFile = this.state.subtitles[this.state.subtitleIndex];
                }
                let secondSubtitleFile;
                if (this.state.secondarySubtitleIndex != 0) {
                    secondSubtitleFile = this.state.subtitles[this.state.secondarySubtitleIndex];
                }
                this.setState({ subtitles: subs }, () => {
                    if (subtitleFile) {
                        var index = this.state.subtitles.findIndex(s => path.basename(s) === path.basename(subtitleFile));
                        if (index != -1) {
                            this.selectSubtitle(index);
                        }
                    }
                    if (secondSubtitleFile) {
                        var index = this.state.subtitles.findIndex(s => path.basename(s) === path.basename(secondSubtitleFile));
                        if (index != -1) {
                            this.selectSecondarySubtitle(index);
                        }
                    }
                    if (!(successCount == 1 && beforeDownloadSubCount == 0)) {
                        alert(i18n.t('alert.download.finished'));
                    }
                });
            }
        }
    };

    selectSubtitle(index, callback) {
        if (index === 0) {
            this.setState({ lines: [], subtitleIndex: 0, wordToLines: {} }, callback);
        } else {
            let subFile = this.state.subtitles[index];
            let lines = parseLinesFromFile(subFile);
            var wordToLines = this.buildWordToLines(lines);
            this.setState({ lines: lines, subtitleIndex: index, wordToLines: wordToLines }, callback);
        }
    }

    selectSecondarySubtitle(index, callback) {
        if (index === 0) {
            this.setState({ secondaryLines: [], secondarySubtitleIndex: 0, secondaryWordToLines: {} }, callback);
        } else {
            let subFile = this.state.subtitles[index];
            let lines = parseLinesFromFile(subFile);
            var wordToLines = this.buildWordToLines(lines);
            this.setState({ secondaryLines: lines, secondarySubtitleIndex: index, secondaryWordToLines: wordToLines }, callback);
        }
    }

    buildWordToLines(lines) {
        let dict = {};
        lines.forEach((line, index) => {
            line.sentences.forEach(words => {
                words.forEach(word => {
                    let list;
                    if (dict.hasOwnProperty(word)) {
                        list = dict[word];
                    }
                    if (!list) {
                        list = [];
                        dict[word] = list;
                    }
                    if (!list.includes(index)) {
                        list.push(index);
                    }
                });
            });
        });
        return dict;
    }

    getSubtitleNames = () => {
        let r = { subtitle: '', secondSubtitle: '' };
        if (this.state.subtitleIndex != 0 && this.state.subtitleIndex < this.state.subtitles.length) {
            r.subtitle = path.basename(this.state.subtitles[this.state.subtitleIndex]);
        }
        if (this.state.secondarySubtitleIndex != 0 && this.state.secondarySubtitleIndex < this.state.subtitles.length) {
            r.secondSubtitle = path.basename(this.state.subtitles[this.state.secondarySubtitleIndex]);
        }
        return r;
    };

    saveTimePos(movieUrl) {
        if (movieUrl && !movieUrl.startsWith('http')) {
            var { subtitle, secondSubtitle } = this.getSubtitleNames();
            SubStore.saveTimePos(movieUrl, this.timePos, this.state.timeOffset, this.state.secondaryTimeOffset, subtitle, secondSubtitle);
        }
    }

    playFile(movieUrl, selectFirst) {
        this.saveTimePos(this.state.movieUrl);

        var subs = SubStore.getLocalSubtitles(movieUrl);

        this.setState(
            {
                movieUrl,
                lines: [],
                secondaryLines: [],
                wordToLines: {},
                // playMode: PlayMode.NORMAL,
                lineIndex: -1,
                prevLineIndex: -1,
                repeatingLineBeginIndex: -1,
                repeatingLineEndIndex: -1,
                subtitles: subs,
                playerType: this.PLAYER_TYPE_MPV,
                secondaryWordToLines: {},
                subtitleIndex: 0,
                secondarySubtitleIndex: 0,
                timeOffset: 0,
                secondaryTimeOffset: 0
            },
            () => {
                let timePosObj = SubStore.getLocalTimePos(this.state.movieUrl);
                if (this.state.subtitles.length > 1) {
                    if (selectFirst) {
                        this.selectSubtitle(1);
                    } else {
                        var index = this.state.subtitles.findIndex(el => {
                            return path.basename(el) == timePosObj.subtitle;
                        });
                        if (index != -1) {
                            this.selectSubtitle(index, this.setState({ timeOffset: timePosObj.timeOffset }));
                        } else {
                            this.selectSubtitle(1);
                        }

                        var secondIndex = this.state.subtitles.findIndex(el => {
                            return path.basename(el) == timePosObj.secondSubtitle;
                        });

                        if (secondIndex != -1) {
                            this.selectSecondarySubtitle(secondIndex, this.setState({ secondaryTimeOffset: timePosObj.secondTimeOffset }));
                        } else {
                            this.selectSecondarySubtitle(0);
                        }
                    }

                    if (this.state.sidePaneType == this.SP_SUB && this.subtitlePane) {
                        this.subtitlePane.showSettings(false);
                    }
                } else {
                    if (this.state.sidePaneType == this.SP_SUB && this.subtitlePane) {
                        this.subtitlePane.showSettings(true);
                    }
                }

                this.playerSubtitle.clearLine();
                this.secondaryPlayerSubtitle.clearLine();
            }
        );

        this.videoHeight = 0;
        this.videoWidth = 0;
        if (this.mpv) {
            this.enableDelogo(false);
            this.mpv.command('loadfile', movieUrl);
        }
        this.setState({ showMediaPane: false });

        if (!movieUrl.startsWith('http')) {
            remote.app.addRecentDocument(movieUrl);
        }
    }

    handleLoadMovieFile = async e => {
        var win = remote.getCurrentWindow();
        win.setMaximizable(false);
        win.setFullScreenable(false);

        const items = remote.dialog.showOpenDialog(remote.getCurrentWindow(), { filters: [{ name: 'Videos' }] });
        if (items) {
            let movieFile = items[0];
            await this.openFile(movieFile);
        }
        //win.setFullScreenable(true);

        win.setMaximizable(true);
        win.setFullScreenable(true);
    };

    handleLoadYoutubeVideo = () => {
        this.setState({
            isUrlPromptShow: true
        });
    };

    handleAddExternalSubtitle = async e => {
        e?.target?.blur();

        if (!this.state.movieUrl) return;

        const win = remote.getCurrentWindow();
        win.setMaximizable(false);
        win.setFullScreenable(false);

        const items = remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
            filters: [{ name: 'Subtitles', extensions: ['srt', 'lrc', 'ass', 'ssa'] }]
        });
        if (items) {
            let subtitleFile = items[0];
            const ext = path.extname(subtitleFile).toLowerCase();
            if (ext === '.ass' || ext === '.ssa') {
                subtitleFile = await convertToSrt(subtitleFile);
            }

            if (subtitleFile) {
                if (this.state.movieUrl.startsWith('http')) {
                    this.readExternalSubtitle(subtitleFile);
                } else {
                    this.openSubtitleFile(subtitleFile);
                }
            } else {
                alert(i18n.t('unable.to.parse.subtitle.file'));
            }
        }

        win.setMaximizable(true);
        win.setFullScreenable(true);
    };

    handleOpenMRU = () => {
        this.pause(true);
        this.setState({ showMediaPane: !this.state.showMediaPane });
    };

    openFile = async openedFile => {
        this.pause(true);
        ipcRenderer.send('enable-youtube-player', false);
        remote.getCurrentWindow().setTitle(openedFile);
        this.setState({ title: path.basename(openedFile), isYouTube: false });
        const ext = path.extname(openedFile).toLowerCase();

        let mediaFile = openedFile;

        if (ext === '.srt' || ext === '.lrc' || ext === '.ass' || ext === '.ssa') {
            // subtitle
            if (ext === '.ass' || ext === '.ssa') {
                mediaFile = await convertToSrt(mediaFile);
                if (!mediaFile) {
                    alert(i18n.t('unable.to.parse.subtitle.file'));
                    return;
                }
            }
            const { playerType } = this.state;
            if (playerType === this.PLAYER_TYPE_MPV) {
                this.openSubtitleFile(mediaFile);
            } else {
                this.readExternalSubtitle(mediaFile);
            }
        } else {
            // movie file
            const storePath = SubStore.getStorePath(mediaFile);
            if (!fs.existsSync(storePath)) {
                SubStore.createStoreFolder(mediaFile);
                this.readSubtitlesFromFile(mediaFile);
                this.playFile(mediaFile, true);
            } else {
                this.playFile(mediaFile, false);
            }
        }
    };

    readExternalSubtitle(subFile) {
        const lines = parseLinesFromFile(subFile);
        this.setState(
            {
                externalLines: lines
            },
            () => {
                this.handleChangeLang('external');
                if (this.state.secondaryLang == 'external') {
                    this.handleChangeSecondaryLang(this.state.secondaryLang);
                }
            }
        );
    }

    openSubtitleFile(subtitleFile) {
        SubStore.addExternalSubtitle(this.state.movieUrl, subtitleFile);
        let subs = SubStore.getLocalSubtitles(this.state.movieUrl);
        if (subs.length > 1) {
            this.setState({ subtitles: subs }, () => {
                var index = this.state.subtitles.findIndex(s => path.basename(s) === path.basename(subtitleFile));
                if (index != -1) {
                    this.selectSubtitle(index);
                } else {
                    this.selectSubtitle(subs.length - 1);
                }
            });
        }
    }

    showMessage = async message => {
        this.setState({ isMessageDialogShow: true });
        await this.waitMessageDialog();
        this.messageDialog.message.innerText = message;
    };

    hideMessageDialog() {
        this.setState({ isMessageDialogShow: false });
    }

    async readSubtitlesFromFile(movieFile) {
        this.showStatusMessage(i18n.t('extracting.subtitles'));
        await subtitleExtractor(movieFile, SubStore.getStorePath(movieFile), (item, index) => {
            if (index === 0) {
                // load the first subtitle
                const subtitles = SubStore.getLocalSubtitles(this.state.movieUrl);
                this.setState({ subtitles }, () => this.selectSubtitle(1));
            }
        });
        await waitFrame();
        const subtitles = SubStore.getLocalSubtitles(this.state.movieUrl);
        if (subtitles.length > 1) {
            this.showStatusMessage(i18n.tf('extracted.n.subtitles', subtitles.length - 1), 2000);
            if (subtitles.length > 2) {
                this.setState({ subtitles });
            }
        } else {
            this.showStatusMessage(i18n.t('no.text.subtitle.found'), 3000);
        }
    }

    handleClickWord = (word, target) => {
        if (!word) return;
        word = word.trim();

        Dictionary.pronounce(word);

        if (Settings.getSettings(Settings.SKEY_CWB) == Settings.CWB_POPUP_DIC) {
            remote.getCurrentWindow().showDefinitionForSelection();
        } else if (Settings.getSettings(Settings.SKEY_CWB) == Settings.CWB_WEB_DIC) {
            this.handleSearchWeb(word);
        } else if (Settings.getSettings(Settings.SKEY_CWB) == Settings.CWB_EXT_DIC) {
            Dictionary.showDicWindow(word);
        }
        setTimeout(() => {
            this.pause(true);
        }, 10);
    };

    handleOpenDictionary = word => {
        if (!word) return;

        Dictionary.pronounce(word);
        Dictionary.showDicWindow(word);
    };

    handleClickWordOnWordBook = (word, target) => {
        this.handleClickWord(word, target);
    };

    handleClickDownload = () => {
        if (!this.state.movieUrl) return;

        this.pause(true);
        this.setState({ isDownloadPromptShow: true });
    };

    handleClickLine = lineIndex => {
        if (lineIndex >= this.state.repeatingLineBeginIndex && lineIndex <= this.state.repeatingLineEndIndex) {
        } else {
            this.stopRepeating();
        }

        delete this.autoPauseLineIndex;
        delete this.autoRepeatLineIndex;

        const loopCount = Settings.getSettings(Settings.SKEY_SINGLE_LINE_LOOP_COUNT);
        this.setState({ singleLineRepeatRemainCount: loopCount });
        this.seekToLine(lineIndex, false);
    };

    handleClickLineOnWordBook = lineIndex => {
        this.changePlayMode(PlayMode.NORMAL);
        this.seekToLine(lineIndex, false);
        this.startRepeating(lineIndex, lineIndex);
    };

    handleSubtitlePaneDoubleClickLine = lineIndex => {
        this.startRepeating(lineIndex, lineIndex);
    };

    startRepeating = (startIndex, endIndex, callback) => {
        this.setState(
            {
                repeatingLineBeginIndex: startIndex,
                repeatingLineEndIndex: endIndex
            },
            callback
        );
    };

    stopRepeating = callback => {
        this.setState(
            {
                repeatingLineBeginIndex: -1,
                repeatingLineEndIndex: -1
            },
            callback
        );
    };

    showStatusMessage = (message, time) => {
        this.refs.messagePane.showMessage(message, time);
    };

    hideStatusMessage = () => {
        this.refs.messagePane.hide();
    };

    handleAddWord = word => {
        if (!word) return;

        this.showStatusMessage(i18n.tf('message.word.added', word), 2000);
        WordBook.add(word);
        this.setState({ wordGroup: WordBook.getCurrentGroup() });
    };

    handleMarkWord = word => {
        if (!word) return;

        this.pause(true);

        Dictionary.lookup(word, str => {
            this.setState({
                showWordDefEditor: true,
                isEditingWordDefinition: false,
                wordForMark: word,
                wordDefinition: str
            });
        });
    };

    handleAfterWordDefEditorShow = () => {};

    showWordNotification = word => {
        var def = WordBook.getWordDefinition(word);
        return this.notification.addNotification({
            word: word,
            definition: def
        });
    };

    updateWordNotification = word => {
        var def = WordBook.getWordDefinition(word);
        return this.notification.updateNotification({
            word: word,
            definition: def
        });
    };

    handleStartFilterSubtitle = term => {
        this.pause(true);
    };

    handleSearchWeb = word => {
        if (!word) return;

        this.setState(
            {
                isShowSidePane: true,
                isVidLibPaneFullSize: false,
                sidePaneType: this.SP_WEB,
                sidePaneWidth: this.SIDE_PANE_WIDTH_MAX
            },
            () => {
                this.webPane.search(word);
            }
        );
    };

    handleSearchVidLib = word => {
        if (!word) return;

        this.setState(
            {
                isShowSidePane: true,
                sidePaneType: this.SP_VIDLIB,
                sidePaneWidth: this.SIDE_PANE_WIDTH_MIN
            },
            () => {
                this.vidLibPane.search(word);
            }
        );
    };

    handleRenameWordList = () => {
        if (WordBook.getCurrentGroupIndex() == 0) {
            //alert(i18n.t("You can not rename the default word list."));
            alert(i18n.t('alert.you.can.not.rename.the.default.word.list'));
        } else {
            this.pause(true);
            this.setState({
                isWordListPromptShow: true,
                isCreateWordList: false
            });
        }
    };

    handleChangeCurrentWordList = newListIndex => {
        WordBook.changeCurrentGroupIndex(newListIndex);

        this.setState({
            currentWordGroupIndex: newListIndex,
            wordGroup: WordBook.getCurrentGroup()
        });
    };

    handleNewWordList = () => {
        this.pause(true);
        this.setState({
            isWordListPromptShow: true,
            isCreateWordList: true
        });
    };

    handleDeleteWordList = () => {
        if (WordBook.getCurrentGroupIndex() == 0) {
            alert(i18n.t('alert.you.can.not.delete.the.default.word.list'));
        } else {
            var answer = confirm(i18n.t('confirm.delete.word.list'));
            if (answer) {
                WordBook.removeCurrentGroup();
                this.setState({
                    wordGroup: WordBook.getCurrentGroup(),
                    wordGroups: WordBook.getGroups(),
                    currentWordGroupIndex: WordBook.getCurrentGroupIndex()
                });
            }
        }
    };

    handlePlayerSubtitleSelectWords = () => {
        this.pause(true);
    };

    handlePlayerSubtitleClickNothing = () => {
        this.togglePause();
    };

    handleShowWords = words => {
        if (Settings.getSettings(Settings.SKEY_DWN) && words.length > 0) {
            const existsWords = WordBook.retrieveWordsHaveDefinition(words);

            existsWords.forEach(word => {
                this.showWordNotification(word);
            });

            return existsWords;
        }

        return [];
    };

    handleRemoveWord = word => {
        WordBook.remove(word);
        this.setState({ wordGroup: WordBook.getCurrentGroup() });
    };

    handleSelectSubtitle = index => {
        this.selectSubtitle(index);
    };

    handleSelectSecondarySubtitle = index => {
        this.selectSecondarySubtitle(index);
    };

    handleToggleSidePane = e => {
        if (e?.stopPropagation) e.stopPropagation();

        if (!this.state.isShowSidePane) {
            this.setState({ isShowSidePane: true }, () => {
                if (this.subtitlePane) {
                    this.subtitlePane.forceUpdate();
                    if (this.state.lineIndex != -1) {
                        this.subtitlePane.scrollToSub(this.state.lineIndex);
                    } else if (this.state.prevLineIndex != -1) {
                        this.subtitlePane.scrollToSub(this.state.prevLineIndex);
                    }
                }
            });
        } else {
            this.setState({
                isShowSidePane: false,
                isVidLibPaneFullSize: false,
                isYouTubeBrowserFullSize: false
            });
        }
    };

    handleShowYouTubeBrowser = () => {
        this.setState({
            sidePaneType: this.SP_YOUTUBE,
            sidePaneWidth: this.SIDE_PANE_WIDTH_MAX,
            isShowSidePane: true,
            isVidLibPaneFullSize: false
        });
    };

    handleShowVidLibPane = () => {
        if (PRO_VERSION) {
            this.setState({
                sidePaneType: this.SP_VIDLIB,
                sidePaneWidth: this.SIDE_PANE_WIDTH_MIN,
                isShowSidePane: true
            });
        }
    };

    handleToggleSubtitlePane = () => {
        if (this.state.sidePaneType == this.SP_SUB && this.state.isShowSidePane) {
        } else {
            this.setState(
                {
                    sidePaneType: this.SP_SUB,
                    sidePaneWidth: Settings.getSidePaneSubtitleSize() <= 2 ? this.SIDE_PANE_WIDTH_MIN : this.SIDE_PANE_WIDTH_MAX,
                    isShowSidePane: true,
                    isVidLibPaneFullSize: false
                },
                () => {
                    this.subtitlePane.forceUpdate();
                    if (this.state.lineIndex != -1) {
                        this.subtitlePane.scrollToSub(this.state.lineIndex);
                    } else if (this.state.prevLineIndex != -1) {
                        this.subtitlePane.scrollToSub(this.state.prevLineIndex);
                    }
                }
            );
        }
    };

    handleToggleWordListPane = () => {
        if (PRO_VERSION) {
            this.setState({
                sidePaneType: this.SP_WORD,
                sidePaneWidth: Settings.getSidePaneSubtitleSize() <= 2 ? this.SIDE_PANE_WIDTH_MIN : this.SIDE_PANE_WIDTH_MAX,
                isShowSidePane: true,
                isVidLibPaneFullSize: false
            });
        }
    };

    handleToggleWebPane = () => {
        this.setState({
            sidePaneType: this.SP_WEB,
            sidePaneWidth: this.SIDE_PANE_WIDTH_MAX,
            isShowSidePane: true,
            isVidLibPaneFullSize: false
        });
    };

    handleTogglePlayerSubtitle = () => {
        this.setState(
            {
                showPlayerSubtitle: !this.state.showPlayerSubtitle
            },
            () => {
                this.showStatusMessage(i18n.tf('message.toggle.subtitle', this.state.showPlayerSubtitle ? i18n.t('on') : i18n.t('off')), 2000);
            }
        );
    };

    handleToggleSecondPlayerSubtitle = () => {
        this.setState(
            {
                showSecondPlayerSubtitle: !this.state.showSecondPlayerSubtitle
            },
            () => {
                this.showStatusMessage(
                    i18n.tf('message.toggle.second.subtitle', this.state.showSecondPlayerSubtitle ? i18n.t('on') : i18n.t('off')),
                    2000
                );
            }
        );
    };

    handleToggleAutoHidePlayerSubtitle = () => {
        this.setState(
            {
                autoHidePlayerSubtitle: !this.state.autoHidePlayerSubtitle
            },
            () => {
                if (this.state.autoHidePlayerSubtitle) {
                    this.playerSubtitle.clearLine();
                }
                this.showStatusMessage(
                    i18n.tf('message.toggle.auto.hide.subtitle', this.state.autoHidePlayerSubtitle ? i18n.t('on') : i18n.t('off')),
                    2000
                );
            }
        );
    };

    handleToggleAutoHideSecondPlayerSubtitle = () => {
        this.setState(
            {
                autoHideSecondPlayerSubtitle: !this.state.autoHideSecondPlayerSubtitle
            },
            () => {
                if (this.state.autoHideSecondPlayerSubtitle) {
                    this.secondaryPlayerSubtitle.clearLine();
                }
                this.showStatusMessage(
                    i18n.tf('message.toggle.auto.hide.second.subtitle', this.state.autoHideSecondPlayerSubtitle ? i18n.t('on') : i18n.t('off')),
                    2000
                );
            }
        );
    };

    handleToggleTuner = e => {
        if (e?.stopPropagation) e.stopPropagation();
        this.setState(prev => ({ showTuner: !prev.showTuner, showSwitchesPane: false }));
    };

    handleToggleSwitchesPane = e => {
        if (e?.stopPropagation) e.stopPropagation();
        this.setState(prev => ({ showSwitchesPane: !prev.showSwitchesPane, showTuner: false }));
    };

    getLine(lineIndex) {
        if (this.state.lines.length > 0 && lineIndex >= 0) {
            return this.state.lines[lineIndex];
        }
        return null;
    }

    handleAfterSubtitleDialogOpen = async () => {
        await waitFrame();
        if (this.resolveSubtitleDialogOpen) {
            this.resolveSubtitleDialogOpen();
            this.resolveSubtitleDialogOpen = null;
        }
    };

    handleWheel = e => {
        if (e.deltaY < 0) {
            this.handleFastForward();
        } else if (e.deltaY > 0) {
            this.handleFastBackward();
        }
    };

    processTrackProperty = (name, value) => {
        // track-list/{n}/(type/id/title)
        var tokens = name.split('/');
        var track = this.getTrack(tokens[1]);
        switch (tokens[2]) {
            case 'id':
                track.id = value;
                break;
            case 'type':
                track.type = value;
                break;
            case 'title':
                track.title = value;
                break;
        }
    };

    getTrack = key => {
        if (!(key in this.tracks)) {
            this.tracks[key] = {};
        }
        return this.tracks[key];
    };

    handlePromptUrlOk = (url, useOtherMethod) => {
        //if (true || !useOtherMethod && Settings.getSettings(Settings.SKEY_YT_PM) == Settings.YT_PM_IFRAME_API) {
        if (true) {
            this.updateTimePos(0);
            this.setState(
                {
                    playerType: this.PLAYER_TYPE_YOUTUBE,
                    isYouTubeBrowserFullSize: false,
                    isUrlPromptShow: false,
                    isYouTube: true,
                    originalMovieUrl: url,
                    movieUrl: url,
                    showMediaPane: false,
                    pause: false,
                    lines: [],
                    secondaryLines: [],
                    externalLines: [],
                    wordToLines: {},
                    subtitles: ['None'],
                    // playMode: PlayMode.NORMAL,
                    lineIndex: -1,
                    prevLineIndex: -1,
                    repeatingLineBeginIndex: -1,
                    repeatingLineEndIndex: -1,
                    timeOffset: 0,
                    duration: 0,
                    secondaryTimeOffset: 0,
                    title: '',
                    lang: 'en',
                    secondaryLang: 'none'
                },
                () => {
                    this.mpv = null;
                    //MRUFiles.add({url: url, title: ""});
                    remote.getCurrentWindow().setTitle(this.state.movieUrl);
                    this.setState({ title: '' });
                    this.playerSubtitle.clearLine();
                    this.secondaryPlayerSubtitle.clearLine();
                    ipcRenderer.send('enable-youtube-player', true);
                }
            );
        } else {
            /*
            this.timePos = 0;
            this.setState( {
                isUrlPromptShow: false,
                isYouTube: true,
                showMediaPane: false,
                originalMovieUrl: url,
                showProgressPane: true,
            }, () => {
                this.pause(true);
                ytdl.getInfo(url, (error, info) => {
                    //console.log(error);
                    //console.log(info)
                    this.setState( { showProgressPane: false });
                    if (error) {
                        alert(error);
                    } else {
                        ipcRenderer.send("enable-youtube-player", true);
                        var fmts = info.formats.slice(0, 5);
                        var quality = Settings.getSettings(Settings.SKEY_YT_PQ);
                        var fmt = fmts.find((f)=>f.resolution == quality);
                        if (!fmt) fmt = fmts[0];
                        this.playFile(fmt.url, true);
                        YoutubeSubtitle.getCCFromId(getVideoId(url).id, "en", (lines) =>
                        {
                            this.handleYouTubeLinesReady(lines);
                        })
                    }
                })
            });
            */
        }
    };

    handleYouTubePlayerReady = () => {
        this.videoHeight = 720;
        this.videoWidth = 1280;

        var domRect = this.playerContainer.getBoundingClientRect();
        this.handleResizePlayer(domRect);

        var speed = this.state.speed;
        this.refs.YouTubePlayer.setSpeed(speed);
    };

    handleYouTubePlayerError = () => {
        var r = confirm(
            'This YouTube video can not be played with the default YouTube playback method, would you like to temporarily play it with the other playback method?'
        );
        if (r) {
            this.closeVideo(() => {
                this.handlePromptUrlOk(this.state.originalMovieUrl, true);
            });
        }
    };

    handlePlayerContextMenu = e => {
        if (this.state.isYouTube) {
            this.YouTubePlayerMenu.popup({ x: e.clientX, y: e.clientY });
        } else {
            this.MPVMenu.popup({ x: e.clientX, y: e.clientY });
        }
    };

    handleYouTubeLinesReady = lines => {
        var wordToLines = this.buildWordToLines(lines);
        this.setState({ lines: lines, wordToLines: wordToLines });
    };

    handleYouTubeSecondaryLinesReady = lines => {
        var wordToLines = this.buildWordToLines(lines);
        this.setState({ secondaryLines: lines, secondaryWordToLines: wordToLines });
    };

    handlePromptUrlCancel = e => {
        this.setState({ isUrlPromptShow: false });
    };

    handleClickYouTubeVideo = url => {
        if (this.state.isYouTubeBrowserFullSize) {
            this.closeVideo(() => {
                this.setState({ isYouTubeBrowserFullSize: false }, () => {
                    this.handlePromptUrlOk(url);
                });
            });
        } else {
            this.handlePromptUrlOk(url);
        }
    };

    handleClickYouTubeBrowserFullSize = () => {
        this.setState(
            {
                isYouTubeBrowserFullSize: !this.state.isYouTubeBrowserFullSize
            },
            () => {
                this.pause(true);
                var win = remote.getCurrentWindow();
                //win.setWindowButtonVisibility(true);
            }
        );
    };

    handleClickVidLibPaneFullSize = callback => {
        this.setState(
            {
                isVidLibPaneFullSize: !this.state.isVidLibPaneFullSize
            },
            () => {
                this.pause(true);
                if (callback) callback();
            }
        );
    };

    handleDrop = e => {
        var url = e.dataTransfer.getData('URL');
        if (url) {
            if (PRO_VERSION) {
                this.handlePromptUrlOk(url);
            } else {
                alert(i18n.t('alert.open.youtube.is.not.supported.by.lite'));
            }
        } else {
            this.openFile(e.dataTransfer.files[0].path);
        }
    };

    handleDropFile = file => {
        this.openFile(file);
    };

    handleDropUrl = url => {
        this.handlePromptUrlOk(url);
    };

    handleGotCCList = ccList => {
        this.subtitlePane?.setCCList(ccList);
    };

    handleSyncTimeToLine = index => {
        var line = this.state.lines[index];
        this.setState(
            {
                timeOffset: line.start / 1000 - this.timePos,
                // playMode: PlayMode.NORMAL,
                repeatingLineBeginIndex: -1,
                repeatingLineEndIndex: -1
            },
            () => {
                this.seekLineToTime((this.state.timeOffset + this.timePos) * 1000);
                //this.seekSecondaryLineToTime((this.state.timeOffset + this.timePos)*1000);
            }
        );
    };

    handleContextMenuOnSubtitlePane = e => {
        this.pause(true);
    };

    handleSubtitlePaneSelectStart = () => {
        this.pause(true);
    };

    handleSubtitlePanePressSpace = () => {
        this.togglePause();
    };

    handleChangeLang = lang => {
        if (lang == 'external') {
            this.setState({ lang: lang });
            this.handleYouTubeLinesReady(this.state.externalLines);
        } else {
            if (this.refs.YouTubePlayer?.isBaseLangReady()) {
                this.setState({ lang: lang });
                this.refs.YouTubePlayer.changeLang(lang);
            }
        }
    };

    handleChangeSecondaryLang = lang => {
        if (lang == 'external') {
            this.setState({ secondaryLang: lang });
            this.handleYouTubeSecondaryLinesReady(this.state.externalLines);
        } else {
            if (this.refs.YouTubePlayer?.isBaseLangReady()) {
                this.setState({ secondaryLang: lang });
                this.refs.YouTubePlayer.changeSecondaryLang(lang);
            }
        }
    };

    handleToggleFilterBySearchTerm = () => {
        this.setState({
            filterBySearchTerm: !this.state.filterBySearchTerm
        });
    };

    getDefaultUrl = () => {
        var urlInClipboard = clipboard.readText();
        if (getVideoId(urlInClipboard).id) {
            return urlInClipboard;
        } else {
            return 'https://youtu.be/UqU19dR0bFE';
        }
    };

    handlePromptDownloadOk = (queryString, languages, limit) => {
        this.downloadSubtitles(queryString, languages, limit);
        this.setState({ isDownloadPromptShow: false });
    };

    handlePromptDownloadCancel = queryString => {
        this.setState({ isDownloadPromptShow: false });
    };

    handlePromptWordListOk = wordListName => {
        this.setState({ isWordListPromptShow: false });

        var trimmed = wordListName.trim();
        if (_.isEmpty(trimmed)) {
            //alert("Word list name can not be empty.");
            alert(i18n.t('alert.word.list.name.can.not.be.empty'));
        } else {
            if (this.state.isCreateWordList) {
                WordBook.createNewWordList(trimmed);
            } else {
                WordBook.renameCurrentWordList(trimmed);
            }
            this.setState({
                wordGroups: WordBook.getGroups(),
                wordGroup: WordBook.getCurrentGroup(),
                currentWordGroupIndex: WordBook.getCurrentGroupIndex()
            });
        }
    };

    handleTagEditorOK = tags => {
        const MAX_RECENT = 5;

        let set = new Set(this.state.recentTags);
        tags.forEach(tag => {
            set.add(tag);
        });
        let newRecentTags = Array.from(set);
        const delCount = newRecentTags.length - MAX_RECENT;
        if (delCount > 0) {
            newRecentTags.splice(0, delCount);
        }
        this.setState({ isTagEditorShow: false, vidTags: tags, recentTags: newRecentTags }, () => {
            if (this.state.isEditingTags) {
                this.saveTagsToVidLib();
                this.setState({
                    isEditingTags: false
                });
            } else {
                this.saveLinesToVidLib();
            }
        });
    };

    handleTagEditorCancel = () => {
        this.setState({ isTagEditorShow: false, isEditingTags: false });
    };

    handleCloseSettings = () => {
        this.setState({ isSettingsShow: false });
    };

    handlePromptWordListCancel = wordListName => {
        this.setState({ isWordListPromptShow: false });
    };

    handleWordDefEditorOK = (word, definition) => {
        this.setState({ showWordDefEditor: false });
        WordBook.addWordDefinition(word, definition);
        var hasWord = this.playerSubtitle.isDisplayingWord(word);
        if (hasWord) {
            this.showWordNotification(word);
        } else {
            this.showStatusMessage(i18n.tf('message.word.added', word), 2000);
        }
    };

    handleAddWordDefinition = (word, definition) => {
        this.setState({
            showWordDefEditor: true,
            isEditingWordDefinition: false,
            wordForMark: word,
            wordDefinition: definition
        });
    };

    handleSwitchWebSource = (index, callback) => {
        this.setState({ webSourceIndex: index }, callback);
    };

    handleWordDefEditorCancel = () => {
        this.setState({ showWordDefEditor: false });
    };

    handleDeleteWordDefinition = word => {
        WordBook.removeWordDefinition(word);
        this.notification.removeNotification(word);
        this.setState({ showWordDefEditor: false });
    };

    handleEditWordDefinition = word => {
        this.pause(true);

        var definition = WordBook.getWordDefinition(word);
        this.setState({
            showWordDefEditor: true,
            isEditingWordDefinition: true,
            wordForMark: word,
            wordDefinition: definition
        });
    };

    handleSaveLineToVidLib = async (index, useLastTags) => {
        if (useLastTags) {
            this.setState(
                {
                    saveToVidLibBegin: index,
                    saveToVidLibEnd: index
                },
                () => {
                    this.saveLinesToVidLib();
                }
            );
        } else {
            this.setState({
                isTagEditorShow: true,
                //vidTags: [],
                saveToVidLibBegin: index,
                saveToVidLibEnd: index
            });
        }
    };

    handleSaveRepeatingLinesToVidLib = async useLastTags => {
        if (useLastTags) {
            this.setState(
                {
                    saveToVidLibBegin: this.state.repeatingLineBeginIndex,
                    saveToVidLibEnd: this.state.repeatingLineEndIndex
                },
                () => {
                    this.saveLinesToVidLib();
                }
            );
        } else {
            this.setState({
                isTagEditorShow: true,
                //vidTags: [],
                saveToVidLibBegin: this.state.repeatingLineBeginIndex,
                saveToVidLibEnd: this.state.repeatingLineEndIndex
            });
        }
    };

    handleEditVidTags = (id, tags) => {
        this.setState({
            isTagEditorShow: true,
            isEditingTags: true,
            vidTags: tags,
            editingVid: id
        });
    };

    handleDeleteVid = id => {
        VidLib.removeVid(id);
        this.vidLibPane.refreshCurrentPage();
    };

    saveLinesToVidLib = async () => {
        this.showStatusMessage(i18n.t('saving.selected.lines.as.movie.clip'));
        await VidLib.saveToLib({
            vidPath: this.state.movieUrl,
            lines: this.state.lines,
            lines2: this.state.secondaryLines,
            startIndex: this.state.saveToVidLibBegin,
            endIndex: this.state.saveToVidLibEnd,
            timeOffsetMs: this.state.timeOffset * 1000,
            tags: this.state.vidTags,
            aid: this.aid
        });
        this.showStatusMessage(i18n.t('saving.movie.clip.done'), 2000);
        this.vidLibPane.refreshCurrentPage();
    };

    saveTagsToVidLib = () => {
        VidLib.updateVidTags(this.state.editingVid, this.state.vidTags);
        this.vidLibPane.updateTags(this.state.editingVid, this.state.vidTags);
    };

    nextAudioTrack = next => {
        if (this.mpv != null) {
            //this.mpv.property("aid", false);
            var audioTracks = this.tracks.filter(track => track.type === 'audio'); //.sort((l,r)=> { return l.id.localeCompare(r.id)});
            if (audioTracks.length > 1) {
                var indexOf = audioTracks.findIndex(e => {
                    return parseInt(e.id) == parseInt(this.aid);
                });
                let newIndex;
                if (next) {
                    newIndex = (indexOf + 1) % audioTracks.length;
                } else {
                    if (indexOf == 0) {
                        newIndex = audioTracks.length - 1;
                    } else {
                        newIndex = indexOf - 1;
                    }
                }
                var track = audioTracks[newIndex];
                this.mpv.property('aid', track.id);
                this.refs.messagePane.showMessage(i18n.tf('audio.track', audioTracks[newIndex].title), 2000);
            }
        }
    };

    handleOpenSettings = () => {
        this.pause(true);
        if (PRO_VERSION) {
            this.vidLibPane.changeIsPlay(false);
        }
        this.setState({
            isSettingsShow: true
        });
    };

    handleImportClipLibrary = async () => {
        var win = remote.getCurrentWindow();
        win.setMaximizable(false);
        win.setFullScreenable(false);

        const items = remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory'] });
        if (items) {
            await this.showMessage(i18n.t('importing.clip.library'));
            await VidLib.import(items[0]);
            this.hideMessageDialog();
            win.setMaximizable(true);
            win.setFullScreenable(true);
            alert(i18n.t('importing.done'));

            this.vidLibPane?.refreshCurrentPage();
        } else {
            win.setMaximizable(true);
            win.setFullScreenable(true);
        }
    };

    handleExportClipLibrary = async () => {
        var win = remote.getCurrentWindow();
        win.setMaximizable(false);
        win.setFullScreenable(false);

        const folder = remote.dialog.showSaveDialog(remote.getCurrentWindow(), { defaultPath: 'beyondplayer.cliplib' });
        if (folder) {
            await this.showMessage(i18n.t('exporting.clip.library'));
            await VidLib.export(folder);
            this.hideMessageDialog();
            win.setMaximizable(true);
            win.setFullScreenable(true);
            alert(i18n.t('exporting.done'));
        } else {
            win.setMaximizable(true);
            win.setFullScreenable(true);
        }
    };

    handleImportWordBook = async () => {
        var win = remote.getCurrentWindow();
        win.setMaximizable(false);
        win.setFullScreenable(false);

        const items = remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory'] });
        if (items) {
            await this.showMessage(i18n.t('importing.word.book'));
            await WordBook.import(items[0]);
            this.hideMessageDialog();
            win.setMaximizable(true);
            win.setFullScreenable(true);
            alert(i18n.t('importing.done'));
        } else {
            win.setMaximizable(true);
            win.setFullScreenable(true);
        }

        this.setState({
            wordGroups: WordBook.getGroups(),
            wordGroup: WordBook.getCurrentGroup(),
            currentWordGroupIndex: WordBook.getCurrentGroupIndex()
        });
    };

    handlePlayerSubtitleStyleChanged = () => {
        this.playerSubtitle?.updateFontStyle();
        this.secondaryPlayerSubtitle?.updateFontStyle();
    };

    handleExportWordBook = async () => {
        var win = remote.getCurrentWindow();
        win.setMaximizable(false);
        win.setFullScreenable(false);

        const folder = remote.dialog.showSaveDialog(remote.getCurrentWindow(), { defaultPath: 'beyondplayer.wordbook' });
        if (folder) {
            await this.showMessage(i18n.t('exporting.word.book'));
            await WordBook.export(folder);
            this.hideMessageDialog();
            win.setMaximizable(true);
            win.setFullScreenable(true);
            alert(i18n.t('exporting.done'));
        } else {
            win.setMaximizable(true);
            win.setFullScreenable(true);
        }
    };

    openYouTubePage = url => {
        this.setState(
            {
                sidePaneType: this.SP_YOUTUBE,
                sidePaneWidth: this.SIDE_PANE_WIDTH_MAX,
                isShowSidePane: true,
                isVidLibPaneFullSize: false,
                isYouTubeBrowserFullSize: true
            },
            () => {
                this.youtubeBrowser.openUrl(url);
            }
        );
    };

    renderSidePane = () => {
        return (
            <div className="sidebar k-side-pane not-draggable" style={{ width: this.state.sidePaneWidth }}>
                {this.state.sidePaneType == this.SP_SUB && (
                    <SubtitlePane
                        ref={ref => (this.subtitlePane = ref)}
                        subtitles={this.state.subtitles}
                        lineIndex={this.state.lineIndex}
                        prevLineIndex={this.state.prevLineIndex}
                        lines={this.state.lines}
                        movieFile={this.state.movieUrl}
                        onLookUpWord={this.handleClickWord}
                        onClickDownload={this.handleClickDownload}
                        onOpenDictionary={this.handleOpenDictionary}
                        onSelectSubtitle={this.handleSelectSubtitle}
                        onSelectSecondarySubtitle={this.handleSelectSecondarySubtitle}
                        onAddWord={this.handleAddWord}
                        onSearchWeb={this.handleSearchWeb}
                        onSearchVidLib={this.handleSearchVidLib}
                        onStartFilterSubtitle={this.handleStartFilterSubtitle}
                        onClickLine={this.handleClickLine}
                        onDoubleClickLine={this.handleSubtitlePaneDoubleClickLine}
                        onRepeat={this.handleRepeatLines}
                        onClearRepeat={this.handleClearRepeat}
                        onChangeTimeOffset={this.handleChangeTimeOffset}
                        onChangeSecondaryTimeOffset={this.handleChangeSecondaryTimeOffset}
                        onSyncTimeToLine={this.handleSyncTimeToLine}
                        onAddExtenalSubtitle={this.handleAddExternalSubtitle}
                        onContextMenu={this.handleContextMenuOnSubtitlePane}
                        onSelectStart={this.handleSubtitlePaneSelectStart}
                        onPressSpace={this.handleSubtitlePanePressSpace}
                        onChangeLang={this.handleChangeLang}
                        onChangeSecondaryLang={this.handleChangeSecondaryLang}
                        onSaveLineToVidLib={this.handleSaveLineToVidLib}
                        onSaveRepeatingLinesToVidLib={this.handleSaveRepeatingLinesToVidLib}
                        onMarkWord={this.handleMarkWord}
                        repeatingLineBeginIndex={this.state.repeatingLineBeginIndex}
                        repeatingLineEndIndex={this.state.repeatingLineEndIndex}
                        subtitleIndex={this.state.subtitleIndex}
                        secondarySubtitleIndex={this.state.secondarySubtitleIndex}
                        timeOffset={this.state.timeOffset}
                        secondaryTimeOffset={this.state.secondaryTimeOffset}
                        filterBySearchTerm={this.state.filterBySearchTerm}
                        isLocal={!this.state.movieUrl.startsWith('http')}
                        lang={this.state.lang}
                        secondaryLang={this.state.secondaryLang}
                    />
                )}
                {this.state.sidePaneType == this.SP_WORD && (
                    <WordListPane
                        ref={ref => (this.wordListPane = ref)}
                        wordGroup={this.state.wordGroup}
                        wordGroups={this.state.wordGroups}
                        currentWordGroupIndex={this.state.currentWordGroupIndex}
                        onClickLineOnWordBook={this.handleClickLineOnWordBook}
                        onClickWordOnWordBook={this.handleClickWordOnWordBook}
                        onClickWord={this.handleClickWord}
                        onRemoveWord={this.handleRemoveWord}
                        onAddWord={this.handleAddWord}
                        onOpenDictionary={this.handleOpenDictionary}
                        onSearchWeb={this.handleSearchWeb}
                        onSearchVidLib={this.handleSearchVidLib}
                        onEditNote={this.handleEditWordDefinition}
                        onClickNewWordList={this.handleNewWordList}
                        onClickDeleteWordList={this.handleDeleteWordList}
                        onClickRenameWordList={this.handleRenameWordList}
                        onChangeWordList={this.handleChangeCurrentWordList}
                        focusedWord={this.state.focusedWord}
                        lines={this.state.lines}
                        wordToLines={this.state.wordToLines}
                        lineIndex={this.state.lineIndex}
                    />
                )}
                {this.state.sidePaneType == this.SP_WEB && (
                    <WebPane
                        ref={ref => (this.webPane = ref)}
                        onAddWord={this.handleAddWord}
                        onAddWordDefinition={this.handleAddWordDefinition}
                        onSwitch={this.handleSwitchWebSource}
                        selectedSourceIndex={this.state.webSourceIndex}
                    />
                )}
            </div>
        );
    };

    renderPlayerPane = () => {
        const { playMode, repeatingLineBeginIndex, singleLineRepeatTotalCount, singleLineRepeatRemainCount } = this.state;
        return (
            <div
                className="k-player-pane pane"
                style={{ visibility: this.state.isYouTubeBrowserFullSize || this.state.isVidLibPaneFullSize ? 'hidden' : 'visible' }}
                onMouseMove={this.handlePlayerMouseMoveThrottled}
                onWheel={this.handleWheelThrottled}
                onClick={this.handleContainerClick}
                onDrop={this.handleDrop}
                onContextMenu={this.handlePlayerContextMenu}
                ref={ref => (this.playerContainer = ref)}>
                {!this.state.isPlayerControlsVisible && (
                    <div
                        ref="overlay"
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,
                            cursor: 'none'
                        }}></div>
                )}
                {this.state.isPlayerControlsVisible && (
                    <div className="k-top-bar">
                        <div style={{ marginTop: 14, display: 'inline-block', marginLeft: 4 }}>
                            <WindowButtons />
                        </div>
                        <TitlePane ref="titlePane" title={this.state.title}>
                            {' '}
                        </TitlePane>
                        <SubControls
                            onOpenFile={this.handleLoadMovieFile}
                            onOpenYouTubeVideo={this.handleLoadYoutubeVideo}
                            onSettings={this.handleOpenSettings}
                        />
                    </div>
                )}
                {this.state.playerType === this.PLAYER_TYPE_MPV && (
                    <ReactMPV
                        onReady={this.handleMPVReady}
                        onPropertyChange={this.handlePropertyChange}
                        onMouseUp={this.handlePlayerMouseUp}
                        onMouseDown={this.handlePlayerMouseDown}
                        style={{
                            width: this.state.zoom,
                            height: '100%',
                            marginLeft: this.state.playerLeftOffset
                        }}
                        ref="mpv"
                    />
                )}
                {this.state.playerType === this.PLAYER_TYPE_YOUTUBE && (
                    <YouTubeIFramePlayer
                        zoom={this.state.zoom}
                        videoUrl={this.state.movieUrl}
                        offset={this.state.playerLeftOffset}
                        onReady={this.handleYouTubePlayerReady}
                        onError={this.handleYouTubePlayerError}
                        onLinesReady={this.handleYouTubeLinesReady}
                        onSecondaryLinesReady={this.handleYouTubeSecondaryLinesReady}
                        onProgress={this.handleYouTubePlayerProgress}
                        onDuration={this.handleYouTubePlayerDuration}
                        onVideoTitle={this.handleYouTubePlayerTitle}
                        onPause={this.handleYouTubePlayerPause}
                        onMouseUp={this.handlePlayerMouseUp}
                        onMouseDown={this.handlePlayerMouseDown}
                        onDropFile={this.handleDropFile}
                        onDropUrl={this.handleDropUrl}
                        onGotCCList={this.handleGotCCList}
                        playing={!this.state.pause}
                        ref="YouTubePlayer"
                        port={this.port}
                    />
                )}
                <div className="k-top-container">
                    <MessagePane ref="messagePane"> </MessagePane>
                    <PlayerSubtitle
                        kid="sub"
                        onClickWord={this.handleClickWord}
                        show={
                            !this.state.isYouTubeBrowserFullSize &&
                            !this.state.isVidLibPaneFullSize &&
                            this.state.secondaryLines.length > 0 &&
                            ((!this.state.autoHideSecondPlayerSubtitle && this.state.showSecondPlayerSubtitle) ||
                                (this.state.autoHideSecondPlayerSubtitle && this.state.isPlayerControlsVisible))
                        }
                        ref={ref => (this.secondaryPlayerSubtitle = ref)}
                        lines={this.state.secondaryLines}
                        onAddWord={this.handleAddWord}
                        onOpenDictionary={this.handleOpenDictionary}
                        onSearchWeb={this.handleSearchWeb}
                        onSearchVidLib={this.handleSearchVidLib}
                        onSelectWords={this.handlePlayerSubtitleSelectWords}
                        onClickNothing={this.handlePlayerSubtitleClickNothing}
                    />
                </div>
                <div className={'byp-center-container' + (this.state.movieUrl ? ' byp-clear-background' : '')}>
                    {this.state.showMediaPane && (
                        <OpenMediaPane
                            onOpenFile={this.handleLoadMovieFile}
                            onOpenYouTubeVideo={this.handleLoadYoutubeVideo}
                            onOpenTutorial={this.handleOpenTutorial}></OpenMediaPane>
                    )}
                    {this.state.showProgressPane && <ProgressPane />}
                    <WordNotifierComponent
                        ref={ref => (this.notification = ref)}
                        onEditWordDefinition={this.handleEditWordDefinition}
                        pause={this.state.pause}
                    />
                </div>
                {this.state.showTuner && (
                    <TunerPane
                        ref={ref => (this.tunerPane = ref)}
                        onChangeSpeed={this.handleChangeSpeed}
                        onChangeMaskHeight={this.handleChangeMaskHeight}
                        onChangePlayerSubtitleSize={this.handleChangePlayerSubtitleSize}
                        onChangeSidePaneSubtitleSize={this.handleChangeSidePaneSubtitleSize}
                        speed={this.state.speed}
                        maskHeight={this.state.maskHeight}
                        showMaskHeight={this.state.playerType != this.PLAYER_TYPE_YOUTUBE}
                        isArrowOnRight={!this.state.isShowSidePane}></TunerPane>
                )}
                {this.state.showSwitchesPane && (
                    <SwitchesPane
                        ref={ref => (this.switchesPane = ref)}
                        isArrowOnRight={!this.state.isShowSidePane}
                        fullScreen={this.state.fullScreen}
                        skipNoDialogueClips={this.state.skipNoDialogueClips}
                        onToggleFullScreen={this.handleClickFullScreen}
                        onToggleSkipNoDialogueClips={this.handleClickToggleSkipNoDialogueClips}></SwitchesPane>
                )}

                <div className="k-bottom-container">
                    {
                        <PlayerSubtitle
                            kid="pri"
                            onClickWord={this.handleClickWord}
                            show={
                                !this.state.isYouTubeBrowserFullSize &&
                                !this.state.isVidLibPaneFullSize &&
                                ((!this.state.autoHidePlayerSubtitle && this.state.showPlayerSubtitle) ||
                                    (this.state.autoHidePlayerSubtitle && this.state.isPlayerControlsVisible))
                            }
                            ref={ref => (this.playerSubtitle = ref)}
                            lines={this.state.lines}
                            onAddWord={this.handleAddWord}
                            onMarkWord={this.handleMarkWord}
                            onOpenDictionary={this.handleOpenDictionary}
                            onSearchWeb={this.handleSearchWeb}
                            onSearchVidLib={this.handleSearchVidLib}
                            onSelectWords={this.handlePlayerSubtitleSelectWords}
                            onClickNothing={this.handlePlayerSubtitleClickNothing}
                            onShowWords={this.handleShowWords}
                        />
                    }
                    {this.state.isPlayerControlsVisible && this.state.playerType != this.PLAYER_TYPE_NONE && <div className="k-bottom-gradient" />}
                    <PlayerControls
                        ref={ref => (this.playerControls = ref)}
                        visible={this.state.isPlayerControlsVisible && !this.state.isYouTubeBrowserFullSize && !this.state.isVidLibPaneFullSize}
                        initialTimePos={this.timePos}
                        isPlaying={this.state.playerType != this.PLAYER_TYPE_NONE}
                        singleLineRepeatRemainCount={singleLineRepeatRemainCount}
                        singleLineRepeatTotalCount={singleLineRepeatTotalCount}
                        playMode={playMode}
                        onClickPlay={this.togglePause}
                        onClickToggleRepeat={this.handleToggleRepeat}
                        onClickFastForward={this.handleFastForward}
                        onClickFastBackward={this.handleFastBackward}
                        onSeek={this.handleSeek}
                        onSeekMouseDown={this.handleSeekMouseDown}
                        onSeekMouseUp={this.handleSeekMouseUp}
                        onLoadFile={this.handleOpenMRU}
                        onClickNextPlayMode={this.handleNextPlayMode}
                        onToggleTuner={this.handleToggleTuner}
                        onToggleSwitchesPane={this.handleToggleSwitchesPane}
                        pause={this.state.pause}
                        duration={this.state.duration}
                        showMediaPane={this.state.showMediaPane}
                        showSidePane={this.state.isShowSidePane}
                        fullScreen={this.state.fullScreen}
                        isRepeating={repeatingLineBeginIndex !== -1}
                        isLight={this.state.playerType == this.PLAYER_TYPE_MPV}
                        showSubtitlePane={this.state.sidePaneType == this.SP_SUB}
                        showWordListPane={this.state.sidePaneType == this.SP_WORD}
                        showWebPane={this.state.sidePaneType == this.SP_WEB}
                        showYouTubeBrowser={this.state.sidePaneType == this.SP_YOUTUBE}
                        showVidLibPane={this.state.sidePaneType == this.SP_VIDLIB}
                        onToggleSubtitlePane={this.handleToggleSubtitlePane}
                        onToggleWordListPane={this.handleToggleWordListPane}
                        onToggleWebPane={this.handleToggleWebPane}
                        onShowYouTubeBrowser={this.handleShowYouTubeBrowser}
                        onShowVidLibPane={this.handleShowVidLibPane}
                        onToggleSidePane={this.handleToggleSidePane}
                        onClickFullScreen={this.handleClickFullScreen}
                    />
                </div>
            </div>
        );
    };

    render() {
        return (
            <div className="window">
                <div className="window-content">
                    <div className="pane-group">
                        {this.renderPlayerPane()}
                        {this.state.isShowSidePane && this.renderSidePane()}
                        {PRO_VERSION && (
                            <YouTubeBrowser
                                show={this.state.sidePaneType == this.SP_YOUTUBE && this.state.isShowSidePane}
                                ref={ref => (this.youtubeBrowser = ref)}
                                onClickYouTubeVideo={this.handleClickYouTubeVideo}
                                onClickToggleFullSize={this.handleClickYouTubeBrowserFullSize}
                                isFullSize={this.state.isYouTubeBrowserFullSize}
                            />
                        )}
                        {PRO_VERSION && (
                            <VidLibPane
                                show={this.state.sidePaneType == this.SP_VIDLIB && this.state.isShowSidePane}
                                ref={ref => (this.vidLibPane = ref)}
                                isFullSize={this.state.isVidLibPaneFullSize}
                                speed={this.state.speed}
                                onClickToggleFullSize={this.handleClickVidLibPaneFullSize}
                                onEditVidTags={this.handleEditVidTags}
                                onDeleteVid={this.handleDeleteVid}
                                onClickWord={this.handleClickWord}
                                onAddWord={this.handleAddWord}
                                onMarkWord={this.handleMarkWord}
                                onOpenDictionary={this.handleOpenDictionary}
                                onSearchWeb={this.handleSearchWeb}
                                onSearchVidLib={this.handleSearchVidLib}
                                onSelectWords={this.handlePlayerSubtitleSelectWords}
                                onClickNothing={this.handlePlayerSubtitleClickNothing}
                            />
                        )}
                    </div>
                </div>
                <Modal
                    isOpen={this.state.isMessageDialogShow}
                    style={customDialogStyles}
                    className="k-modal"
                    overlayClassName="k-overlay"
                    onAfterOpen={this.handleAfterSubtitleDialogOpen}
                    contentLabel="Subtitle Dialog">
                    <MessageDialog ref={_ => (this.messageDialog = _)}></MessageDialog>
                </Modal>
                <Modal
                    isOpen={this.state.isUrlPromptShow}
                    style={customDialogStyles}
                    className="k-modal"
                    overlayClassName="k-overlay"
                    onAfterOpen={this.handleAfterUrlPromptShow}>
                    <PromptDialog
                        promptInfo={i18n.t('please.paste.youtube.url')}
                        defaultValue={this.getDefaultUrl()}
                        onPromptOk={this.handlePromptUrlOk}
                        onPromptCancel={this.handlePromptUrlCancel}></PromptDialog>
                </Modal>
                <Modal
                    isOpen={this.state.isDownloadPromptShow}
                    style={customDialogStyles}
                    className="k-modal"
                    overlayClassName="k-overlay"
                    onAfterOpen={this.handleAfterDownloadPromptShow}>
                    <DownloadSubtitleDialog
                        defaultValue={path.basename(this.state.movieUrl)}
                        onPromptOk={this.handlePromptDownloadOk}
                        onPromptCancel={this.handlePromptDownloadCancel}
                    />
                </Modal>
                <Modal
                    isOpen={this.state.isWordListPromptShow}
                    style={customDialogStyles}
                    className="k-modal"
                    overlayClassName="k-overlay"
                    onAfterOpen={this.handleAfterWordListPromptShow}>
                    <PromptDialog
                        promptInfo={'Word List Name: '}
                        defaultValue={this.state.wordGroup.name == 'Default' ? '' : this.state.wordGroup.name}
                        onPromptOk={this.handlePromptWordListOk}
                        onPromptCancel={this.handlePromptWordListCancel}></PromptDialog>
                </Modal>
                <Modal
                    isOpen={this.state.showWordDefEditor}
                    style={customDialogStyles}
                    className="k-modal"
                    overlayClassName="k-overlay"
                    onAfterOpen={this.handleAfterWordDefEditorShow}>
                    <WordDefinitionEditorPane
                        word={this.state.wordForMark}
                        definition={this.state.wordDefinition}
                        ref={ref => {
                            this.wordDefEditor = ref;
                        }}
                        onOK={this.handleWordDefEditorOK}
                        isEditing={this.state.isEditingWordDefinition}
                        onCancel={this.handleWordDefEditorCancel}
                        onDeleteWordDefinition={this.handleDeleteWordDefinition}></WordDefinitionEditorPane>
                </Modal>
                <Modal
                    isOpen={this.state.isTagEditorShow}
                    style={customDialogStyles}
                    className="k-modal"
                    overlayClassName="k-overlay"
                    onAfterOpen={this.handleAfterTagEditorShow}>
                    <TagEditorDialog
                        tags={this.state.vidTags}
                        recentTags={this.state.recentTags}
                        onClickOK={this.handleTagEditorOK}
                        onClickCancel={this.handleTagEditorCancel}></TagEditorDialog>
                </Modal>

                {this.state.isSettingsShow && (
                    <Modal isOpen={true} style={customDialogStyles} className="k-modal" overlayClassName="k-overlay">
                        <SettingsPane
                            ref="settingsPane"
                            onPlayerSubtitleStyleChanged={this.handlePlayerSubtitleStyleChanged}
                            onClose={this.handleCloseSettings}
                        />
                    </Modal>
                )}

                {PRO_VERSION && this.state.showAnkiDialog && (
                    <Suspense fallback={<Loader message={i18n.t('please.wait')} />}>
                        <this.state.AnkiExportAnkiDialog onClose={() => this.setState({ showAnkiDialog: false })} />
                    </Suspense>
                )}
            </div>
        );
    }
}

export default App;
