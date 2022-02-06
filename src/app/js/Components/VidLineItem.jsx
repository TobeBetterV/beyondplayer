import React from 'react';
import { select } from '../Model/KUtils';

export default class VidLineItem extends React.PureComponent {
    static CHARS_PER_LINE = 38;
    static ROW_HEIGHT = 25;
    static ROW_PADDING = 16;

    constructor(props) {
        super(props);
        this.progressBar = null;
    }

    handleClickWord = e => {
        e.stopPropagation();
        var word = e.target.innerText;
        //e.target.style["user-select"] = "text";
        select(e.target);
        this.props.onClickWord(word, e.target);
        select(null);
        //e.target.style["user-select"] = "none";
    };

    updateProgress = percent => {
        this.progressBar.style.height = percent + '%';
    };

    buildClassName = () => {
        var cn = 'k-vid-line-item-words';
        if (this.props.currentIndex === this.props.line.index && this.props.highlighted) {
            cn += ' k-selected';
        }
        if (this.props.line.index % 2 == 0) {
            cn += ' k-even';
        } else {
            cn += ' k-odd';
        }
        return cn;
    };

    handleMouseDown = e => {
        this.dragStartPos = [e.screenX, e.screenY];
    };

    handleMouseMove = e => {
        this.dragEndPos = [e.screenX, e.screenY];
    };

    handleMouseUp = e => {
        if (!this.dragStartPos) return;

        if (this.dragStartPos[0] == this.dragEndPos[0] && this.dragStartPos[1] == this.dragEndPos[1]) {
            if (e.target.nodeName != 'SPAN') {
                this.props.onClickLine(this.props.line.index, true);
            }
        }
    };

    handleMouseLeave = e => {};

    render() {
        const line = this.props.line;
        return (
            <div
                className="k-vid-line-item"
                ref={ref => (this.element = ref)}
                onMouseDown={this.handleMouseDown}
                onMouseMove={this.handleMouseMove}
                onMouseUp={this.handleMouseUp}
                onMouseLeave={this.handleMouseLeave}
                data-index={line.index}
                onContextMenu={this.props.onContextMenu}
                style={{ height: line.height }}>
                <div
                    className="k-vid-line-item-progress"
                    ref={ref => (this.progressBar = ref)}
                    style={{
                        height: this.props.currentIndex > line.index ? '100%' : '0%',
                        backgroundColor: this.props.highlighted ? 'rgb(9, 140, 228)' : 'rgb(40, 40, 40)'
                    }}></div>
                <div className={this.buildClassName()}>
                    {line.words.map((word, i) =>
                        word == '\n' ? (
                            <br key={i} />
                        ) : (
                            <span
                                className={i >= line.highlightStart && i <= line.highlightEnd ? ' k-highlighter' : ''}
                                key={i}
                                onClick={this.handleClickWord}>
                                {' '}
                                {word}{' '}
                            </span>
                        )
                    )}
                </div>
            </div>
        );
    }
}
