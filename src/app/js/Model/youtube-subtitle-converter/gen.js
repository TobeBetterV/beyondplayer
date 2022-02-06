import he from 'he';
import { breakLine } from '../KUtils';

const genCCSub = body => {
    const lineObjs = body.slice(2).filter(lineObj => lineObj.length > 2);
    const subtitles = lineObjs.map(([tagName, { t, d }, text], i) => {
        const startTime = parseInt(t);
        const endTime = parseInt(d) + startTime;

        return {
            text,
            start: startTime,
            end: endTime,
            sentences: breakLine(text),
            index: i
        };
    }, '');

    return subtitles;
};

const genTranscript = body => {
    const lineObjs = body.slice(2).filter(lineObj => lineObj.length > 2);
    const subtitles = lineObjs.map(([tagName, { start, dur }, text], i) => {
        const startTime = parseFloat(start) * 1000;
        const endTime = parseFloat(dur) * 1000 + startTime;
        var sub = {
            start: startTime,
            end: endTime,
            text: text,
            sentences: breakLine(he.decode(text)),
            index: i
        };
        return sub;
    }, '');

    return subtitles;
};

const genSub = body => {
    const lineObjs = body.slice(2).filter(lineObj => lineObj.length > 2);
    //console.log("len:" + lineObjs.length);

    let subtitles = lineObjs.map(([tagName, { t, d }, ...texts], index) => {
        const startTime = parseInt(t);
        let words = texts
            .map(text => {
                if (text[0] === 's') {
                    return text[2].trim();
                } else {
                    return text;
                }
            })
            .filter(w => w);
        const content = words.join(' ');
        var sentences = breakLine(content);

        var sub = {
            start: startTime,
            sentences: sentences,
            text: content,
            index: index
        };

        return sub;
    }, '');

    let pEnd = 0;
    for (let i = subtitles.length - 1; i >= 0; i--) {
        var sub = subtitles[i];
        if (pEnd != 0) {
            sub.end = pEnd - 1;
        }
        pEnd = sub.start;
    }

    return subtitles;
};

const gen = json => {
    if (json[0] === 'timedtext' && json[1].format === '3') {
        if (json[2][0] === 'body') {
            // CC srt sub
            return genCCSub(json[2]);
        }
        // auto srt sub without youtube-like styling
        return genSub(json[3]);
    } else if (json[0] === 'transcript') {
        return genTranscript(json);
    } else {
        throw Error('only timedtext with format 3 or transcript expected.');
    }
};

export default gen;
