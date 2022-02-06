import React from 'react';
import WordItem from './WordItem.jsx';
import { remote } from 'electron';
import SearchInput from './SearchInput.jsx';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const i18n = remote.require('./i18n');

export default class WordListPane extends React.Component {
    constructor(props) {
        super(props);
        this.items = {};
        this.onClickWordOnWordBook = this.onClickWordOnWordBook.bind(this);
        this.onSearchUpdated = this.onSearchUpdated.bind(this);
        this.handleClickSortByTime = this.handleClickSortByTime.bind(this);
        this.handleChangeFilter = this.handleChangeFilter.bind(this);

        this.state = {
            searchTerm: '',
            sortByTime: true,
            filteredBySubtitle: false,
            selected: ''
        };

        this.lineIndex = -1;

        this.lineItemWordMenu = new Menu();
        this.lineItemWordMenu.append(
            new MenuItem({
                label: i18n.t('add.to.word.book'),
                click: () => {
                    this.props.onAddWord(this.rightClickWord);
                }
            })
        );
        this.lineItemWordMenu.append(new MenuItem({ type: 'separator' }));
        this.lineItemWordMenu.append(
            new MenuItem({
                label: i18n.t('search.in.web'),
                click: () => {
                    this.props.onSearchWeb(this.rightClickWord);
                }
            })
        );

        this.lineItemWordMenu.append(
            new MenuItem({
                label: i18n.t('search.in.vidlib'),
                click: () => {
                    this.props.onSearchVidLib(this.rightClickWord);
                }
            })
        );

        this.lineItemWordMenu.append(
            new MenuItem({
                label: i18n.t('search.in.dictionary'),
                click: () => {
                    this.props.onOpenDictionary(this.rightClickWord);
                }
            })
        );

        this.wordMenu = new Menu();
        this.wordMenu.append(
            new MenuItem({
                label: i18n.t('remove.from.word.book'),
                click: () => {
                    this.handleRemoveWord(this.rightClickWord);
                }
            })
        );
        this.wordMenu.append(new MenuItem({ type: 'separator' }));
        this.wordMenu.append(
            new MenuItem({
                label: i18n.t('search.in.web'),
                click: () => {
                    this.props.onSearchWeb(this.rightClickWord);
                }
            })
        );
        this.wordMenu.append(
            new MenuItem({
                label: i18n.t('search.in.vidlib'),
                click: () => {
                    this.props.onSearchVidLib(this.rightClickWord);
                }
            })
        );
        this.wordMenu.append(
            new MenuItem({
                label: i18n.t('search.in.dictionary'),
                click: () => {
                    this.props.onOpenDictionary(this.rightClickWord);
                }
            })
        );
    }

    handleRemoveWord = word => {
        var answer = confirm(i18n.tf('confirm.remove.word', word));
        if (answer) {
            this.props.onRemoveWord(word);
            this.setState({ selected: '' });
        }
    };

    highlight(index) {
        if (index != -1) {
            if (this.lineIndex != -1) {
                this.items[this.lineIndex].highlight(false);
            }
            this.lineIndex = index;
            this.items[index].highlight(true);
        }
    }

    handleOnContextMenuOnWord = e => {
        e.preventDefault();
        this.wordMenu.popup({ x: e.clientX, y: e.clientY });
        this.rightClickWord = e.target.innerText;
    };

    handleOnContextMenuOnLineItemWord = e => {
        e.preventDefault();

        this.lineItemWordMenu.popup({ x: e.clientX, y: e.clientY });
        this.rightClickWord = e.target.innerText;
    };

    handleSelectWord = word => {
        this.setState({
            selected: word
        });
    };

    handleClickSortByTime() {
        this.setState({ sortByTime: true });
    }

    handleClickSortByAlphabet = () => {
        this.setState({ sortByTime: false });
    };

    handleChangeFilter(e) {
        this.setState({ filteredBySubtitle: e.target.checked });
    }

    onClickWordOnWordBook(word, target) {
        this.props.onClickWordOnWordBook(word, target);
    }

    onClickLineOnLineItem = (lineIndex, word) => {
        this.props.onClickLineOnWordBook(lineIndex);
        this.handleSelectWord(word);
    };

    onSearchUpdated(term) {
        this.setState({ searchTerm: term });
    }

    getWordLines(word) {
        var terms = word.split(' ');
        var indices = [];

        terms.forEach(term => {
            var indic = this.props.wordToLines[term];
            indices.push(indic);
        });

        var result = _.intersection(...indices);

        var lines = [];
        result.forEach(index => {
            lines.push(this.props.lines[index]);
        });

        if (indices.length > 1) {
            lines = lines.filter(line => line.text.includes(word));
        }
        return lines;
    }

    getSelectedWord() {
        return this.state.selected;
    }

    handleClickClear = () => {
        this.setState({ searchTerm: '' });
    };

    handleClickToggle = e => {
        this.setState({ showSettings: !this.state.showSettings });
    };

    handleChangeCurrentWordList = e => {
        this.props.onChangeWordList(e.target.value);
    };

    handleKeyDown = e => {
        const charCode = e.keyCode || e.which;
        if (charCode === 32) {
            e.preventDefault();
            return false;
        }
    };

    render() {
        let filteredWords = this.props.wordGroup.words.filter(item => {
            if (!item.word.includes(this.state.searchTerm)) return false;
            if (this.state.filteredBySubtitle && !this.props.wordToLines[item.word]) return false;
            return true;
        });

        if (this.state.sortByTime) {
            filteredWords.sort((a, b) => {
                return b.time - a.time;
            });
        } else {
            filteredWords.sort((a, b) => {
                return a.word.toLowerCase().localeCompare(b.word.toLowerCase());
            });
        }

        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SearchInput
                    inputClassName="k-search-input"
                    placeholder={i18n.t('search.word')}
                    onChange={this.onSearchUpdated}
                    value={this.state.searchTerm}
                    onClickClear={this.handleClickClear}
                />
                {filteredWords.length == 0 && !this.state.searchTerm ? (
                    <div className="k-word-pane-hint">
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: i18n.t('hint.word.book.1') }} />
                            <li dangerouslySetInnerHTML={{ __html: i18n.t('hint.word.book.2') }} />
                        </ul>
                    </div>
                ) : (
                    <div className="k-subtitle-lines" onKeyDown={this.handleKeyDown} tabIndex="0" style={{ outline: 'none' }}>
                        {filteredWords.map((item, i) => (
                            <WordItem
                                key={i}
                                wordIndex={i}
                                ref={ref => (this.items[i] = ref)}
                                word={item.word}
                                onSelect={this.handleSelectWord}
                                selected={this.state.selected == item.word || (!this.state.selected && i == 0)}
                                lineIndex={this.props.lineIndex}
                                onClickWord={this.onClickWordOnWordBook}
                                onClickLineOnLineItem={this.onClickLineOnLineItem}
                                onRemoveWord={this.handleRemoveWord}
                                wordRelatedLines={this.getWordLines(item.word)}
                                onContextMenuOnWord={this.handleOnContextMenuOnWord}
                                onContextMenuOnLineItemWord={this.handleOnContextMenuOnLineItemWord}
                                onSearchInWeb={this.props.onSearchWeb}
                                onSearchInDictionary={this.props.onOpenDictionary}
                                onEditNote={this.props.onEditNote}
                            />
                        ))}
                    </div>
                )}
                {this.state.showSettings ? (
                    <div className="k-subtitle-settings">
                        <div className="k-wordlist-settings-section">
                            <div className="k-settings-row" style={{ textAlign: 'center' }}>
                                <div className="btn-group">
                                    <button
                                        className={'btn btn-default' + (this.state.sortByTime ? ' active' : '')}
                                        onClick={this.handleClickSortByTime}>
                                        {i18n.t('sort.by.time')}
                                    </button>
                                    <button
                                        className={'btn btn-default' + (this.state.sortByTime ? '' : ' active')}
                                        onClick={this.handleClickSortByAlphabet}>
                                        {i18n.t('sort.by.alphabet')}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="k-wordlist-settings-section">
                            <div className="k-settings-row">
                                <div className="k-settings-label" style={{ width: 250 }}>
                                    {' '}
                                    {i18n.t('filtered.by.current.subtitle')}{' '}
                                </div>
                                <input
                                    type="checkbox"
                                    style={{ margin: '5px', width: 50 }}
                                    checked={this.state.filteredBySubtitle}
                                    onChange={this.handleChangeFilter}
                                />
                            </div>
                        </div>
                        <div className="k-wordlist-settings-section">
                            <div className="k-settings-row">
                                <div className="k-settings-label">{i18n.t('new.word.list')}</div>
                                <button className="btn btn-mini k-highlight" onClick={this.props.onClickNewWordList} style={{ width: '150px' }}>
                                    <span className="icon icon-plus-circled"></span>
                                    <span>{i18n.t('click.to.create')}</span>
                                </button>
                            </div>
                            <div className="k-settings-row">
                                <div className="k-settings-label">{i18n.t('delete.current.word.list')}</div>
                                <button className="btn btn-mini k-highlight" onClick={this.props.onClickDeleteWordList} style={{ width: '150px' }}>
                                    <span className="icon icon-minus-circled"></span>
                                    <span>{i18n.t('click.to.delete')}</span>
                                </button>
                            </div>
                            <div className="k-settings-row">
                                <div className="k-settings-label">{i18n.t('rename.current.word.list')}</div>
                                <button className="btn btn-mini k-highlight" onClick={this.props.onClickRenameWordList} style={{ width: '150px' }}>
                                    <span className="icon icon-pencil"></span>
                                    <span>{i18n.t('click.to.rename')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
                <div className="k-pane-footer">
                    <div style={{ margin: '2px' }}>
                        <select className="k-select" onChange={this.handleChangeCurrentWordList} value={this.props.currentWordGroupIndex}>
                            {this.props.wordGroups.map((wordGroup, i) => (
                                <option key={i} value={i}>
                                    {wordGroup.name + ' (' + wordGroup.words.length + ')'}
                                </option>
                            ))}
                        </select>
                        <button
                            className="btn btn-mini pull-right"
                            onClick={this.handleClickToggle}
                            title={i18n.t('toggle.word.book.settings')}
                            style={{
                                height: '21px',
                                backgroundColor: 'rgb(73, 73, 73)'
                                /*backgroundColor: "#127BC8"*/
                            }}>
                            <span
                                className={'icon ' + (this.state.showSettings ? 'icon-down-open' : 'icon-up-open')}
                                style={{ color: '#fff' }}></span>
                        </button>
                    </div>
                </div>
                <ReactTooltip place="left" type="light" effect="solid" multiline={true} className="k-tooltip" />
            </div>
        );
    }
}
