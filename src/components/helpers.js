import dictionary from '../data/dictionary.json';

export const styles = {
	'practice-sheet': 'practice-sheet',
	'pdf-page': 'pdf-page',
	'page-separator': 'page-separator',
	'grid-box': 'grid-box',
	'char-row': 'char-row',
	'char-block': 'char-block',
	'font-kaiti': 'font-kaiti',
	'pinyin-text': 'pinyin-text',
	'grid-container': 'grid-container',
	'char-overlay-text': 'char-overlay-text',
	'app-container': 'app-container',
	title: 'title',
	'controls-panel': 'controls-panel',
	'label-style': 'label-style',
	'input-style': 'input-style',
	'hidden-mobile-msg': 'hidden-mobile-msg',
	'center-content': 'center-content',
	'loading-text': 'loading-text',
	'spacing-block': 'spacing-block',
	'save-message': 'save-message',
	'styled-select-container': 'styled-select-container',
	'styled-select-button': 'styled-select-button',
	'styled-select-options': 'styled-select-options',
	'styled-select-option-item': 'styled-select-option-item',
	'styled-select-option-item-active': 'styled-select-option-item-active',
	'styled-select-option-item-highlighted': 'styled-select-option-item-highlighted',
	'checkbox-container': 'checkbox-container',
	'custom-checkbox': 'custom-checkbox',
	'custom-checkmark': 'custom-checkmark',
	'checkbox-label': 'checkbox-label',
	'off-screen-mobile': 'off-screen-mobile',
	'notification-pop-up': 'notification-pop-up',
	'char-counter': 'char-counter',
	'notification-success': 'notification-success',
	'notification-error': 'notification-error',
};

// =====================================================================
// API FUNCTIONS (Character Info Generation - Pinyin & Definition)
// =====================================================================

export const generateCharInfo = async text => {
	if (!text || text.length === 0) return {};
	const map = {};
	const hanziArray = text.split('');
	hanziArray.forEach(char => {
		if (dictionary[char]) {
			map[char] = {
				pinyin: dictionary[char].pinyin || '',
				definition: dictionary[char].definition || '',
			};
		} else {
			map[char] = { pinyin: '', definition: '' };
		}
	});
	return map;
};
