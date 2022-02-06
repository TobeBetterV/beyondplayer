import path from 'path';
import util from 'util';
import log from 'electron-log';
import FFmpeg from 'fluent-ffmpeg';
import { remote } from 'electron';

const isDev = require('electron-is-dev');
const exec = util.promisify(require('child_process').exec);

export const getFFmpegExePath = exeName => {
    let exePath;
    if (isDev) {
        const appPath = path.join(remote.app.getAppPath(), '..');
        exePath = path.join(appPath, 'scripts', 'dist', exeName);
    } else {
        const appPath = remote.app.getAppPath();
        exePath = path.join(appPath, 'node_modules', 'mpv.js', 'build', 'Release', exeName);
    }
    return exePath.replace('app.asar', 'app.asar.unpacked');
};

export const initFFmpegPath = () => {
    const ffmpegPath = getFFmpegExePath('ffmpeg');
    const ffprobePath = getFFmpegExePath('ffprobe');

    log.info(`Init ffmpeg path:${ffmpegPath}`);
    log.info(`Init ffprobe path:${ffprobePath}`);

    FFmpeg.setFfmpegPath(ffmpegPath);
    FFmpeg.setFfprobePath(ffprobePath);
};

export const convertToSrt = async subtitleFile => {
    const baseName = path.basename(subtitleFile);
    const tempFile = path.join(remote.app.getPath('temp'), `${baseName}.srt`);
    const command = `"${getFFmpegExePath('ffmpeg')}" -y -i "${subtitleFile}" "${tempFile}"`;

    log.info(`Execute Command: ${command}`);

    try {
        const r = await exec(command);
        if (r.error) throw r.error;
    } catch (e) {
        log.error(`error on converting ${subtitleFile} to srt file: ${e}`);
        return '';
    }

    return tempFile;
};
