// ---------------------------------------------------------------------
// Custom Styled Select Component
// ---------------------------------------------------------------------

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as h from './helpers';

export default function StyledSelect({ value, onChange, options, labelGetter }) {
	const [isOpen, setIsOpen] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const containerRef = useRef(null);
	const buttonRef = useRef(null);
	const listRef = useRef(null);

	const selectedOption = options.find(opt => opt.value === value);
	const selectedLabel = selectedOption
		? labelGetter
			? labelGetter(selectedOption)
			: selectedOption.label || selectedOption.value
		: '';

	useEffect(() => {
		const handleClickOutside = event => {
			if (containerRef.current && !containerRef.current.contains(event.target)) {
				setIsOpen(false);
				setHighlightedIndex(-1); // reset highlight when closing via outside click
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// When opening, set initial highlighted index to selected option or 0
	useEffect(() => {
		if (isOpen) {
			const idx = options.findIndex(opt => opt.value === value);
			setHighlightedIndex(idx >= 0 ? idx : options.length ? 0 : -1);
			// focus the list so it receives keyboard events
			setTimeout(() => {
				if (listRef.current) listRef.current.focus();
			}, 0);
		} else {
			setHighlightedIndex(-1);
		}
	}, [isOpen, options, value]);

	// Clamp highlightedIndex if options change
	useEffect(() => {
		if (highlightedIndex >= options.length) {
			setHighlightedIndex(-1);
		}
	}, [options, highlightedIndex]);

	const handleOptionSelect = optionValue => {
		onChange(optionValue);
		setIsOpen(false);
		setHighlightedIndex(-1); // reset highlight after selection
		// return focus to button for accessibility
		setTimeout(() => {
			if (buttonRef.current) buttonRef.current.focus();
		}, 0);
	};

	const handleButtonKeyDown = e => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setIsOpen(prev => !prev);
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const selIdx = options.findIndex(opt => opt.value === value);
			setIsOpen(true);
			setHighlightedIndex(selIdx >= 0 ? selIdx : 0);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			const selIdx = options.findIndex(opt => opt.value === value);
			setIsOpen(true);
			setHighlightedIndex(selIdx >= 0 ? selIdx : options.length - 1);
			return;
		}
	};

	const handleListKeyDown = useCallback(
		e => {
			if (!options.length) return;

			if (e.key === 'Escape') {
				setIsOpen(false);
				setHighlightedIndex(-1);
				if (buttonRef.current) buttonRef.current.focus();
				e.preventDefault();
				return;
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setHighlightedIndex(prev => {
					const next = prev < options.length - 1 ? prev + 1 : 0;
					const el = document.getElementById(`select-option-${next}`);
					if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
					return next;
				});
				return;
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setHighlightedIndex(prev => {
					const next = prev > 0 ? prev - 1 : options.length - 1;
					const el = document.getElementById(`select-option-${next}`);
					if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
					return next;
				});
				return;
			}

			if (e.key === 'Home') {
				e.preventDefault();
				setHighlightedIndex(0);
				const el = document.getElementById(`select-option-0`);
				if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
				return;
			}

			if (e.key === 'End') {
				e.preventDefault();
				const last = options.length - 1;
				setHighlightedIndex(last);
				const el = document.getElementById(`select-option-${last}`);
				if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
				return;
			}

			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < options.length) {
					handleOptionSelect(options[highlightedIndex].value);
				}
			}
		},
		[highlightedIndex, options]
	);

	return (
		<div
			ref={containerRef}
			className={h.styles['styled-select-container']}
			role="combobox"
			aria-expanded={isOpen}
			aria-haspopup="listbox"
			aria-owns="select-options-list"
			aria-controls="select-options-list"
			aria-activedescendant={isOpen && highlightedIndex >= 0 ? `select-option-${highlightedIndex}` : undefined}
		>
			<div
				ref={buttonRef}
				className={h.styles['styled-select-button']}
				onClick={() => setIsOpen(prev => !prev)}
				onKeyDown={handleButtonKeyDown}
				tabIndex="0"
				aria-haspopup="listbox"
				aria-controls="select-options-list"
			>
				{selectedLabel}
			</div>

			{isOpen && (
				<ul
					ref={listRef}
					id="select-options-list"
					className={h.styles['styled-select-options']}
					role="listbox"
					tabIndex="0"
					onKeyDown={handleListKeyDown}
					aria-activedescendant={highlightedIndex >= 0 ? `select-option-${highlightedIndex}` : undefined}
				>
					{options.map((option, idx) => (
						<li
							key={option.value}
							id={`select-option-${idx}`}
							className={`${h.styles['styled-select-option-item']} ${
								option.value === value ? h.styles['styled-select-option-item-active'] : ''
							} ${
								idx === highlightedIndex ? h.styles['styled-select-option-item-highlighted'] || '' : ''
							}`}
							onClick={() => handleOptionSelect(option.value)}
							onMouseEnter={() => setHighlightedIndex(idx)}
							role="option"
							aria-selected={option.value === value}
							tabIndex="-1"
						>
							{labelGetter ? labelGetter(option) : option.label || option.value}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

StyledSelect.propTypes = {
	value: PropTypes.any,
	onChange: PropTypes.func.isRequired,
	options: PropTypes.array.isRequired,
	labelGetter: PropTypes.func.isRequired,
};
