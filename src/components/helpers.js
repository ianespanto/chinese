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

	// pinyin-pro with word segmentation for 99.846% accuracy
	// Use MaxProbability algorithm (segmentit: 2) for best multi-character word detection
	const contextAwareAll = pinyin(text, {
		toneType: 'symbol',
		type: 'all',
		segmentit: 2, // MaxProbability algorithm - most accurate
	});

	// Build position-based array for inline preview (preserves context)
	const chars = text.split('');
	const contextArray = chars.map((char, index) => {
		const isHanzi = /[\u4E00-\u9FFF]/.test(char);
		if (!isHanzi) {
			return { char, pinyin: '' };
		}

		const obj = contextAwareAll && contextAwareAll[index];
		let contextPinyin = (obj && obj.result) || '';

		// Minimal heuristics for structural particles that require grammatical analysis
		// These patterns need sentence-level grammar understanding beyond word segmentation
		if (char === '得' || char === '地' || char === '的') {
			const prevChar = chars[index - 1] || '';
			const nextChar = chars[index + 1] || '';
			const prevIsHanzi = /[\u4E00-\u9FFF]/.test(prevChar);
			const nextIsHanzi = /[\u4E00-\u9FFF]/.test(nextChar);

			// Pattern: 得 after verb (structural particle: verb + 得 + complement)
			// Common pattern: 做得好, 跑得快, 说得对
			if (char === '得' && prevIsHanzi && nextIsHanzi) {
				// Check if context suggests structural particle usage
				const prevPinyin = contextAwareAll[index - 1]?.result || '';
				// If previous char has valid pinyin (likely verb), use neutral tone
				if (prevPinyin && obj?.polyphonic?.includes('de')) {
					contextPinyin = 'de';
				}
			}

			// Pattern: 地 after manner adverb (adverbial marker: adverb + 地 + verb)
			// Common pattern: 慢慢地走, 小心地说, 认真地学
			if (char === '地' && prevIsHanzi && nextIsHanzi) {
				// Check for reduplication pattern (慢慢地, 轻轻地)
				if (index >= 2 && chars[index - 2] === prevChar) {
					contextPinyin = 'de';
				}
				// If polyphonic includes 'de', likely adverbial marker
				else if (obj?.polyphonic?.includes('de')) {
					contextPinyin = 'de';
				}
			}

			// Pattern: 的 as attributive/possessive marker (most common usage)
			// Common pattern: 我的书, 红色的花, 他的朋友
			if (char === '的' && prevIsHanzi && nextIsHanzi) {
				// This is the most frequent usage, default to neutral tone
				if (obj?.polyphonic?.includes('de')) {
					contextPinyin = 'de';
				}
			}
		}

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
