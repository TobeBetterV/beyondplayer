import path from 'path-extra';
import storage from 'electron-json-storage';
import _ from 'lodash';
import { clipboard, shell } from 'electron';
import fs from 'fs-extra';
import shortid from 'shortid';

class WordBook {
    KEY = 'wordBook';
    data = {};
    baseNotePath = '';
    wordBookPath = '';
    basePath = '';

    reverseIndex = {};

    defaultData = {
        currentGroup: 0,
        groups: [
            {
                name: 'Default',
                words: []
            }
        ]
    };

    constructor(base) {
        if (base) {
            this.basePath = base;
        } else {
            this.basePath = storage.getDataPath();
        }
        this.baseNotePath = path.join(this.basePath, 'notes');
        this.wordBookPath = path.join(this.basePath, 'wordBook.json');

        if (!base) {
            fs.ensureDirSync(this.baseNotePath);
        }
    }

    load = async callback => {
        let data;
        if (!fs.existsSync(this.wordBookPath)) {
            this.data = this.defaultData;
            this.save();
        } else {
            data = await fs.readJSON(this.wordBookPath);
            if (!('currentGroup' in data)) {
                this.data = this.defaultData;
                this.data.groups[0].words = this.data.groups[0].words.concat(data);
                this.save();
            } else {
                this.data = data;
            }
        }

        this.buildReverseIndex();

        if (callback) callback();
    };

    buildReverseIndex() {
        this.reverseIndex = {};

        var g = this.getCurrentGroup();
        g.words.forEach(wordItem => {
            if (wordItem.word.indexOf(' ') !== -1 && wordItem.definition) {
                let splittedWords = wordItem.word.split(' ');
                splittedWords.forEach(splitted => {
                    if (!this.reverseIndex.hasOwnProperty(splitted)) {
                        this.reverseIndex[splitted] = [];
                    }
                    this.reverseIndex[splitted].push({
                        word: wordItem.word,
                        splitted: splittedWords
                    });
                });
            }
        });
    }

    save() {
        fs.writeJSONSync(this.wordBookPath, this.data);
    }

    add = word => {
        word = word.trim();
        var group = this.data.groups[this.data.currentGroup];

        if (
            group.words.find(item => {
                return item.word == word;
            })
        ) {
            return;
        }

        var item = { word: word, time: Date.now() };
        group.words.push(item);
        this.save();
    };

    remove = word => {
        word = word.trim();

        var group = this.data.groups[this.data.currentGroup];

        console.log(`remove word: ${word}`);

        this.removeWordDefinition(word);

        _.remove(group.words, item => {
            return item.word.trim() == word;
        });

        this.save();
    };

    copyToClipboard = () => {
        var group = this.data.groups[this.data.currentGroup];
        var buffer = group.words.map(item => item.word).join('\n');
        clipboard.writeText(buffer);
    };

    revealInFinder = () => {
        var dir = storage.getDataPath();
        shell.openItem(dir);
    };

    getCurrentGroup() {
        return this.data.groups[this.data.currentGroup];
    }

    getGroups() {
        return this.data.groups;
    }

    getGroupByName = name => {
        for (let index = 0; index < this.data.groups; index++) {
            const group = this.data.groups[index];
            if (group.name == name) {
                return group;
            }
        }
        return null;
    };

    getGroupIndex = name => {
        for (let index = 0; index < this.data.groups.length; index++) {
            const group = this.data.groups[index];
            if (group.name == name) {
                return index;
            }
        }
        return -1;
    };

    getCurrentGroupIndex() {
        return this.data.currentGroup;
    }

    getWordItem(word) {
        word = word.trim();
        var g = this.getCurrentGroup();
        return g.words.find(w => w.word == word);
    }

    createNewWordList(wordListName) {
        var group = {
            name: wordListName,
            words: []
        };
        this.data.groups.push(group);
        this.sortGroups();

        var index = this.data.groups.findIndex(e => {
            return e === group;
        });
        this.data.currentGroup = index;
        this.save();
        return index;
    }

    sortGroups() {
        var newGroups = this.data.groups.slice(1);
        newGroups.sort((l, r) => {
            return l.name.localeCompare(r.name);
        });
        newGroups.unshift(this.data.groups[0]);
        this.data.groups = newGroups;
    }

    changeCurrentGroupIndex(newIndex) {
        this.data.currentGroup = newIndex;
        this.buildReverseIndex();
        this.save();
    }

    removeCurrentGroup() {
        this.data.groups.splice(this.data.currentGroup, 1);
        this.data.currentGroup = 0;
        this.save();
    }

    renameCurrentWordList(wordListName) {
        var g = this.getCurrentGroup();
        g.name = wordListName;
        this.sortGroups();
        var index = this.data.groups.findIndex(e => {
            return e === g;
        });
        this.data.currentGroup = index;
        this.save();
    }

    isWordDefinitionExists(word) {
        var wordItem = this.getWordItem(word);
        return wordItem && wordItem.definition;
    }

    isWordDefinitionPartialExists(word) {
        word = word.trim();
        return this.reverseIndex.hasOwnProperty(word);
    }

    retrieveWordsHaveDefinition(words) {
        words = Array.from(new Set(words));
        var exists = [];
        words.forEach(word => {
            if (this.isWordDefinitionExists(word)) {
                exists.push(word);
            }
        });
        var possibleWords = {};
        words.forEach(word => {
            if (this.isWordDefinitionPartialExists(word)) {
                this.reverseIndex[word].forEach(pWordContainer => {
                    possibleWords[pWordContainer.word] = pWordContainer;
                });
            }
        });
        if (!_.isEmpty(possibleWords)) {
            var dict = words.reduce((obj, item) => {
                obj[item] = true;
                return obj;
            }, {});

            for (let pWord in possibleWords) {
                //console.log("pWord:" + pWord);
                var unmatch = false;
                var pWordSplitted = possibleWords[pWord].splitted;
                for (let i = 0; i < pWordSplitted.length; i++) {
                    let splitted = pWordSplitted[i];
                    //console.log("splitted:" + splitted);
                    if (!dict.hasOwnProperty(splitted)) {
                        unmatch = true;
                        break;
                    }
                }
                if (!unmatch) {
                    exists.push(pWord);
                }
            }
        }
        return exists;
    }

    addWordDefinition = (word, defintion, save = true) => {
        word = word.trim();

        let defFile;

        if (this.isWordDefinitionExists(word)) {
            var wordItem = this.getWordItem(word);
            defFile = wordItem.definition;
            fs.writeFileSync(path.join(this.baseNotePath, defFile), defintion);
        } else {
            let wordItem = this.getWordItem(word);
            if (!wordItem) {
                this.add(word);
            }
            wordItem = this.getWordItem(word);
            defFile = shortid.generate();
            wordItem.definition = defFile;
            fs.writeFileSync(path.join(this.baseNotePath, defFile), defintion);
            if (save) {
                this.save();
                this.buildReverseIndex();
            }
        }
    };

    getWordDefinition(word) {
        word = word.trim();
        if (this.isWordDefinitionExists(word)) {
            var wordItem = this.getWordItem(word);
            var defFile = wordItem.definition;
            var def = fs.readFileSync(path.join(this.baseNotePath, defFile), { encoding: 'UTF-8' });
            return def.toString();
        }
        return '';
    }

    removeWordDefinition = word => {
        word = word.trim();
        if (this.isWordDefinitionExists(word)) {
            var wordItem = this.getWordItem(word);
            var defFile = wordItem.definition;
            fs.removeSync(path.join(this.baseNotePath, defFile));
            delete wordItem.definition;
            this.save();
        }
    };

    export = async newPath => {
        await fs.copy(this.wordBookPath, path.join(newPath, `${this.KEY}.json`));
        await fs.copy(this.baseNotePath, path.join(newPath, 'notes'));
    };

    import = async sourcePath => {
        let source = new WordBook(sourcePath);
        await source.load();
        let sourceGroups = source.data.groups;
        for (let i = 0; i < sourceGroups.length; i++) {
            let sourceGroup = sourceGroups[i];
            source.data.currentGroup = i;
            let groupIndex = this.getGroupIndex(sourceGroup.name);
            if (groupIndex == -1) {
                groupIndex = this.createNewWordList(sourceGroup.name);
            }
            this.data.currentGroup = groupIndex;
            let words = sourceGroup.words;
            for (let j = 0; j < words.length; j++) {
                const word = words[j].word;
                const definition = source.getWordDefinition(word);
                this.addWordDefinition(word, definition, false);
            }
        }
        this.changeCurrentGroupIndex(0);
    };
}

export default new WordBook();
