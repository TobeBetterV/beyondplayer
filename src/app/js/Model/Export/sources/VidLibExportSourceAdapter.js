const lines2Text = lines =>
    lines
        .reduce((result, line) => {
            return `${result}${line.text}\n`;
        }, '')
        .replace(/\n$/, '');

const vid2SourceItem = viItem => {
    const { id, thumbnail: frontPreview, vid: frontVideo, lines = [], lines2 = [], tags } = viItem;

    const frontText = lines2Text(lines);
    const backText = lines2Text(lines2);

    return {
        id,
        frontVideo,
        frontPreview,
        frontText,
        backText,
        tags
    };
};

class VidLibExportSourceAdapter {
    constructor({ vidLib, filter = () => true }) {
        this.vidLib = vidLib;
        this.filter = filter;
    }

    *[Symbol.iterator]() {
        const ids = this.vidLib.retrieveAll();

        for (let index = 0; index < ids.length; index += 1) {
            const sourceItem = this.vidLib.genVidInfo(ids[index]);
            const resultItem = vid2SourceItem(sourceItem);

            if (this.filter(resultItem)) {
                yield resultItem;
            }
        }
    }

    static getOutputFields() {
        return ['id', 'frontVideo', 'frontPreview', 'frontText', 'tags'];
    }
}

export { VidLibExportSourceAdapter };
