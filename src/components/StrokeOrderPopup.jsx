import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faRotateRight } from '@fortawesome/free-solid-svg-icons';

const StrokeOrderPopup = ({ character, pinyin, gridType, onClose }) => {
	const writerRef = useRef(null);
	const containerRef = useRef(null);
	const gridRef = useRef(null);
	const isMountedRef = useRef(true);
	const [showReplay, setShowReplay] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);

	const animateCharacter = () => {
		if (!writerRef.current || !isMountedRef.current) return;
		setShowReplay(false);
		setIsAnimating(true);
		writerRef.current.animateCharacter({
			onComplete: () => {
				if (isMountedRef.current) {
					setIsAnimating(false);
					setShowReplay(true);
				}
			},
		});
	};

	useEffect(() => {
		if (!character || !containerRef.current) return;

		isMountedRef.current = true;

		// Reset state
		setShowReplay(false);
		setIsAnimating(false);

		// Clear container
		containerRef.current.innerHTML = '';

		const writer = HanziWriter.create(containerRef.current, character, {
			width: 240,
			height: 240,
			padding: 0,
			strokeColor: '#2d3747',
			// radicalColor: '#56ab91',
			showOutline: true,
			showCharacter: false,
			charDataLoader: char => {
				return fetch(`/chinese/hanzi-writer-data/${char}.json`).then(res => {
					if (!res.ok) throw new Error(`Character ${char} not found`);
					return res.json();
				});
			},
		});

		writerRef.current = writer;

		// Animate the character after a short delay
		const animateTimeout = setTimeout(() => {
			if (writerRef.current && isMountedRef.current) {
				setIsAnimating(true);
				writerRef.current.animateCharacter({
					onComplete: () => {
						if (isMountedRef.current) {
							setIsAnimating(false);
							setShowReplay(true);
						}
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
		<div className="stroke-order-overlay" onClick={onClose}>
			<div className="stroke-order-popup" onClick={e => e.stopPropagation()}>
				<button className="stroke-order-close" onClick={onClose} aria-label="Close">
					<FontAwesomeIcon icon={faXmark} />
				</button>
				<div className="stroke-order-content">
					<h3 className="stroke-order-title">{pinyin || character}</h3>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
						<div style={{ position: 'relative', display: 'inline-block', width: 240, height: 240 }}>
							{/* Grid SVG - behind character */}
							<svg
								ref={gridRef}
								width="240"
								height="240"
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									pointerEvents: 'none',
									zIndex: 0,
								}}
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
										/>
									</>
								)}
							</svg>

							{/* HanziWriter container - on top of grid */}
							<div
								ref={containerRef}
								className="stroke-order-canvas"
								style={{
									position: 'relative',
									zIndex: 1,
								}}
							></div>
						</div>
					</div>
					<div className="stroke-order-replay-container">
						{showReplay && !isAnimating && (
							<button
								className="stroke-order-replay btn btn--primary btn--width-auto"
								onClick={animateCharacter}
							>
								<FontAwesomeIcon icon={faRotateRight} />
								<span>Replay</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default StrokeOrderPopup;
