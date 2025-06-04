// popup.js
// This script runs when the extension's popup window is opened.
// It manages the UI for enabling/disabling the transliterator and displaying its status.

document.addEventListener('DOMContentLoaded', () => {
    const statusText = document.getElementById('status-text');
    const toggleButton = document.getElementById('toggleButton');

    /**
     * Updates the UI (status text and its styling) based on the transliterator's state.
     * @param {boolean} isEnabled - True if the transliterator is enabled, false otherwise.
     */
    function updatePopupUI(isEnabled) {
        statusText.textContent = isEnabled ? 'ON' : 'OFF';
        statusText.className = isEnabled ? 'status-on' : 'status-off';
        // The button text could also change if desired, but "Toggle" is clear.
    }

    /**
     * Fetches the current transliterator state from the background script
     * and updates the popup UI accordingly.
     */
    function fetchAndDisplayState() {
        // Send a message to the background script to get its current state.
        chrome.runtime.sendMessage({ type: 'GET_TRANSLITERATOR_STATE' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Popup] Error fetching state:', chrome.runtime.lastError.message);
                // Fallback UI update if communication fails.
                updatePopupUI(false); // Assume OFF or an error state.
                return;
            }
            if (response && response.type === 'TRANSLITERATOR_STATE_RESPONSE') {
                updatePopupUI(response.isEnabled);
            }
        });
    }

    // --- Event Listeners ---

    // 1. Listen for clicks on the toggle button.
    toggleButton.addEventListener('click', () => {
        // When the button is clicked, send a message to the background script.
        // The background script will handle the actual toggling logic and persistence.
        chrome.runtime.sendMessage({ type: 'TOGGLE_TRANSLITERATOR' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Popup] Error toggling:', chrome.runtime.lastError.message);
                return;
            }
            // After the background script toggles, it will send a state update message
            // which this popup will also listen for (see next listener),
            // so we don't necessarily need to update UI here directly based on this response.
            // However, if the background script returns the new state, we could use it:
            if (response && response.type === 'TOGGLE_RESPONSE') {
                updatePopupUI(response.newState); // Update directly if background sends newState
            }
        });
    });

    // 2. Listen for state updates from the background script.
    // This ensures the popup UI is always in sync with the background script's actual state,
    // even if the state is changed by something other than the popup itself (e.g., initially loading).
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'TRANSLITERATOR_STATE_UPDATE') {
            updatePopupUI(message.isEnabled);
        }
    });

    // --- Initial Setup ---

    // Fetch and display the current state when the popup is first opened.
    fetchAndDisplayState();
});