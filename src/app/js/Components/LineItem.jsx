import React from 'react';
import { select } from '../Model/KUtils';
import Settings from '../Model/Settings';

export default class LineItem extends React.PureComponent {
    static ROW_PADDING = 16;

    constructor(props) {
        super(props);
        this.element = null;
    }

    scrollIntoView() {
        this.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        //scrollIntoView(this.element)
    }

    handleClickWord = e => {
        e.stopPropagation();
        var word = e.target.innerText.trim();
        e.target.style['user-select'] = 'text';
        select(e.target);
        this.props.onClickWord(word, e.target);
        select(null);
        var target = e.target;
        setTimeout(() => {
            target.style['user-select'] = 'none';
        }, 1);
    };

    handleClickLine = e => {
        this.props.onClickLine(this.props.subtitleIndex, e.target);
    };

    highlight(flag) {
        if (flag) {
            this.element.classList.add('selected');
        } else {
            this.element.classList.remove('selected');
        }
    }

    calcClassName() {
        var className = 'k-line-item';
        if (this.props.repeatingRange) {
            var start = this.props.repeatingRange[0];
            var end = this.props.repeatingRange[1];
            var index = this.props.subtitleIndex;
            if (start <= index && index <= end) {
                className += ' k-line-item-repeating';
            }
        }
        if (this.props.selected) {
            className += ' selected';
        } else if (this.props.prevSelected) {
            className += ' prev-selected';
        }
        return className;
    }

    buildWordsFromSentences(sentences) {
        this.highightEnd = -1;
        this.highlightStart = 99999;

        var newWords = [];
        let first = true;
        sentences.forEach(sentence => {
            if (first) {
                first = false;
            } else {
                newWords.push('\n');
            }
            this.buildWords(sentence, newWords);
        });
        return newWords;
    }

    buildWords(words, newWords) {
        let charCount = 0;
        let terms = this.props.searchTermWords || [];
        let tIndex = 0;
        let highlightStart = -1;
        let highlightEnd = -1;
        let found = false;
        for (var i = 0; i < words.length; i++) {
            charCount += words[i].length;
            if (charCount > Settings.getSidePaneCharsPerLine()) {
                newWords.push('\n');
                charCount = words[i].length;
            }
            newWords.push(words[i]);
            if (terms.length > 0 && !found) {
                if (words[i].toLowerCase().includes(terms[tIndex].toLowerCase())) {
                    if (tIndex == 0) {
                        highlightStart = newWords.length - 1;
                    }
                    tIndex++;
                    if (tIndex >= terms.length) {
                        highlightEnd = newWords.length - 1;
                        found = true;
                    }
                } else {
                    tIndex = 0;
                }
            }
        }

        if (this.highlightStart == 99999) {
            if (highlightEnd != -1) {
                this.highlightEnd = highlightEnd;
                this.highlightStart = highlightStart;
            }
        }
        return newWords;
    }

    render() {
        const words = this.buildWordsFromSentences(this.props.sentences);
        return (
            <p
                className={this.calcClassName()}
                ref={ref => (this.element = ref)}
                onClick={this.handleClickLine}
                data-index={this.props.subtitleIndex}
                onContextMenu={this.props.onContextMenu}>
                {this.props.searchTerm
                    ? words.map((word, i) =>
                          word == '\n' ? (
                              <br key={i} />
                          ) : (
                              <span
                                  className={i >= this.highlightStart && i <= this.highlightEnd ? 'k-highlighter' : ''}
                                  key={i}
                                  onClick={this.handleClickWord}>
                                  {' '}
                                  {word}{' '}
                              </span>
                          )
                      )
                    : words.map((word, i) =>
                          word == '\n' ? (
                              <br key={i} />
                          ) : (
                              <span key={i} onClick={this.handleClickWord}>
                                  {' '}
                                  {word}{' '}
                              </span>
                          )
                      )}
            </p>
        );
    }
}
