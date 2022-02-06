import storage from 'electron-json-storage';
import _ from 'lodash';

class MRUFiles {
    KEY = 'mru';
    MAX_COUNT = 20;
    files = [];

    load = callback => {
        storage.get(this.KEY, (error, data) => {
            if (error) throw error;

            if (_.isEmpty(data)) {
                this.files = [];
            } else {
                this.files = data;
            }
            callback(this.files);
        });
    };

    add = file => {
        if (!this.files || _.isEmpty(this.files)) {
            this.files = [];
        }

        let index = this.files.findIndex(item => {
            if (_.isString(item)) {
                return item == file;
            } else {
                return item.url == file.url;
            }
        });

        if (index != -1) {
            this.files.splice(index, 1);
            this.files.unshift(file);
        } else {
            this.files.unshift(file);
            if (this.files.length > this.MAX_COUNT) {
                this.files.pop();
            }
        }

        console.log(this.files);

        storage.set(this.KEY, this.files, function(error) {
            if (error) throw error;
        });
    };
}

export default new MRUFiles();
