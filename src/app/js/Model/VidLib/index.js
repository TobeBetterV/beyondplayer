import shortid from 'shortid';
import { remote, shell } from 'electron';
import fs from 'fs-extra';
import path from 'path-extra';
import FlexSearch from 'flexsearch';
import sizeOf from 'image-size';
import converter from './VidConverter';
import TagSearch from '../TagSearch';
import { parseLinesFromFile, formatMs } from '../KUtils';

const log = require('electron-log');

class VidLib {
    basePath;
    indexPath;
    index;
    tagIndex;

    constructor(base) {
        if (base) {
            this.basePath = base;
        } else {
            this.basePath = path.join(remote.app.getPath('userData'), 'vidlib/default');
        }
        this.indexPath = path.join(this.basePath, 'index');
        this.tagIndexPath = path.join(this.basePath, 'tagIndex');

        if (!base) {
            fs.ensureDirSync(this.basePath);
        }

        this.index = new FlexSearch();

        if (fs.existsSync(this.indexPath)) {
            this.index.import(fs.readFileSync(this.indexPath, 'utf8'));
        }

        this.tagIndex = new TagSearch(this.tagIndexPath);
        this.tagIndex.load();
    }

    retrieveAll = sortInAscending => {
        if (sortInAscending) {
            return this.index.index;
        }
        return this.index.index.reverse();
    };

    search = (searchTerm, sortInAscending) => {
        const trimmedTerm = searchTerm.trim();

        let ids;
        let query;
        let tags = [];

        const sharpIndex = trimmedTerm.search('#');
        if (sharpIndex === -1) {
            query = trimmedTerm;
            ids = this.index.search(trimmedTerm);
        } else {
            query = trimmedTerm.substr(0, sharpIndex);
            ids = new Set(this.index.search(query));
            const tagString = trimmedTerm.substr(sharpIndex, trimmedTerm.length - sharpIndex);

            tags = tagString
                .split('#')
                .filter(tag => tag)
                .map(tag => tag.trim());
            const tagIds = this.tagIndex.findIdsWithTags(tags);
            const tagSet = new Set(tagIds);

            if (ids.size === 0) {
                ids = Array.from(tagSet);
            } else {
                const intersection = new Set();
                for (const id of ids) if (tagSet.has(id)) intersection.add(id);
                ids = Array.from(intersection);
            }
        }
        if (!sortInAscending) ids = ids.reverse();
        return { ids, query, tags };
    };

    genVids = ids => {
        const vids = [];
        for (let index = 0; index < ids.length; index += 1) {
            const id = ids[index];
            const vid = this.genVidInfo(id);
            if (vid) {
                vids.push(vid);
            }
        }
        return vids;
    };

    getAllTags = () => {
        return this.tagIndex.getAllTags();
    };

    getAllTagCounts = () => {
        return this.tagIndex.getAllTagCounts();
    };

    combineLines = (lines, lines2) => {
        let linesCombined;
        if (lines2.length === lines.length) {
            linesCombined = [...lines];
            linesCombined.forEach((line, index) => {
                const line2 = lines2[index];
                line.sentences = line.sentences.concat(line2.sentences);
            });
        } else {
            linesCombined = lines.length > 0 ? lines : lines2;
        }
        return linesCombined;
    };

    genVidInfo = theId => {
        try {
            const id = theId.replace('@', '');
            const clipFolderPath = path.join(this.basePath, id);
            const clipPath = path.join(clipFolderPath, 'vid.mp4');
            const srtPath = path.join(clipFolderPath, 'vid.srt');
            const srtPath2 = path.join(clipFolderPath, 'vid.2.srt');
            const thumbnailPath = path.join(clipFolderPath, 'vid.png');
            const tagPath = path.join(clipFolderPath, 'tags.txt');
            const size = sizeOf(thumbnailPath);

            const lines = parseLinesFromFile(srtPath, 'UTF-8');
            const lines2 = parseLinesFromFile(srtPath2, 'UTF-8');
            const tags = this.parseTag(tagPath);

            const linesCombined = this.combineLines(lines, lines2);

            return {
                id,
                lines,
                lines2,
                linesCombined,
                tags,
                thumbnail: thumbnailPath,
                vid: clipPath,
                meta: { size }
            };
        } catch (ex) {
            log.error(`Unable to open vid ${theId}: ${ex}`);
            return null;
        }
    };

    updateVidTags = (id, newTags) => {
        const vidInfo = this.genVidInfo(id);
        if (!vidInfo) return;
        const oldTags = vidInfo.tags;
        const clipFolderPath = path.join(this.basePath, id);
        const tagPath = path.join(clipFolderPath, 'tags.txt');
        this.saveTags(tagPath, newTags);
        this.tagIndex.removeAll(oldTags, id);
        this.tagIndex.addAll(newTags, id);
    };

    removeVid = id => {
        const vidInfo = this.genVidInfo(id);
        if (!vidInfo) return;
        this.tagIndex.removeAll(vidInfo.tags, id);
        const clipFolderPath = path.join(this.basePath, id);
        fs.removeSync(clipFolderPath);
        this.index.remove(id);
        fs.writeFileSync(this.indexPath, this.index.export());
    };

    reveal = id => {
        const clipFolderPath = path.join(this.basePath, id);
        shell.openItem(clipFolderPath);
    };

    copyVid = async (sourceVidPath, id, save = false) => {
        const destVidPath = path.join(this.basePath, id);
        await fs.copy(sourceVidPath, destVidPath);
        const vidInfo = this.genVidInfo(id);
        if (!vidInfo) return;

        this.tagIndex.addAll(vidInfo.tags, id, save);

        // added to index
        const text = this.combineAllText(vidInfo.linesCombined);
        this.index.add(id, text);
        if (save) {
            await fs.writeFile(this.indexPath, this.index.export());
        }
    };

    saveToLib = async ({ vidPath, lines, lines2, startIndex, endIndex, timeOffsetMs, tags, aid }) => {
        if (lines.length === 0 && lines2.length === 0) {
            log.log('Unable to save video clip, no subtitle');
            return false;
        }
        const linesPrimary = lines.length !== 0 ? lines : lines2;

        // create clip folder
        const id = shortid.generate();
        const clipFolderPath = path.join(this.basePath, id);
        fs.ensureDirSync(clipFolderPath);

        const clipPath = path.join(clipFolderPath, 'vid.mp4');
        const srtPath = path.join(clipFolderPath, 'vid.srt');
        const srtPath2 = path.join(clipFolderPath, 'vid.2.srt');
        const thumbnailPath = path.join(clipFolderPath, 'vid.png');
        const tagPath = path.join(clipFolderPath, 'tags.txt');

        // convert vid
        const startTime = formatMs(linesPrimary[startIndex].start - timeOffsetMs);
        const endTime = formatMs(linesPrimary[endIndex].end - timeOffsetMs);

        let result = await converter.convert(vidPath, startTime, endTime, aid, clipPath);

        // create thumbnail
        if (result) {
            result = await converter.genThumbnail(clipPath, '00:00:00.0', thumbnailPath);
        }

        // error check
        if (!result) {
            fs.removeSync(clipFolderPath);
            return false;
        }
        if (lines.length > 0) {
            // create srt
            await this.saveSrt(lines, startIndex, endIndex, srtPath);
        }

        if (lines2.length > 0) {
            // create secondary srt
            await this.saveSrt(lines2, startIndex, endIndex, srtPath2);
        }

        // create tags
        await this.saveTags(tagPath, tags);
        this.tagIndex.addAll(tags, id);

        // added to index
        const vidInfo = this.genVidInfo(id);
        const text = this.combineAllText(vidInfo.linesCombined);
        this.index.add(id, text);
        fs.writeFileSync(this.indexPath, this.index.export());

        return true;
    };

    combineAllText = lines => {
        let text = '';
        let first = true;
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            text += line.text;
            if (first) {
                first = false;
            } else {
                text += ' ';
            }
        }
        return text;
    };

    saveSrt = async (lines, startIndex, endIndex, thePath) => {
        const startTime = lines[startIndex].start;
        const newLines = [];
        for (let index = startIndex; index <= endIndex; index += 1) {
            const line = lines[index];
            newLines.push(`${index - startIndex + 1}\r\n`);
            newLines.push(`${formatMs(line.start - startTime, ',')} --> ${formatMs(line.end - startTime, ',')}\r\n`);
            newLines.push(`${line.text}\r\n\r\n`);
        }
        await fs.writeFile(thePath, newLines.join(''));
    };

    saveTags = async (thePath, tags) => {
        let first = true;
        const lines = [];
        tags.forEach(tag => {
            if (first) {
                first = false;
            } else {
                lines.push(`\r\n`);
            }
            lines.push(tag);
        });
        await fs.writeFile(thePath, lines.join(''));
    };

    parseTag = thePath => {
        if (fs.existsSync(thePath)) {
            const tagString = fs.readFileSync(thePath, 'utf8');
            return tagString.split('\r\n').filter(tag => {
                return tag;
            });
        }
        return [];
    };

    getVidBasePath = id => {
        return path.join(this.basePath, id);
    };

    export = async newPath => {
        await fs.copy(this.basePath, newPath);
    };

    import = async sourcePath => {
        const source = new VidLib(sourcePath);
        const allIds = source.retrieveAll().reverse();
        const myIds = this.retrieveAll();
        for (let index = 0; index < allIds.length; index += 1) {
            let id = allIds[index];
            if (!myIds.includes(id)) {
                id = id.replace('@', '');
                const baseVidPath = source.getVidBasePath(id);
                await this.copyVid(baseVidPath, id, false);
            }
        }
        fs.writeFileSync(this.indexPath, this.index.export());
        this.tagIndex.save();
    };
}

export default new VidLib();
