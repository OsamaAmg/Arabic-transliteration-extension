// background.js
// Enhanced background script with better Google page support

// Import the ArabicTransliterator class.
import { ArabicTransliterator } from './transliteration-rules.js';

// Initialize the transliterator instance.
const transliterator = new ArabicTransliterator();

// Define a key for storing the enabled state in browser storage.
const STORAGE_KEY_ENABLED = 'translit_enabled';

// Track injected tabs to avoid duplicate injections
const injectedTabs = new Set();

/**
 * Check if URL is a Google page - Enhanced version
 */
function isGooglePage(url) {
    if (!url) return false;
    const googleDomains = [
        'google.com',
        'www.google.com',
        'mail.google.com',
        'drive.google.com',
        'docs.google.com',
        'sheets.google.com',
        'slides.google.com',
        'forms.google.com',
        'translate.google.com',
        'maps.google.com',
        'calendar.google.com',
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'studio.youtube.com'
    ];
    
    // Check exact matches and subdomains
    const hostname = new URL(url).hostname.toLowerCase();
    return googleDomains.some(domain => 
        hostname === domain || 
        hostname.endsWith('.' + domain) ||
        hostname.includes('google.') ||
        hostname.includes('youtube.')
    );
}

/**
 * Enhanced content script injection with Google-specific handling
 */
async function injectContentScript(tabId, isGoogle = false) {
    try {
        // Check if already injected
        if (injectedTabs.has(tabId)) {
            // Content script already injected
            return;
        }

        // Test if content script is already there
        const testResult = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
        if (testResult) {
            // Content script already active
            injectedTabs.add(tabId);
            return;
        }

        // For Google pages, wait a bit longer and use different injection strategy
        if (isGoogle) {
            // Enhanced injection for Google pages
            
            // Wait for page to be more stable
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try multiple injection attempts for Google pages
            let injectionSuccess = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content-scripts/content.js'],
                        injectImmediately: true
                    });
                    injectionSuccess = true;
                    // Injection successful
                    break;
                } catch (error) {
                    console.warn(`[Background] Google page injection attempt ${attempt} failed:`, error);
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }
            
            if (!injectionSuccess) {
                throw new Error('All Google page injection attempts failed');
            }
        } else {
            // Standard injection for non-Google pages
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content-scripts/content.js']
            });
        }

        injectedTabs.add(tabId);
        // Content script injection completed

        // Send initial state with longer delay for Google pages
        const stateDelay = isGoogle ? 2000 : 100;
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
                type: 'TRANSLITERATOR_STATE_UPDATE',
                isEnabled: transliterator.isTransliteratorEnabled(),
                isGooglePage: isGoogle
            }).catch(error => {
                console.warn(`[Background] Error sending initial state to tab ${tabId}:`, error);
            });
        }, stateDelay);

    } catch (error) {
        console.error(`[Background] Error injecting content script into tab ${tabId}:`, error);
        // Remove from tracking if injection failed
        injectedTabs.delete(tabId);
    }
}

/**
 * Sets the extension icon badge text and color based on the enabled state.
 */
function updateBadge(isEnabled) {
    chrome.action.setBadgeText({
        text: isEnabled ? 'ON' : 'OFF'
    });
    chrome.action.setBadgeBackgroundColor({
        color: isEnabled ? '#4CAF50' : '#F44336'
    });
}

/**
 * Loads the enabled state from storage and initializes the transliterator.
 */
async function initializeTransliteratorState() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY_ENABLED);
        const isEnabled = result[STORAGE_KEY_ENABLED] !== undefined ? result[STORAGE_KEY_ENABLED] : true; 

        transliterator.setEnabled(isEnabled);
        updateBadge(isEnabled);
        // Transliterator state initialized

        // Inject content scripts into all existing tabs
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                await injectContentScript(tab.id, isGooglePage(tab.url));
            }
        }

    } catch (error) {
        console.error('[Background] Error loading transliterator state:', error);
        transliterator.setEnabled(true);
        updateBadge(true);
    }
}

/**
 * Send state update to all tabs
 */
async function broadcastStateUpdate(newState) {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                // Ensure content script is injected first
                if (!injectedTabs.has(tab.id)) {
                    await injectContentScript(tab.id, isGooglePage(tab.url));
                }
                
                // Send state update using new format
                chrome.tabs.sendMessage(tab.id, {
                    action: 'toggle',
                    enabled: newState
                }).catch(error => {
                    if (!error.message.includes("Could not establish connection")) {
                        console.warn(`[Background] Error sending state update to tab ${tab.id}:`, error);
                    }
                });
            }
        }
    } catch (error) {
        console.error('[Background] Error broadcasting state update:', error);
    }
}

// --- Event Listeners ---

// 1. Listen for messages from content scripts and popup.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
        sendResponse({ type: 'PONG' });
        return true;
    } else if (message.type === 'TRANSLITERATE_REAL_TIME') {
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
        (async () => {
            const currentState = transliterator.isTransliteratorEnabled();
            const newState = !currentState;

            transliterator.setEnabled(newState);
            updateBadge(newState);

            try {
                await chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: newState });
                // State toggled via keyboard shortcut
            } catch (error) {
                console.error('[Background] Error saving transliterator state:', error);
            }

            // Broadcast to all tabs
            await broadcastStateUpdate(newState);

            sendResponse({ type: 'TOGGLE_RESPONSE', newState: newState });
        })();

        return true;
    }
    
    // Handle new content script messages
    else if (message.action === 'transliterate') {
        const transliteratedText = transliterator.transliterate(message.text);
        sendResponse({ transliteratedText });
        return true;
    } else if (message.action === 'getState') {
        sendResponse({ enabled: transliterator.isTransliteratorEnabled() });
        return true;
    }
});

// 2. Listen for clicks on the extension's browser action icon.
chrome.action.onClicked.addListener(async (tab) => {
    const currentState = transliterator.isTransliteratorEnabled();
    const newState = !currentState;

    transliterator.setEnabled(newState);
    updateBadge(newState);

    try {
        await chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: newState });
        // State toggled via icon click
    } catch (error) {
        console.error('[Background] Error saving transliterator state (icon click):', error);
    }

    // Broadcast to all tabs
    await broadcastStateUpdate(newState);
});

// 3. Enhanced tab update listener with better Google handling
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Clear injection tracking when tab navigates
    if (changeInfo.status === 'loading') {
        injectedTabs.delete(tabId);
    }
    
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const isGoogle = isGooglePage(tab.url);
        // Tab loading completed
        
        // For Google pages, wait longer before injection
        const injectionDelay = isGoogle ? 2000 : 500;
        
        setTimeout(async () => {
            await injectContentScript(tabId, isGoogle);
            
            // Send state update with additional delay for Google pages
            const stateDelay = isGoogle ? 1000 : 500;
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                    action: 'toggle',
                    enabled: transliterator.isTransliteratorEnabled()
                }).catch(error => {
                    if (!error.message.includes("Could not establish connection")) {
                        console.warn(`[Background] Error sending state update on tab update ${tabId}:`, error);
                    }
                });
            }, stateDelay);
        }, injectionDelay);
    }
});

// 4. Clean up when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
});

// 5. Handle tab activation to ensure content script is ready
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        if (!injectedTabs.has(activeInfo.tabId)) {
            await injectContentScript(activeInfo.tabId, isGooglePage(tab.url));
        }
    }
});

// 6. Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-transliteration') {
        const currentState = transliterator.isTransliteratorEnabled();
        const newState = !currentState;

        transliterator.setEnabled(newState);
        updateBadge(newState);

        try {
            await chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: newState });
            // State toggled via keyboard shortcut
        } catch (error) {
            console.error('[Background] Error saving transliterator state (keyboard shortcut):', error);
        }

        // Broadcast to all tabs
        await broadcastStateUpdate(newState);
    }
});

// 7. Initialize the state when the service worker starts up.
initializeTransliteratorState();