// content.js
// Enhanced Arabic Transliteration script with advanced site compatibility
// Includes debugging tools and multiple detection strategies

console.log('[Content Script] Arabic Transliteration module loaded.'); 

let isTransliteratorEnabled = false;
let isUpdatingInput = false;
let debugMode = true; // Enable detailed logging for troubleshooting

// Store references to active elements for debugging
let activeElements = new Set();
let lastProcessedElement = null;

/**
 * Enhanced debugging function
 */
function debugLog(message, data = null) {
    if (debugMode) {
        console.log(`[DEBUG] ${message}`, data || '');
    }
}

/**
 * Analyzes an element to understand its input mechanism
 */
function analyzeElement(element) {
    const analysis = {
        tagName: element.tagName,
        type: element.type,
        isContentEditable: element.isContentEditable,
        hasValue: 'value' in element,
        hasTextContent: !!element.textContent,
        classList: Array.from(element.classList),
        id: element.id,
        shadowRoot: !!element.shadowRoot,
        parentShadowRoot: !!element.getRootNode().host,
        computedRole: window.getComputedStyle(element).getPropertyValue('role'),
        ariaRole: element.getAttribute('role'),
        isInput: element.matches('input, textarea, [contenteditable]'),
        hasCompositionEvents: true, // We'll check this
        rect: element.getBoundingClientRect()
    };
    
    debugLog('Element Analysis:', analysis);
    return analysis;
}

/**
 * Multiple strategies to detect input elements
 */
function findAllInputElements() {
    const selectors = [
        // Standard inputs
        'input[type="text"]',
        'input[type="search"]',
        'input:not([type])',
        'textarea',
        '[contenteditable="true"]',
        '[contenteditable=""]',
        
        // ARIA inputs
        '[role="textbox"]',
        '[role="searchbox"]',
        '[role="combobox"]',
        
        // Common class patterns
        '[class*="input"]',
        '[class*="search"]',
        '[class*="textbox"]',
        '[class*="editor"]',
        
        // YouTube specific
        '#search-input input',
        'ytd-searchbox input',
        '.ytd-searchbox input',
        '#movie_player input',
        
        // Google specific
        'input[name="q"]',
        '[role="combobox"]',
        '.gLFyf', // Google search input class
        
        // Common frameworks
        '[data-testid*="input"]',
        '[data-testid*="search"]',
    ];
    
    const elements = [];
    selectors.forEach(selector => {
        try {
            const found = document.querySelectorAll(selector);
            found.forEach(el => {
                if (!elements.includes(el)) {
                    elements.push(el);
                }
            });
        } catch (e) {
            debugLog(`Invalid selector: ${selector}`, e);
        }
    });
    
    debugLog(`Found ${elements.length} potential input elements`);
    return elements;
}

/**
 * Enhanced element detection that works with shadow DOM
 */
function findInputsInShadowDOM(root = document) {
    const inputs = [];
    
    function traverse(node) {
        // Check current node
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (isInputElement(node)) {
                inputs.push(node);
            }
            
            // Check shadow root
            if (node.shadowRoot) {
                traverse(node.shadowRoot);
            }
        }
        
        // Traverse children
        for (const child of node.childNodes) {
            traverse(child);
        }
    }
    
    traverse(root);
    return inputs;
}

/**
 * Improved input element detection
 */
function isInputElement(element) {
    if (!element || !element.tagName) return false;
    
    // Standard checks
    if (element.tagName === 'INPUT' && 
        ['text', 'search', 'email', 'url', 'tel', 'password', ''].includes(element.type || '')) {
        return true;
    }
    
    if (element.tagName === 'TEXTAREA') return true;
    if (element.isContentEditable) return true;
    
    // ARIA roles
    const role = element.getAttribute('role');
    if (['textbox', 'searchbox', 'combobox'].includes(role)) return true;
    
    // Check if element can receive text input
    if (element.tabIndex >= 0 && 
        (element.textContent !== undefined || element.value !== undefined)) {
        const style = window.getComputedStyle(element);
        if (style.cursor === 'text' || style.cursor === 'auto') {
            return true;
        }
    }
    
    return false;
}

/**
 * Multiple event attachment strategies
 */
function attachAdvancedListeners() {
    debugLog('Attaching advanced event listeners...');
    
    // Strategy 1: Standard event delegation (your current approach)
    document.addEventListener('input', handleInputEvent, true); // Use capture phase
    document.addEventListener('keydown', handleKeyEvent, true);
    document.addEventListener('keyup', handleKeyEvent, true);
    document.addEventListener('compositionstart', handleCompositionEvent, true);
    document.addEventListener('compositionupdate', handleCompositionEvent, true);
    document.addEventListener('compositionend', handleCompositionEvent, true);
    
    // Strategy 2: Focus tracking to catch dynamic elements
    document.addEventListener('focusin', handleFocusEvent, true);
    document.addEventListener('focusout', handleFocusEvent, true);
    
    // Strategy 3: Direct attachment to discovered elements
    attachToDiscoveredElements();
    
    // Strategy 4: Mutation observer for dynamic content
    setupMutationObserver();
    
    // Strategy 5: Polling for hard-to-catch elements
    startPeriodicCheck();
}

function handleFocusEvent(event) {
    const element = event.target;
    debugLog('Focus event:', { type: event.type, element: element.tagName, id: element.id });
    
    if (event.type === 'focusin' && isInputElement(element)) {
        analyzeElement(element);
        attachDirectListeners(element);
        activeElements.add(element);
    } else if (event.type === 'focusout') {
        activeElements.delete(element);
    }
}

function handleKeyEvent(event) {
    const element = event.target;
    debugLog('Key event:', { 
        type: event.type, 
        key: event.key, 
        element: element.tagName,
        isInput: isInputElement(element)
    });
    
    if (isInputElement(element)) {
        // Process after the key is processed
        setTimeout(() => processElement(element), 0);
    }
}

function handleCompositionEvent(event) {
    debugLog('Composition event:', { type: event.type, data: event.data });
    const element = event.target;
    
    if (event.type === 'compositionend' && isInputElement(element)) {
        setTimeout(() => processElement(element), 0);
    }
}

/**
 * Attach listeners directly to specific elements
 */
function attachDirectListeners(element) {
    // Remove existing listeners to avoid duplicates
    element.removeEventListener('input', directInputHandler);
    element.removeEventListener('keyup', directKeyHandler);
    element.removeEventListener('paste', directPasteHandler);
    
    // Attach new listeners
    element.addEventListener('input', directInputHandler);
    element.addEventListener('keyup', directKeyHandler);
    element.addEventListener('paste', directPasteHandler);
    
    debugLog('Direct listeners attached to:', element);
}

function directInputHandler(event) {
    debugLog('Direct input event:', event.target);
    processElement(event.target);
}

function directKeyHandler(event) {
    debugLog('Direct key event:', { key: event.key, target: event.target });
    setTimeout(() => processElement(event.target), 0);
}

function directPasteHandler(event) {
    debugLog('Direct paste event:', event.target);
    setTimeout(() => processElement(event.target), 50); // Longer delay for paste
}

/**
 * Process discovered elements immediately
 */
function attachToDiscoveredElements() {
    const elements = [
        ...findAllInputElements(),
        ...findInputsInShadowDOM()
    ];
    
    debugLog(`Attaching to ${elements.length} discovered elements`);
    
    elements.forEach(element => {
        analyzeElement(element);
        attachDirectListeners(element);
    });
}

/**
 * Watch for dynamically added elements
 */
function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check the added node itself
                    if (isInputElement(node)) {
                        debugLog('New input element detected via mutation:', node);
                        analyzeElement(node);
                        attachDirectListeners(node);
                    }
                    
                    // Check children of added node
                    const childInputs = node.querySelectorAll ? 
                        Array.from(node.querySelectorAll('input, textarea, [contenteditable], [role="textbox"]')) : [];
                    
                    childInputs.forEach(input => {
                        if (isInputElement(input)) {
                            debugLog('New child input detected via mutation:', input);
                            analyzeElement(input);
                            attachDirectListeners(input);
                        }
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['contenteditable', 'role', 'class', 'id']
    });
    
    debugLog('Mutation observer setup complete');
}

/**
 * Periodic check for elements that might be missed
 */
function startPeriodicCheck() {
    setInterval(() => {
        const newElements = findAllInputElements().filter(el => !activeElements.has(el));
        if (newElements.length > 0) {
            debugLog(`Periodic check found ${newElements.length} new elements`);
            newElements.forEach(el => {
                analyzeElement(el);
                attachDirectListeners(el);
            });
        }
    }, 2000); // Check every 2 seconds
}

/**
 * Universal element processing function
 */
function processElement(element) {
    if (!isTransliteratorEnabled || isUpdatingInput || !isInputElement(element)) {
        return;
    }
    
    lastProcessedElement = element;
    debugLog('Processing element:', element);
    
    let currentText = '';
    let cursorPosition = 0;
    let isContentEditable = false;
    
    // Get text and cursor position based on element type
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        currentText = element.value || '';
        cursorPosition = element.selectionStart || 0;
    } else if (element.isContentEditable) {
        currentText = getContentEditableText(element);
        cursorPosition = getCursorPositionInContentEditable(element);
        isContentEditable = true;
    } else if (element.getAttribute('role') === 'textbox' || element.getAttribute('role') === 'searchbox') {
        // Handle ARIA textboxes
        currentText = element.textContent || element.innerText || '';
        // For ARIA elements, cursor position is harder to determine
        cursorPosition = currentText.length;
    }
    
    if (currentText.trim()) {
        debugLog('Sending for transliteration:', { currentText, cursorPosition, isContentEditable });
        debouncedRequestTransliteration(currentText, cursorPosition, element, isContentEditable);
    }
}

// Your existing transliteration functions (keeping them as-is)
function requestTransliteration(currentText, cursorPosition, inputElement, isContentEditable = false) {
    debugLog('Requesting transliteration:', { currentText, cursorPosition, isContentEditable });

    chrome.runtime.sendMessage({
        type: 'TRANSLITERATE_REAL_TIME',
        payload: {
            currentText,
            cursorPosition
        }
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn(`[Content Script] Message send error: ${chrome.runtime.lastError.message}`);
            return;
        }

        if (response && response.type === 'TRANSLITERATE_RESPONSE') {
            debugLog('Received transliteration response:', response.payload);
            const { text: transliteratedText, newCursorPosition } = response.payload;

            if (isContentEditable) {
                updateContentEditableElement(inputElement, transliteratedText, newCursorPosition);
            } else {
                updateStandardInputElement(inputElement, transliteratedText, newCursorPosition);
            }
        }
    });
}

function updateStandardInputElement(inputElement, transliteratedText, newCursorPosition) {
    if (inputElement.value !== transliteratedText) {
        isUpdatingInput = true;
        inputElement.value = transliteratedText;
        isUpdatingInput = false;

        const finalCursorPosition = Math.min(newCursorPosition, transliteratedText.length);
        inputElement.selectionStart = finalCursorPosition;
        inputElement.selectionEnd = finalCursorPosition;
        debugLog('Standard input updated');
    }
}

// Keep your existing contenteditable functions
function updateContentEditableElement(element, transliteratedText, newCursorPosition) {
    const currentText = getContentEditableText(element);
    
    if (currentText !== transliteratedText) {
        isUpdatingInput = true;
        setContentEditableText(element, transliteratedText);
        setCursorPositionInContentEditable(element, newCursorPosition);
        isUpdatingInput = false;
        debugLog('ContentEditable element updated');
    }
}

function getContentEditableText(element) {
    return element.textContent || element.innerText || '';
}

function setContentEditableText(element, text) {
    element.textContent = text;
}

function getCursorPositionInContentEditable(element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer)) return 0;
    
    const preCaretRange = document.createRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    
    return preCaretRange.toString().length;
}

function setCursorPositionInContentEditable(element, position) {
    const selection = window.getSelection();
    const range = document.createRange();
    
    try {
        const textNodeAndOffset = getTextNodeAndOffsetFromPosition(element, position);
        if (textNodeAndOffset) {
            range.setStart(textNodeAndOffset.node, textNodeAndOffset.offset);
            range.setEnd(textNodeAndOffset.node, textNodeAndOffset.offset);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    } catch (error) {
        console.warn('[Content Script] Error setting cursor position:', error);
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function getTextNodeAndOffsetFromPosition(element, position) {
    let currentPosition = 0;
    
    function walkTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const textLength = node.textContent.length;
            if (currentPosition + textLength >= position) {
                return {
                    node: node,
                    offset: position - currentPosition
                };
            }
            currentPosition += textLength;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (let child of node.childNodes) {
                const result = walkTextNodes(child);
                if (result) return result;
            }
        }
        return null;
    }
    
    return walkTextNodes(element);
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const debouncedRequestTransliteration = debounce(requestTransliteration, 200);

// Legacy event handler for compatibility
function handleInputEvent(event) {
    debugLog('Legacy input event:', event.target);
    processElement(event.target);
}

// Message handling
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TRANSLITERATOR_STATE_UPDATE') {
        isTransliteratorEnabled = message.isEnabled;
        debugLog(`Transliteration state updated to: ${isTransliteratorEnabled ? 'ON' : 'OFF'}`);
    }
});

// Initialization
async function initializeContentScript() {
    debugLog('Initializing enhanced content script...');
    
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_TRANSLITERATOR_STATE' });
        if (response && response.type === 'TRANSLITERATOR_STATE_RESPONSE') {
            isTransliteratorEnabled = response.isEnabled;
            debugLog(`Initial state fetched: ${isTransliteratorEnabled ? 'ON' : 'OFF'}`);
        }
    } catch (error) {
        debugLog('Error getting initial state:', error);
    }
    
    // Attach all listeners
    attachAdvancedListeners();
    
    debugLog('Enhanced content script initialization complete');
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

// Export debug functions for console testing
window.debugTransliteration = {
    findAllInputs: findAllInputElements,
    analyzeElement,
    processElement,
    toggleDebug: () => { debugMode = !debugMode; debugLog('Debug mode:', debugMode); },
    getActiveElements: () => Array.from(activeElements),
    getLastProcessed: () => lastProcessedElement
};