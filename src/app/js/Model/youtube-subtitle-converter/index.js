import { breakLine } from '../KUtils';
import gen from './gen';
import parse from './parser';

export function parseCC(xmlStr) {
    if (!xmlStr) {
        return [];
    } else {
        return gen(parse(xmlStr));
    }
}

export function parseAutoGen(jsonStr) {
    if (!jsonStr) {
        return [];
    }
    return parseJson(jsonStr);
}

const reducer = (content, seg) => {
    return content + seg.utf8;
};

const parseJson = jsonStr => {
    jsonStr = jsonStr.replace(/\\n/g, ' ');
    const json = JSON.parse(jsonStr);
    const events = json.events;

    const lines = events
        .map(event => {
            const start = event.tStartMs;
            // const durationMs = event.dDurationMs;
            // const end = start + durationMs;
            // duration from YouTube is not correct, calculate it by ourself
            if (event.segs) {
                if (event.segs.length == 1 && !event.segs[0].utf8.trim()) return null;

                const text = event.segs.reduce(reducer, '');
                const sentences = breakLine(text);
                return { start, sentences, text };
            }
            return null;
        })
        .filter(line => line != null);

    let lastStart = 0;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];
        line.index = index;
        if (!lastStart) {
            line.end = line.start + 99999;
        } else {
            line.end = lastStart - 1;
        }
        lastStart = line.start;
    }

    return lines;
};
