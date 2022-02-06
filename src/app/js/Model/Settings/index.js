import storage from 'electron-json-storage';

class Settings {
    KEY = 'settings';

    SKEY_PWFF = 'pauseWhenFastForward';
    SKEY_VOICE = 'voice';
    SKEY_CWB = 'clickWordBehaviour';
    SKEY_EXT_DIC = 'externalDic';
    SKEY_HWDD = 'hardwareDecoder';
    SKEY_YT_PM = 'youtubePlaybackMethod';
    SKEY_YT_PQ = 'youtubePlaybackQuality';
    SKEY_ENABLE_SOCKS5 = 'enable_socks5';
    SKEY_SOCKS5_IP = 'socks5_ip';
    SKEY_SOCKS5_PORT = 'socks5_port';
    SKEY_SINGLE_LINE_LOOP_COUNT = 'single_line_loop_count';
    SKEY_FSP = 'fixed_subtitle_position';
    SKEY_DSB = 'display_subtitle_background';
    SKEY_DWN = 'display_word_notification';

    SKEY_PLAYER_SUB_SIZE = 'player_sub_size';
    SKEY_PLAYER_SUB_COLOR = 'player_sub_color';
    SKEY_PLAYER_SUB_FONT = 'player_sub_font';
    SKEY_SIDE_PANE_SUB_STYLE = 'side_pane_sub_style';
    SKEY_SIDE_PANE_SUB_SIZE = 'side_pane_sub_size';

    CWB_POPUP_DIC = '0';
    CWB_WEB_DIC = '1';
    CWB_EXT_DIC = '2';

    EXD_APPLE_DIC = '0';
    EXD_EUDIC = '1';

    YT_PM_IFRAME_API = 'iframe_api';
    YT_PM_G_STREAM = 'google_video_stream';

    YT_PQ_720 = '720p';
    YT_PQ_360 = '360p';
    YT_PQ_240 = '240p';
    YT_PQ_144 = '144p';
    UI_LNG = 'uiLanguage';

    settings;
    loaded = false;

    defaultSettings = {
        [this.SKEY_CWB]: this.CWB_POPUP_DIC,
        [this.UI_LNG]: '',
        [this.SKEY_VOICE]: '',
        [this.SKEY_EXT_DIC]: this.EXD_APPLE_DIC,
        [this.SKEY_HWDD]: 'no',
        [this.SKEY_YT_PM]: this.YT_PM_IFRAME_API,
        [this.SKEY_YT_PQ]: this.YT_PQ_360,
        [this.SKEY_PWFF]: false,
        [this.SKEY_ENABLE_SOCKS5]: false,
        [this.SKEY_SOCKS5_IP]: '',
        [this.SKEY_SOCKS5_PORT]: '',
        [this.SKEY_SINGLE_LINE_LOOP_COUNT]: 2,
        [this.SKEY_FSP]: false,
        [this.SKEY_DSB]: false,
        [this.SKEY_DWN]: true,
        [this.SKEY_PLAYER_SUB_SIZE]: 1,
        [this.SKEY_PLAYER_SUB_FONT]: 1,
        [this.SKEY_PLAYER_SUB_COLOR]: 1,
        [this.SKEY_SIDE_PANE_SUB_SIZE]: 1
    };

    load = callback => {
        if (this.loaded) {
            if (callback) {
                callback(this.settings);
            }
            return;
        }

        storage.get(this.KEY, (error, data) => {
            if (error) throw error;
            if (_.isEmpty(data)) {
                this.settings = this.defaultSettings;
            } else {
                this.settings = data;
            }
            if (callback) {
                callback(this.settings);
            }
            this.loaded = true;
        });
    };

    save = data => {
        this.settings = data;
        storage.set(this.KEY, data, function(error) {
            if (error) throw error;
        });
    };

    restore = () => {
        this.save(this.defaultSettings);
    };

    getAllSettings() {
        Object.keys(this.defaultSettings).forEach(key => {
            this.getSettings(key);
        });
        return this.settings;
    }

    getSettings(key) {
        if (!(key in this.settings)) {
            this.settings[key] = this.defaultSettings[key];
        }
        return this.settings[key];
    }

    setSettings(key, v) {
        this.settings[key] = v;
        this.save(this.settings);
    }

    getSocks5() {
        if (this.getSettings(this.SKEY_ENABLE_SOCKS5)) {
            const ip = this.getSettings(this.SKEY_SOCKS5_IP);
            const port = this.getSettings(this.SKEY_SOCKS5_PORT);
            if (ip && port) {
                return `socks5://${ip}:${port}`;
            }
        }
        return '';
    }

    getPlayerSubtitleSize() {
        return this.getSettings(this.SKEY_PLAYER_SUB_SIZE);
    }

    setPlayerSubtitleSize(v) {
        this.setSettings(this.SKEY_PLAYER_SUB_SIZE, v);
    }

    getSidePaneSubtitleSize() {
        return this.getSettings(this.SKEY_SIDE_PANE_SUB_SIZE);
    }

    getSidePaneSubtitleSizeInPx() {
        const size = this.getSettings(this.SKEY_SIDE_PANE_SUB_SIZE);

        switch (size) {
            case 1:
                return 16;
            case 2:
                return 20;
            case 3:
                return 24;
            default:
                return 16;
        }
    }

    getSidePaneCharsPerLine() {
        const size = this.getSettings(this.SKEY_SIDE_PANE_SUB_SIZE);

        switch (size) {
            case 1:
                return 38;
            case 2:
                return 38;
            case 3:
                return 34;
            default:
                return 38;
        }
    }

    getSidePaneRowHeight() {
        const size = this.getSettings(this.SKEY_SIDE_PANE_SUB_SIZE);

        switch (size) {
            case 1:
                return 25;
            case 2:
                return 31;
            case 3:
                return 37;
            default:
                return 25;
        }
    }

    getLanguage() {
        return this.getSettings(this.UI_LNG);
    }

    COLORS = ['White', 'Gold', 'Cyan', 'SpringGreen', 'Orange', 'Yellow'];

    FONTS = [
        {
            fontFamily: 'k-merriweather',
            name: 'Merriweather Sans',
            credit: 'https://fonts.google.com/specimen/Merriweather+Sans'
        },
        {
            fontFamily: 'k-oswald',
            name: 'Oswald',
            credit: 'https://fonts.google.com/specimen/Oswald'
        },
        {
            fontFamily: 'k-fira-sans-condensed',
            name: 'Fira-Sans-Condensed',
            credit: 'https://fonts.google.com/specimen/Fira+Sans+Condensed'
        }
    ];

    getPlayerSubtitleColor() {
        let color;
        const colorIndex = this.getSettings(this.SKEY_PLAYER_SUB_COLOR) - 1;

        if (colorIndex < this.COLORS.length) {
            color = this.COLORS[colorIndex];
        } else {
            color = this.COLORS[0];
        }

        return color;
    }

    getPlayerSubtitleFont() {
        let font;
        const index = this.getSettings(this.SKEY_PLAYER_SUB_FONT) - 1;

        if (index < this.FONTS.length) {
            font = this.FONTS[index];
        } else {
            font = this.FONTS[0];
        }

        return font.fontFamily;
    }

    getPlayerSubtitleBackground() {
        return this.getSettings(this.SKEY_DSB) ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)';
    }

    setSidePaneSubtitleSize(v) {
        this.setSettings(this.SKEY_SIDE_PANE_SUB_SIZE, v);
    }

    PLAYER_SUBTITLE_STEP = 0.05;

    MAX_PLAYER_SUBTITLE_SIZE = 2.5;
    MIN_PLAYER_SUBTITLE_SIZE = 0.7;

    stepPlayerSubtitleSize(bigger) {
        const current = this.getPlayerSubtitleSize();

        if (bigger) {
            if (current < this.MAX_PLAYER_SUBTITLE_SIZE) {
                this.setPlayerSubtitleSize(Math.min(current + this.PLAYER_SUBTITLE_STEP, this.MAX_PLAYER_SUBTITLE_SIZE));
            }
        } else {
            if (current > this.MIN_PLAYER_SUBTITLE_SIZE) {
                this.setPlayerSubtitleSize(Math.max(current - this.PLAYER_SUBTITLE_STEP, this.MIN_PLAYER_SUBTITLE_SIZE));
            }
        }
    }
}

export default new Settings();
