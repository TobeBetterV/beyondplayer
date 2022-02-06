import fs from 'fs-extra';

export default class TagSearch {
    filePath;
    index;

    constructor(filePath) {
        this.filePath = filePath;
    }

    load = () => {
        if (fs.existsSync(this.filePath)) {
            this.index = fs.readJSONSync(this.filePath);
        } else {
            this.index = {};
        }
    };

    getAllTags = () => {
        return Object.keys(this.index);
    };

    getAllTagCounts = () => {
        let tags = Object.keys(this.index);
        let counts = [];
        tags.forEach(value => {
            let count = this.index[value].length;
            if (count > 0) {
                counts.push({ value, count });
            }
        });
        return counts;
    };

    add = (tag, id, save = false) => {
        let idList = [];
        if (this.index.hasOwnProperty(tag)) {
            idList = this.index[tag];
        } else {
            this.index[tag] = idList;
        }
        if (idList.indexOf(id) === -1) {
            idList.push(id);
        }
        if (save) {
            this.save();
        }
    };

    addAll = (tags, id, save = true) => {
        tags.forEach(tag => {
            this.add(tag, id);
        });
        if (save) {
            this.save();
        }
    };

    remove = (tag, id, save = false) => {
        if (this.index.hasOwnProperty(tag)) {
            let idList = this.index[tag];
            let index = idList.indexOf(id);
            if (index !== -1) {
                idList.splice(index, 1);
            }
            if (idList.length == 0) {
                delete this.index[tag];
            }
            if (save) {
                this.save();
            }
        }
    };

    removeAll = (tags, id) => {
        tags.forEach(tag => {
            this.remove(tag, id);
        });
        this.save();
    };

    findIdsWithTag = tag => {
        if (this.index.hasOwnProperty(tag)) {
            return this.index[tag];
        }
        return [];
    };

    findIdsWithTags = tags => {
        let prevSet;
        tags.forEach(tag => {
            let ids = this.findIdsWithTag(tag);
            let set = new Set(ids);
            if (prevSet) {
                let intersect = new Set();
                prevSet.forEach(x => {
                    if (set.has(x)) {
                        intersect.add(x);
                    }
                });
                prevSet = intersect;
            } else {
                prevSet = set;
            }
        });
        if (prevSet) {
            return Array.from(prevSet);
        }
        return [];
    };

    save = () => {
        fs.writeJSONSync(this.filePath, this.index);
    };
}
