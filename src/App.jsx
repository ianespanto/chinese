import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import StyledSelect from './components/StyledSelect';
import CustomCheckbox from './components/CustomCheckbox';
import NotificationPopUp from './components/NotificationPopUp';
import GridBox from './components/GridBox';
import StrokeOrderPopup from './components/StrokeOrderPopup';
import * as h from './components/Helpers';

// --- PDF DIMENSION CONSTANTS IN POINTS (pt) ---
const MARGIN_PT = 18;
const PDF_PAGE_WIDTH_PT = 8.5 * 72;
const PDF_PAGE_HEIGHT_PT = 11 * 72;
const CONTENT_WIDTH_PT = PDF_PAGE_WIDTH_PT - MARGIN_PT * 2;
const CONTENT_HEIGHT_PT = PDF_PAGE_HEIGHT_PT - MARGIN_PT * 2;
const HEADER_AREA_HEIGHT_PT = 15;
const GRIDS_PER_ROW = 11;
const GRID_BORDER_WIDTH_PT = 0.5;
const GRID_BOX_HEIGHT_PT = (CONTENT_WIDTH_PT - 2 * GRID_BORDER_WIDTH_PT) / GRIDS_PER_ROW;

// --- CHARACTER LIMIT CONSTANT ---
const MAX_CHARACTERS = 50;

// ---------------------------------------------------------------------
// Custom Styles
// ---------------------------------------------------------------------

const CustomStyles = () => (
	<style>
		{`
        .${h.styles['pinyin-text']} {
            height: ${HEADER_AREA_HEIGHT_PT}pt;
        }

        #${h.styles['practice-sheet']} {
            width: ${PDF_PAGE_WIDTH_PT}pt; 
            padding: ${MARGIN_PT}pt; 
        }

        .${h.styles['pdf-page']} {
            width: ${CONTENT_WIDTH_PT}pt; 
            height: ${CONTENT_HEIGHT_PT}pt; 
            margin-bottom: ${MARGIN_PT}pt;
        }

        .${h.styles['page-separator']} {
            width: ${CONTENT_WIDTH_PT}pt;
            margin: ${MARGIN_PT}pt 0;
        }
        
        .${h.styles['grid-container']} {
            border-width: ${GRID_BORDER_WIDTH_PT}pt; 
        }

        .${h.styles['grid-box']} {
            width: calc(100.01% / ${GRIDS_PER_ROW}); 
            height: ${GRID_BOX_HEIGHT_PT}pt; 
            border-width: ${GRID_BORDER_WIDTH_PT}pt; 
        }
    `}
	</style>
);

// ---------------------------------------------------------------------
// PracticeSheet Component (Main Application Logic)
// ---------------------------------------------------------------------

function PracticeSheet() {
	// Default values
	const DEFAULT_CHARACTERS = '';
	const DEFAULT_TRACE_COUNT = 5;
	const DEFAULT_ROWS_PER_CHAR = 2;
	const DEFAULT_SHOW_HEADER_INFO = true;
	const DEFAULT_GRID_TYPE = 'mi-zi-ge';
	const DEFAULT_TOP_SPACING = 5;
	const DEFAULT_TRACE_OPACITY = 'medium';

	// State Variables
	const [characters, setCharacters] = useState(DEFAULT_CHARACTERS);
	// debouncedCharacters reduces frequency of expensive work (fetch + pagination)
	const [debouncedCharacters, setDebouncedCharacters] = useState(DEFAULT_CHARACTERS);
	const [traceCount, setTraceCount] = useState(DEFAULT_TRACE_COUNT);
	const [rowsPerChar, setRowsPerChar] = useState(DEFAULT_ROWS_PER_CHAR);
	const [showHeaderInfo, setShowHeaderInfo] = useState(DEFAULT_SHOW_HEADER_INFO);
	const [gridType, setGridType] = useState(DEFAULT_GRID_TYPE);
	const [topSpacing, setTopSpacing] = useState(DEFAULT_TOP_SPACING);
	const [traceOpacity, setTraceOpacity] = useState(DEFAULT_TRACE_OPACITY);

	const [isComposing, setIsComposing] = useState(false);
	const [charInfoMap, setCharInfoMap] = useState({});
	const [contextPinyinArray, setContextPinyinArray] = useState([]);
	const characterInputRef = useRef(null);
	const [isPinyinLoading, setIsPinyinLoading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isLoaded, setIsLoaded] = useState(true);
	const [notificationMessage, setNotificationMessage] = useState(null);
	const [selectedChar, setSelectedChar] = useState(null);

	const sheetRef = useRef(null);

	// Define opacity map for use in renderCharacterBlock
	const OPACITY_MAP = useMemo(
		() => ({
			low: 0.1,
			medium: 0.25,
			high: 0.5,
		}),
		[]
	);

	// clearNotificationMessage is used by the NotificationPopUp
	// and manually here to clear the error state immediately.
	const clearNotificationMessage = useCallback(() => setNotificationMessage(null), []);

	// --- Initial Load (Load Preferences) ---
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (!jsPDF) {
			setIsLoaded(false);
		}

		const savedPreferences = localStorage.getItem('practiceSheetPreferences');
		if (savedPreferences) {
			try {
				const prefs = JSON.parse(savedPreferences);
				setTraceCount(prefs.traceCount ?? DEFAULT_TRACE_COUNT);
				setRowsPerChar(prefs.rowsPerChar ?? DEFAULT_ROWS_PER_CHAR);
				setShowHeaderInfo(prefs.showHeaderInfo ?? DEFAULT_SHOW_HEADER_INFO);
				setGridType(prefs.gridType ?? DEFAULT_GRID_TYPE);
				setTopSpacing(prefs.topSpacing ?? DEFAULT_TOP_SPACING);
				setTraceOpacity(prefs.traceOpacity ?? DEFAULT_TRACE_OPACITY); // Load new preference
			} catch (e) {
				console.error('Could not parse saved preferences:', e);
			}
		}
		// Intentionally run only once on mount; constants/jsPDF are stable.
	}, []);

	// debounce characters -> debouncedCharacters (skip while composing)
	useEffect(() => {
		if (isComposing) return; // don't update while IME composition in progress
		const id = setTimeout(() => setDebouncedCharacters(characters), 500); // debounce to reduce CPU churn
		return () => clearTimeout(id);
	}, [characters, isComposing]);

	// --- Character Info Fetching (runs on debouncedCharacters) ---
	useEffect(() => {
		let cancelled = false;

		const fetchCharInfo = async () => {
			const rawChars = debouncedCharacters.split('');
			const chineseChars = rawChars.filter(c => c.match(/[\u4E00-\u9FFF]/));
			const uniqueChineseChars = Array.from(new Set(chineseChars));

			if (uniqueChineseChars.length === 0) {
				if (!cancelled) {
					setCharInfoMap({});
					setContextPinyinArray([]);
				}
				return;
			}

			if (!cancelled) setIsPinyinLoading(true);
			try {
				const result = await h.generateCharInfo(debouncedCharacters);
				if (!result || typeof result !== 'object') {
					console.debug('generateCharInfo returned unexpected result', result);
					setCharInfoMap({});
					setContextPinyinArray([]);
				} else {
					setCharInfoMap(result.charMap || {});
					setContextPinyinArray(result.contextArray || []);
				}
			} catch (err) {
				console.warn('generateCharInfo failed', err);
				if (!cancelled) {
					setCharInfoMap({});
					setContextPinyinArray([]);
				}
			} finally {
				if (!cancelled) setIsPinyinLoading(false);
			}
		};

		fetchCharInfo();

		return () => {
			cancelled = true;
		};
	}, [debouncedCharacters]);

	// --- Input Handlers ---
	const handleCompositionStart = () => setIsComposing(true);
	const handleCompositionEnd = e => {
		setIsComposing(false);
		handleCharInput(e);
	};

	const handleCharInput = e => {
		const newValue = e.target.value;
		// Auto-resize textarea height to fit content
		try {
			e.target.style.height = 'auto';
			e.target.style.height = `${e.target.scrollHeight}px`;
		} catch (err) {
			// ignore (if element not available)
		}
		if (newValue.length <= MAX_CHARACTERS) {
			setCharacters(newValue);
			// If the user deletes characters and fixes the limit error:
			if (notificationMessage?.type === 'error') {
				// Immediately set the parent message to null, triggering the pop-up to hide immediately.
				clearNotificationMessage();
			}
		} else {
			// Only update if the user is actively typing a character past the limit
			if (newValue.length > characters.length) {
				setNotificationMessage({
					text: `${MAX_CHARACTERS} Characters Max`,
					type: 'error',
				});
			}
		}
	};

	// Keep textarea height in sync when characters change programmatically
	useEffect(() => {
		if (!characterInputRef?.current) return;
		const el = characterInputRef.current;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}, [characters]);

	// --- Control Button Handlers ---

	const handleSanitizeInput = () => {
		const rawChars = characters.split('');

		const chineseChars = rawChars.filter(c => c.match(/[\u4E00-\u9FFF]/));

		const uniqueChars = [];
		const seen = new Set();
		chineseChars.forEach(char => {
			if (!seen.has(char)) {
				seen.add(char);
				uniqueChars.push(char);
			}
		});

		setCharacters(uniqueChars.join(''));
	};

	const handleSavePreferences = () => {
		const prefs = {
			traceCount,
			rowsPerChar,
			showHeaderInfo,
			gridType,
			topSpacing,
			traceOpacity,
		};
		localStorage.setItem('practiceSheetPreferences', JSON.stringify(prefs));

		// This call will immediately overwrite any existing message (like an error)
		// and restart the 3-second fade-out timer in NotificationPopUp.
		setNotificationMessage({ text: 'Settings Saved', type: 'success' });
	};

	// --- Dynamic Text & Options ---
	const hasChineseChars = useMemo(() => {
		return characters.split('').some(c => c.match(/[\u4E00-\u9FFF]/));
	}, [characters]);

	const pinyinCheckboxLabel = hasChineseChars ? 'Show Pinyin' : 'Pinyin Space';

	const topSpacingOptions = [
		{ value: 5, label: 'Small' },
		{ value: 30, label: 'Medium' },
		{ value: 60, label: 'Large' },
	];

	const gridTypeOptions = [
		{ value: 'mi-zi-ge', label: '米字格' },
		{ value: 'tian-zi-ge', label: '田字格' },
		{ value: 'empty', label: 'Blank' },
	];

	const traceOpacityOptions = [
		// New Opacity Options
		{ value: 'low', label: 'Light' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'Dark' },
	];

	// NEW: Trace Count and Rows Per Char options (for StyledSelect)
	const traceCountOptions = Array.from({ length: 11 }, (_, i) => ({ value: i, label: String(i) }));
	const rowsPerCharOptions = Array.from({ length: 5 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

	const getTopSpacingLabel = option => option.label;
	const getGridTypeLabel = option => option.label;
	const getTraceOpacityLabel = option => option.label;

	// New label getters for the new selects
	const getTraceCountLabel = option => option.label;
	const getRowsPerCharLabel = option => option.label;

	// --- PAGINATION LOGIC (based on debouncedCharacters to avoid frequent recompute) ---
	const paginatedBlocks = useMemo(() => {
		const charArray = debouncedCharacters.split('').filter(c => c.match(/[\u4E00-\u9FFF]/));

		const currentHeaderHeight = showHeaderInfo ? HEADER_AREA_HEIGHT_PT : 0;

		const blockHeight =
			Number(topSpacing) + currentHeaderHeight + GRID_BOX_HEIGHT_PT * rowsPerChar + GRID_BORDER_WIDTH_PT * 2;

		let pages = [[]];
		let currentPageHeight = 0;
		const maxPageHeight = CONTENT_HEIGHT_PT;

		charArray.forEach((char, charIndex) => {
			if (currentPageHeight + blockHeight > maxPageHeight && currentPageHeight > 0) {
				pages.push([]);
				currentPageHeight = 0;
			}

			const info = charInfoMap[char] || { pinyin: '', pinyinAll: '' };

			pages[pages.length - 1].push({
				type: 'char',
				char,
				pinyin: info.pinyin,
				pinyinAll: info.pinyinAll || info.pinyin,
				key: `char-${char}-${charIndex}`,
			});
			currentPageHeight += blockHeight;
		});

		const lastPageIndex = pages.length - 1;

		if (pages[lastPageIndex].length > 0 || charArray.length === 0) {
			const lastPage = pages[lastPageIndex];
			const currentHeight = lastPage.length * blockHeight;
			const remainingHeight = maxPageHeight - currentHeight;
			const emptyBlocksToFill = Math.floor(remainingHeight / blockHeight);

			for (let i = 0; i < emptyBlocksToFill; i++) {
				lastPage.push({ type: 'empty', char: null, pinyin: '', key: `empty-${lastPageIndex}-${i}` });
			}
		}
		if (pages.length === 1 && pages[0].length === 0 && charArray.length === 0) {
			const blocksToFill = Math.floor(maxPageHeight / blockHeight);
			for (let i = 0; i < blocksToFill; i++) {
				pages[0].push({ type: 'empty', char: null, pinyin: '', key: `empty-0-${i}` });
			}
		}

		return pages.filter(page => page.length > 0);
	}, [debouncedCharacters, rowsPerChar, showHeaderInfo, charInfoMap, topSpacing]);

	// --- PDF Generation ---

	const handleGeneratePdf = async () => {
		if (!isLoaded || isGenerating || paginatedBlocks.length === 0) return;
		setIsGenerating(true);

		// helper: convert ArrayBuffer -> base64 (safely in chunks)
		const arrayBufferToBase64 = buffer => {
			const bytes = new Uint8Array(buffer);
			const chunkSize = 0x8000; // 32KB chunks
			let binary = '';
			for (let i = 0; i < bytes.length; i += chunkSize) {
				const chunk = bytes.subarray(i, i + chunkSize);
				// apply on small enough chunk to avoid call stack limits
				binary += String.fromCharCode.apply(null, chunk);
			}
			return btoa(binary);
		};

		const registerFont = async (pdfInstance, url, fontKey, fileExt = 'ttf') => {
			try {
				const res = await fetch(url);
				if (!res.ok) {
					console.warn('Font fetch failed:', url, res.status);
					return false;
				}
				const ab = await res.arrayBuffer();
				const b64 = arrayBufferToBase64(ab);
				const filename = `${fontKey}.${fileExt}`;

				if (
					pdfInstance &&
					typeof pdfInstance.addFileToVFS === 'function' &&
					typeof pdfInstance.addFont === 'function'
				) {
					pdfInstance.addFileToVFS(filename, b64);
					pdfInstance.addFont(filename, fontKey, 'normal');
					return true;
				}

				if (
					jsPDF &&
					jsPDF.API &&
					typeof jsPDF.API.addFileToVFS === 'function' &&
					typeof jsPDF.API.addFont === 'function'
				) {
					jsPDF.API.addFileToVFS(filename, b64);
					jsPDF.API.addFont(filename, fontKey, 'normal');
					return true;
				}

				console.warn('jsPDF addFileToVFS / addFont not available on instance or static API');
				return false;
			} catch (err) {
				console.warn('registerFont error', err);
				return false;
			}
		};

		try {
			const FONT_URL = '/chinese/assets/fonts/8a1e9fe86f7a9489ec091ec4b78af185.ttf'; // Kaiti (Chinese)
			const FONT_KEY = 'KaiTi_GB2312';

			const FONT_PINYIN_URL = '/chinese/assets/fonts/InterTight-Regular.ttf';
			const FONT_PINYIN_KEY = 'InterTight';

			// create PDF instance early so we can register font on the instance if supported
			const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });

			// only register Kaiti when there's at least one hanzi to render
			const hasAnyHanzi =
				paginatedBlocks &&
				paginatedBlocks.some(page => page.some(block => block.type === 'char' && block.char));

			let kaitiRegistered = false;
			if (hasAnyHanzi) {
				kaitiRegistered = await registerFont(pdf, FONT_URL, FONT_KEY);
			}

			// Only register pinyin font when the UI is set to show pinyin
			// and there is at least one non-empty pinyin in the paginated data.
			let pinyinRegistered = false;
			const hasAnyPinyin =
				paginatedBlocks &&
				paginatedBlocks.some(page =>
					page.some(block => block.pinyin && String(block.pinyin).trim().length > 0)
				);

			if (showHeaderInfo && hasAnyPinyin) {
				pinyinRegistered = await registerFont(pdf, FONT_PINYIN_URL, FONT_PINYIN_KEY);
			} else {
				pinyinRegistered = false;
			}

			// --- now draw pages using `pdf` instance ---
			for (let pageIndex = 0; pageIndex < paginatedBlocks.length; pageIndex++) {
				const page = paginatedBlocks[pageIndex];
				if (pageIndex > 0) pdf.addPage();

				const originX = MARGIN_PT;
				const originY = MARGIN_PT;
				let cursorY = originY;

				for (let bi = 0; bi < page.length; bi++) {
					const block = page[bi];
					cursorY += Number(topSpacing);

					// --- header / pinyin (LEFT ALIGNED) ---
					if (showHeaderInfo) {
						const headerTop = cursorY;
						const headerHeight = HEADER_AREA_HEIGHT_PT;
						const pinyinToShow = block.pinyinAll || block.pinyin;
						if (pinyinToShow) {
							if (pinyinRegistered) {
								pdf.setFont(FONT_PINYIN_KEY, 'normal');
							} else {
								pdf.setFont('Helvetica', 'normal');
							}
							pdf.setFontSize(10);
							pdf.setTextColor(0, 0, 0);
							const pinyinInset = 2;
							pdf.text(pinyinToShow, originX + pinyinInset, headerTop + headerHeight / 2 + 3, {
								align: 'left',
							});
						}
						cursorY += headerHeight;
					}

					// --- grid rows and characters (CENTERED & scaled to box) ---
					const boxHeight = GRID_BOX_HEIGHT_PT;
					for (let r = 0; r < rowsPerChar; r++) {
						let colX = originX;
						for (let c = 0; c < GRIDS_PER_ROW; c++) {
							const bw = CONTENT_WIDTH_PT / GRIDS_PER_ROW;
							const bh = boxHeight;

							// outer border (solid)
							pdf.setDrawColor('#56ab91');
							pdf.setLineWidth(GRID_BORDER_WIDTH_PT * 2);
							pdf.setLineDash([]); // solid
							pdf.rect(colX, cursorY, bw, bh, 'S');

							// inner guide lines (dashed)
							pdf.setLineWidth(1);
							pdf.setDrawColor('#56ab91');
							pdf.setLineDash([3, 3], 0);

							if (gridType === 'mi-zi-ge' || gridType === 'tian-zi-ge') {
								pdf.line(colX + bw / 2, cursorY, colX + bw / 2, cursorY + bh);
								pdf.line(colX, cursorY + bh / 2, colX + bw, cursorY + bh / 2);
							}

							if (gridType === 'mi-zi-ge') {
								pdf.line(colX, cursorY, colX + bw, cursorY + bh);
								pdf.line(colX, cursorY + bh, colX + bw, cursorY);
							}

							// reset dash for subsequent drawing
							pdf.setLineDash([]);

							let charToShow = null;
							let opacity = 0;
							if (block.type === 'char') {
								const gridIndex = r * GRIDS_PER_ROW + c;
								if (gridIndex === 0) {
									charToShow = block.char;
									opacity = 1;
								} else if (gridIndex <= traceCount) {
									charToShow = block.char;
									const map = { low: 0.1, medium: 0.25, high: 0.5 };
									opacity = map[traceOpacity] ?? 0.25;
								}
							}

							if (charToShow) {
								// use Kaiti for hanzi only if registration succeeded and there is hanzi
								if (kaitiRegistered) {
									pdf.setFont(FONT_KEY, 'normal');
								} else {
									pdf.setFont('Helvetica', 'normal');
								}

								// scale the font to the grid size (adjust factor to match preview)
								const scaleFactor = 0.9;
								const fontSizePt = Math.floor(Math.min(bh * scaleFactor, bw * scaleFactor));
								pdf.setFontSize(fontSizePt);

								// center horizontally and vertically.
								const centerX = colX + bw / 2;
								const centerY = cursorY + bh / 2;

								// simulate trace by using lighter gray for lower opacity
								if (opacity < 1) {
									const gray = Math.round(255 * (1 - opacity));
									pdf.setTextColor(gray, gray, gray);
								} else {
									pdf.setTextColor(0, 0, 0);
								}

								try {
									pdf.text(charToShow, centerX, centerY, { align: 'center', baseline: 'middle' });
								} catch (e) {
									const verticalNudge = fontSizePt * 0.12;
									pdf.text(charToShow, centerX, centerY + verticalNudge, { align: 'center' });
								}
							}

							colX += bw;
						}
						cursorY += boxHeight;
					}
				}
			}

			pdf.save('chinese-worksheet.pdf');
		} catch (err) {
			console.error('Vector PDF generation failed:', err);
		} finally {
			setIsGenerating(false);
		}
	};

	// show "Updating preview..." while waiting for debounce to complete
	const isPreviewUpdating = characters !== debouncedCharacters && !isComposing;

	// --- RENDER CHARACTER BLOCK (memoized so map(...) doesn't recreate function each render) ---
	const renderCharacterBlock = useCallback(
		block => {
			const traceValue = OPACITY_MAP[traceOpacity]; // Get numeric value from map

			return (
				<div key={block.key} className={h.styles['char-block']}>
					{/* Note Taking Space */}
					<div className={h.styles['spacing-block']} style={{ height: `${topSpacing}pt` }}></div>

					{/* Header Display Row (Pinyin) */}
					<div style={{ overflow: 'hidden', height: showHeaderInfo ? `${HEADER_AREA_HEIGHT_PT}pt` : '0' }}>
						{showHeaderInfo && (
							<div className={h.styles['pinyin-text']}>{block.pinyinAll || block.pinyin}</div>
						)}
					</div>

					{/* Grid Rows */}
					<div className={h.styles['grid-container']}>
						{Array.from({ length: rowsPerChar }).map((_, rowIndex) => (
							<div key={rowIndex} className={h.styles['char-row']}>
								{Array.from({ length: GRIDS_PER_ROW }).map((_, colIndex) => {
									const gridIndex = rowIndex * GRIDS_PER_ROW + colIndex;
									let charToShow = null;
									let opacity = 0;

									if (block.type === 'char') {
										if (gridIndex === 0) {
											charToShow = block.char;
											opacity = 1; // Solid character
										} else if (gridIndex <= traceCount) {
											charToShow = block.char;
											opacity = traceValue; // Use selected trace opacity
										}
									}

									return (
										<GridBox
											key={colIndex}
											char={charToShow}
											opacity={opacity}
											gridType={gridType}
										/>
									);
								})}
							</div>
						))}
					</div>
				</div>
			);
		},
		[OPACITY_MAP, traceOpacity, rowsPerChar, traceCount, gridType, showHeaderInfo, topSpacing]
	);

	const characterCount = characters.length;
	const isLimitReached = characterCount >= MAX_CHARACTERS;

	const pagesCount = paginatedBlocks.length;

	return (
		<div className={h.styles['app-container']}>
			<NotificationPopUp message={notificationMessage} clearMessage={clearNotificationMessage} />
			<StrokeOrderPopup
				character={selectedChar?.char}
				pinyin={selectedChar?.pinyin}
				gridType={gridType}
				onClose={() => setSelectedChar(null)}
			/>{' '}
			<h1 className={h.styles['title']}>
				<span>Chinese Toolkit</span>
			</h1>
			{/* CONTROLS */}
			<div className={h.styles['controls-panel']}>
				<div className="chracter-input-container">
					<textarea
						id="character-input"
						ref={characterInputRef}
						value={characters}
						onChange={handleCharInput}
						onCompositionStart={handleCompositionStart}
						onCompositionEnd={handleCompositionEnd}
						className={h.styles['input-style']}
						placeholder={`Enter up to ${MAX_CHARACTERS} characters`}
						rows={1}
						style={{ overflow: 'hidden', resize: 'none' }}
					/>
					{/* Character Counter */}
					<div className="counters-container">
						{/* Live page count indicator (aria-live so screen readers are notified) */}
						<div className="page-count-indicator" aria-live="polite" aria-atomic="true">
							{pagesCount} Page{pagesCount === 1 ? '' : 's'}
						</div>
						<div className={`${h.styles['char-counter']} ${isLimitReached ? 'limit-reached' : ''}`}>
							{characterCount} / {MAX_CHARACTERS} Characters
						</div>
					</div>
				</div>
				{/* Live inline pinyin preview (ruby) beneath the textarea */}
				{contextPinyinArray.length > 0 && (
					<div className={`inline-pinyin-preview ${h.styles['font-kaiti']}`} aria-live="polite">
						{contextPinyinArray.map((item, i) => {
							const isHanzi = /[\u4E00-\u9FFF]/.test(item.char);
							if (!isHanzi) {
								return <span key={`plain-${i}`}>{item.char}</span>;
							}
							return (
								<ruby
									key={`ruby-${i}`}
									onClick={() => setSelectedChar({ char: item.char, pinyin: item.pinyin })}
									title={`Click to view stroke order for ${item.char} (${item.pinyin})`}
								>
									<rb>{item.char}</rb>
									<rt>{item.pinyin}</rt>
								</ruby>
							);
						})}
					</div>
				)}{' '}
				{/* GENERATE PDF BUTTON */}
				<div className="generate-button-container">
					<button
						onClick={handleGeneratePdf}
						disabled={isGenerating}
						className="btn btn-generate btn--primary"
					>
						{isGenerating ? 'Generating...' : 'Generate Worksheet'}
					</button>
				</div>
				{/* CONTROL BUTTONS GROUP */}
				<div className="control-buttons-container">
					<div className="control-buttons-container__button control-buttons-container__button--sanitize">
						<button onClick={handleSanitizeInput} className="btn btn-sanitize btn--secondary">
							Clean Up
						</button>
					</div>
					<div className="control-buttons-container__button control-buttons-container__button--save">
						<button onClick={handleSavePreferences} className="btn btn-save btn--secondary">
							Save Settings
						</button>
					</div>
				</div>
				{/* TRACEABLE COPIES */}
				<div>
					<label className={h.styles['label-style']}>Traceable Copies</label>
					<StyledSelect
						value={traceCount}
						onChange={val => setTraceCount(Number(val))}
						options={traceCountOptions}
						labelGetter={getTraceCountLabel}
					/>
				</div>
				{/* ROWS PER CHAR */}
				<div>
					<label className={h.styles['label-style']}>Rows per Char</label>
					<StyledSelect
						value={rowsPerChar}
						onChange={val => setRowsPerChar(Number(val))}
						options={rowsPerCharOptions}
						labelGetter={getRowsPerCharLabel}
					/>
				</div>
				{/* GRID TYPE - STYLED SELECT */}
				<div>
					<label className={h.styles['label-style']}>Grid Style</label>
					<StyledSelect
						value={gridType}
						onChange={setGridType}
						options={gridTypeOptions}
						labelGetter={getGridTypeLabel}
					/>
				</div>
				{/* NEW TRACE OPACITY CONTROL */}
				<div>
					<label className={h.styles['label-style']}>Trace Opacity</label>
					<StyledSelect
						value={traceOpacity}
						onChange={setTraceOpacity}
						options={traceOpacityOptions}
						labelGetter={getTraceOpacityLabel}
					/>
				</div>
				{/* NOTE SPACING - STYLED SELECT */}
				<div>
					<label className={h.styles['label-style']}>Spacing</label>
					<StyledSelect
						value={topSpacing}
						onChange={val => setTopSpacing(Number(val))}
						options={topSpacingOptions}
						labelGetter={getTopSpacingLabel}
					/>
				</div>
				{/* PINYIN CHECKBOX (CUSTOM COMPONENT) */}
				<div className="checkbox-wrapper">
					<CustomCheckbox
						id="showHeaderInfo"
						label={pinyinCheckboxLabel}
						checked={showHeaderInfo}
						onChange={setShowHeaderInfo}
						isLoading={isPinyinLoading}
					/>
				</div>
			</div>
			{/* PREVIEW CONTAINER */}
			<div>
				<p className={h.styles['hidden-mobile-msg']}>Worksheet preview on larger screens only</p>

				<div className={`preview-updating-container ${h.styles['off-screen-mobile']}`}>
					{isPreviewUpdating && (
						<div className="preview-updating" aria-live="polite">
							Updating preview...
						</div>
					)}
				</div>

				<div id={h.styles['practice-sheet']} ref={sheetRef} className={h.styles['off-screen-mobile']}>
					{paginatedBlocks.map((page, pageIndex) => (
						<React.Fragment key={pageIndex}>
							<div className={h.styles['pdf-page']}>{page.map(renderCharacterBlock)}</div>
							{pageIndex < paginatedBlocks.length - 1 && (
								<div className={h.styles['page-separator']}></div>
							)}
						</React.Fragment>
					))}
				</div>
			</div>
			<div className="footer-credit">
				<p>&copy; {new Date().getFullYear()} Ian Espanto</p>
			</div>
		</div>
	);
}

export default function App() {
	return (
		<>
			<CustomStyles />
			<PracticeSheet />
		</>
	);
}
