import faker from 'faker';
import { VidLibExportSourceAdapter } from '../VidLibExportSourceAdapter';

describe('VidLibExportSourceAdapter specs', () => {
    const createVidLibItem = () => ({
        id: faker.random.alphaNumeric(),
        thumbnail: faker.system.filePath(),
        vid: faker.system.filePath(),
        tags: [],
        lines: [{ text: faker.lorem.sentence() }]
    });

    const createVidLib = items => ({
        retrieveAll: () => items.map(item => item.id),
        genVidInfo: id => {
            if (id === items[0].id) {
                return items[0];
            } else if (id === items[1].id) {
                return items[1];
            }

            throw new Error();
        }
    });

    const expectMatchObject = (resultItem, vidItem) => {
        expect(resultItem).toMatchObject({
            id: vidItem.id,
            frontVideo: vidItem.vid,
            frontPreview: vidItem.thumbnail,
            frontText: vidItem.lines[0].text
        });
    };

    it('should convert vidLib items to the source items', () => {
        const vidLibItems = [createVidLibItem(), createVidLibItem()];
        const vidLib = createVidLib(vidLibItems);

        const vidAdapter = new VidLibExportSourceAdapter({ vidLib });
        const result = [...vidAdapter];

        expect(result.length).toBe(2);
        expectMatchObject(result[0], vidLibItems[0]);
        expectMatchObject(result[1], vidLibItems[1]);
    });
});
