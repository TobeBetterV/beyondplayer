import React from 'react';
import PropTypes from 'prop-types';
import { Card, Tooltip, Checkbox } from 'antd';
import { card, thumb, text, checkbox } from './AnkiVideoCard.module.less';

const AnkiVideoCard = ({ id, frontPreview, frontText, checked, onSelectVideo }) => (
    <Card.Grid className={card} key={id} onClick={() => onSelectVideo(id, !checked)}>
        <Tooltip title={frontText} mouseEnterDelay={1.0}>
            <Checkbox className={checkbox} checked={checked} />
            <img alt="" className={thumb} src={frontPreview} />
            <span className={text}>{frontText}</span>
        </Tooltip>
    </Card.Grid>
);

AnkiVideoCard.propTypes = {
    checked: PropTypes.bool.isRequired,
    frontPreview: PropTypes.string.isRequired,
    frontText: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    onSelectVideo: PropTypes.func.isRequired
};
export { AnkiVideoCard };
