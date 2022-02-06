import parseTimestamps from './parseTimestamps';
/**
 * Parse a SRT or WebVTT string.
 * @param {String} srtOrVtt
 * @return {Array} subtitles
 */

export default function parse(srtOrVtt) {
    if (!srtOrVtt) return [];

    const source = srtOrVtt
        .trim()
        .concat('\n')
        .replace(/\r\n/g, '\n')
        .replace(/\\N/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^WEBVTT.*\n(?:.*: .*\n)*\n/, '')
        .replace(/<font (color|face|size)=".+">/g, '')
        .replace(/<\/?b>/g, '')
        .replace(/<\/font>/g, '')
        .split('\n');

    let lines = source.reduce(
        (captions, row, index) => {
            const caption = captions[captions.length - 1];

            if (!caption.index) {
                if (/^-?\d+$/.test(row)) {
                    caption.index = parseInt(row, 10);
                    return captions;
                }
            }

            if (!caption.hasOwnProperty('start')) {
                let timeObj;
                try {
                    timeObj = parseTimestamps(row);
                } catch (ex) {
                    console.log('Unable to parse row: ' + row);
                    console.log('ex:' + ex);
                    timeObj = { start: 0, end: 0 };
                }
                Object.assign(caption, timeObj);
                return captions;
            }

            if (row === '') {
                delete caption.index;
                if (index !== source.length - 1) {
                    captions.push({});
                }
            } else {
                row = row.replace(/\{\\.+?\}/g, '');
                caption.text = caption.text ? caption.text + '\n' + row : row;
            }

            return captions;
        },
        [{}]
    );

    let prevStart, prevEnd;
    lines = lines.reduce((result, line, index) => {
        if (index != 0) {
            if (line.start == prevStart && line.end == prevEnd) {
                result[result.length - 1].text += '\n' + line.text;
            } else {
                result.push(line);
            }
        } else {
            result.push(line);
        }
        prevStart = line.start;
        prevEnd = line.end;
        return result;
    }, []);

    return lines;
}
