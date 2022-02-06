import path from 'path';
import url from 'url';
import unhandled from 'electron-unhandled';
import nodeStatic from 'node-static';
import http from 'http';
import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';

import Settings from './js/Model/Settings';

const isDev = require('electron-is-dev');

const i18n = eval('require')('./i18n');
const log = eval('require')('electron-log');

unhandled({
    logger: error => {
        log.error(error);
    }
});

log.transports.console.level = 'info';
log.transports.file.level = 'info';

log.info('BeyondPlayer Started');

// avoid transform by webpack
// process.env.MPVJS_TERMINAL = 1;
// process.env.MPVJS_VERBOSE = 1;

process.on('uncaughtException', err => {
    log.error(err.stack);
});

Settings.load(() => {
    let lang = Settings.getLanguage();
    log.info(`lang:${lang}`);
    if (!lang) {
        const locale = app.getLocale();
        log.info(`locale:${locale}`);
        lang = app.getLocale();
    }
    i18n.init(lang);
});

let mainWindow;
let autoHidePlayerSubtitle = false;
let autoHideSecondPlayerSubtitle = false;
const showPlayerSubtitle = true;
const showSecondPlayerSubtitle = true;
let menu;
let openWithPath;
let openWithUrl;

let isPro = false;
let forceQuit = false;
let server;
let port;

log.info('Loaded Electron');

const { getPluginEntry } = require('mpv.js');

// Absolute path to the plugin directory.
// const pluginDir = path.join(path.dirname(require.resolve("mpv.js")), "build", "Release");
const pluginDir = path.join(app.getAppPath(), 'node_modules', 'mpv.js', 'build', 'Release').replace('app.asar', 'app.asar.unpacked');

log.info(`mpv plugin dir: ${pluginDir}`);

// See pitfalls section for details.
// if (process.platform !== "linux") {process.chdir(pluginDir);}
// log.info(`changed cwd to: ${pluginDir}`);

// To support a broader number of systems.
app.commandLine.appendSwitch('ignore-gpu-blacklist'); // DISABLED for https://github.com/electron/electron/issues/8807
app.commandLine.appendSwitch('no-sandbox'); // DISABLED for https://github.com/electron/electron/issues/8807
app.commandLine.appendSwitch('disable-site-isolation-trials'); // DISABLED cross-domain, https://github.com/electron/electron/issues/18940

const pluginEntry = getPluginEntry(pluginDir);
log.info(`pluginEntry: ${pluginEntry}`);

app.commandLine.appendSwitch('register-pepper-plugins', pluginEntry);

log.info('Register mpv.js plugin');

function enableSubItems(item, enabled, excepts) {
    if (typeof item === 'string') {
        item = menu.getMenuItemById(item);
    }
    if (excepts && excepts.indexOf(item.id) != -1) return;

    item.enabled = enabled;

    if (item && item.submenu) {
        item.submenu.items.forEach(subItem => {
            enableSubItems(subItem, enabled, excepts);
        });
    }
}

function openTutorial() {
    const docPath = url.format({
        pathname: path.join(__dirname, 'assets/documentation/vid_tutorial.html'),
        protocol: 'file:',
        slashes: true
    });

    log.info(docPath);

    const manualWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        show: false
    });

    manualWindow.loadURL(docPath);
    manualWindow.show();
}

function createWindow() {
    if (isDev) {
        const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
        installExtension(REACT_DEVELOPER_TOOLS)
            .then(name => log.info(`Added Extension: ${name}`))
            .catch(err => log.error(`An error occurred: ${err}`));
    }
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 760,
        titleBarStyle: 'hidden',
        show: false,
        backgroundColor: '#2e2c29',
        webPreferences: { plugins: true, nodeIntegration: true, webviewTag: true }
    });

    mainWindow.setWindowButtonVisibility(false);

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        })
    );

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('close', e => {
        e.preventDefault();
        mainWindow.webContents.send('user-close', forceQuit);
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    app.on('before-quit', () => {
        forceQuit = true;
    });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (server) {
        server.close();
    }
    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('open-file', (event, filePath) => {
    log.info(`open-file:${filePath}`);
    event.preventDefault();
    if (mainWindow) {
        log.info('main-window-ready');
        mainWindow.webContents.send('open-file-with', filePath);
    } else {
        log.info('main-window-not-ready');
        openWithPath = filePath;
    }
});

app.on('open-url', (event, fullUrl) => {
    log.info(`open-url:${fullUrl}`);
    event.preventDefault();

    const urlObject = new URL(fullUrl);
    const videoUrl = urlObject.searchParams.get('url');
    log.info(`video-url:${videoUrl}`);

    if (mainWindow && port) {
        log.info('main-window-ready');
        mainWindow.webContents.send('open-url-with', videoUrl);
    } else {
        log.info('main-window-or-port-not-ready');
        openWithUrl = videoUrl;
    }
});

if (isDev) {
    require('electron-debug');
    eval('require')('electron-reload')(__dirname);
}

ipcMain.on('change-auto-hide-player-subtitle', (event, arg) => {
    autoHidePlayerSubtitle = arg;
    menu.getMenuItemById('toggle-subtitle').enabled = !autoHidePlayerSubtitle;
});

ipcMain.on('change-auto-hide-second-player-subtitle', (event, arg) => {
    autoHideSecondPlayerSubtitle = arg;
    menu.getMenuItemById('toggle-second-subtitle').enabled = !autoHideSecondPlayerSubtitle;
});

ipcMain.on('change-skip-no-dialogue-clips', (event, arg) => {
    menu.getMenuItemById('skip-no-dialogue-clips').checked = arg;
});

ipcMain.on('change-pause', (event, arg) => {
    menu.getMenuItemById('toggle-pause').checked = arg;
});

ipcMain.on('enable-youtube-player', (event, arg) => {
    if (isPro) {
        enableSubItems('youtube', arg);
    }
});

ipcMain.on('vid-lib-pane-fullsize-changed', (event, arg) => {
    if (isPro) {
        enableSubItems('subtitles', !arg);
        enableSubItems('loop', !arg, ['toggle-loop', 'loop-times']);
        enableSubItems('vidlib', arg, [
            'save-current-line',
            'save-current-line-with-tags',
            'export-clip-library',
            'import-clip-library',
            'export-anki'
        ]);
    }
});

ipcMain.on('set-button-visibility', (event, arg) => {
    // mainWindow.setWindowButtonVisibility(arg);
});

ipcMain.on('open-tutorial', (event, arg) => {
    openTutorial();
});

function buildMenu(isPro) {
    const mSettingsItem = {
        label: i18n.t('settings'),
        accelerator: 'Cmd+,',
        click() {
            mainWindow.webContents.send('settings');
        }
    };

    const mProApplication = {
        label: 'Application',
        submenu: [
            { label: i18n.t('about.pro'), selector: 'orderFrontStandardAboutPanel:' },
            { type: 'separator' },
            mSettingsItem,
            { type: 'separator' },
            {
                label: i18n.t('quit'),
                accelerator: 'Command+Q',
                click() {
                    app.quit();
                }
            }
        ]
    };
    const mLiteApplication = {
        label: 'Application',
        submenu: [
            { label: i18n.t('about.lite'), selector: 'orderFrontStandardAboutPanel:' },
            { type: 'separator' },
            mSettingsItem,
            { type: 'separator' },
            {
                label: i18n.t('get.full.version'),
                click() {
                    mainWindow.webContents.send('get-full-version');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('quit'),
                accelerator: 'Command+Q',
                click() {
                    app.quit();
                }
            }
        ]
    };

    const mProFile = {
        label: i18n.t('file'),
        submenu: [
            {
                label: i18n.t('open.file'),
                accelerator: 'CmdOrCtrl+O',
                click() {
                    mainWindow.webContents.send('open-file');
                }
            },
            {
                label: i18n.t('open.youtube.video'),
                accelerator: 'CmdOrCtrl++L',
                click() {
                    mainWindow.webContents.send('open-url');
                }
            },
            {
                role: 'recentDocuments',
                label: i18n.t('open.recent'),
                submenu: [
                    {
                        label: i18n.t('clear.recent'),
                        click() {
                            app.clearRecentDocuments();
                        }
                    }
                ]
            }
        ]
    };

    const mLiteFile = {
        label: i18n.t('file'),
        submenu: [
            {
                label: i18n.t('open.file'),
                accelerator: 'CmdOrCtrl+O',
                click() {
                    mainWindow.webContents.send('open-file');
                }
            },
            {
                role: 'recentDocuments',
                label: i18n.t('open.recent'),
                submenu: [
                    {
                        label: i18n.t('clear.recent'),
                        click() {
                            app.clearRecentDocuments();
                        }
                    }
                ]
            }
        ]
    };

    const mEdit = {
        label: i18n.t('edit'),
        submenu: [
            { label: i18n.t('undo'), accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
            { label: i18n.t('redo'), accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
            { type: 'separator' },
            { label: i18n.t('cut'), accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
            { label: i18n.t('copy'), accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
            { label: i18n.t('paste'), accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
            { label: i18n.t('select.all'), accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
        ]
    };

    const mPlayback = {
        label: i18n.t('playback'),
        submenu: [
            {
                id: 'toggle-pause',
                label: i18n.t('pause'),
                accelerator: 'space',
                checked: false,
                type: 'checkbox',
                click() {
                    mainWindow.webContents.send('toggle-pause');
                }
            },
            {
                label: i18n.t('reload'),
                click() {
                    mainWindow.webContents.send('reload');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('next.line'),
                accelerator: 'right',
                click() {
                    mainWindow.webContents.send('fast-forward');
                }
            },
            {
                label: i18n.t('previous.line'),
                accelerator: 'left',
                click() {
                    mainWindow.webContents.send('fast-backward');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('skip.no.dialogue.clips'),
                id: 'skip-no-dialogue-clips',
                type: 'checkbox',
                checked: false,
                click() {
                    mainWindow.webContents.send('toggle-skip-no-dialogue-clips');
                }
            }
        ]
    };

    const mLoop = {
        label: i18n.t('loop'),
        id: 'loop',
        submenu: [
            {
                label: i18n.t('toggle.loop'),
                accelerator: 'enter',
                id: 'toggle-loop',
                click() {
                    mainWindow.webContents.send('toggle-loop');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('extend.loop.left.range'),
                accelerator: '[',
                click() {
                    mainWindow.webContents.send('extend-loop-prev');
                }
            },
            {
                label: i18n.t('extend.loop.right.range'),
                accelerator: ']',
                click() {
                    mainWindow.webContents.send('extend-loop-next');
                }
            },
            {
                label: i18n.t('shrink.loop.left.range'),
                accelerator: '{',
                click() {
                    mainWindow.webContents.send('shrink-loop-prev');
                }
            },
            {
                label: i18n.t('shrink.loop.right.range'),
                accelerator: '}',
                click() {
                    mainWindow.webContents.send('shrink-loop-next');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('loop.current.line.with.times'),
                id: 'loop-times',
                submenu: [
                    {
                        label: i18n.t('2.times'),
                        accelerator: '2',
                        click() {
                            mainWindow.webContents.send('loop-times', 2);
                        }
                    },
                    {
                        label: i18n.t('3.times'),
                        accelerator: '3',
                        click() {
                            mainWindow.webContents.send('loop-times', 3);
                        }
                    },
                    {
                        label: i18n.t('4.times'),
                        accelerator: '4',
                        click() {
                            mainWindow.webContents.send('loop-times', 4);
                        }
                    },
                    {
                        label: i18n.t('5.times'),
                        accelerator: '5',
                        click() {
                            mainWindow.webContents.send('loop-times', 5);
                        }
                    },
                    {
                        label: i18n.t('6.times'),
                        accelerator: '6',
                        click() {
                            mainWindow.webContents.send('loop-times', 6);
                        }
                    },
                    {
                        label: i18n.t('7.times'),
                        accelerator: '7',
                        click() {
                            mainWindow.webContents.send('loop-times', 7);
                        }
                    },
                    {
                        label: i18n.t('8.times'),
                        accelerator: '8',
                        click() {
                            mainWindow.webContents.send('loop-times', 8);
                        }
                    },
                    {
                        label: i18n.t('9.times'),
                        accelerator: '9',
                        click() {
                            mainWindow.webContents.send('loop-times', 9);
                        }
                    }
                ]
            }
        ]
    };

    if (isPro) {
        mPlayback.submenu.push(
            { type: 'separator' },
            {
                label: i18n.t('speed.up'),
                accelerator: 'CmdOrCtrl+]',
                click() {
                    mainWindow.webContents.send('speed-up');
                }
            },
            {
                label: i18n.t('speed.down'),
                accelerator: 'CmdOrCtrl+[',
                click() {
                    mainWindow.webContents.send('speed-down');
                }
            },
            {
                label: i18n.t('speed.reset'),
                accelerator: 'CmdOrCtrl+\\',
                click() {
                    mainWindow.webContents.send('speed-reset');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('next.audio.track'),
                click() {
                    mainWindow.webContents.send('next-audio-track', true);
                }
            },
            {
                label: i18n.t('previous.audio.track'),
                click() {
                    mainWindow.webContents.send('next-audio-track', false);
                }
            }
        );
    }

    const mSubtitle = {
        label: i18n.t('subtitle'),
        id: 'subtitles',
        submenu: [
            {
                label: i18n.t('reveal.subtitles.in.finder'),
                click() {
                    mainWindow.webContents.send('reveal-subtitles');
                }
            },
            {
                label: i18n.t('clear.all.subtitles.for.the.current.movie'),
                click() {
                    mainWindow.webContents.send('clear-subtitles');
                }
            },
            {
                label: i18n.t('download.online.subtitles'),
                click() {
                    mainWindow.webContents.send('download-subtitles');
                }
            },
            {
                label: i18n.t('add.external.subtitle'),
                click() {
                    mainWindow.webContents.send('add-external-subtitle');
                }
            },
            {
                label: i18n.t('popular.subtitle.sites'),
                submenu: [
                    {
                        label: 'Opensubtitles.org',
                        click() {
                            shell.openExternal('https://www.opensubtitles.org');
                        }
                    },
                    {
                        label: i18n.t('assrt.net'),
                        click() {
                            shell.openExternal('https://assrt.net');
                        }
                    }
                ]
            },
            { type: 'separator' },
            {
                label: i18n.t('subtitle.shift.+'),
                accelerator: 'CmdOrCtrl+Shift+right',
                click() {
                    mainWindow.webContents.send('add-subtitle-shift');
                }
            },
            {
                label: i18n.t('subtitle.shift.-'),
                accelerator: 'CmdOrCtrl+Shift+left',
                click() {
                    mainWindow.webContents.send('reduce-subtitle-shift');
                }
            },
            {
                label: i18n.t('reset.subtitle.shift'),
                accelerator: 'CmdOrCtrl+Shift+up',
                click() {
                    mainWindow.webContents.send('reset-subtitle-shift');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('filter.subtitle.by.keyword'),
                type: 'checkbox',
                checked: true,
                click() {
                    mainWindow.webContents.send('toggle-filter-by-search-term');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('bigger.player.subtitle'),
                accelerator: 'CmdOrCtrl+=',
                click() {
                    mainWindow.webContents.send('player-subtitle-bigger');
                }
            },
            {
                label: i18n.t('smaller.player.subtitle'),
                accelerator: 'CmdOrCtrl+-',
                click() {
                    mainWindow.webContents.send('player-subtitle-smaller');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('search.selected.text.in.dictionary'),
                click() {
                    mainWindow.webContents.send('search-selection-in-dictionary');
                }
            }
        ]
    };

    if (isPro) {
        mSubtitle.submenu.unshift(
            {
                id: 'toggle-subtitle',
                label: i18n.t('show.subtitle'),
                accelerator: 'CmdOrCtrl+S',
                type: 'checkbox',
                checked: showPlayerSubtitle,
                click() {
                    mainWindow.webContents.send('toggle-subtitle');
                }
            },
            {
                id: 'toggle-auto-hide-subtitle',
                label: i18n.t('auto.hide.subtitle'),
                accelerator: 'CmdOrCtrl+H',
                type: 'checkbox',
                checked: autoHidePlayerSubtitle,
                click() {
                    mainWindow.webContents.send('toggle-auto-hide-subtitle');
                }
            },
            {
                id: 'toggle-second-subtitle',
                label: i18n.t('show.second.subtitle'),
                type: 'checkbox',
                accelerator: 'CmdOrCtrl+Shift+S',
                checked: showSecondPlayerSubtitle,
                click() {
                    mainWindow.webContents.send('toggle-second-subtitle');
                }
            },
            {
                id: 'toggle-auto-hide-second-subtitle',
                label: i18n.t('auto.hide.second.subtitle'),
                accelerator: 'CmdOrCtrl+Shift+H',
                type: 'checkbox',
                checked: autoHideSecondPlayerSubtitle,
                click() {
                    mainWindow.webContents.send('toggle-auto-hide-second-subtitle');
                }
            },
            { type: 'separator' }
        );
        mSubtitle.submenu.push({
            label: i18n.t('search.selected.text.in.web'),
            click() {
                mainWindow.webContents.send('search-selection-in-web-dictionary');
            }
        });
    }

    const mView = {
        label: i18n.t('view'),
        submenu: [
            {
                label: i18n.t('toggle.full.screen'),
                accelerator: 'Cmd+Ctrl+F',
                click() {
                    mainWindow.webContents.send('toggle-full-screen');
                }
            },
            {
                label: i18n.t('toggle.expanded.view'),
                accelerator: 'CmdOrCtrl+E',
                click() {
                    mainWindow.webContents.send('toggle-expand-view');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('toggle.side.panel'),
                accelerator: 'CmdOrCtrl+B',
                click() {
                    mainWindow.webContents.send('toggle-side-bar');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('open.subtitle.panel'),
                accelerator: 'CmdOrCtrl+1',
                click() {
                    mainWindow.webContents.send('open-subtitle-pane');
                }
            },
            {
                label: i18n.t('open.word.panel'),
                accelerator: 'CmdOrCtrl+2',
                click() {
                    mainWindow.webContents.send('open-word-pane');
                }
            },
            {
                label: i18n.t('open.vid.lib.panel'),
                accelerator: 'CmdOrCtrl+3',
                click() {
                    mainWindow.webContents.send('open-vid-lib-pane');
                }
            },
            {
                label: i18n.t('open.youtube.panel'),
                accelerator: 'CmdOrCtrl+4',
                click() {
                    mainWindow.webContents.send('open-youtube-pane');
                }
            },
            {
                label: i18n.t('open.web.search.panel'),
                accelerator: 'CmdOrCtrl+5',
                click() {
                    mainWindow.webContents.send('open-web-pane');
                }
            }
        ]
    };

    const mWord = {
        label: i18n.t('word.book'),
        submenu: [
            {
                label: i18n.t('add.selected.text.to.word.book'),
                click() {
                    mainWindow.webContents.send('add-selection-to-word-book');
                }
            },
            {
                label: i18n.t('annotate.selected.text.for.automatic.notification'),
                click() {
                    mainWindow.webContents.send('annotate-selected-text');
                }
            },
            {
                label: i18n.t('annotate.searched.word.with.selected.text.in.web.search.panel'),
                click() {
                    mainWindow.webContents.send('annotate-from-web-pane');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('copy.words.to.clipboard'),
                click() {
                    mainWindow.webContents.send('copy-word-book');
                }
            },
            {
                label: i18n.t('reveal.word.book.file.in.finder'),
                click() {
                    mainWindow.webContents.send('reveal-work-book-in-finder');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('export.word.book'),
                click() {
                    mainWindow.webContents.send('export-word-book');
                }
            },
            {
                label: i18n.t('import.word.book'),
                click() {
                    mainWindow.webContents.send('import-word-book');
                }
            }
        ]
    };

    const mYouTube = {
        label: i18n.t('youtube'),
        id: 'youtube',
        submenu: [
            {
                label: i18n.t('reload.youtube.video'),
                id: 'youtube-0',
                enabled: false,
                click() {
                    mainWindow.webContents.send('reload-youtube');
                }
            },
            {
                label: i18n.t('copy.youtube.video.url'),
                id: 'youtube-1',
                enabled: false,
                click() {
                    mainWindow.webContents.send('copy-youtube-url');
                }
            },
            {
                label: i18n.t('open.youtube.video.in.default.browser'),
                id: 'youtube-2',
                enabled: false,
                click() {
                    mainWindow.webContents.send('open-youtube-in-default-browser');
                }
            },
            {
                label: i18n.t('open.youtube.video.in.side.panel'),
                id: 'youtube-3',
                enabled: false,
                click() {
                    mainWindow.webContents.send('open-youtube-in-side-panel');
                }
            },
            {
                label: i18n.t('save.youtube.subtitle'),
                id: 'youtube-4',
                enabled: false,
                click() {
                    mainWindow.webContents.send('save-youtube-subtitle');
                }
            }
        ]
    };

    const mWebDict = {
        label: i18n.t('web.dictionary'),
        submenu: [
            {
                label: i18n.tf('switch.to.web.dic', 1),
                accelerator: 'Ctrl+1',
                click() {
                    mainWindow.webContents.send('switch-web-dict', 0);
                }
            },
            {
                label: i18n.tf('switch.to.web.dic', 2),
                accelerator: 'Ctrl+2',
                click() {
                    mainWindow.webContents.send('switch-web-dict', 1);
                }
            },
            {
                label: i18n.tf('switch.to.web.dic', 3),
                accelerator: 'Ctrl+3',
                click() {
                    mainWindow.webContents.send('switch-web-dict', 2);
                }
            },
            {
                label: i18n.tf('switch.to.web.dic', 4),
                accelerator: 'Ctrl+4',
                click() {
                    mainWindow.webContents.send('switch-web-dict', 3);
                }
            },
            {
                label: i18n.tf('switch.to.web.dic', 5),
                accelerator: 'Ctrl+5',
                click() {
                    mainWindow.webContents.send('switch-web-dict', 4);
                }
            }
        ]
    };

    const mHelp = {
        role: 'help',
        label: i18n.t('help'),
        submenu: [
            {
                label: i18n.t('tutorial'),
                click() {
                    openTutorial();
                }
            },
            {
                label: i18n.t('wiki'),
                click() {
                    shell.openExternal('https://github.com/circleapps/beyondplayer/wiki');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('privacy.policy'),
                click() {
                    shell.openExternal('https://circleapps.co/privacy.txt');
                }
            },
            {
                label: i18n.t('open.source.software.license'),
                click() {
                    shell.openExternal('https://github.com/circleapps/beyondplayer/wiki/Open-Source-Software-Attribution');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('email.feedback'),
                click() {
                    // require('electron').shell.openItem(__dirname + '/assets/SourcePlayerDocumentation.pdf') }
                    // var body = "%0D%0A%0D%0A%0D%0A" + os.type() + "-" + os.platform() + "-" + os.release();
                    let playerName;
                    if (isPro) {
                        playerName = 'BeyondPlayer Pro';
                    } else {
                        playerName = 'BeyondPlayer Lite';
                    }
                    const address = `mailto:edwardweiliao@gmail.com?subject=Feedback for ${playerName}`;
                    shell.openExternal(address);
                }
            },
            {
                label: i18n.t('reveal.log.file'),
                click() {
                    mainWindow.webContents.send('reveal-log-file');
                }
            }
        ]
    };

    const mClipLibrary = {
        label: i18n.t('clip.library'),
        id: 'vidlib',
        submenu: [
            {
                label: i18n.t('save.current.line.to.clip.library'),
                id: 'save-current-line',
                accelerator: 'CmdOrCtrl+K',
                click() {
                    mainWindow.webContents.send('save-current-line');
                }
            },
            {
                label: i18n.t('save.current.line.to.clip.library.with.recent.tags'),
                id: 'save-current-line-with-tags',
                accelerator: 'CmdOrCtrl+Shift+K',
                click() {
                    mainWindow.webContents.send('save-current-line-with-tags');
                }
            },
            {
                type: 'separator'
            },
            {
                label: i18n.t('prev.video.clip'),
                accelerator: 'Shift+left',
                enabled: false,
                click() {
                    mainWindow.webContents.send('prev-video-clip');
                }
            },
            {
                label: i18n.t('next.video.clip'),
                accelerator: 'Shift+right',
                enabled: false,
                click() {
                    mainWindow.webContents.send('next-video-clip');
                }
            },
            {
                label: i18n.t('prev.page'),
                accelerator: 'PageUp',
                enabled: false,
                click() {
                    mainWindow.webContents.send('prev-page');
                }
            },
            {
                label: i18n.t('next.page'),
                accelerator: 'PageDown',
                enabled: false,
                click() {
                    mainWindow.webContents.send('next-page');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('export.clip.library'),
                id: 'export-clip-library',
                click() {
                    mainWindow.webContents.send('export-clip-library');
                }
            },
            {
                label: i18n.t('import.clip.library'),
                id: 'import-clip-library',
                click() {
                    mainWindow.webContents.send('import-clip-library');
                }
            },
            { type: 'separator' },
            {
                label: i18n.t('file.export.anki'),
                id: 'export-anki',
                click() {
                    mainWindow.webContents.send('export-anki-dialog');
                }
            }
        ]
    };

    let template;
    if (isPro) {
        template = [mProApplication, mProFile, mEdit, mPlayback, mView, mLoop, mSubtitle, mClipLibrary, mWord, mYouTube, mWebDict, mHelp];
    } else {
        template = [mLiteApplication, mLiteFile, mEdit, mPlayback, mLoop, mSubtitle, mHelp];
    }

    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

ipcMain.on('is-pro', (event, arg) => {
    isPro = arg;
    buildMenu(isPro);
});

ipcMain.on('app-ready', () => {
    if (isPro) {
        const file = new nodeStatic.Server(`${__dirname}/static`);
        server = http.createServer((request, response) => {
            request
                .addListener('end', () => {
                    file.serve(request, response);
                })
                .resume();
        });
        server.listen(0);
        server.on('listening', () => {
            port = server.address().port;
            log.info(`Listening to port: ${port}`);
            mainWindow.webContents.send('port', port);

            if (openWithUrl) {
                mainWindow.webContents.send('open-url-with', openWithUrl);
            }
        });
    }

    if (openWithPath) {
        mainWindow.webContents.send('open-file-with', openWithPath);
    }
});
