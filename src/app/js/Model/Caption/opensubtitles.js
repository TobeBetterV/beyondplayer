import OS from 'opensubtitles-api';
import { head } from 'lodash';
import zlib from 'zlib';
import fse from 'fs-extra';
import bluebird from 'bluebird';
import iconvlite from 'iconv-lite';
import got from 'got';

const zlibUnzip = bluebird.promisify(zlib.unzip);

const OpenSubtitles = new OS({
    useragent: 'EMPlayer v1',
    ssl: true
});

const download = async (item, path) => {
    const response = await got(item.downloadUrl, { encoding: null });
    const unzipped = await zlibUnzip(response.body);
    const subtitleContent = iconvlite.decode(unzipped, item.encoding);
    await fse.writeFile(path, subtitleContent, 'utf8');
};

const transform = items =>
    items.map(({ filename, url, encoding, score }) => ({
        score,
        download,
        encoding,
        name: filename,
        downloadUrl: url,
        extention: '',
        source: 'opensubtitles',
        size: ''
    }));

const textSearch = async (query, language, limit) => {
    const options = {
        sublanguageid: language,
        limit,
        query,
        gzip: true
    };

    let items = [];

    try {
        items = await OpenSubtitles.search(options);

        if (!items) {
            console.log(`Opensubtitles: Nothing found...`);
            return [];
        }

        const firstItem = head(Object.keys(items)); // firstItem is selected language: obj[language]
        const results = items[firstItem];

        if (!results) return [];

        return transform(results);
    } catch (e) {
        alert('Unable to retrieve data from OpenSubtitle: ' + e);
    }
    return items;
};

const fileSearch = async (files, language, limit) => {
    const subtitleReferences = files.map(async file => {
        const info = await OpenSubtitles.identify({
            path: file.path,
            extend: true
        });

        const options = {
            limit,
            sublanguageid: language,
            hash: info.moviehash,
            filesize: info.moviebytesize,
            path: file.path,
            filename: file.filename,
            imdbid: null,
            gzip: true
        };

        if (info && info.metadata && info.metadata.imdbid) {
            options['imdbid'] = info.metadata.imdbid;
        }

        const result = await OpenSubtitles.search(options);
        const firstItem = head(Object.keys(result));
        const subtitle = result[firstItem];

        return {
            file,
            subtitle
        };
    });

    const downloadedReferences = await Promise.all(subtitleReferences);
    const subtitleResults = downloadedReferences.filter(({ subtitle }) => subtitle !== undefined);

    return subtitleResults;
};

export default {
    textSearch,
    fileSearch,
    download
};
