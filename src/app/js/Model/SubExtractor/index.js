import fs from 'fs';
import path from 'path';
import Ffmpeg from 'fluent-ffmpeg';

const fileExists = require('file-exists').sync;

const streamToString = (stream, enc) => {
    let str = '';
    return new Promise((resolve, reject) => {
        stream.on('data', data => {
            str += typeof enc === 'string' ? data.toString(enc) : data.toString();
        });

        stream.on('end', () => resolve(str));
        stream.on('error', reject);
    });
};

export const subtitleExtractor = (filePath, outputDir, progressCallback) => {
    const dir = outputDir || path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const srtPath = language => {
        const languageSuffix = language ? `.${language}` : '';
        return path.join(dir, `${name + languageSuffix}.srt`);
    };
    return new Promise((resolve, reject) =>
        Ffmpeg({ source: filePath }).ffprobe(async (err, { streams }) => {
            if (err) {
                return reject(err);
            }

            const subtitles = streams.filter(
                ({ codec_type, codec_name }) => codec_type === 'subtitle' && !codec_name.match(/.*_pgs_*.|dvd_subtitle/i)
            );
            const result = [];

            try {
                for (const subtitleItem of subtitles) {
                    const { index, tags = {} } = subtitleItem;
                    const language = tags.language || tags.LANGUAGE || index;
                    // const title = tags.title || '';
                    let text = await new Promise((subtitleResolve, subtitleReject) => {
                        let subtitleText;

                        const stream = Ffmpeg({ source: filePath })
                            .outputOptions(`-map 0:${index}`)
                            .format('srt')
                            .on('error', subtitleReject)
                            .on('end', () => subtitleResolve(subtitleText))
                            .pipe(undefined, { end: true });

                        subtitleText = streamToString(stream);
                    });

                    text = text.replace(/\<[^>]*\>/g, '');
                    let subtitlePath = srtPath(language);
                    for (let i = 2; fileExists(subtitlePath); i += 1) {
                        subtitlePath = language ? srtPath(language + i) : srtPath(i);
                    }
                    fs.writeFileSync(subtitlePath, text, { encoding: 'utf-8' });
                    const item = {
                        number: index,
                        path: subtitlePath,
                        language
                    };
                    result.push(item);
                    setTimeout(() => {
                        progressCallback(item, result.length - 1);
                    }, 0);
                }
            } catch (error) {
                return reject(error);
            }

            resolve(result);
        })
    );
};
