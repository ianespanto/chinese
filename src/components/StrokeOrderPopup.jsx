import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faArrowRotateRight } from '@fortawesome/free-solid-svg-icons';
import CustomCheckbox from './CustomCheckbox';

const StrokeOrderPopup = ({ character, pinyin, gridType, onClose }) => {
	const writerRef = useRef(null);
	const containerRef = useRef(null);
	const gridRef = useRef(null);
	const isMountedRef = useRef(true);
	// Replay button is always shown; animation state not needed
	const [showOutline, setShowOutline] = useState(true);

	// Apply current outline visibility/color to the writer instance
	const applyOutline = () => {
		if (!writerRef.current) return;
		const color = showOutline ? 'rgba(206,212,218,0.8)' : 'rgba(255,255,255,0)';
		if (typeof writerRef.current.updateColor === 'function') {
			writerRef.current.updateColor('outlineColor', color);
		}
		// Do not toggle showOutline at runtime; keep it rendered and control via color
	};

	const animateCharacter = () => {
		if (!writerRef.current || !isMountedRef.current) return;
		try {
			if (writerRef.current.cancelAnimation) {
				writerRef.current.cancelAnimation();
			} else if (writerRef.current.pauseAnimation) {
				writerRef.current.pauseAnimation();
			}
		} catch {}

		writerRef.current.animateCharacter({
			onComplete: () => {
				// no-op
			},
		});
	};

	// Separate effect to update outline without recreating writer.
	// Include character/gridType in deps to catch toggles before writer init.
	useEffect(() => {
		applyOutline();
	}, [showOutline, character, gridType]);

	useEffect(() => {
		if (!character || !containerRef.current) return;

		isMountedRef.current = true;

		// No animation state to reset

		// Clear container
		containerRef.current.innerHTML = '';

		const writer = HanziWriter.create(containerRef.current, character, {
			width: 240,
			height: 240,
			padding: 0,
			strokeColor: '#2d3747',
			// Always render outline; control visibility via outlineColor only
			showOutline: true,
			outlineColor: showOutline ? 'rgba(206,212,218,0.8)' : 'rgba(255,255,255,0)',
			showCharacter: false,
			charDataLoader: async char => {
				const res = await fetch(`/chinese/hanzi-writer-data/${char}.json`);
				if (!res.ok) throw new Error(`Character ${char} not found`);
				return await res.json();
			},
		});

		writerRef.current = writer;
		// Ensure outline state is applied even if user toggled quickly before init
		applyOutline();

		// Animate the character after a short delay
		const animateTimeout = setTimeout(() => {
			if (writerRef.current && isMountedRef.current) {
				writerRef.current.animateCharacter({
					onComplete: () => {
						// no-op
					},
				});
			}
		}, 500);

		return () => {
			isMountedRef.current = false;
			clearTimeout(animateTimeout);
			if (writerRef.current) {
				writerRef.current.pauseAnimation();
			}
			writerRef.current = null;
		};
	}, [character, gridType]);

	if (!character) return null;

	return (
		<div
			className="stroke-order-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={`Stroke order for ${character}`}
			tabIndex={-1}
		>
			<div className="stroke-order-popup" onClick={e => e.stopPropagation()} role="document">
				<button
					className="stroke-order-close"
					onClick={onClose}
					aria-label="Close stroke order popup"
					tabIndex={0}
				>
					<FontAwesomeIcon icon={faXmark} />
				</button>
				<div className="stroke-order-content">
					<h3
						className="stroke-order-title"
						tabIndex={0}
						aria-label={`Character: ${character}${pinyin ? ', Pinyin: ' + pinyin : ''}`}
					>
						{pinyin || character}
					</h3>
					<div className="stroke-order-animation-wrapper">
						<div className="stroke-order-canvas-container">
							{/* Grid SVG - behind character */}
							<svg
								ref={gridRef}
								className="stroke-order-grid"
								width="240"
								height="240"
								role="img"
								aria-label="Stroke order grid"
								focusable="false"
							>
								{/* Outer border */}
								<rect
									x="0"
									y="0"
									width="240"
									height="240"
									fill="none"
									stroke="#56ab91"
									strokeWidth="2"
								/>

								{/* Inner grid lines */}
								{(gridType === 'mi-zi-ge' || gridType === 'tian-zi-ge') && (
									<>
										{/* Vertical center line */}
										<line
											x1="120"
											y1="0"
											x2="120"
											y2="240"
											stroke="#56ab91"
											strokeWidth="1"
											strokeDasharray="5,5"
											aria-hidden="true"
										/>
										{/* Horizontal center line */}
										<line
											x1="0"
											y1="120"
											x2="240"
											y2="120"
											stroke="#56ab91"
											strokeWidth="1"
											strokeDasharray="5,5"
											aria-hidden="true"
										/>
									</>
								)}

								{gridType === 'mi-zi-ge' && (
									<>
										{/* Diagonal top-left to bottom-right */}
										<line
											x1="0"
											y1="0"
											x2="240"
											y2="240"
											stroke="#56ab91"
											strokeWidth="1"
											strokeDasharray="5,5"
											aria-hidden="true"
										/>
										{/* Diagonal top-right to bottom-left */}
										<line
											x1="240"
											y1="0"
											x2="0"
											y2="240"
											stroke="#56ab91"
											strokeWidth="1"
											strokeDasharray="5,5"
											aria-hidden="true"
										/>
									</>
								)}
							</svg>

							{/* HanziWriter container - on top of grid */}
							<div
								ref={containerRef}
								className="stroke-order-canvas"
								role="img"
								aria-label={`Stroke order animation for ${character}`}
								tabIndex={0}
							></div>
						</div>
					</div>
					<div className="stroke-order-controls">
						<CustomCheckbox
							id="show-outline"
							label="Show Trace"
							checked={showOutline}
							onChange={setShowOutline}
							ariaLabel="Show or hide trace outline"
							tabIndex={0}
						/>
					</div>
					<div className="stroke-order-play-container">
						<button
							className="stroke-order-play btn btn--secondary btn--width-auto"
							onClick={animateCharacter}
							aria-label="Play stroke animation"
							tabIndex={0}
						>
							<FontAwesomeIcon icon={faArrowRotateRight} />
							<span>Play</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StrokeOrderPopup;
