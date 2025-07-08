// Arabic Transliteration Extension - Content Script
// Handles real-time transliteration for text input fields

let isTransliteratorEnabled = false;
let isUpdatingInput = false;
let lastProcessedElement = null;
let universalObserver = null;
let initializationComplete = false;

/**
 * Find all relevant input elements on the page
 */
function findInputElements() {
    const selectors = [
        // Google Search specific
        'input[name="q"]',
        'textarea[name="q"]',
        '.gLFyf',
        'input.gLFyf',
        'input[role="combobox"]',
        'form[action*="/search"] input',
        
        // General inputs
        'input[type="text"]',
        'input[type="search"]',
        'input[type="email"]',
        'input[type="url"]',
        'input[type="tel"]',
        'input:not([type])',
        'textarea',
        '[contenteditable="true"]',
        '[role="textbox"]',
        '[role="searchbox"]'
    ];
    
    const elements = [];
    selectors.forEach(selector => {
        try {
            document.querySelectorAll(selector).forEach(el => {
                if (!elements.includes(el) && isValidInputElement(el)) {
                    elements.push(el);
                }
            });
        } catch (e) {
            // Skip invalid selectors
        }
    });
    
    return elements;
}

/**
 * Validate if element is suitable for transliteration
 */
function isValidInputElement(element) {
    if (!element || !element.tagName || !element.isConnected) return false;
    
    // Standard input validation
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input') {
        const type = element.type?.toLowerCase();
        return !type || ['text', 'search', 'email', 'url', 'tel'].includes(type);
    }
    
    if (tagName === 'textarea') return true;
    
    // ContentEditable elements
    if (element.contentEditable === 'true' || element.isContentEditable) {
        return true;
    }
    
    // Role-based validation
    const role = element.getAttribute('role');
    if (['textbox', 'searchbox', 'combobox'].includes(role)) {
        return true;
    }
    
    // Skip disabled/readonly and hidden elements
    if (element.disabled || element.readOnly) return false;
    if (element.offsetParent === null && element.style.position !== 'fixed') {
        return false;
    }
    
    return false;
}

/**
 * Check if element should be processed for transliteration
 */
function isInputElement(element) {
    return isValidInputElement(element);
}

/**
 * Set up event listeners and mutation observer
 */
function attachEventListeners() {
    const eventConfig = { passive: false, capture: true };
    
    const eventHandlers = {
        input: (event) => {
            if (isInputElement(event.target) && isTransliteratorEnabled) {
                processElement(event.target);
            }
        },
        
        keyup: (event) => {
            if (isInputElement(event.target) && isTransliteratorEnabled) {
                if (event.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(event.key)) {
                    processElement(event.target);
                }
            }
        },
        
        focus: (event) => {
            if (isInputElement(event.target)) {
                lastProcessedElement = event.target;
            }
        }
    };
    
    // Attach event listeners
    Object.entries(eventHandlers).forEach(([eventType, handler]) => {
        document.addEventListener(eventType, handler, eventConfig);
    });
    
    // Set up mutation observer for dynamic content
    universalObserver = new MutationObserver((mutations) => {
        if (!isTransliteratorEnabled) return;
        
        let hasNewInputs = false;
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isInputElement(node)) {
                        hasNewInputs = true;
                    } else {
                        const inputs = node.querySelectorAll ? 
                            node.querySelectorAll('input, textarea, [contenteditable]') : [];
                        if (inputs.length > 0) {
                            hasNewInputs = true;
                        }
                    }
                }
            });
        });
        
        if (hasNewInputs) {
            setTimeout(processPage, 100);
        }
    });
    
    universalObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
}

/**
 * Process individual input element for transliteration
 */
function processElement(element) {
    if (!element || isUpdatingInput || !isTransliteratorEnabled) return;
    
    const currentText = getCurrentText(element);
    if (!currentText) return;
    
    // Get transliterated text from background script
    chrome.runtime.sendMessage({
        action: 'transliterate',
        text: currentText
    }, (response) => {
        if (response && response.transliteratedText && response.transliteratedText !== currentText) {
            updateElementText(element, response.transliteratedText);
        }
    });
}

/**
 * Get current text from element
 */
function getCurrentText(element) {
    if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
        return element.value || '';
    } else if (element.isContentEditable) {
        return element.textContent || '';
    }
    return '';
}

/**
 * Update element with transliterated text
 */
function updateElementText(element, transliteratedText) {
    if (isUpdatingInput) return;
    
    isUpdatingInput = true;
    
    try {
        if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
            const cursorPosition = element.selectionStart || transliteratedText.length;
            element.value = transliteratedText;
            
            // Restore cursor position
            const newPosition = Math.min(cursorPosition, transliteratedText.length);
            element.setSelectionRange(newPosition, newPosition);
            
            // Trigger events
            ['input', 'change'].forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                element.dispatchEvent(event);
            });
        } else if (element.isContentEditable) {
            const selection = window.getSelection();
            const cursorPosition = selection.rangeCount > 0 ? 
                selection.getRangeAt(0).startOffset : transliteratedText.length;
            
            element.textContent = transliteratedText;
            
            // Restore cursor position
            try {
                const range = document.createRange();
                const textNode = element.firstChild || element;
                const newPosition = Math.min(cursorPosition, transliteratedText.length);
                
                if (textNode.nodeType === Node.TEXT_NODE) {
                    range.setStart(textNode, newPosition);
                    range.setEnd(textNode, newPosition);
                } else {
                    range.selectNodeContents(element);
                    range.collapse(false);
                }
                
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) {
                // Cursor restoration failed, continue
            }
            
            // Trigger input event
            const event = new Event('input', { bubbles: true });
            element.dispatchEvent(event);
        }
    } catch (e) {
        // Element update failed
    } finally {
        isUpdatingInput = false;
    }
}

/**
 * Process all input elements on page
 */
function processPage() {
    if (!isTransliteratorEnabled) return;
    
    const inputElements = findInputElements();
    inputElements.forEach(element => {
        if (getCurrentText(element)) {
            processElement(element);
        }
    });
}

/**
 * Handle messages from background script and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'toggle':
            isTransliteratorEnabled = message.enabled;
            if (isTransliteratorEnabled) {
                processPage();
            }
            sendResponse({ success: true });
            break;
            
        case 'getStatus':
            sendResponse({ 
                enabled: isTransliteratorEnabled,
                inputsFound: findInputElements().length
            });
            break;
            
        case 'processCurrentElement':
            if (lastProcessedElement && isTransliteratorEnabled) {
                processElement(lastProcessedElement);
            }
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
    return true; // Keep message channel open for async response
});

/**
 * Initialize content script
 */
function initializeContentScript() {
    if (initializationComplete) return;
    
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
        if (response) {
            isTransliteratorEnabled = response.enabled || false;
            
            // Set up event listeners
            attachEventListeners();
            
            // Process page if enabled
            if (isTransliteratorEnabled) {
                setTimeout(processPage, 500);
            }
            
            initializationComplete = true;
        }
    });
}

// Initialize based on document state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    setTimeout(initializeContentScript, 100);
}

// Backup initialization
setTimeout(() => {
    if (!initializationComplete) {
        initializeContentScript();
    }
}, 2000);
