// ---------------------------------------------------------------------
// Notification Pop-Up Component
// ---------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import * as h from './helpers';

export default function NotificationPopUp({ message, clearMessage }) {
	// Local state to control visibility and display content separately
	const [isVisible, setIsVisible] = useState(false);
	const [displayMessage, setDisplayMessage] = useState(null);

	// Effect 1: Handles incoming messages and starts the HIDE timer (3s for auto-hide)
	useEffect(() => {
		// If a new message is received
		if (message && message.text) {
			// 1. Immediately update content state and make it visible
			setDisplayMessage(message);
			setIsVisible(true);

			// 2. Start the timer to remove the 'show' class after 3s (starts fade-out)
			const visibilityTimer = setTimeout(() => {
				setIsVisible(false);
			}, 3000);

			// Cleanup: clear the timer if a new message arrives or if the parent clears the message manually
			return () => clearTimeout(visibilityTimer);
		} else if (message === null) {
			// If parent calls clearMessage() (to immediately dismiss an error)
			setIsVisible(false);
		}
	}, [message]);

	// Effect 2: Handles clearing the content AFTER the CSS transition (0.5s)
	useEffect(() => {
		// If the box is now hidden (!isVisible) AND there is still content to clear
		if (displayMessage && !isVisible) {
			// Wait for the CSS transition (0.5s) to finish before clearing the content
			const contentClearTimer = setTimeout(() => {
				// 3. Clear the content in the parent state (allowing a new message)
				clearMessage();
			}, 500); // Must match the 0.5s transition time defined in CustomStyles

			return () => clearTimeout(contentClearTimer);
		}
	}, [isVisible, clearMessage, displayMessage]);

	const baseClass = h.styles['notification-pop-up'];
	// Use displayMessage for content and type, and isVisible for the 'show' class
	const typeClass = displayMessage?.type ? h.styles[`notification-${displayMessage.type}`] : '';
	const showClass = isVisible ? 'show' : '';

	return (
		<div className={`${baseClass} ${typeClass} ${showClass}`}>
			<span>{displayMessage?.text}</span>
		</div>
	);
}
