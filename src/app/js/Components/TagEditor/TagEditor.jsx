const React = require('react');
const PropTypes = require('prop-types');
const Tag = require('./Tag.jsx');
const Input = require('./Input.jsx');
const Suggestions = require('./Suggestions.jsx');

const KEYS = {
    ENTER: 13,
    TAB: 9,
    BACKSPACE: 8,
    UP_ARROW: 38,
    DOWN_ARROW: 40
};

const CLASS_NAMES = {
    root: 'k-tag-editor',
    rootFocused: 'is-focused',
    selected: 'k-tag-editor__selected',
    selectedTag: 'k-tag-editor__selected-tag',
    selectedTagName: 'k-tag-editor__selected-tag-name',
    search: 'k-tag-editor__search'
};

const LISTBOX_ID = 'ReactTags-listbox';

class TagEditor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            query: '',
            focused: false,
            expandable: false,
            selectedIndex: -1,
            classNames: { ...CLASS_NAMES, ...props.classNames }
        };

        this.inputEventHandlers = {
            onChange: () => {},
            onBlur: this.handleBlur.bind(this),
            onFocus: this.handleFocus.bind(this),
            onInput: this.handleInput.bind(this),
            onKeyDown: this.handleKeyDown.bind(this)
        };
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(newProps) {
        this.setState({
            classNames: { ...CLASS_NAMES, ...newProps.classNames }
        });
    }

    render() {
        const {
            autofocus,
            autoresize,
            placeholder,
            suggestions,
            tagComponent,
            tags: propsTags,
            minQueryLength,
            inputAttributes,
            suggestionsFilter,
            maxSuggestionsLength
        } = this.props;
        const { focused, query, classNames: stateClassNames } = this.state;
        const TagComponent = tagComponent || Tag;

        const tags = propsTags.map((tag, i) => (
            <TagComponent key={i} tag={tag} classNames={stateClassNames} onDelete={this.deleteTag.bind(this, i)} />
        ));

        const expandable = focused && query.length >= minQueryLength;
        const classNames = [stateClassNames.root];

        if (focused) {
            classNames.push(stateClassNames.rootFocused);
        }

        return (
            <div className={classNames.join(' ')} onClick={this.handleClick.bind(this)}>
                <div className={stateClassNames.selected} aria-live="polite" aria-relevant="additions removals">
                    {tags}
                </div>
                <div className={stateClassNames.search}>
                    <Input
                        {...this.state}
                        inputAttributes={inputAttributes}
                        inputEventHandlers={this.inputEventHandlers}
                        ref={c => {
                            this.input = c;
                        }}
                        listboxId={LISTBOX_ID}
                        autofocus={autofocus}
                        autoresize={autoresize}
                        expandable={expandable}
                        placeholder={placeholder}
                    />
                    <Suggestions
                        {...this.state}
                        ref={c => {
                            this.suggestions = c;
                        }}
                        listboxId={LISTBOX_ID}
                        expandable={expandable}
                        suggestions={suggestions}
                        suggestionsFilter={suggestionsFilter}
                        addTag={this.addTag.bind(this)}
                        maxSuggestionsLength={maxSuggestionsLength}
                    />
                </div>
            </div>
        );
    }

    getQuery = () => this.state.query;

    handleInput(e) {
        const query = e.target.value;
        const { handleInputChange } = this.props;

        if (handleInputChange) {
            handleInputChange(query);
        }

        this.setState({ query });
    }

    handleKeyDown(e) {
        const { query, selectedIndex } = this.state;
        const { delimiters, delimiterChars, allowBackspace, tags } = this.props;

        // when one of the terminating keys is pressed, add current query to the tags.
        if (delimiters.indexOf(e.keyCode) > -1 || delimiterChars.indexOf(e.key) > -1) {
            if (query || selectedIndex > -1) {
                e.preventDefault();
            }

            this.handleDelimiter();
        }

        // when backspace key is pressed and query is blank, delete the last tag
        if (e.keyCode === KEYS.BACKSPACE && query.length === 0 && allowBackspace) {
            this.deleteTag(tags.length - 1);
        }

        if (e.keyCode === KEYS.UP_ARROW) {
            e.preventDefault();

            // if last item, cycle to the bottom
            if (selectedIndex <= 0) {
                this.setState({ selectedIndex: this.suggestions.state.options.length - 1 });
            } else {
                this.setState({ selectedIndex: selectedIndex - 1 });
            }
        }

        if (e.keyCode === KEYS.DOWN_ARROW) {
            e.preventDefault();

            this.setState({ selectedIndex: (selectedIndex + 1) % this.suggestions.state.options.length });
        }
    }

    handleDelimiter() {
        const { minQueryLength, allowNew } = this.props;
        const { query, selectedIndex } = this.state;

        if (query.length >= minQueryLength) {
            // Check if the user typed in an existing suggestion.
            const match = this.suggestions.state.options.findIndex(suggestion => {
                return suggestion.name.search(new RegExp(`^${query}$`, 'i')) === 0;
            });

            const index = selectedIndex === -1 ? match : selectedIndex;

            if (index > -1) {
                this.addTag(this.suggestions.state.options[index]);
            } else if (allowNew) {
                this.addTag({ name: query });
            }
        }
    }

    handleClick(e) {
        if (document.activeElement !== e.target) {
            this.input.input.focus();
        }
    }

    handleBlur() {
        const { handleBlur, addOnBlur } = this.props;
        this.setState({ focused: false, selectedIndex: -1 });

        if (handleBlur) {
            handleBlur();
        }

        if (addOnBlur) {
            this.handleDelimiter();
        }
    }

    handleFocus() {
        const { handleFocus } = this.props;
        this.setState({ focused: true });

        if (handleFocus) {
            handleFocus();
        }
    }

    addTag(tag) {
        const { handleValidate, handleAddition } = this.props;

        if (tag.disabled) {
            return;
        }

        if (typeof handleValidate === 'function' && !handleValidate(tag)) {
            return;
        }

        handleAddition(tag);

        // reset the state
        this.setState({
            query: '',
            selectedIndex: -1
        });
    }

    deleteTag(i) {
        const { query } = this.state;
        const { handleDelete, clearInputOnDelete } = this.props;

        handleDelete(i);

        if (clearInputOnDelete && query !== '') {
            this.setState({ query: '' });
        }
    }
}

TagEditor.defaultProps = {
    tags: [],
    placeholder: 'Add new tag',
    suggestions: [],
    suggestionsFilter: null,
    autofocus: true,
    autoresize: true,
    delimiters: [KEYS.TAB, KEYS.ENTER],
    delimiterChars: [],
    minQueryLength: 2,
    maxSuggestionsLength: 6,
    allowNew: false,
    allowBackspace: true,
    tagComponent: null,
    inputAttributes: {},
    addOnBlur: false,
    clearInputOnDelete: true
};

TagEditor.propTypes = {
    addOnBlur: PropTypes.bool,
    allowBackspace: PropTypes.bool,
    allowNew: PropTypes.bool,
    autofocus: PropTypes.bool,
    autoresize: PropTypes.bool,
    classNames: PropTypes.object,
    clearInputOnDelete: PropTypes.bool,
    delimiterChars: PropTypes.arrayOf(PropTypes.string),
    delimiters: PropTypes.arrayOf(PropTypes.number),
    handleAddition: PropTypes.func.isRequired,
    handleBlur: PropTypes.func,
    handleDelete: PropTypes.func.isRequired,
    handleFocus: PropTypes.func,
    handleInputChange: PropTypes.func,
    handleValidate: PropTypes.func,
    inputAttributes: PropTypes.object,
    maxSuggestionsLength: PropTypes.number,
    minQueryLength: PropTypes.number,
    placeholder: PropTypes.string,
    suggestions: PropTypes.arrayOf(PropTypes.object),
    suggestionsFilter: PropTypes.func,
    tagComponent: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),
    tags: PropTypes.arrayOf(PropTypes.object)
};

module.exports = TagEditor;
