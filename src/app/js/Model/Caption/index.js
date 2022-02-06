const Promise = require('bluebird');
import addic7ed from './addic7ed';
import opensubtitles from './opensubtitles';
import path from 'path-extra';
import fs from 'fs-extra';

class Caption {
    sources;
    constructor() {
        this.sources = [opensubtitles, addic7ed];
    }

    getLocalSubtitles = movieFile => {
        let dirName = path.dirname(movieFile);
        let idxFilePath = path.replaceExt(movieFile, '.kidx');
        console.log(`idxFilePath: ${idxFilePath}`);

        if (!fs.existsSync(idxFilePath)) {
            fs.closeSync(fs.openSync(idxFilePath, 'w'));
        }
        let subFiles = fs
            .readFileSync(idxFilePath)
            .toString()
            .split('\n');

        subFiles = subFiles.filter(subFile => subFile);

        subFiles = subFiles.map(subFile => {
            if (!subFile.startsWith('/')) {
                return path.join(dirName, subFile);
            }
            return subFile;
        });
        return subFiles;
    };

    searchByQuery = async (query, language = 'eng', limit = 10) => {
        if (language == 'eng') {
            query = query.replace(/[^\x00-\x7F]/g, '');
            query = query.replace(/\.\.\./g, '.');
            query = query.replace(/\.\./g, '.');
            query = query.replace(/^\./g, '');
        }

        const checkSources = this.sources.map(source => {
            try {
                return source.textSearch(query, language, limit);
            } catch (e) {
                alert(e);
                return [];
            }
        });

        let all = await Promise.all(checkSources);
        let results = [];
        for (let r of all) {
            results = results.concat(r);
        }
        return results;
    };

    searchByFiles(files, language = 'eng', limit = 10) {
        const opensubtitlesRef = opensubtitles.fileSearch(files, language, limit);

        return {
            on(event, callback) {
                switch (event) {
                    case 'completed':
                    default:
                        // First promise which is resolved should return its results
                        Promise.race([opensubtitlesRef]).then(results => callback(results));

                        return this;
                }
            }
        };
    }

    download = async (item, source, filename) => {
        switch (source) {
            case 'opensubtitles':
                return await opensubtitles.download(item, filename);
            case 'addic7ed':
                return await addic7ed.download(item, filename);
        }
    };
}

export default new Caption();
