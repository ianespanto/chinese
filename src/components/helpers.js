import { pinyin } from 'pinyin-pro';

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
	if (!text || text.length === 0) return { charMap: {}, contextArray: [] };

	// Get context-aware pinyin for the entire text (for inline preview)
	const contextAwarePinyinString = pinyin(text, { toneType: 'symbol', type: 'array' });

	// Build position-based array for inline preview (preserves context)
	const contextArray = text.split('').map((char, index) => {
		const isHanzi = /[\u4E00-\u9FFF]/.test(char);
		if (!isHanzi) {
			return { char, pinyin: '' };
		}

		const contextPinyin = contextAwarePinyinString[index] || '';
		return { char, pinyin: contextPinyin };
	});

	// Build character map for unique characters (for PDF/practice sheet with all pronunciations)
	const charMap = {};
	const uniqueHanzi = Array.from(new Set(text.split('').filter(c => /[\u4E00-\u9FFF]/.test(c))));

	uniqueHanzi.forEach(char => {
		try {
			// Get all pronunciations for this character
			const allPronunciations = pinyin(char, {
				toneType: 'symbol',
				type: 'array',
				multiple: true,
			});

			const pinyinArray = Array.isArray(allPronunciations) ? allPronunciations : [allPronunciations];

			charMap[char] = {
				pinyin: pinyinArray[0] || '',
				pinyinAll: pinyinArray.join(', '),
			};
		} catch (e) {
			charMap[char] = { pinyin: '', pinyinAll: '' };
		}
	});

	return { charMap, contextArray };
};
