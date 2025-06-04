// content.js
// Main content script for real-time Arabic transliteration in browser extension.
// This script interacts with the web page's input fields and communicates
// with the background script to perform dynamic text conversion.

console.log('[Content Script] Arabic Transliteration module loaded.'); // Keep this one

let isTransliteratorEnabled = false; // Controls whether transliteration is active.
let isUpdatingInput = false;         // Flag to prevent re-triggering input events when programmatically updating the field.

/**
 * Sends a message to the background script to request real-time transliteration.
 * The background script will process the text and send back the transliterated result.
 *
 * @param {string} currentText - The current value of the input field.
 * @param {number} cursorPosition - The current cursor position (selectionStart) in the input field.
 * @param {HTMLElement} inputElement - The DOM element (input or textarea) that triggered the event.
 */
function requestTransliteration(currentText, cursorPosition, inputElement) {
    console.log('[Content Script] Sending message to background:', { currentText, cursorPosition }); // ADDED LOG

    // Send message to the background script.
    // The callback handles the response when the background script finishes processing.
    chrome.runtime.sendMessage({
        type: 'TRANSLITERATE_REAL_TIME',
        payload: {
            currentText,
            cursorPosition
        }
    }, (response) => {
        // Check for any runtime errors during message passing (e.g., background script disconnected).
        if (chrome.runtime.lastError) {
            console.warn(`[Content Script] Message send error: ${chrome.runtime.lastError.message}`); // ADDED LOG
            // If the background script is unreachable, we might want to temporarily
            // disable the transliteration in the content script to avoid more errors.
            return;
        }

        // Process the response from the background script.
        if (response && response.type === 'TRANSLITERATE_RESPONSE') {
            console.log('[Content Script] Received response from background:', response.payload); // ADDED LOG
            const { text: transliteratedText, newCursorPosition } = response.payload;

            // Only update the input field if its current value is different from the transliterated text.
            // This prevents unnecessary DOM manipulations and cursor resets.
            if (inputElement.value !== transliteratedText) {
                isUpdatingInput = true; // Set flag to prevent 'input' event from looping back.
                inputElement.value = transliteratedText; // Update the input field's value.
                isUpdatingInput = false; // Reset flag after updating.

                // Restore the cursor position in the updated input field.
                // Math.min ensures the cursor doesn't go beyond the new text length.
                const finalCursorPosition = Math.min(newCursorPosition, transliteratedText.length);
                inputElement.selectionStart = finalCursorPosition;
                inputElement.selectionEnd = finalCursorPosition;
                console.log('[Content Script] Input field updated.'); // ADDED LOG
            } else {
                console.log('[Content Script] Input field value unchanged, no update needed.'); // ADDED LOG
            }
        }
    });
}

/**
 * Debounces a function call.
 * This prevents the `requestTransliteration` function from being called too frequently
 * during rapid typing, improving performance and reducing message overhead.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced version of the function.
 */
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this; // Maintain the original context (e.g., the input element).
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Create a debounced version of `requestTransliteration`.
// A delay of around 100-200ms usually provides a good balance between responsiveness and performance.
const debouncedRequestTransliteration = debounce(requestTransliteration, 150);

/**
 * Handles the 'input' event that fires when a user types into a text field.
 * This is the primary entry point for capturing user input.
 *
 * @param {Event} event - The DOM 'input' event object.
 */
function handleInputEvent(event) {
    if (!isTransliteratorEnabled) {
        // If this fired, you'd see: '[Content Script] Transliteration is OFF. Skipping input event.'
        console.log('[Content Script] Transliteration is OFF. Skipping input event.');
        return;
    }

    if (isUpdatingInput) {
        // If this fired, you'd see: '[Content Script] Ignoring programmatic input update.'
        console.log('[Content Script] Ignoring programmatic input update.');
        return;
    }

    const targetElement = event.target;
    // THIS IS THE LINE YOU ARE SEEING:
    console.log('[Content Script] Input event detected on:', targetElement);

    const isTextInput = (targetElement.tagName === 'INPUT' && ['text', 'search', 'email', 'url', 'tel', 'password'].includes(targetElement.type)) ||
                        targetElement.tagName === 'TEXTAREA';

    const isContentEditable = targetElement.isContentEditable;

    if (isTextInput && !targetElement.readOnly && !targetElement.disabled) {
        // If this fired, you'd see: '[Content Script] Target is a valid text input. Processing...'
        console.log('[Content Script] Target is a valid text input. Processing...');
        // ... rest of the logic ...
    } else if (isContentEditable) {
        // If this fired, you'd see: '[Content Script] Contenteditable elements detected...'
        console.log("[Content Script] Contenteditable elements detected but not fully supported in this version.");
    } else {
        // If the 'if' and 'else if' both failed, this *should* fire:
        // '[Content Script] Input event on unsupported element: INPUT text' (or whatever it is)
        console.log('[Content Script] Input event on unsupported element:', targetElement.tagName, targetElement.type);
    }
    // ... (rest of the handleInputEvent function)
}

// --- Event Listener Registration ---

// Attach a single 'input' event listener to the document body.
// Events from input fields will bubble up to the body, allowing centralized handling.
document.body.addEventListener('input', handleInputEvent);
console.log('[Content Script] Global input listener attached to document.body'); // ADDED LOG

// --- Communication with Background Script ---

// Set up a listener for messages coming from the background script.
// This is how the content script receives state updates (e.g., ON/OFF toggle)
// and could potentially receive other commands from the background service worker.
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TRANSLITERATOR_STATE_UPDATE') {
        isTransliteratorEnabled = message.isEnabled;
        console.log(`[Content Script] Transliteration state updated to: ${isTransliteratorEnabled ? 'ON' : 'OFF'}`); // Keep this log
        // No specific action needed beyond updating the flag, as handleInputEvent
        // will check this flag on the next input.
    }
    // No need to return `true` as we are not sending an asynchronous response back.
});

// --- Initialization Logic ---

/**
 * Initializes the content script when the page loads.
 * It primarily requests the current transliterator state from the background script.
 */
async function initializeContentScript() {
    console.log('[Content Script] Initializing content script...'); // ADDED LOG
    try {
        // Request the initial state from the background script.
        // This ensures the content script knows whether to activate its functionality
        // as soon as the page loads.
        const response = await chrome.runtime.sendMessage({ type: 'GET_TRANSLITERATOR_STATE' });

        // Process the response to set the initial enabled state.
        if (response && response.type === 'TRANSLITERATOR_STATE_RESPONSE') {
            isTransliteratorEnabled = response.isEnabled;
            console.log(`[Content Script] Initial state fetched: ${isTransliteratorEnabled ? 'ON' : 'OFF'}`); // Keep this log
        }
    } catch (error) {
        // Handle cases where the background script might not be available yet
        // (e.g., extension just installed/reloaded, or on certain browser pages).
        if (!error.message.includes("Could not establish connection")) {
            console.error('[Content Script] Error getting initial state from background:', error); // Keep this log
        } else {
            console.log('[Content Script] Connection error during initial state fetch (normal on some pages):', error.message); // ADDED LOG
        }
        // Fallback: If communication fails, assume enabled by default, or disable to be safe.
        // For robustness, defaulting to disabled might be safer if the background isn't responding.
        // For now, we'll stick to the background's default of 'ON'.
        // isTransliteratorEnabled = false; // Or true, depending on desired fail-safe behavior.
    }
}

// Execute the initialization function when the DOM is fully loaded.
// This ensures that input elements are available for event listener attachment.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
    console.log('[Content Script] Waiting for DOMContentLoaded to initialize.'); // ADDED LOG
} else {
    // If the DOM is already loaded (e.g., script injected after DOMContentLoaded), initialize immediately.
    initializeContentScript();
    console.log('[Content Script] DOM already loaded, initializing immediately.'); // ADDED LOG
}