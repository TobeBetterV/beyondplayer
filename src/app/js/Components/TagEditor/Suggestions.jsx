const React = require('react');

function escapeForRegExp(query) {
    return query.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function markIt(input, query) {
    let result = input;

    if (query) {
        const regex = RegExp(escapeForRegExp(query), 'gi');

        result = input.replace(regex, '<mark>$&</mark>');
    }

    return {
        __html: result
    };
}

function filterSuggestions(query, suggestions, length, suggestionsFilter) {
    let filter = suggestionsFilter;

    if (!filter) {
        const regex = new RegExp(`(?:^|\\s)${escapeForRegExp(query)}`, 'i');
        filter = item => regex.test(item.name);
    }

    return suggestions.filter(item => filter(item, query)).slice(0, length);
}

class Suggestions extends React.Component {
    constructor(props) {
        super(props);

        const { query, suggestions, maxSuggestionsLength, suggestionsFilter } = this.props;

        this.state = {
            options: filterSuggestions(query, suggestions, maxSuggestionsLength, suggestionsFilter)
        };
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(newProps) {
        this.setState({
            options: filterSuggestions(newProps.query, newProps.suggestions, newProps.maxSuggestionsLength, newProps.suggestionsFilter)
        });
    }

    render() {
        const { expandable, selectedIndex, listboxId, query } = this.props;
        const { options: stateOptions } = this.state;

        if (!expandable || !stateOptions.length) {
            return null;
        }

        const options = stateOptions.map((item, i) => {
            const key = `${listboxId}-${i}`;
            const classNames = [];

            if (selectedIndex === i) {
                classNames.push('is-active');
            }

            if (item.disabled) {
                classNames.push('is-disabled');
            }

            return (
                <li
                    id={key}
                    key={key}
                    role="option"
                    className={classNames.join(' ')}
                    aria-disabled={item.disabled === true}
                    onMouseDown={this.handleMouseDown.bind(this, item)}>
                    <span dangerouslySetInnerHTML={markIt(item.name, query)} />
                </li>
            );
        });

        return (
            <div className="k-tag-editor__suggestions">
                <ul role="listbox" id={listboxId}>
                    {options}
                </ul>
            </div>
        );
    }

    handleMouseDown(item, e) {
        // focus is shifted on mouse down but calling preventDefault prevents this
        e.preventDefault();

        // eslint-disable-next-line react/destructuring-assignment
        this.props.addTag(item);
    }
}

module.exports = Suggestions;
