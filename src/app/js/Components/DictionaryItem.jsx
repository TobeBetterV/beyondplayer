import React from 'react';
import Dictionary from '../Model/Dictionary';

export default class DictionaryItem extends React.Component {
    constructor(props) {
        super(props);
        this.audio = null;
        this.onClickPlaySound = this.onClickPlaySound.bind(this);
        this.state = { isPaused: true };
    }

    onClickPlaySound(evt) {
        this.play();
    }

    play() {
        Dictionary.pronounce(this.props.data.word);
    }

    render() {
        return (
            <div>
                <h4 className="dict-head"> {this.props.data.name}</h4>
                <div>
                    {this.props.data.definition.map((line, i) => (
                        <div key={i}> {line}</div>
                    ))}
                </div>
            </div>
        );
    }
}
