/* eslint-disable max-len */
import util from 'util';
import { remote } from 'electron';
import fs from 'fs-extra';
import path from 'path-extra';
import { getFFmpegExePath } from '../FFmpegHelper';

const log = require('electron-log');

const exec = util.promisify(require('child_process').exec);

class VidConverter {
    convert = async (vidPath, startTime, endTime, aid, outPath) => {
        // ffmpeg -fflags +genpts -i Girl\,\ Interrupted\ 1999\ DvDrip\[Eng\]-greenbud1969.avi -ss 00:01:30.0 -acodec copy -vcodec copy -t 00:00:30.0 out.mp4
        const tempFile = path.join(remote.app.getPath('temp'), 'tempvid.mp4');
        if (fs.existsSync(tempFile)) {
            fs.removeSync(tempFile);
        }
        try {
            // const commandExtract = `ffmpeg -ss ${startTime} -to ${endTime} -fflags +genpts -i "${vidPath}" -acodec copy -vcodec copy -strict -2 "${tempFile}"`
            const commandExtract = `"${getFFmpegExePath(
                'ffmpeg'
            )}" -ss ${startTime} -to ${endTime} -fflags +genpts -i "${vidPath}" -acodec aac -vcodec copy -map 0:v:0 -map 0:a:${aid -
                1} -strict -2 -b:a 128k "${tempFile}"`;
            const commandScale = `"${getFFmpegExePath(
                'ffmpeg'
            )}" -i "${tempFile}" -vf scale=370:-2 -acodec aac -af "aresample=async=1000" -max_muxing_queue_size 1999 "${outPath}"`;

            let r = await exec(commandExtract);
            if (r.error) {
                log.error(`error on extract: ${r.error}`);
                return false;
            }
            r = await exec(commandScale);

            if (r.error) {
                log.error(`error on scale: ${r.error}`);
                return false;
            }
        } catch (e) {
            log.error(`error on generating movie clip: ${e}`);
            return false;
        }

        return true;
    };

    genThumbnail = async (vidPath, time, outPath) => {
        const commandThumbnail = `"${getFFmpegExePath('ffmpeg')}" -i "${vidPath}" -ss ${time} -vframes 1 "${outPath}"`;
        log.log(commandThumbnail);
        const { error } = await exec(commandThumbnail);
        if (error) {
            log.error(`error on gen thumbnail: ${error}`);
            return false;
        }
        return true;
    };
}

export default new VidConverter();
