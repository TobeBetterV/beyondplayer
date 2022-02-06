import { useCallback } from 'react';

const value = target => target.value;
const checked = target => target.checked;
const extractors = { value, checked };

const onValueChange = (key, onChange, extractor = value) => {
    return useCallback(({ target }) => onChange(key, extractor(target)), [onChange]);
};

export { onValueChange, extractors };
