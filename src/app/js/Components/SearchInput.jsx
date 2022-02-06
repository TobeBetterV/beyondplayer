import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class SearchInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            searchTerm: this.props.value || ''
        };
        this.updateSearch = this.updateSearch.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (typeof nextProps.value !== 'undefined' && nextProps.value !== this.props.value) {
            const e = {
                target: {
                    value: nextProps.value
                }
            };
            this.updateSearch(e);
        }
    }

    render() {
        const {
            onChange,
            onClickClear,
            sortResults,
            throttle,
            filterKeys,
            value,
            fuzzy,
            flex,
            inputClassName,
            inputStyle,
            ...inputProps
        } = this.props; // eslint-disable-line no-unused-vars
        inputProps.type = inputProps.type || 'search';
        inputProps.value = this.state.searchTerm;
        inputProps.onChange = this.updateSearch;
        inputProps.placeholder = inputProps.placeholder || 'Search';

        return (
            <div className={inputClassName ? inputClassName : 'k-search-input'} style={inputStyle}>
                <input {...inputProps} style={{ display: 'inline-block' }} />{' '}
                <span ref="clear" title="Clear" onClick={this.handleClickClear}>
                    &times;
                </span>
            </div>
        );
    }

    handleClickClear = () => {
        this.props.onClickClear();
        this.refs.clear.style.visibility = 'hidden';
    };

    updateSearch(e) {
        const searchTerm = e.target.value;
        this.setState(
            {
                searchTerm: searchTerm
            },
            () => {
                this.refs.clear.style.visibility = searchTerm ? 'visible' : 'hidden';
                if (this._throttleTimeout) {
                    clearTimeout(this._throttleTimeout);
                }

                this._throttleTimeout = setTimeout(() => this.props.onChange(searchTerm), this.props.throttle);
            }
        );
    }
}

SearchInput.defaultProps = {
    onChange() {},
    onClickClear() {},
    fuzzy: false,
    flex: false,
    throttle: 200
};

SearchInput.propTypes = {
    onChange: PropTypes.func,
    onClickClear: PropTypes.func,
    sortResults: PropTypes.bool,
    fuzzy: PropTypes.bool,
    flex: PropTypes.bool,
    throttle: PropTypes.number,
    flex: PropTypes.bool,
    filterKeys: PropTypes.oneOf([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    value: PropTypes.string
};
