import React from 'react';
import WebSourceItem from './WebSourceItem.jsx';
import WebSearch from '../Model/WebSearch';
import SearchInput from './SearchInput.jsx';
import { remote, clipboard } from 'electron';
import Loader from 'react-loader-spinner';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Settings from '../Model/Settings';

const i18n = remote.require('./i18n');
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

const getItemStyle = (isDragging, draggableStyle) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: 'none',
    /*padding: grid * 2,*/
    margin: `0 0 0 0`,
    /*background: isDragging ? 'lightgreen' : 'grey',*/
    ...draggableStyle
});

const getListStyle = isDraggingOver => ({
    /*background: isDraggingOver ? 'lightblue' : 'lightgrey',*/
    /*padding: grid,*/
    width: 468
});

export default class WebPane extends React.Component {
    constructor(props) {
        super(props);

        this.items = [];
        this.state = {
            searchTerm: '',
            showConfigPane: false,
            enabledSources: WebSearch.getEnabledSources(),
            sources: this.generateConfigSources(JSON.parse(JSON.stringify(WebSearch.getAllSources().slice(0))))
        };

        this.menu = new Menu();
        this.menu.append(
            new MenuItem({
                label: i18n.t('annotate.selected.text'),
                click: () => {
                    this.props.onAddWordDefinition(this.state.searchTerm, this.selectedText);
                }
            })
        );
        this.menu.append(new MenuItem({ type: 'separator' }));
        this.menu.append(
            new MenuItem({
                label: i18n.t('copy'),
                click: () => {
                    clipboard.writeText(this.selectedText, 'selection');
                }
            })
        );
    }

    search(term) {
        this.setState({
            searchTerm: term
        });
    }

    getSelectedText() {
        return this.selectedText;
    }

    addSelectionToWordDefinition = () => {
        this.props.onAddWordDefinition(this.state.searchTerm, this.selectedText);
    };

    handleWebViewIPC = event => {
        switch (event.channel) {
            case 'right-click-selection':
                var msg = event.args[0];
                this.selectedText = msg.text;
                var bounds = this.refs.web.getBoundingClientRect();
                this.menu.popup({ x: msg.x + bounds.left, y: msg.y + bounds.top });
                break;
            case 'change-selection':
                this.selectedText = event.args[0];
                break;
        }
    };

    initWebView = () => {
        this.refs.web.addEventListener('did-finish-load', this.handleLoad);
        this.refs.web.addEventListener('ipc-message', this.handleWebViewIPC);
        this.checkWebviewReady(() => {
            var socks5 = Settings.getSocks5();
            if (socks5) {
                const ses = this.refs.web.getWebContents().session;
                ses.setProxy({ proxyRules: socks5 }, () => {
                    this.updateSrc();
                });
            } else {
                this.updateSrc();
            }
        });
    };

    componentDidMount() {
        this.initWebView();
    }

    updateSrc = () => {
        this.refs.web.src = WebSearch.generateSearchUrl(this.state.enabledSources[this.props.selectedSourceIndex], this.state.searchTerm);
    };

    checkWebviewReady = callback => {
        if (this.refs.web.getWebContents) {
            callback();
        } else {
            requestAnimationFrame(() => {
                this.checkWebviewReady(callback);
            });
        }
    };

    onSearchUpdated = term => {
        this.setState({ searchTerm: term }, () => {
            if (this.state.showConfigPane) return;
            this.showLoader();
            this.updateSrc();
        });
    };

    reload = () => {
        this.setState({ showConfigPane: false }, () => {
            this.showLoader();
            this.refs.web.addEventListener('did-finish-load', this.handleLoad);
            this.updateSrc();
        });
    };

    getClickFunc(index) {
        return e => {
            this.props.onSwitch(index, () => {
                this.reload();
            });
        };
    }

    handleLoad = () => {
        this.refs.loader.style.display = 'none';
    };

    handleClickToggleConfig = e => {
        this.setState(
            {
                showConfigPane: !this.state.showConfigPane
            },
            () => {
                if (this.state.showConfigPane) {
                    this.refs.loader.style.display = 'none';
                } else {
                    this.initWebView();
                }
            }
        );
    };

    handleClickSave = () => {
        this.props.onSwitch(0);

        var sources = this.state.sources.map(s => {
            delete s.uid;
            return s;
        });
        WebSearch.save(sources);
        this.setState(
            {
                showConfigPane: false,
                enabledSources: WebSearch.getEnabledSources(),
                sources: this.generateConfigSources(JSON.parse(JSON.stringify(WebSearch.getAllSources().slice(0))))
            },
            () => {
                this.forceUpdate(this.initWebView);
            }
        );
    };

    handleClickCancel = () => {
        this.setState({ showConfigPane: false }, this.initWebView);
    };

    handleClickRestore = () => {
        WebSearch.restore();
        this.setState(
            {
                showConfigPane: false,
                enabledSources: WebSearch.getEnabledSources(),
                sources: this.generateConfigSources(JSON.parse(JSON.stringify(WebSearch.getAllSources().slice(0))))
            },
            () => {
                this.forceUpdate(this.initWebView);
            }
        );
    };

    showLoader() {
        this.refs.loader.style.display = 'block';
    }

    handleChangeHomeUrl = (i, v) => {
        const sources = this.state.sources;
        sources[i].homeUrl = v;
        this.setState({ sources: sources });
    };

    handleChangeSearchUrl = (i, v) => {
        const sources = this.state.sources;
        sources[i].searchUrl = v;
        this.setState({ sources: sources });
    };

    handleChangeName = (i, v) => {
        const sources = this.state.sources;
        sources[i].name = v;
        this.setState({ sources: sources });
    };

    handleChangeSeparator = (i, v) => {
        const sources = this.state.sources;
        sources[i].separator = v;
        this.setState({ sources: sources });
    };

    handleChangeEnabled = (i, v) => {
        const sources = this.state.sources;

        if (v) {
            let count = 0;
            this.state.sources.forEach(e => {
                if (e.enabled) count++;
            });
            if (count >= WebSearch.MAX_ENABLED) {
                alert(i18n.tf('alert.max.enabled.web.sources', WebSearch.MAX_ENABLED));
                return;
            }
        }

        sources[i].enabled = v;
        this.setState({ sources: sources });
    };

    onDragEnd = result => {
        if (!result.destination) {
            return;
        }

        const sources = reorder(this.state.sources, result.source.index, result.destination.index);

        this.setState({
            sources
        });
    };

    handleClickClear = () => {
        this.setState({ searchTerm: '' });
    };

    handleClickAddSearchWord = () => {
        var word = this.state.searchTerm;
        if (word) {
            this.props.onAddWord(word);
        }
    };

    generateConfigSources = sources => {
        sources.forEach(source => {
            source.uid =
                'uid_' +
                Math.random()
                    .toString(36)
                    .substr(2, 9);
        });
        return sources;
    };

    render() {
        this.items = [];

        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'row' }}>
                    <SearchInput
                        inputClassName="k-search-input"
                        inputStyle={{ flex: 1 }}
                        placeholder={i18n.t('search.word')}
                        onChange={this.onSearchUpdated}
                        value={this.state.searchTerm}
                        onClickClear={this.handleClickClear}
                    />
                    <button
                        className="btn"
                        onClick={this.handleClickAddSearchWord}
                        style={{ height: '32px', backgroundColor: 'rgb(50,50,50)', color: 'white', margin: '10px 8px 5px 0px' }}
                        title={i18n.t('add.search.term.to.word.book')}>
                        +
                    </button>
                </div>
                <div style={{ top: '45%', right: '215px', position: 'absolute' }} ref="loader">
                    <Loader type="Oval" color="#127BC8" height="50" width="50" />
                </div>
                {this.state.showConfigPane ? (
                    <div className="k-web-config-pane">
                        <DragDropContext onDragEnd={this.onDragEnd}>
                            <Droppable droppableId="droppable">
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} style={getListStyle(snapshot.isDraggingOver)}>
                                        {this.state.sources.map((source, i) => (
                                            <Draggable key={source.uid} draggableId={source.uid} index={i}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}>
                                                        <WebSourceItem
                                                            index={i}
                                                            name={source.name}
                                                            searchUrl={source.searchUrl}
                                                            homeUrl={source.homeUrl}
                                                            enabled={source.enabled}
                                                            separator={source.separator}
                                                            ref={ref => {
                                                                this.items.push(ref);
                                                            }}
                                                            onChangeSearchUrl={this.handleChangeSearchUrl}
                                                            onChangeHomeUrl={this.handleChangeHomeUrl}
                                                            onChangeName={this.handleChangeName}
                                                            onChangeEnabled={this.handleChangeEnabled}
                                                            onChangeSeparator={this.handleChangeSeparator}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        <div>
                            * {i18n.t('hint.web.source.1')}
                            <br />* {i18n.t('hint.web.source.2')}
                        </div>
                        <div
                            style={{
                                height: '70px'
                            }}
                            className="k-bottom-button-container">
                            <button className="btn btn-default" onClick={this.handleClickCancel}>
                                {i18n.t('cancel')}
                            </button>
                            <button className="btn btn-default" onClick={this.handleClickRestore}>
                                {i18n.t('reset')}
                            </button>
                            <button className="btn btn-default" onClick={this.handleClickSave}>
                                {i18n.t('save')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <webview
                        className="k-web"
                        useragent="Mozilla/5.0 (Linux; Android 7.0; SM-G930V Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36"
                        preload="./inter_op_webpane.js"
                        nodeintegration="true"
                        ref="web"
                    />
                )}
                <div className="k-webpane-footer">
                    {this.state.enabledSources.map((source, i) => (
                        <div
                            key={source.name}
                            className={'k-web-source-btn' + (this.props.selectedSourceIndex == i && !this.state.showConfigPane ? ' k-active' : '')}
                            onClick={this.getClickFunc(i)}>
                            {source.name.split(' ').map((item, i) => (
                                <span key={i} style={{ margin: 'auto' }}>
                                    {item}
                                    <br />
                                </span>
                            ))}
                        </div>
                    ))}
                    <div
                        className={'k-web-source-btn pull-right' + (this.state.showConfigPane ? ' k-active' : '')}
                        style={{ flexBasis: '44px', flexGrow: 0, paddingTop: '15px' }}
                        onClick={this.handleClickToggleConfig}
                        title={i18n.t('toggle.web.dictionary.settings')}>
                        <span>⚙</span>
                    </div>
                </div>
            </div>
        );
    }
}
