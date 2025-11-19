import React from 'react';
import PropTypes from 'prop-types';
import * as h from './helpers';

// ---------------------------------------------------------------------
// GridBox Component
// ---------------------------------------------------------------------
function GridBox({ char, opacity = 1, gridType }) {
	const GRID_LINE_COLOR = 'var(--primary)';

	const svgLines = React.useMemo(() => {
		const common = (x1, y1, x2, y2) => (
			<line
				key={`${x1}-${y1}-${x2}-${y2}`}
				x1={x1}
				y1={y1}
				x2={x2}
				y2={y2}
				stroke={GRID_LINE_COLOR}
				strokeWidth="1"
				strokeDasharray="3,3"
			/>
		);

		const lines = [];
		if (gridType === 'tian-zi-ge' || gridType === 'mi-zi-ge') {
			lines.push(common('50', '0', '50', '100'));
			lines.push(common('0', '50', '100', '50'));
		}
		if (gridType === 'mi-zi-ge') {
			lines.push(common('0', '0', '100', '100'));
			lines.push(common('100', '0', '0', '100'));
		}
		return lines;
	}, [gridType]);

	return (
		<div className={h.styles['grid-box']} style={{ position: 'relative' }} aria-hidden={!char}>
			<svg
				width="100%"
				height="100%"
				viewBox="0 0 100 100"
				xmlns="http://www.w3.org/2000/svg"
				style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
				focusable="false"
				aria-hidden="true"
			>
				{svgLines}
			</svg>

			{char && (
				<div
					className={`${h.styles['char-overlay-text']} ${h.styles['font-kaiti']}`}
					style={{ opacity: opacity }}
					aria-label={char}
				>
					<span>{char}</span>
				</div>
			)}
		</div>
	);
}

GridBox.propTypes = {
	char: PropTypes.string,
	opacity: PropTypes.number,
	gridType: PropTypes.string,
};

export default React.memo(
	GridBox,
	(prevProps, nextProps) =>
		prevProps.char === nextProps.char &&
		prevProps.opacity === nextProps.opacity &&
		prevProps.gridType === nextProps.gridType
);
