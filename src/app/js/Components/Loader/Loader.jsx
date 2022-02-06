import React from 'react';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import MessageDialog from '../MessageDialog.jsx';
import { root } from './Loader.module.less';

/**
 * A default wait popup dialog
 * @param {Object} params
 * @param {boolean} params.isOpen - a proxy option to the modal dialog, shows/hides dialog
 * @param {function} params.onAfterOpen - a proxy option to the modal dialog, on after open callback
 * @param {string=} params.message - a popup message
 */
const Loader = ({ isOpen = true, onAfterOpen = () => {}, message = '' }) => (
    <Modal isOpen={isOpen} className={`${root} k-modal`} overlayClassName="k-overlay" onAfterOpen={onAfterOpen} contentLabel="Subtitle Dialog">
        <MessageDialog message={message} />
    </Modal>
);

Loader.propTypes = {
    isOpen: PropTypes.bool,
    message: PropTypes.string,
    onAfterOpen: PropTypes.func
};

export { Loader };
