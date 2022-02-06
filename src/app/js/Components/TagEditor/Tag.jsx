const React = require('react');

const Tag = ({ classNames, tag, onDelete }) => (
    <button type="button" className={classNames.selectedTag} title="Click to remove tag" onClick={onDelete}>
        <span className={classNames.selectedTagName}>{tag.name}</span>
    </button>
);

module.exports = Tag;
