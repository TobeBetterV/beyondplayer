const React = require('react');

const SIZER_STYLES = {
    position: 'absolute',
    width: 0,
    height: 0,
    visibility: 'hidden',
    overflow: 'scroll',
    whiteSpace: 'pre'
};

const STYLE_PROPS = ['fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'letterSpacing'];

class Input extends React.Component {
    constructor(props) {
        super(props);
        this.state = { inputWidth: null };
    }

    componentDidMount() {
        const { autoresize, autofocus } = this.props;

        if (autoresize) {
            this.copyInputStyles();
            this.updateInputWidth();
        }

        if (autofocus) {
            this.input.focus();
        }
    }

    componentDidUpdate() {
        this.updateInputWidth();
    }

    render() {
        const { inputAttributes, inputEventHandlers, query, placeholder, expandable, listboxId, selectedIndex } = this.props;
        const { inputWidth } = this.state;

        return (
            <div className="k-tag-editor__search-input">
                <input
                    {...inputAttributes}
                    {...inputEventHandlers}
                    ref={c => {
                        this.input = c;
                    }}
                    value={query}
                    placeholder={placeholder}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-label={placeholder}
                    aria-owns={listboxId}
                    aria-activedescendant={selectedIndex > -1 ? `${listboxId}-${selectedIndex}` : null}
                    aria-expanded={expandable}
                    style={{ width: inputWidth }}
                />
                <div
                    ref={c => {
                        this.sizer = c;
                    }}
                    style={SIZER_STYLES}>
                    {query || placeholder}
                </div>
            </div>
        );
    }

    copyInputStyles() {
        const inputStyle = window.getComputedStyle(this.input);

        STYLE_PROPS.forEach(prop => {
            this.sizer.style[prop] = inputStyle[prop];
        });
    }

    updateInputWidth() {
        let inputWidth;
        const { autoresize } = this.props;
        const { inputWidth: stateInputWidth } = this.state;

        if (autoresize) {
            // scrollWidth is designed to be fast not accurate.
            // +2 is completely arbitrary but does the job.
            inputWidth = Math.ceil(this.sizer.scrollWidth) + 2;
        }

        if (inputWidth !== stateInputWidth) {
            this.setState({ inputWidth });
        }
    }
}

module.exports = Input;
