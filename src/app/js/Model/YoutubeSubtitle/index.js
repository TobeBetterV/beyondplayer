import fs from 'fs-extra';
import log from 'electron-log';
import { remote } from 'electron';
import { parseAutoGen, parseCC } from '../youtube-subtitle-converter';
import { formatMs } from '../KUtils';

class YoutubeSubtitle {
    getSubtitleFromUrl = async (url, videoId, lang) => {
        let lines = [];
        if (lang.startsWith('cc_')) {
            lines = await this.getCCFromId(videoId, lang.replace('cc_', ''));
        } else {
            lines = await this.getAutoSubFromUrl(url, lang);
        }
        return lines;
    };

    downloadSubtitleFromUrl = async (url, videoId, lang) => {
        const lines = await this.getSubtitleFromUrl(url, videoId, lang);
        const text = this.convertLinesToSrt(lines);
        const filePath = remote.dialog.showSaveDialog(remote.getCurrentWindow(), { defaultPath: `YouTubeSubtitle.${lang}.srt` });
        await fs.writeFile(filePath, text);
        return filePath;
    };

    convertLinesToSrt = lines => {
        const result = lines.reduce((text, line, index) => {
            let temp = `${index + 1}\n`;
            temp += `${formatMs(line.start)} --> ${formatMs(line.end)}\n`;
            temp += `${line.text}\n\n`;
            return text + temp;
        }, '');
        return result;
    };

    getAutoSubFromUrl = async (url, lang) => {
        let lines = [];
        const text = await this.sendAutoGenerateRequest(url, lang);
        if (text) {
            lines = parseAutoGen(text);
        }
        return lines;
    };

    getCCFromId = async (videoId, lang) => {
        const text = await this.sendCCRequest(videoId, lang);
        let lines = [];
        if (text) {
            lines = parseCC(text);
        }
        return lines;
    };

    sendAutoGenerateRequest = async (url, lang) => {
        let requestUrl = url;
        if (!requestUrl.includes(`lang=${lang}`)) {
            requestUrl += `&tlang=${lang}`;
        }
        const text = await this.requestText(requestUrl);
        return text;
    };

    sendCCRequest = async (videoId, lang) => {
        const url = `http://video.google.com/timedtext?lang=${lang}&v=${videoId}`;
        log.info(`getCCFromId:${url}`);

        const text = await this.requestText(url);
        return text;
    };

    ccListParser = text => {
        const trackList = new DOMParser().parseFromString(text, 'text/xml').getElementsByTagName('track');
        return Array.from(trackList).map(trackElement => ({
            key: `cc_${trackElement.getAttribute('lang_code')}`,
            name: `${trackElement.getAttribute('lang_translated')} [cc]`
        }));
    };

    getCCListFromId = async videoId => {
        const listUrl = `https://video.google.com/timedtext?hl=en&v=${videoId}&type=list`;
        log.info(`listUrl:${listUrl}`);
        const text = this.requestText(listUrl);
        if (text) {
            return this.ccListParser(text);
        }
        return [];
    };

    requestText = async url => {
        return new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    resolve('');
                }
            });
            xhr.addEventListener('error', () => {
                log.error(xhr.statusText);
                resolve('');
            });
            xhr.open('GET', url);
            xhr.send();
        });
    };
}

export default new YoutubeSubtitle();
