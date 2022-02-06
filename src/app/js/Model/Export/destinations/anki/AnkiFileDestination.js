import { promises as fs } from 'fs';
import AnkiExport from 'anki-apkg-export';

function interpolateTemplate(params) {
    const names = Object.keys(params);
    const values = Object.values(params);

    return new Function(...names, `return \`${this}\`;`)(...values);
}

class AnkiFileDestination {
    constructor({ file, deckName, frontTemplate, backTemplate }) {
        this.file = file;
        this.deckName = deckName;
        this.backTemplate = backTemplate.replace(/{{/g, '${').replace(/}}/g, '}');
        this.frontTemplate = frontTemplate.replace(/{{/g, '${').replace(/}}/g, '}');
    }

    export = async source => {
        const apkgDeck = new AnkiExport(this.deckName);
        const backTemplate = interpolateTemplate.bind(this.backTemplate);
        const frontTemplate = interpolateTemplate.bind(this.frontTemplate);
        const isIncludeVideo = this.backTemplate.includes('frontVideo') || this.frontTemplate.includes('frontVideo');
        const isIncludePreview = this.backTemplate.includes('frontPreview') || this.frontTemplate.includes('frontPreview');

        for (const item of source) {
            const { id, frontVideo, frontPreview } = item;

            if (isIncludeVideo) {
                const frontVideoContent = await fs.readFile(frontVideo);
                apkgDeck.addMedia(`${id}.mp4`, frontVideoContent);

                item.frontVideo = `${id}.mp4`;
            }

            if (isIncludePreview) {
                const frontVideoContent = await fs.readFile(frontPreview);
                apkgDeck.addMedia(`${id}.png`, frontVideoContent);

                item.frontPreview = `${id}.png`;
            }

            apkgDeck.addCard(frontTemplate(item), backTemplate(item));
        }

        const zipFile = await apkgDeck.save();

        await fs.writeFile(this.file, zipFile, 'binary');
    };
}

export { AnkiFileDestination };
