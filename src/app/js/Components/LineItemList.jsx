import React from 'react';
import LineItem from './LineItem.jsx';
import { remote } from 'electron';
import DragSelect from 'dragselect';
import ReactList from './ReactList.jsx';
import Settings from '../Model/Settings/index.js';

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const i18n = remote.require('./i18n');

export default class LineItemList extends React.Component {
    constructor(props) {
        super(props);
        this.items = {};
        this.elements = [];

        this.clickStartTime = 0;

        this.state = { fontSize: Settings.getSidePaneSubtitleSizeInPx() };

        this.menuOnWord = new Menu();

        if (PRO_VERSION) {
            this.menuOnWord.append(
                new MenuItem({
                    label: i18n.t('add.to.word.book'),
                    click: () => {
                        if (this.focused) {
                            this.props.onAddWord(this.focused.innerText);
                        }
                    }
                })
            );

            this.menuOnWord.append(
                new MenuItem({
                    label: i18n.t('annotate.for.automatic.notification'),
                    click: () => {
                        this.props.onMarkWord(this.focused.innerText);
                    }
                })
            );
            this.menuOnWord.append(new MenuItem({ type: 'separator' }));
            this.menuOnWord.append(
                new MenuItem({
                    label: i18n.t('search.in.web'),
                    click: () => {
                        if (this.focused) {
                            this.props.onSearchWeb(this.focused.innerText);
                        }
                    }
                })
            );

            this.menuOnWord.append(
                new MenuItem({
                    label: i18n.t('search.in.vidlib'),
                    click: () => {
                        if (this.focused) {
                            this.props.onSearchVidLib(this.focused.innerText);
                        }
                    }
                })
            );
        }
        this.menuOnWord.append(
            new MenuItem({
                id: 'lookup',
                label: i18n.t('search.in.dictionary'),
                click: () => {
                    if (this.focused) {
                        this.props.onOpenDictionary(this.focused.innerText.trim());
                    }
                }
            })
        );

        if (PRO_VERSION) {
            this.menuOnWord.append(new MenuItem({ type: 'separator' }));

            this.menuOnWord.append(
                new MenuItem({
                    id: 'saveLines',
                    label: i18n.t('save.repeating.lines.to.library'),
                    click: () => {
                        this.props.onSaveRepeatingLinesToVidLib();
                    }
                })
            );
            this.menuOnWord.append(
                new MenuItem({
                    id: 'saveLine',
                    label: i18n.t('save.this.line.to.library'),
                    click: () => {
                        this.props.onSaveLineToVidLib(this.rightClickLIneIndex);
                    }
                })
            );
        }

        this.menuOnLine = new Menu();

        if (PRO_VERSION) {
            this.menuOnLine.append(
                new MenuItem({
                    id: 'saveLine',
                    label: i18n.t('save.this.line.to.library'),
                    click: () => {
                        this.props.onSaveLineToVidLib(this.rightClickLIneIndex);
                    }
                })
            );

            this.menuOnRange = new Menu();
            this.menuOnRange.append(
                new MenuItem({
                    id: 'saveLines',
                    label: i18n.t('save.repeating.lines.to.library'),
                    click: () => {
                        this.props.onSaveRepeatingLinesToVidLib();
                    }
                })
            );
            this.menuOnRange.append(
                new MenuItem({
                    id: 'saveLine',
                    label: i18n.t('save.this.line.to.library'),
                    click: () => {
                        this.props.onSaveLineToVidLib(this.rightClickLIneIndex);
                    }
                })
            );
            this.menuOnRange.append(new MenuItem({ type: 'separator' }));
            this.menuOnRange.append(
                new MenuItem({
                    label: i18n.t('shift.subtitle.to.this.line'),
                    click: () => {
                        this.props.onSyncTimeToLine(this.rightClickLIneIndex);
                    }
                })
            );
        }

        this.menuOnLine.append(
            new MenuItem({
                label: i18n.t('shift.subtitle.to.this.line'),
                click: () => {
                    this.props.onSyncTimeToLine(this.rightClickLIneIndex);
                }
            })
        );

        this.dragSelect = null;
    }

    componentWillUnmount() {
        if (this.dragSelect != null) {
            this.dragSelect.stop();
            this.dragSelect = null;
        }
    }

    updateFontSize = () => {
        this.setState({ fontSize: Settings.getSidePaneSubtitleSizeInPx() });
    };

    handleMouseMove = e => {
        this.dragEndPos = [e.screenX, e.screenY];
    };

    handleDragStart = e => {
        this.dragStartPos = [e.screenX, e.screenY];
        this.props.onSelectStart();
    };

    handleScroll = e => {
        this.lastScrollTime = Date.now();
    };

    handleKeyDown = e => {
        var charCode = e.keyCode || e.which;
        if (charCode === 32) {
            e.preventDefault();
            this.props.onPressSpace();
            return false;
        }
    };

    handleDragEnd = nodes => {
        if (this.props.searchTerm) return;

        if (nodes.length <= 0) return;
        if (!this.dragStartPos) return;

        if (this.dragStartPos[0] == this.dragEndPos[0] && this.dragStartPos[1] == this.dragEndPos[1]) {
            this.isSelecting = false;
            return;
        }

        this.isSelecting = true;

        var [start, end] = this.getSelectedLines(nodes);
        this.props.onRepeat(start, end);
    };

    componentDidUpdate() {
        if (!this.dragSelect) {
            this.dragSelect = new DragSelect({
                selectables: [],
                area: this.refs.container,
                customStyles: true,
                onDragStart: this.handleDragStart,
                callback: this.handleDragEnd
            });
        }

        this.dragSelect.removeSelectables(this.dragSelect.getSelectables(), true);
        this.dragSelect.addSelectables(this.elements);
        this.dragSelect.selector.style.display = 'none';
    }

    scrollToSub = index => {
        if (Date.now() - this.lastScrollTime < 2000) return;

        if (index != -1) {
            var [start, end] = this.refs.scroll.getVisibleRange();

            let visible = index >= start && index <= end;

            if (visible) {
                let middle = (end + start) / 2;
                if (index <= middle) return;
            }

            var half = (end - start) / 2;
            var targetIndex = Math.round(index - half);
            if (targetIndex < 0) targetIndex = 0;

            this.refs.scroll.scrollTo(targetIndex, visible);
        }
    };

    onClickWord = (word, target) => {
        this.dragSelect.break();
        //target.style["user-select"] = "text";
        this.props.onLookUpWord(word, target);
        //target.style["user-select"] = "none";
    };

    getSelectedLines(nodes) {
        let start = this.props.lines.length;
        let end = -1;

        for (var i = 0, len = nodes.length; i < len; i++) {
            let node = nodes[i];
            let index = parseInt(node.dataset.index);
            if (index != -1) {
                if (index < start) {
                    start = index;
                }
                if (index > end) {
                    end = index;
                }
            }
        }

        return [start, end];
    }

    handleContextMenu = e => {
        this.props.onContextMenu(e);

        if (this.focused) {
            this.popUpWordMenu(e);
        } else if (e.target && e.target.nodeName == 'P') {
            this.popUpMenu(e);
        } else {
            this.props.onClearRepeat();
        }
    };

    popUpWordMenu = e => {
        if (PRO_VERSION) {
            this.rightClickLIneIndex = parseInt(e.target.parentNode.dataset.index);
            const left = this.props.repeatingRange[0];
            this.enableMenuItem(this.menuOnWord, 'saveLine', this.props.isLocal);
            this.enableMenuItem(this.menuOnWord, 'saveLines', this.props.isLocal && left !== -1);
            this.menuOnWord.popup({ x: e.clientX, y: e.clientY });
        } else {
            this.menuOnWord.popup({ x: e.clientX, y: e.clientY });
        }
    };

    popUpMenu = e => {
        if (PRO_VERSION) {
            this.rightClickLIneIndex = parseInt(e.target.dataset.index);
            const left = this.props.repeatingRange[0];
            const right = this.props.repeatingRange[1];
            if (left !== -1 && left <= this.rightClickLIneIndex && this.rightClickLIneIndex <= right) {
                this.enableMenuItem(this.menuOnRange, 'saveLine', this.props.isLocal);
                this.enableMenuItem(this.menuOnRange, 'saveLines', this.props.isLocal);
                this.menuOnRange.popup({ x: e.clientX, y: e.clientY });
            } else {
                this.enableMenuItem(this.menuOnLine, 'saveLine', this.props.isLocal);
                this.menuOnLine.popup({ x: e.clientX, y: e.clientY });
            }
        } else {
            this.rightClickLIneIndex = parseInt(e.target.dataset.index);
            this.menuOnLine.popup({ x: e.clientX, y: e.clientY });
        }
    };

    enableMenuItem = (menu, id, v) => {
        let item = menu.getMenuItemById(id);
        item.enabled = v;
    };

    handleFocus = e => {
        if (e.target && e.target.nodeName.toLowerCase() == 'span') {
            this.focused = e.target;
        }
    };

    handleFocusOut = e => {
        if (e.target && e.target.nodeName.toLowerCase() == 'span') {
            this.focused = null;
        }
    };

    onClickLine = (lineIndex, target) => {
        //alert("click 0!");
        //if (this.isSelecting) return;

        //alert("click 1!");

        var now = Date.now();
        if (now - this.clickStartTime < 300) {
            this.props.onDoubleClickLine(lineIndex);
        } else {
            this.props.onClickLine(lineIndex);
        }
        this.clickStartTime = now;
    };

    calcItemSize = index => {
        var line = this.props.lines[index];
        if (!line) return 0;

        let lineCount = 0;
        let charCount = 0;

        line.sentences.forEach(sentence => {
            charCount = 0;
            for (var i = 0; i < sentence.length; i++) {
                charCount += sentence[i].length;
                if (charCount > Settings.getSidePaneCharsPerLine()) {
                    lineCount++;
                    charCount = sentence[i].length;
                }
            }
            lineCount++;
        });

        return lineCount * Settings.getSidePaneRowHeight() + LineItem.ROW_PADDING;
    };

    renderItem = (index, key) => {
        var line = this.props.lines[index];
        return (
            <LineItem
                key={key}
                subtitleIndex={line.index}
                searchTerm={this.props.searchTerm}
                searchTermWords={this.props.searchTermWords}
                selected={line.index === this.props.lineIndex}
                prevSelected={line.index === this.props.prevLineIndex}
                repeatingRange={this.props.repeatingRange}
                ref={ref => {
                    if (ref) {
                        this.items[line.index] = ref;
                        this.elements.push(ref.element);
                    }
                }}
                sentences={line.sentences}
                onClickWord={this.onClickWord}
                onClickLine={this.onClickLine}
                onAddWord={this.props.onAddWord}
            />
        );
    };

    render() {
        this.items = {};
        this.elements = [];

        return (
            <div
                className="k-subtitle-lines"
                onContextMenu={this.handleContextMenu}
                onMouseOver={this.handleFocus}
                onMouseMove={this.handleMouseMove}
                onMouseOut={this.handleFocusOut}
                onScroll={this.handleScroll}
                onKeyDown={this.handleKeyDown}
                ref="container"
                tabIndex="0"
                style={{ outline: 'none', fontSize: this.state.fontSize }}>
                <ReactList
                    itemRenderer={this.renderItem}
                    itemSizeGetter={this.calcItemSize}
                    length={this.props.lines.length}
                    ref="scroll"
                    type="variable"
                />
            </div>
        );
    }
}
