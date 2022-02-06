import React from 'react';
import LineItemList from './LineItemList.jsx';
import SearchInput from './SearchInput.jsx';
import { remote } from 'electron';
import { breakSentence } from '../Model/KUtils';
import LocalSubtitleSettingsPane from './LocalSubtitleSettingsPane.jsx';
import YouTubeSubtitleSettingsPane from './YouTubeSubtitleSettingsPane.jsx';

const i18n = remote.require('./i18n');

export default class SubtitlePane extends React.Component {
    constructor(props) {
        super(props);
        this.handleClickToggle = this.handleClickToggle.bind(this);
        this.onSearchUpdated = this.onSearchUpdated.bind(this);
        this.state = {
            searchTerm: '',
            searchTermWords: [],
            filterMode: true,
            showSettings: this.props.subtitles.length > 1 ? false : true,
            ccList: []
        };

        this.list = null;
    }

    scrollToSub(index) {
        this.list.scrollToSub(index);
    }

    updateSubtitleFontSize = () => {
        this.list.updateFontSize();
    };

    handleClickToggle(e) {
        this.setState({ showSettings: !this.state.showSettings });
    }

    showSettings(v) {
        this.setState({ showSettings: v });
    }

    onSearchUpdated(term) {
        var words = breakSentence(term);
        this.setState({ searchTerm: term, searchTermWords: words });
    }

    handleFocusSearch = () => {
        this.props.onStartFilterSubtitle();
    };

    handleClickClear = () => {
        this.setState({ searchTerm: '', searchTermWords: [] }, () => {
            if (this.props.lineIndex != -1) {
                this.list.scrollToSub(this.props.lineIndex);
            }
        });
    };

    containsElement(el) {}

    setCCList = ccList => {
        this.setState({ ccList });
    };

    render() {
        const filteredLines = this.props.filterBySearchTerm
            ? this.props.lines.filter(line => line.text.toLowerCase().includes(this.state.searchTerm.toLowerCase()))
            : this.props.lines;

        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <SearchInput
                    placeholder={i18n.t('search.in.subtitle')}
                    inputClassName="k-search-input"
                    onChange={this.onSearchUpdated}
                    value={this.state.searchTerm}
                    onClickClear={this.handleClickClear}
                    onFocus={this.handleFocusSearch}
                />

                <LineItemList
                    {...this.props}
                    lines={filteredLines}
                    repeatingRange={[this.props.repeatingLineBeginIndex, this.props.repeatingLineEndIndex]}
                    ref={ref => (this.list = ref)}
                    searchTerm={this.state.searchTerm}
                    searchTermWords={this.state.searchTermWords}
                />
                {this.state.showSettings ? (
                    this.props.isLocal ? (
                        <LocalSubtitleSettingsPane {...this.props} />
                    ) : (
                        <YouTubeSubtitleSettingsPane {...this.props} ccList={this.state.ccList} />
                    )
                ) : null}
                <div
                    className="k-subtitle-footer"
                    style={{ textAlign: 'center' }}
                    onClick={this.handleClickToggle}
                    title={i18n.t('toggle.subtitle.settings')}>
                    <span className={'icon ' + (this.state.showSettings ? 'icon-down-open' : 'icon-dot-3')} style={{ color: '#fff' }}></span>
                </div>
            </div>
        );
    }
}
