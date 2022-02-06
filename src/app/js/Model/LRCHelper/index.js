import parser from 'lrc-parser';

class LRCHelper {
    parseLRC = str => {
        const lrc = parser(str);
        lrc.scripts.forEach(line => {
            line.start = line.start * 1000;
            line.end = line.end * 1000;
        });
        return lrc.scripts;
    };
}

export default new LRCHelper();
