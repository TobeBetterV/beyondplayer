import { remote } from 'electron';
import storage from 'electron-json-storage';

class WebSearch {
    KEY = 'webSearch';
    MAX_ENABLED = 5;

    sources;

    defaultLangSource = {
        ja: {
            name: '英語-日本語',
            searchUrl: 'https://dictionary.cambridge.org/ja/dictionary/english-japanese/{term}',
            homeUrl: 'https://dictionary.cambridge.org/ja/dictionary/english-japanese/',
            separator: '-',
            enabled: true
        },
        ko: {
            name: '영어–일본어 사전',
            searchUrl: 'https://dictionary.cambridge.org/ko/사전/영어-한국어/{term}',
            homeUrl: 'https://dictionary.cambridge.org/ko/사전/영어-한국어/',
            separator: '-',
            enabled: true
        },
        'zh-CN': {
            name: '剑桥 英语-简中',
            searchUrl: 'https://dictionary.cambridge.org/zhs/词典/英语-汉语-简体/{term}',
            homeUrl: 'https://dictionary.cambridge.org/zhs/词典/英语-汉语-简体/',
            separator: '-',
            enabled: true
        },
        'zh-TW': {
            name: '剑桥 英语-繁中',
            searchUrl: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/{term} ',
            homeUrl: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/',
            separator: '-',
            enabled: true
        },
        en: {
            name: 'Cambridge English',
            searchUrl: 'https://dictionary.cambridge.org/dictionary/english/{term}',
            homeUrl: 'https://dictionary.cambridge.org/dictionary/english/',
            separator: '',
            enabled: true
        },
        ru: {
            name: 'English Russian',
            searchUrl: 'https://dictionary.cambridge.org/ru/словарь/англо-русский/{term}',
            homeUrl: 'https://dictionary.cambridge.org/ru/словарь/англо-русский/',
            separator: '',
            enabled: true
        },
        fr: {
            name: 'Anglais-Français',
            searchUrl: 'https://dictionary.cambridge.org/fr/dictionnaire/anglais-francais/{term}',
            homeUrl: 'https://dictionary.cambridge.org/fr/dictionnaire/anglais-francais/',
            separator: '',
            enabled: true
        },
        de: {
            name: 'Englisch–Deutsch',
            searchUrl: 'https://dictionary.cambridge.org/de/worterbuch/englisch-deutsch/{term}',
            homeUrl: 'https://dictionary.cambridge.org/de/worterbuch/englisch-deutsch/',
            separator: '',
            enabled: true
        },
        it: {
            name: 'inglese-italiano',
            searchUrl: 'https://dictionary.cambridge.org/it/dizionario/inglese-italiano/{term}',
            homeUrl: 'https://dictionary.cambridge.org/it/dizionario/inglese-italiano/',
            separator: '',
            enabled: true
        },
        pl: {
            name: 'angielsko-polski',
            searchUrl: 'https://dictionary.cambridge.org/pl/dictionary/english-polish/{term}',
            homeUrl: 'https://dictionary.cambridge.org/pl/dictionary/english-polish/',
            separator: '',
            enabled: true
        },
        tr: {
            name: 'İngilizce–Türkçe',
            searchUrl: 'https://dictionary.cambridge.org/tr/sözlük/ingilizce-türkçe/{term}',
            homeUrl: 'https://dictionary.cambridge.org/tr/sözlük/ingilizce-türkçe/',
            separator: '',
            enabled: true
        },
        vi: {
            name: 'English-Vietnamese',
            searchUrl: 'https://dictionary.cambridge.org/vi/dictionary/english-vietnamese/{term}',
            homeUrl: 'https://dictionary.cambridge.org/vi/dictionary/english-vietnamese/',
            separator: '',
            enabled: true
        },
        'es-419': {
            name: 'Inglés-Español',
            searchUrl: 'https://dictionary.cambridge.org/es/diccionario/ingles-espanol/{term}',
            homeUrl: 'https://dictionary.cambridge.org/es/diccionario/ingles-espanol/',
            separator: '',
            enabled: true
        },
        'pt-BR': {
            name: 'Inglês-Português',
            searchUrl: 'https://dictionary.cambridge.org/pt/dicionario/ingles-portugues/{term}',
            homeUrl: 'https://dictionary.cambridge.org/pt/dicionario/ingles-portugues/',
            separator: '',
            enabled: true
        },
        'pt-PT': {
            name: 'Inglês-Português',
            searchUrl: 'https://dictionary.cambridge.org/pt/dicionario/ingles-portugues/{term}',
            homeUrl: 'https://dictionary.cambridge.org/pt/dicionario/ingles-portugues/',
            separator: '',
            enabled: true
        }
    };

    defaultSources = [
        {
            name: "Learners's Dictionary",
            searchUrl: 'http://www.learnersdictionary.com/definition/{term}',
            homeUrl: 'http://www.learnersdictionary.com/',
            separator: '',
            enabled: true
        },
        {
            name: 'Merrian Webster',
            searchUrl: 'https://www.merriam-webster.com/dictionary/{term}',
            homeUrl: 'https://www.merriam-webster.com/dictionary/',
            separator: '',
            enabled: true
        },
        {
            name: 'Google Search',
            searchUrl: 'https://www.google.com/search?q=define+{term}',
            homeUrl: 'https://www.google.com/',
            separator: '+',
            enabled: true
        },
        {
            name: 'Vocabulary.com',
            searchUrl: 'https://www.vocabulary.com/dictionary/{term}',
            homeUrl: 'https://www.vocabulary.com/dictionary/',
            separator: '',
            enabled: false
        },
        {
            name: 'Urban Dictionary',
            searchUrl: 'https://www.urbandictionary.com/define.php?term={term}',
            homeUrl: 'https://www.urbandictionary.com/',
            separator: '',
            enabled: true
        },
        {
            name: '必应 词典',
            searchUrl: 'https://cn.bing.com/dict/search?q={term}',
            homeUrl: 'https://cn.bing.com/dict/',
            separator: '',
            enabled: false
        }
    ];

    generateSearchUrl(source, term) {
        term = term.trim();
        if (!term) {
            return encodeURI(source.homeUrl);
        }
        if (source.separator) {
            term = term.replace(' ', source.separator);
        }
        return encodeURI(source.searchUrl.replace('{term}', term));
    }

    constructor() {
        this.sources = [];
    }

    buildDefaultSources = () => {
        var locale = remote.app.getLocale();

        console.log(`locale: ${locale}`);

        let defaultLang = this.defaultLangSource[locale];
        if (!defaultLang) {
            defaultLang = this.defaultLangSource['en'];
        }
        let newSources = [];
        newSources.push(defaultLang);
        newSources.push(...this.defaultSources);
        return newSources;
    };

    load = callback => {
        storage.get(this.KEY, (error, data) => {
            if (error) throw error;
            if (_.isEmpty(data)) {
                this.sources = this.buildDefaultSources();
            } else {
                this.sources = data;
            }
            if (callback) {
                callback(this.sources);
            }
        });
    };

    save = data => {
        this.sources = data;
        storage.set(this.KEY, data, function(error) {
            if (error) throw error;
        });
    };

    restore = () => {
        this.save(this.buildDefaultSources());
    };

    getEnabledSources() {
        return this.sources.filter(source => source.enabled);
    }

    getAllSources() {
        return this.sources;
    }
}

export default new WebSearch();
