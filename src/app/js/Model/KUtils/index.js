import { resolve } from 'path';
import fs from 'fs-extra';
import jschardet from 'jschardet';
import iconv from 'iconv-lite';
import { remote, shell } from 'electron';
import path from 'path-extra';

import LRCHelper from '../LRCHelper';
import { parse } from '../Subtitle';

const i18n = remote.require('./i18n');
const log = require('electron-log');

export function checkNeedUpgrade() {
    const newPath = remote.app.getPath('userData');
    const markPath = path.join(newPath, 'upgrade_mark');
    const markExist = fs.existsSync(markPath);
    if (markExist) return false;

    const oldPath = newPath.replace('BeyondPlayer', 'Source Player');
    const exists = fs.existsSync(oldPath);
    if (!exists) {
        fs.ensureFileSync(markPath);
        return false;
    }
    return true;
}

export let doUpgrade = async () => {
    let newPath = remote.app.getPath('userData');
    let oldPath = newPath.replace('BeyondPlayer', 'Source Player');
    let markPath = path.join(newPath, 'upgrade_mark');

    let oldSubPath = path.join(oldPath, 'subtitles');
    let newSubPath = path.join(newPath, 'subtitles');
    let oldStoragePath = path.join(oldPath, 'storage');
    let newStoragePath = path.join(newPath, 'storage');

    if (fs.existsSync(oldSubPath)) {
        await fs.copy(oldSubPath, newSubPath);
    }
    if (fs.existsSync(oldStoragePath)) {
        await fs.copy(oldStoragePath, newStoragePath);
    }
    fs.ensureFileSync(markPath);
    return true;
};

export let select = element => {
    var selectedText;
    if (!element) {
        var selection = window.getSelection();
        selection.removeAllRanges();
        return '';
    }

    if (element.nodeName === 'SELECT') {
        element.focus();

        selectedText = element.value;
    } else if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
        var isReadOnly = element.hasAttribute('readonly');

        if (!isReadOnly) {
            element.setAttribute('readonly', '');
        }

        element.select();
        element.setSelectionRange(0, element.value.length);

        if (!isReadOnly) {
            element.removeAttribute('readonly');
        }

        selectedText = element.value;
    } else {
        if (element.hasAttribute('contenteditable')) {
            element.focus();
        }

        var selection = window.getSelection();
        var range = document.createRange();

        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);

        selectedText = selection.toString();
    }

    return selectedText;
};

export function cleanLine(line) {
    line = line.replace(/<i>/g, '');
    line = line.replace(/<\/i>/g, '');
    return line;
}

export function breakLine(line) {
    let sentences = line.split('\n');
    if (sentences.length > 2) {
        var newSentences = [];
        var index = 0;
        sentences.forEach(sentence => {
            if (index > 1) {
                newSentences[1] = newSentences[1] + ' ' + sentence;
            } else {
                newSentences.push(sentence);
            }
            index++;
        });
        sentences = newSentences;
    }
    let wss = [];
    sentences.forEach(sentence => {
        let ws = breakSentence(sentence);
        wss.push(ws);
    });
    if (sentences.length == 1 && sentences[0].length > 38) {
        let length = 0;
        let breakIndex = -1;
        let words = wss[0];
        for (let index = 0; index < words.length; index++) {
            const word = words[index];
            length += word.length;
            if (length > 38) {
                breakIndex = index;
                break;
            }
        }
        if (breakIndex > 0) {
            wss = [];
            let ws0 = words.slice(0, breakIndex);
            let ws1 = words.slice(breakIndex);
            wss.push(ws0);
            wss.push(ws1);
        }
    }
    return wss;
}

export function parseLinesFromFile(subFile, encoding) {
    let lines = [];
    if (!fs.existsSync(subFile)) {
        return lines;
    }

    try {
        let subString;
        if (encoding) {
            subString = fs.readFileSync(subFile, { encoding });
        } else {
            const subContent = fs.readFileSync(subFile);
            const detectedEncoding = jschardet.detect(subContent);

            if (detectedEncoding.encoding && detectedEncoding.encoding !== 'utf8') {
                subString = iconv.decode(subContent, detectedEncoding.encoding);
            } else {
                subString = subContent.toString();
            }
        }

        if (subFile.endsWith('lrc')) {
            lines = LRCHelper.parseLRC(subString);
        } else {
            lines = parse(subString);
        }
    } catch (e) {
        log.log(e);
        remote.dialog.showErrorBox('error', `Not able to parse subtitle: ${subFile}`);
    }
    lines = lines.filter(l => l.text);
    lines.sort((a, b) => {
        return a.start - b.start;
    });
    lines.forEach((element, index) => {
        if (element.text) {
            element.sentences = breakLine(cleanLine(element.text));
        } else {
            element.text = '';
            element.sentences = [];
        }

        element.index = index;
    });

    return lines;
}

export function breakSentence(sentence) {
    sentence = sentence.replace(/\.|\?|"|,|!|\]|\[/g, ' $& ');
    return sentence.split(' ');
}

export function nextNode(node) {
    if (node.hasChildNodes()) {
        return node.firstChild;
    } else {
        while (node && !node.nextSibling) {
            node = node.parentNode;
        }
        if (!node) {
            return null;
        }
        return node.nextSibling;
    }
}

export function getRangeSelectedNodes(range, childOfNode) {
    var node = range.startContainer;
    var endNode = range.endContainer;

    // Special case for a range that is contained within a single node
    if (node == endNode) {
        return [node];
    }

    // Iterate nodes until we hit the end container
    var rangeNodes = [];
    while (node && node != endNode) {
        node = nextNode(node);
        if (childOfNode === node.parentNode) {
            rangeNodes.push(node);
        }
    }

    // Add partially selected nodes at the start of the range
    node = range.startContainer;

    let top = childOfNode ? childOfNode : range.commonAncestorContainer;

    while (node && node != top) {
        if (childOfNode === node.parentNode) {
            rangeNodes.unshift(node);
        }
        node = node.parentNode;
    }

    return rangeNodes;
}

export function getSelectedNodes(childOfNode) {
    if (window.getSelection) {
        var sel = window.getSelection();
        if (!sel.isCollapsed) {
            return getRangeSelectedNodes(sel.getRangeAt(0), childOfNode);
        }
    }
    return [];
}

export function getChildNodeContainsChild(parentNode, containedNode) {
    while (containedNode.parentNode != parentNode) {
        containedNode = containedNode.parentNode;
    }
    return containedNode;
}

export function hasSelection() {
    return !window.getSelection().isCollapsed;
}

export function getSelectedText() {
    let selection = window.getSelection();
    if (selection.rangeCount == 0) return '';
    var range = selection.getRangeAt(0);
    if (!range) return '';

    if (range.commonAncestorContainer.nodeName == '#text' || range.commonAncestorContainer.nodeName == 'SPAN') {
        return selection.toString();
    }

    let allWithinRangeParent = range.commonAncestorContainer.getElementsByTagName('SPAN');
    let allSelected = [];

    for (var i = 0, el; (el = allWithinRangeParent[i]); i++) {
        if (selection.containsNode(el, true)) {
            allSelected.push(el);
        }
    }
    let text = '';
    for (let index = 0; index < allSelected.length; index++) {
        const el = allSelected[index];
        var t = el.innerText;
        if (!t) {
            t = ' ';
        } else {
            if (index == 0 && index == allSelected.length - 1) {
                t = t.substring(range.startOffset, range.endOffset);
            } else if (index == 0) {
                t = t.substring(range.startOffset);
            } else if (index == allSelected.length - 1) {
                t = t.substring(0, range.endOffset);
            }
        }
        text += t;
    }
    return text.trim();
}

export let formatTime = seconds => {
    var date = new Date(seconds * 1000);
    var hh = date.getUTCHours();
    var mm = date.getUTCMinutes();
    var ss = date.getSeconds();
    var t = '';
    if (hh > 0) {
        t += hh;
        t += ':';
    }
    if (mm < 10) t += '0';
    t += mm;
    t += ':';
    if (ss < 10) t += '0';
    t += ss;
    return t;
};

export function isChildOf(child, parent) {
    let ap = resolve(parent);
    let ac = resolve(child);
    if (ac === ap) return false;
    return child.startsWith(parent);
}

export let deleteFolderRecursiveSync = path => {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, index) {
            var curPath = path + '/' + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            } else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

let msToObj = n => ({
    d: Math.floor(n / 86400000),
    hr: Math.floor(n / 3600000) % 24,
    min: Math.floor(n / 60000) % 60,
    s: Math.floor(n / 1000) % 60,
    ms: Math.floor(n) % 1000
});

let leftPad = (str, len = 2, n = 0) => String(str).padStart(len, n);

export function formatMs(inputMs, msSeparator = '.') {
    const { d, hr, min, s, ms } = msToObj(inputMs);
    const timeStr = `${leftPad(hr)}:${leftPad(min)}:${leftPad(s)}${msSeparator}${leftPad(ms, 3)}`;
    return timeStr;
}

export function showGetFullVersion() {
    if (!PRO_VERSION) {
        var choice = remote.dialog.showMessageBox(remote.getCurrentWindow(), {
            type: 'question',
            buttons: [i18n.t('later'), i18n.t('yes')],
            title: i18n.t('app.is.lite'),
            message: i18n.t('pro.features')
        });
        if (choice == 1) {
            shell.openExternal('https://itunes.apple.com/cn/app/source-player/id1441871343?l=en&mt=12');
        }
    }
}
