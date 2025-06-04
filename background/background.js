// background.js
// This script runs in the background of the browser extension.
// It manages the state of the transliterator and handles communication
// with content scripts and the extension's UI (browser action).

// Import the ArabicTransliterator class.
// IMPORTANT: Ensure 'transliteration-rules.js' is in the SAME directory (background/)
// as background.js, or adjust the path accordingly.
import { ArabicTransliterator } from './transliteration-rules.js';

// Initialize the transliterator instance.
// This is declared at the top level so it's accessible throughout the service worker.
const transliterator = new ArabicTransliterator();

// Define a key for storing the enabled state in browser storage.
const STORAGE_KEY_ENABLED = 'translit_enabled';

/**
 * Sets the extension icon badge text and color based on the enabled state.
 * @param {boolean} isEnabled - The current enabled state of the transliterator.
 */
function updateBadge(isEnabled) {
    chrome.action.setBadgeText({
        text: isEnabled ? 'ON' : 'OFF'
    });
    chrome.action.setBadgeBackgroundColor({
        color: isEnabled ? '#4CAF50' : '#F44336' // Green for ON, Red for OFF
    });
}

/**
 * Loads the enabled state from storage and initializes the transliterator.
 * Also updates the badge and sends the state to all active content scripts.
 */
async function initializeTransliteratorState() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY_ENABLED);
        // Default to true if the state hasn't been set yet
        const isEnabled = result[STORAGE_KEY_ENABLED] !== undefined ? result[STORAGE_KEY_ENABLED] : true; 

        transliterator.setEnabled(isEnabled);
        updateBadge(isEnabled);
        console.log(`[Background] Initialized transliterator state: ${isEnabled ? 'ON' : 'OFF'}`);

        // Notify all active tabs about the initial state
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'TRANSLITERATOR_STATE_UPDATE',
                        isEnabled: isEnabled
                    }).catch(error => {
                        // Catch errors for tabs where content script might not be injected yet
                        // or if the tab is not accessible (e.g., chrome:// URLs)
                        if (!error.message.includes("Could not establish connection")) {
                            console.warn(`[Background] Error sending state to tab ${tab.id}:`, error);
                        }
                    });
                }
            });
        });

    } catch (error) {
        console.error('[Background] Error loading transliterator state:', error);
        // Fallback to default if storage fails
        transliterator.setEnabled(true);
        updateBadge(true);
    }
}

// --- Event Listeners ---

// 1. Listen for messages from content scripts and popup.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log('[Background] Message received:', message);

    if (message.type === 'TRANSLITERATE_REAL_TIME') {
        const { currentText, cursorPosition } = message.payload;
        const result = transliterator.transliterateRealTime(currentText, cursorPosition);
        sendResponse({
            type: 'TRANSLITERATE_RESPONSE',
            payload: result
        });
        return true;
    } else if (message.type === 'GET_TRANSLITERATOR_STATE') {
        sendResponse({
            type: 'TRANSLITERATOR_STATE_RESPONSE',
            isEnabled: transliterator.isTransliteratorEnabled()
        });
        return true;
    } else if (message.type === 'TOGGLE_TRANSLITERATOR') {
        // Use an async IIFE to handle asynchronous operations within the listener
        (async () => {
            const currentState = transliterator.isTransliteratorEnabled();
            const newState = !currentState;

            transliterator.setEnabled(newState);
            updateBadge(newState);

            try {
                await chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: newState });
                console.log(`[Background] Translit toggled to: ${newState ? 'ON' : 'OFF'}`);
            } catch (error) {
                console.error('[Background] Error saving transliterator state:', error);
            }

            // Send update to all active tabs
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'TRANSLITERATOR_STATE_UPDATE',
                            isEnabled: newState
                        }).catch(error => {
                            if (!error.message.includes("Could not establish connection")) {
                                console.warn(`[Background] Error sending state update to tab ${tab.id}:`, error);
                            }
                        });
                    }
                });
            });

            // Send response back to the popup
            sendResponse({ type: 'TOGGLE_RESPONSE', newState: newState });

        })(); // End of the async IIFE

        return true; // Must return true for async sendResponse
    }
});

// 2. Listen for clicks on the extension's browser action icon (separate from popup button).
chrome.action.onClicked.addListener(async (tab) => {
    const currentState = transliterator.isTransliteratorEnabled();
    const newState = !currentState;

    transliterator.setEnabled(newState);
    updateBadge(newState);

    try {
        await chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: newState });
        console.log(`[Background] Translit toggled by icon click to: ${newState ? 'ON' : 'OFF'}`);
    } catch (error) {
        console.error('[Background] Error saving transliterator state (icon click):', error);
    }

    // Send a message to the content script in the active tab
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'TRANSLITERATOR_STATE_UPDATE',
            isEnabled: newState
        }).catch(error => {
            if (!error.message.includes("Could not establish connection")) {
                console.warn(`[Background] Error sending state update to tab ${tab.id}:`, error);
            }
        });
    }
});

// 3. Initialize the state when the service worker starts up.
initializeTransliteratorState();

// 4. Optional: Listen for tab updates to re-send state.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'TRANSLITERATOR_STATE_UPDATE',
            isEnabled: transliterator.isTransliteratorEnabled()
        }).catch(error => {
            if (!error.message.includes("Could not establish connection")) {
                console.warn(`[Background] Error sending state update on tab update ${tabId}:`, error);
            }
        });
    }
});