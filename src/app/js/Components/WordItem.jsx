import React from 'react';
import LineItem from './LineItem.jsx';
import { select } from '../Model/KUtils';
import WordBookInstance from '../Model/WordBook';

export default class WordItem extends React.PureComponent {
    constructor(props) {
        super(props);
        this.element = null;
    }

    handleClickWord = e => {
        e.stopPropagation();
        var word = e.target.innerText;
        select(e.target);
        this.props.onClickWord(word, e.target);
        select(null);
    };

    handleClickLine = e => {
        this.props.onSelect(this.props.word);
    };

    handleContextMenu = e => {
        this.props.onContextMenuOnWord(e);
        this.props.onSelect(this.props.word);
    };

    handleClickLineOnLineItem = (index, target) => {
        this.props.onClickLineOnLineItem(index, this.props.word);
    };

    highlight(flag) {
        if (flag) {
            this.element.classList.add('selected');
        } else {
            this.element.classList.remove('selected');
        }
    }

    handleClickRemove = () => {
        this.props.onRemoveWord(this.props.word);
    };

    handleClickSearchInDictionary = () => {
        this.props.onSearchInDictionary(this.props.word);
    };

    handleClickSearchInWeb = () => {
        this.props.onSearchInWeb(this.props.word);
    };

    handleClickEditNote = () => {
        this.props.onEditNote(this.props.word);
    };

    trimDef(def) {
        const MAX = 200;
        if (def.length > MAX) {
            return def.substring(0, MAX - 3) + '...';
        }
        return def;
    }

    render() {
        const def = WordBookInstance.getWordDefinition(this.props.word);
        const textStyle = def ? 'underline' : 'inherit';
        return (
            <div className="k-word-item-container">
                <div
                    className={'k-word-item' + (this.props.selected ? ' selected' : '')}
                    ref={ref => (this.element = ref)}
                    onClick={this.handleClickLine}
                    onContextMenu={this.handleContextMenu}>
                    <a onClick={this.handleClickWord} style={{ textDecoration: textStyle }} data-tip={this.trimDef(def)}>
                        {this.props.word}{' '}
                    </a>
                    {this.props.selected ? (
                        <div className="btn-group" style={{ marginLeft: '10px', marginBottom: '3px' }}>
                            <button className="btn btn-default btn-large" onClick={this.handleClickSearchInDictionary}>
                                <span className="icon icon-book" />
                            </button>
                            <button className="btn btn-default btn-large" onClick={this.handleClickSearchInWeb}>
                                <span className="icon icon-globe" />
                            </button>
                            <button className="btn btn-default btn-large" onClick={this.handleClickEditNote}>
                                <span className="icon icon-pencil" />
                            </button>
                        </div>
                    ) : null}
                    {this.props.selected ? <span className="pull-right icon icon-cancel-squared" onClick={this.handleClickRemove}></span> : null}
                </div>
                <div style={{ paddingLeft: '0px' }}>
                    {this.props.wordRelatedLines.map((line, i) => (
                        <LineItem
                            key={line.index}
                            subtitleIndex={line.index}
                            selected={line.index === this.props.lineIndex}
                            sentences={line.sentences}
                            onClickWord={this.props.onClickWord}
                            onClickLine={this.handleClickLineOnLineItem}
                            onContextMenu={this.props.onContextMenuOnLineItemWord}
                            onAddWord={this.props.onAddWord}
                        />
                    ))}
                </div>
            </div>
        );
    }
}
