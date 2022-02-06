const path = require('path');
const fs = require('fs');
let loadedLanguage;
const util = require('util');

module.exports = new i18n();

function i18n() {}

i18n.prototype.init = function(locale) {
    if (fs.existsSync(path.join(__dirname, locale + '.json'))) {
        loadedLanguage = JSON.parse(fs.readFileSync(path.join(__dirname, locale + '.json'), 'utf8'));
    } else {
        loadedLanguage = JSON.parse(fs.readFileSync(path.join(__dirname, 'en.json'), 'utf8'));
    }
};

i18n.prototype.t = function(phrase) {
    let translation = loadedLanguage[phrase];
    if (translation === undefined) {
        translation = phrase;
    }
    return translation;
};

i18n.prototype.tf = function(phrase, ...args) {
    let translation = loadedLanguage[phrase];
    if (translation === undefined) {
        translation = phrase;
    }
    return util.format(translation, ...args);
};
