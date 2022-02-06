const addic7ed = require('addic7ed-api');

const download = async (item, path) => {
    return addic7ed.download(item.subInfo, path);
};

const transform = (query, items) =>
    items.map(item => ({
        name: `${query}.${item.distribution}.${item.team}`,
        subInfo: item,
        extention: '',
        source: 'addic7ed',
        size: '',
        score: 0,
        download
    }));

const textSearch = async (query, language, limit) => {
    const splitQuery = query.match(/s([0-9]{1,2})\s*e([0-9]{1,2}.*)/i);

    if (!splitQuery) {
        console.log(`Addic7ed: Can't parse ${query}...`);
        return [];
    }

    let serie = query.replace(splitQuery[0], '');
    serie = serie.replace(/\./g, ' ');
    const season = parseInt(splitQuery[1], 10);
    const episode = parseInt(splitQuery[2], 10);

    let items = [];

    try {
        items = await addic7ed.search(serie, season, episode, language);

        if (!items) {
            console.log('Addic7ed: Nothing found...');
            return [];
        }
        return transform(query, items);
    } catch (e) {
        alert('Unable to retrieve data from addic7ed:' + e);
    }

    return [];
};

//TODO remove it
const fileSearch = async () => {};

export default {
    textSearch,
    fileSearch,
    download
};
