import '@testing-library/jest-dom';
import React from 'react';
import Modal from 'react-modal';
import { render, screen } from '@testing-library/react';
import { Loader } from './Loader.jsx';

describe('Loader specs', () => {
    beforeAll(() => {
        const modalRoot = document.createElement('div');

        modalRoot.setAttribute('id', 'modal-root');
        document.body.appendChild(modalRoot);

        Modal.setAppElement(modalRoot);
    });

    it('should correctly render a message', () => {
        const message = 'Test message';
        render(<Loader message={message} />);

        expect(screen.queryByText(message)).not.toBeNull();
    });
});
