import React from 'react';
import DictionaryItem from './DictionaryItem.jsx';

export default class DictionaryPane extends React.Component {
    render() {
        return (
            <div className="dict-pane">
                {this.props.data.map((item, i) => (
                    <DictionaryItem data={item} key={i}></DictionaryItem>
                ))}
            </div>
        );
    }
}
