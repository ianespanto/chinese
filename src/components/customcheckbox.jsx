// ---------------------------------------------------------------------
// Custom Checkbox Component
// ---------------------------------------------------------------------

import * as h from './helpers';

export default function CustomCheckbox({ id, label, checked, onChange, isLoading }) {
	const handleToggle = () => onChange(!checked);

	const handleKeyToggle = e => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleToggle();
		}
	};

	return (
		<div
			className={h.styles['checkbox-container']}
			onClick={handleToggle}
			onKeyDown={handleKeyToggle}
			role="checkbox"
			aria-checked={checked}
			tabIndex="0"
		>
			<div
				className={h.styles['custom-checkbox']}
				style={{
					backgroundColor: checked ? 'var(--primary)' : 'var(--white)',
					borderColor: checked ? 'var(--primary)' : 'var(--border)',
				}}
			>
				{checked && (
					<svg
						className={h.styles['custom-checkmark']}
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M4 12.6111L8.92308 17.5L20 6.5"
							stroke="white"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				)}
			</div>
			<label className={h.styles['checkbox-label']}>
				{label}
				{isLoading && <span className={h.styles['loading-text']}>...</span>}
			</label>
		</div>
	);
}
