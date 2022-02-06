import path from 'path-extra';
import { remote, shell } from 'electron';
import md5 from 'md5';
import fs from 'fs-extra';
const i18n = remote.require('./i18n');
import { deleteFolderRecursiveSync, parseLinesFromFile } from '../KUtils';

class SubStore {
    basePath;

    constructor() {
        this.basePath = path.join(remote.app.getPath('userData'), 'subtitles');
        fs.ensureDirSync(this.basePath);
    }

    getStorePath(filePath) {
        var hash = md5(filePath);
        console.log(`hash: ${hash}`);
        return path.join(this.basePath, hash);
    }

    createStoreFolder(filePath) {
        var folderPath = this.getStorePath(filePath);
        fs.ensureDirSync(folderPath);
    }

    saveTimePos = (movieUrl, timePos, timeOffset, secondTimeOffset, subtitle, secondSubtitle) => {
        const storePath = this.getStorePath(movieUrl);
        fs.ensureDirSync(storePath);

        const timePosFilePath = this.getStoreTimePosFile(movieUrl);

        const obj = {
            timePos,
            subtitle,
            secondSubtitle,
            timeOffset,
            secondTimeOffset
        };
        fs.writeFileSync(timePosFilePath, JSON.stringify(obj));
    };

    getStoreTimePosFile = movieUrl => {
        let basename = path.basename(movieUrl);
        let storePath = this.getStorePath(movieUrl);
        console.log(`storePath: ${storePath}`);
        let timePosFilePath = path.join(storePath, basename + '.tps');
        console.log(`timePosFilePath: ${timePosFilePath}`);
        return timePosFilePath;
    };

    getLocalTimePos = movieUrl => {
        if (movieUrl.startsWith('http')) return { timePos: 0, subtitle: '', timeOffset: 0 };

        let timePosFilePath = this.getStoreTimePosFile(movieUrl);

        if (!fs.existsSync(timePosFilePath)) {
            fs.closeSync(fs.openSync(timePosFilePath, 'w'));
        }
        let obj = {};
        try {
            obj = JSON.parse(fs.readFileSync(timePosFilePath).toString());
        } catch (e) {}

        if (!obj.timePos) {
            obj.timePos = 0;
        }
        if (!obj.subtitle) {
            obj.subtitle = '';
        }
        if (!obj.secondSubtitle) {
            obj.secondSubtitle = '';
        }
        if (!obj.timeOffset) {
            obj.timeOffset = 0;
        }
        if (!obj.secondTimeOffset) {
            obj.secondTimeOffset = 0;
        }
        return obj;
    };

    clearSubtitles = (movieUrl, callback) => {
        if (!movieUrl || movieUrl.startsWith('http')) return;

        let storePath = this.getStorePath(movieUrl);
        if (fs.existsSync(storePath)) {
            var result = confirm(i18n.t('confirm.clear.subtitles'));
            if (result) {
                deleteFolderRecursiveSync(storePath);
                if (callback) callback();
            }
        }
    };

    getLocalSubtitles = movieUrl => {
        if (movieUrl.startsWith('http')) return [];

        let storePath = this.getStorePath(movieUrl);
        if (!fs.existsSync(storePath)) {
            fs.mkdirpSync(storePath);
        }

        let subFiles = fs
            .readdirSync(storePath)
            .filter(file => {
                var lower = file.toLocaleLowerCase();
                return lower.endsWith('srt') || lower.endsWith('lrc');
            })
            .map(file => path.join(storePath, file));

        subFiles.unshift('None');
        return subFiles;
    };

    addExternalSubtitle = (movieUrl, subtitleFileName) => {
        this.createStoreFolder(movieUrl);
        let storePath = path.join(this.getStorePath(movieUrl), path.basename(subtitleFileName));
        fs.copySync(subtitleFileName, storePath);
    };

    revealSubtitleFolder = movieUrl => {
        if (!movieUrl || movieUrl.startsWith('http')) return;

        let storePath = this.getStorePath(movieUrl);
        if (fs.existsSync(storePath)) {
            shell.openItem(storePath);
        }
    };
}

export default new SubStore();
