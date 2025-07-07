// content.js
// Arabic Transliteration Extension - Production Version
// Optimized for Google Search and other text input fields

let isTransliteratorEnabled = false;
let isUpdatingInput = false;
let lastProcessedElement = null;
let universalObserver = null;
let initializationComplete = false;

/**
 * Find relevant input elements efficiently
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
 * Improved input element validation
 */
function isValidInputElement(element) {
    if (!element || !element.tagName) return false;
    
    // Check if element is connected to DOM
    if (!element.isConnected) return false;
    
    // Check for Google Docs-specific elements
    const isGoogleDocs = /docs\.google\.com\/document/i.test(window.location.href);
    if (isGoogleDocs) {
        // In Google Docs, be more permissive with contentEditable elements
        if (element.contentEditable === 'true' || element.isContentEditable) {
            debugLog('Google Docs: Accepting contentEditable element:', element);
            return true;
        }
        
        // Google Docs iframe content (from different document)
        if (element.ownerDocument !== document && element.tagName === 'BODY' && element.contentEditable === 'true') {
            debugLog('Google Docs: Accepting iframe body element:', element);
            return true;
        }
        
        // Any contentEditable in iframe document
        if (element.ownerDocument !== document && element.isContentEditable) {
            debugLog('Google Docs: Accepting iframe contentEditable element:', element);
            return true;
        }
        
        // Google Docs-specific classes and roles
        const docsClasses = [
            'docs-texteventtarget-iframe',
            'kix-canvas-tile-content',
            'kix-paginateddocumentplugin',
            'kix-page-content-wrap',
            'docs-title-input',
            'docos-input'
        ];
        
        if (docsClasses.some(cls => element.className && element.className.includes(cls))) {
            // Skip canvas elements even if they have docs classes
            if (element.tagName === 'CANVAS') {
                debugLog('Google Docs: Rejecting canvas element despite matching class');
                return false;
            }
            debugLog('Google Docs: Accepting element with docs class:', element.className);
            return true;
        }
        
        // Check for role=textbox in Google Docs
        if (element.getAttribute('role') === 'textbox') {
            debugLog('Google Docs: Accepting textbox role element:', element);
            return true;
        }
    }
    
    // Check if element is hidden (but be more lenient for Google Docs)
    if (!isGoogleDocs && element.offsetParent === null && element.style.position !== 'fixed') {
        return false;
    }
    
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input') {
        const type = (element.type || 'text').toLowerCase();
        return ['text', 'search', 'email', 'url', 'tel', ''].includes(type);
    }
    
    if (tagName === 'textarea') return true;
    
    // ContentEditable elements
    if (element.isContentEditable || element.contentEditable === 'true') {
        return true;
    }
    
    // ARIA roles
    const role = element.getAttribute('role');
    if (['textbox', 'searchbox', 'combobox'].includes(role)) {
        return true;
    }
    
    return false;
}

/**
 * Optimized event attachment with intelligent batching
 */
function attachAdvancedListeners() {
    // Use passive listeners where possible for better performance
    const eventConfig = { passive: false, capture: true };
    
    // Universal event delegation with optimized debouncing
    const eventHandlers = {
        input: (event) => {
            if (isInputElement(event.target)) {
                debouncedProcessElement(event.target);
            }
        },
        
        keyup: (event) => {
            if (isInputElement(event.target)) {
                // Only process on significant key events
                if (event.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(event.key)) {
                    debouncedProcessElement(event.target);
                }
            }
        },
        
        keydown: (event) => {
            // Add keydown for Google Docs compatibility
            if (isInputElement(event.target)) {
                // For Google Docs, we need to capture more events
                const isGoogleDocs = /docs\.google\.com\/document/i.test(window.location.href);
                if (isGoogleDocs && event.key.length === 1) {
                    // Small delay to let the character be inserted first
                    setTimeout(() => debouncedProcessElement(event.target), 10);
                }
            }
        },
        
        paste: (event) => {
            if (isInputElement(event.target)) {
                // Longer delay for paste to allow content to be inserted
                setTimeout(() => processElement(event.target), 100);
            }
        },
        
        focusin: (event) => {
            if (isInputElement(event.target)) {
                handleElementFocus(event.target);
            }
        },
        
        focusout: (event) => {
            if (activeElements.has(event.target)) {
                activeElements.delete(event.target);
            }
        },
        
        // Additional Google Docs specific events
        textInput: (event) => {
            if (isInputElement(event.target)) {
                const isGoogleDocs = /docs\.google\.com\/document/i.test(window.location.href);
                if (isGoogleDocs) {
                    // TextInput event for Google Docs
                }
                debouncedProcessElement(event.target);
            }
        },
        
        // Mutation-based fallback for Google Docs
        DOMCharacterDataModified: (event) => {
            const isGoogleDocs = /docs\.google\.com\/document/i.test(window.location.href);
            if (isGoogleDocs && event.target.parentElement && isInputElement(event.target.parentElement)) {
                debouncedProcessElement(event.target.parentElement);
            }
        }
    };
    
    // Attach event listeners
    Object.entries(eventHandlers).forEach(([eventType, handler]) => {
        document.addEventListener(eventType, handler, eventConfig);
    });
    
    // Process existing elements
    processDiscoveredElements();
    
    // Setup observers
    setupOptimizedMutationObserver();
    
    // Special Google Docs text change detection
    const isGoogleDocs = /docs\.google\.com\/document/i.test(window.location.href);
    if (isGoogleDocs) {
        setupGoogleDocsTextDetection();
    }
    
    // Setup periodic check
    setupPeriodicCheck();
}

/**
 * Attach event listeners specifically for iframe elements (Google Docs)
 */
function attachIframeEventListeners(element) {
    const iframeDoc = element.ownerDocument;
    
    if (!iframeDoc || iframeDoc === document) {
        debugLog('Element is not in iframe, skipping iframe listeners');
        return;
    }
    
    debugLog('Attaching iframe-specific event listeners', element);
    
    // Create event handlers specific to this iframe element
    const iframeEventHandlers = {
        input: (event) => {
            if (event.target === element || element.contains(event.target)) {
                // Iframe input event
                debouncedProcessElement(event.target);
            }
        },
        
        keydown: (event) => {
            if (event.target === element || element.contains(event.target)) {
                // Iframe keydown event
                debouncedProcessElement(event.target);
            }
        },
        
        keyup: (event) => {
            if (event.target === element || element.contains(event.target)) {
                // Iframe keyup event
                debouncedProcessElement(event.target);
            }
        },
        
        paste: (event) => {
            if (event.target === element || element.contains(event.target)) {
                // Iframe paste event
                setTimeout(() => debouncedProcessElement(event.target), 50);
            }
        },
        
        focus: (event) => {
            if (event.target === element || element.contains(event.target)) {
                // Iframe focus event
                handleElementFocus(event.target);
            }
        }
    };
    
    // Attach listeners to the iframe document
    Object.entries(iframeEventHandlers).forEach(([eventType, handler]) => {
        try {
            iframeDoc.addEventListener(eventType, handler, { passive: false, capture: true });
            debugLog(`Attached iframe ${eventType} listener`);
        } catch (error) {
            debugLog(`Error attaching iframe ${eventType} listener:`, error);
        }
    });
    
    // Also set up a mutation observer for the iframe element
    if (window.MutationObserver) {
        const iframeMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    // Iframe mutation detected
                    debouncedProcessElement(element);
                }
            });
        });
        
        iframeMutationObserver.observe(element, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        debugLog('Iframe mutation observer attached');
    }
    
    // Activate this element
    activeElements.add(element);
    elementMetadata.set(element, {
        discovered: Date.now(),
        processCount: 0,
        isIframe: true
    });
    
    debugLog('Iframe element activated');
}

/**
 * Handle element focus with immediate processing
 */
function handleElementFocus(element) {
    debugLog('Element focused:', element);
    
    activeElements.add(element);
    
    // Store element metadata
    elementMetadata.set(element, {
        lastProcessed: Date.now(),
        processCount: 0
    });
    
    // Process immediately if there's existing content
    const currentText = getCurrentText(element);
    if (currentText.trim()) {
        setTimeout(() => processElement(element), 10);
    }
}

/**
 * Optimized processing of discovered elements
 */
function processDiscoveredElements() {
    const elements = findAllInputElements();
    debugLog(`Processing ${elements.length} discovered elements`);
    
    elements.forEach(element => {
        // Add to active set if it has focus
        if (document.activeElement === element) {
            activeElements.add(element);
        }
        
        // Store metadata
        elementMetadata.set(element, {
            discovered: Date.now(),
            processCount: 0
        });
    });
}

/**
 * Optimized mutation observer with intelligent filtering
 */
function setupOptimizedMutationObserver() {
    if (universalObserver) {
        universalObserver.disconnect();
    }
    
    let pendingMutations = [];
    let mutationTimer = null;
    
    const processMutations = () => {
        if (pendingMutations.length === 0) return;
        
        const mutations = pendingMutations;
        pendingMutations = [];
        
        let hasNewInputs = false;
        const processedElements = new Set();
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && !processedElements.has(node)) {
                        processedElements.add(node);
                        
                        // Check the node itself
                        if (isValidInputElement(node)) {
                            debugLog('New input element detected:', node);
                            hasNewInputs = true;
                        }
                        
                        // Check children (limit depth for performance)
                        if (node.querySelectorAll) {
                            const inputs = node.querySelectorAll('input, textarea, [contenteditable], [role="textbox"], [role="searchbox"], [role="combobox"]');
                            if (inputs.length > 0) {
                                inputs.forEach(input => {
                                    if (isValidInputElement(input) && !processedElements.has(input)) {
                                        debugLog('New child input detected:', input);
                                        processedElements.add(input);
                                        hasNewInputs = true;
                                    }
                                });
                            }
                        }
                    }
                });
            }
        });
        
        if (hasNewInputs) {
            debugLog('New inputs detected via mutation observer');
            // Invalidate cache
            elementMetadata.delete(document);
        }
    };
    
    universalObserver = new MutationObserver(mutations => {
        // Batch mutations for performance
        pendingMutations.push(...mutations);
        
        if (mutationTimer) {
            clearTimeout(mutationTimer);
        }
        
        mutationTimer = setTimeout(processMutations, 100);
    });
    
    universalObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false // Disable attribute watching for better performance
    });
    
    debugLog('Optimized mutation observer setup complete');
}

/**
 * Optimized periodic check with backoff
 */
function setupPeriodicCheck() {
    let checkInterval = 3000; // Start with 3 seconds
    const maxInterval = 30000; // Max 30 seconds
    let consecutiveEmptyChecks = 0;
    
    const performCheck = () => {
        const allInputs = findAllInputElements();
        const newInputs = allInputs.filter(el => !elementMetadata.has(el));
        
        if (newInputs.length > 0) {
            debugLog(`Periodic check found ${newInputs.length} new elements`);
            consecutiveEmptyChecks = 0;
            checkInterval = 3000; // Reset interval
            
            newInputs.forEach(el => {
                elementMetadata.set(el, {
                    discovered: Date.now(),
                    processCount: 0
                });
            });
        } else {
            consecutiveEmptyChecks++;
            // Exponential backoff
            if (consecutiveEmptyChecks > 3) {
                checkInterval = Math.min(checkInterval * 1.5, maxInterval);
            }
        }
        
        // Schedule next check
        periodicCheckTimer = setTimeout(performCheck, checkInterval);
    };
    
    // Start periodic checking
    periodicCheckTimer = setTimeout(performCheck, checkInterval);
}

/**
 * Enhanced Google-specific element processing
 */
function processElement(element) {
    if (!isTransliteratorEnabled || isUpdatingInput || !isValidInputElement(element)) {
        return;
    }
    
    // Enhanced rate limiting for Google pages
    const metadata = elementMetadata.get(element);
    if (metadata) {
        const now = Date.now();
        const minInterval = isGooglePage ? 200 : 100; // Slower for Google pages
        if (now - (metadata.lastProcessed || 0) < minInterval) {
            return;
        }
        metadata.lastProcessed = now;
        metadata.processCount = (metadata.processCount || 0) + 1;
    }
    
    lastProcessedElement = element;
    debugLog('Processing element:', element);
    
    const currentText = getCurrentText(element);
    const cursorPosition = getCursorPosition(element);
    const isContentEditable = element.isContentEditable || element.contentEditable === 'true';
    
    // Special handling for Google search elements
    if (isGooglePage && element.name === 'q') {
        debugLog('Processing Google search input');
        
        // Force focus to ensure we're working with the right element
        if (document.activeElement !== element) {
            try {
                element.focus();
            } catch (e) {
                debugLog('Could not focus Google search element:', e);
            }
        }
    }
    
    if (currentText.trim()) {
        debugLog('Sending for transliteration:', { 
            text: currentText.substring(0, 50) + (currentText.length > 50 ? '...' : ''),
            cursorPosition, 
            isContentEditable,
            isGooglePage,
            elementName: element.name,
            elementClass: element.className
        });
        
        requestTransliteration(currentText, cursorPosition, element, isContentEditable);
    }
}

/**
 * Optimized text extraction
 */
function getCurrentText(element) {
    try {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return element.value || '';
        } else if (element.isContentEditable || element.contentEditable === 'true') {
            return element.textContent || element.innerText || '';
        } else if (['textbox', 'searchbox', 'combobox'].includes(element.getAttribute('role'))) {
            return element.textContent || element.innerText || '';
        }
    } catch (error) {
        debugLog('Error getting text:', error);
    }
    return '';
}

/**
 * Optimized cursor position detection
 */
function getCursorPosition(element) {
    try {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return element.selectionStart || 0;
        } else if (element.isContentEditable || element.contentEditable === 'true') {
            return getCursorPositionInContentEditable(element);
        }
    } catch (error) {
        debugLog('Error getting cursor position:', error);
    }
    return 0;
}

/**
 * Optimized debounced processing
 */
const debouncedProcessElement = debounce(processElement, 150);

// Keep all existing transliteration functions unchanged
function requestTransliteration(currentText, cursorPosition, inputElement, isContentEditable = false) {
    debugLog('Requesting transliteration...');

    chrome.runtime.sendMessage({
        type: 'TRANSLITERATE_REAL_TIME',
        payload: {
            currentText,
            cursorPosition
        }
    }, (response) => {
        if (chrome.runtime.lastError) {
            debugLog(`Message send error: ${chrome.runtime.lastError.message}`);
            return;
        }

        if (response && response.type === 'TRANSLITERATE_RESPONSE') {
            debugLog('Received transliteration response');
            const { text: transliteratedText, newCursorPosition } = response.payload;

            if (isContentEditable) {
                updateContentEditableElement(inputElement, transliteratedText, newCursorPosition);
            } else {
                updateStandardInputElement(inputElement, transliteratedText, newCursorPosition);
            }
        }
    });
}

/**
 * Enhanced Google-aware input update for standard elements
 */
function updateStandardInputElement(inputElement, transliteratedText, newCursorPosition) {
    if (inputElement.value !== transliteratedText) {
        isUpdatingInput = true;
        
        // For Google search inputs, use a more careful approach
        if (isGooglePage && (inputElement.name === 'q' || inputElement.className.includes('gLFyf'))) {
            debugLog('Updating Google search input with special handling');
            
            // Store original handlers
            const originalOninput = inputElement.oninput;
            const originalOnchange = inputElement.onchange;
            
            // Temporarily disable handlers to prevent interference
            inputElement.oninput = null;
            inputElement.onchange = null;
            
            // Update value
            inputElement.value = transliteratedText;
            
            // Set cursor position first
            const finalCursorPosition = Math.min(newCursorPosition, transliteratedText.length);
            try {
                inputElement.selectionStart = finalCursorPosition;
                inputElement.selectionEnd = finalCursorPosition;
            } catch (e) {
                debugLog('Error setting cursor position:', e);
            }
            
            // Restore handlers
            inputElement.oninput = originalOninput;
            inputElement.onchange = originalOnchange;
            
            // Trigger events for Google's JavaScript
            ['input', 'change', 'keyup'].forEach(eventType => {
                const event = new Event(eventType, { 
                    bubbles: true, 
                    cancelable: true,
                    composed: true 
                });
                inputElement.dispatchEvent(event);
            });
            
            // Special Google events
            if (inputElement.getAttribute('jsaction')) {
                const customEvent = new CustomEvent('input', {
                    bubbles: true,
                    detail: { synthetic: true }
                });
                inputElement.dispatchEvent(customEvent);
            }
        } else {
            // Standard handling for non-Google inputs
            inputElement.value = transliteratedText;
            
            // Trigger events for compatibility
            ['input', 'change'].forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                inputElement.dispatchEvent(event);
            });
            
            // Set cursor position
            const finalCursorPosition = Math.min(newCursorPosition, transliteratedText.length);
            try {
                inputElement.selectionStart = finalCursorPosition;
                inputElement.selectionEnd = finalCursorPosition;
            } catch (e) {
                debugLog('Error setting cursor position:', e);
            }
        }
        
        isUpdatingInput = false;
        debugLog('Standard input updated');
    }
}

function updateContentEditableElement(element, transliteratedText, newCursorPosition) {
    const currentText = getCurrentText(element);
    
    if (currentText !== transliteratedText) {
        isUpdatingInput = true;
        element.textContent = transliteratedText;
        setCursorPositionInContentEditable(element, newCursorPosition);
        
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        element.dispatchEvent(event);
        
        isUpdatingInput = false;
        debugLog('ContentEditable element updated');
    }
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
        debugLog('Error setting cursor position:', error);
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

function isInputElement(element) {
    return isValidInputElement(element);
}

/**
 * Attach event listeners specifically for iframe elements (Google Docs)
 */
function attachIframeEventListeners(element) {
    const iframeDoc = element.ownerDocument;
    
    if (!iframeDoc || iframeDoc === document) {
        return;
    }
    
    // Create event handlers specific to this iframe element
    const iframeEventHandlers = {
        input: (event) => {
            if (event.target === element || element.contains(event.target)) {
                debouncedProcessElement(event.target);
            }
        },
        
        keydown: (event) => {
            if (event.target === element || element.contains(event.target)) {
                // Handle special keys
                if (event.key === 'Backspace' || event.key === 'Delete') {
                    setTimeout(() => {
                        debouncedProcessElement(event.target);
                    }, 10);
                }
            }
        },
        
        keyup: (event) => {
            if (event.target === element || element.contains(event.target)) {
                debouncedProcessElement(event.target);
            }
        },
        
        paste: (event) => {
            if (event.target === element || element.contains(event.target)) {
                setTimeout(() => {
                    debouncedProcessElement(event.target);
                }, 50);
            }
        },
        
        focus: (event) => {
            if (event.target === element || element.contains(event.target)) {
                handleElementFocus(event.target);
            }
        },
        
        textInput: (event) => {
            if (event.target === element || element.contains(event.target)) {
                debouncedProcessElement(event.target);
            }
        }
    };
    
    // Attach listeners to the iframe document
    Object.entries(iframeEventHandlers).forEach(([eventType, handler]) => {
        try {
            iframeDoc.addEventListener(eventType, handler, { passive: false, capture: true });
        } catch (error) {
            debugLog(`Error attaching iframe ${eventType} listener:`, error);
        }
    });
    
    // Also set up a direct mutation observer for the iframe element
    if (window.MutationObserver) {
        const iframeMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    if (mutation.target === element || element.contains(mutation.target)) {                    // Iframe mutation detected
                    debouncedProcessElement(element);
                    }
                }
            });
        });
        
        iframeMutationObserver.observe(element, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true
        });
        
        // Store observer reference to clean up later if needed
        if (!element._iframeMutationObserver) {
            element._iframeMutationObserver = iframeMutationObserver;
        }
    }
    
    // Try to immediately activate this element if it's focusable
    if (element.isContentEditable || element.contentEditable === 'true' || element.contentEditable === '') {
        try {
            // Making iframe element active
            activeElements.add(element);
            elementMetadata.set(element, {
                discovered: Date.now(),
                processCount: 0,
                isIframe: true,
                iframeDoc: iframeDoc
            });
            
            // Try to focus the element briefly to ensure it's ready
            element.focus();
        } catch (error) {
            debugLog('Error activating iframe element:', error);
        }
    }
}

// Enhanced message handling with Google page detection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
        sendResponse({ type: 'PONG' });
        return true;
    } else if (message.type === 'TRANSLITERATOR_STATE_UPDATE') {
        isTransliteratorEnabled = message.isEnabled;
        
        // Handle Google page flag from background script
        if (message.isGooglePage !== undefined) {
            isGooglePage = message.isGooglePage;
            debugLog(`Google page detected: ${isGooglePage}`);
            
            if (isGooglePage) {
                // Clear cache to force re-detection with Google-specific strategies
                elementMetadata.delete(document);
                
                // Immediate re-scan for Google inputs
                setTimeout(() => {
                    const googleInputs = findGoogleInputs();
                    debugLog(`Re-scanned Google inputs: ${googleInputs.length} found`);
                    
                    // Process any focused Google input immediately
                    if (document.activeElement && isValidInputElement(document.activeElement)) {
                        debugLog('Processing focused Google element');
                        processElement(document.activeElement);
                    }
                }, 100);
            }
        }
        
        debugLog(`Transliteration state updated: ${isTransliteratorEnabled ? 'ON' : 'OFF'}, Google: ${isGooglePage}`);
    } else if (message.type === 'TOGGLE_DEBUG') {
        debugMode = !debugMode;
        debugLog(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
        sendResponse({ debugMode });
    }
});

// Enhanced initialization with Google page detection
async function initializeContentScript() {
    if (initializationComplete) {
        return;
    }
    
    // Detect if we're on a Google page or homepage
    isGooglePage = /google\.com|youtube\.com|googleapis\.com/i.test(window.location.hostname);
    const isGoogleHomepage = /google\.com\/?(\?|#|$)|google\.com\/webhp|google\.com\/search|ogs\.google\.com/.test(window.location.href);
    const isGoogleDocs = /docs\.google\.com\/document/i.test(window.location.href);
    const isOGSWidget = /ogs\.google\.com/.test(window.location.href);
    
    // Only show initialization message for Google Docs
    if (isGoogleDocs) {
        // Google Docs initialization (silent for production)
    }
    
    // Force debug mode for Google pages (disabled in production)
    if (isGooglePage) {
        // Debug mode disabled for production release
    }
    
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_TRANSLITERATOR_STATE' });
        if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
        }
        if (response && response.type === 'TRANSLITERATOR_STATE_RESPONSE') {
            isTransliteratorEnabled = response.isEnabled;
            // Transliterator state received
        }
    } catch (error) {
        // Error getting initial state, defaulting to enabled
        isTransliteratorEnabled = true;
    }
    
    // Progressive initialization with Google-specific timing
    const initSteps = [
        () => {
            if (isGooglePage) {
                // Longer delays for Google pages, especially homepage
                const delay = isGoogleHomepage ? 1000 : 500;
                setTimeout(() => {
                    attachAdvancedListeners();
                }, delay);
            } else {
                attachAdvancedListeners();
            }
        },
        () => {
            // Google-specific post-initialization
            if (isGooglePage) {
                // Google Docs specific initialization
                if (isGoogleDocs) {
                    // Google Docs takes longer to load, add extra delay
                    setTimeout(() => {
                        // First try regular detection
                        let docsInputs = findGoogleInputs();
                        
                        // If regular detection didn't find good elements, try aggressive detection
                        const aggressiveInputs = findGoogleDocsEditingArea();
                        
                        // Combine results, prioritizing aggressive detection for actual content editing
                        const combinedInputs = [...aggressiveInputs];
                        docsInputs.forEach(el => {
                            if (!combinedInputs.includes(el)) {
                                combinedInputs.push(el);
                            }
                        });
                        
                        // Process found elements
                        if (combinedInputs.length > 0) {
                            combinedInputs.forEach((el, idx) => {
                                const isInIframe = el.ownerDocument !== document;
                                
                                // For iframe elements, attach listeners directly to their document
                                if (isInIframe) {
                                    attachIframeEventListeners(el);
                                }
                            });
                        }
                        
                        // If no contentEditable found, wait for document to load
                        if (combinedInputs.length === 0) {
                            let docsRetry = 0;
                            const retryDocs = () => {
                                docsRetry++;
                                
                                elementMetadata.delete(document);
                                const retryInputs = findGoogleInputs();
                                
                                if (retryInputs.length === 0 && docsRetry < 5) {
                                    setTimeout(retryDocs, 2000 * docsRetry);
                                } else if (retryInputs.length > 0) {
                                    // Inputs finally detected
                                } else {
                                    // No inputs found after 5 retries
                                }
                            };
                            setTimeout(retryDocs, 3000);
                        }
                    }, 3000); // Longer delay for Google Docs
                    return; // Skip regular Google processing for Docs
                }
                
                // For non-Docs Google pages, silent initialization
                const scanDelay = isGoogleHomepage ? 2000 : 1000;
                
                setTimeout(() => {
                    const googleInputs = findGoogleInputs();
                    
                    // For homepage, try multiple detection attempts
                    if (isGoogleHomepage && googleInputs.length === 0 && googlePageRetryCount < 5) {
                        const retryHomepage = () => {
                            googlePageRetryCount++;
                            elementMetadata.delete(document); // Clear cache
                            const retryInputs = findGoogleInputs();
                            
                            if (retryInputs.length === 0 && googlePageRetryCount < 5) {
                                setTimeout(retryHomepage, 1500 * googlePageRetryCount);
                            }
                        };
                        
                        setTimeout(retryHomepage, 1000);
                    }
                    
                    // If no inputs found on regular Google pages, try standard retry
                    else if (!isGoogleHomepage && googleInputs.length === 0 && googlePageRetryCount < 3) {
                        googlePageRetryCount++;
                        setTimeout(() => {
                            elementMetadata.delete(document);
                            findGoogleInputs();
                        }, 1000 * googlePageRetryCount);
                    }
                }, scanDelay);
            }
            
            initializationComplete = true;
        }
    ];
    
    // Execute initialization steps with adjusted delays for Google
    const baseDelay = isGooglePage ? (isGoogleHomepage ? 200 : 100) : 50;
    initSteps.forEach((step, index) => {
        setTimeout(step, index * baseDelay);
    });
}

/**
 * Special Google Docs text change detection
 */
function setupGoogleDocsTextDetection() {
    debugLog('Setting up Google Docs text change detection');
    
    // Track text content of all contentEditable elements
    const trackedElements = new Map();
    
    const checkForTextChanges = () => {
        const docsElements = findGoogleInputs();
        
        docsElements.forEach(element => {
            try {
                const currentText = getCurrentText(element);
                const lastText = trackedElements.get(element);
                
                if (lastText !== undefined && currentText !== lastText && currentText.trim()) {
                    // Text change detected - process the element
                    processElement(element);
                }
                
                trackedElements.set(element, currentText);
            } catch (e) {
                debugLog('Error checking text changes:', e);
            }
        });
    };
    
    // Check for changes every 100ms when user is actively typing
    let isUserTyping = false;
    let typingTimer = null;
    
    // Detect when user starts/stops typing
    document.addEventListener('keydown', (event) => {
        if (event.key.length === 1) { // Character keys only
            isUserTyping = true;
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                isUserTyping = false;
            }, 2000);
        }
    });
    
    // Fast polling when typing, slower when idle
    const pollForChanges = () => {
        checkForTextChanges();
        const nextInterval = isUserTyping ? 100 : 1000; // 100ms when typing, 1s when idle
        setTimeout(pollForChanges, nextInterval);
    };
    
    // Start polling
    setTimeout(pollForChanges, 1000);
    
    // Also set up a mutation observer specifically for Google Docs
    if (document.body) {
        const docsObserver = new MutationObserver((mutations) => {
            let hasTextMutation = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'characterData' || 
                    (mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
                    
                    // Check if the mutation is inside a contentEditable element
                    let currentNode = mutation.target;
                    while (currentNode && currentNode !== document.body) {
                        if (currentNode.contentEditable === 'true' && isValidInputElement(currentNode)) {
                            hasTextMutation = true;
                            break;
                        }
                        currentNode = currentNode.parentNode;
                    }
                }
            });
            
            if (hasTextMutation) {
                // Small delay to let the text settle
                setTimeout(checkForTextChanges, 50);
            }
        });
        
        docsObserver.observe(document.body, {
            characterData: true,
            childList: true,
            subtree: true
        });
        
        debugLog('Google Docs mutation observer and polling setup complete');
    }
}

/**
 * Aggressive Google Docs content detection
 */
function findGoogleDocsEditingArea() {
    debugLog('Starting enhanced Google Docs content detection');
    
    const found = [];
    
    // Method 1: Look for the specific Google Docs editor iframe
    debugLog('Method 1: Looking for Google Docs editor iframe');
    const docsIframes = document.querySelectorAll('iframe[src*="docs.google.com"], iframe.docs-texteventtarget-iframe');
    debugLog(`Found ${docsIframes.length} potential Google Docs iframes`);
    
    docsIframes.forEach((iframe, idx) => {
        try {
            debugLog(`Checking Google Docs iframe ${idx + 1}:`, {
                src: iframe.src,
                className: iframe.className,
                id: iframe.id
            });
            
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
                debugLog(`Successfully accessed Google Docs iframe ${idx + 1} document`);
                
                // Check the body - in Google Docs editor iframe, the body is often the editable area
                if (iframeDoc.body) {
                    const body = iframeDoc.body;
                    debugLog(`Google Docs iframe ${idx + 1} body:`, {
                        contentEditable: body.contentEditable,
                        isContentEditable: body.isContentEditable,
                        tagName: body.tagName,
                        className: body.className,
                        id: body.id,
                        innerText: body.innerText ? body.innerText.substring(0, 100) : 'No text'
                    });
                    
                    if (body.isContentEditable || body.contentEditable === 'true' || body.contentEditable === '') {
                        debugLog(`Adding Google Docs iframe ${idx + 1} body as main editing area`);
                        // Mark this as the main editing area
                        body.setAttribute('data-gdocs-main-editor', 'true');
                        found.push(body);
                    }
                }
                
                // Also check for any other contentEditable elements in the iframe
                const editables = iframeDoc.querySelectorAll('[contenteditable], [role="textbox"]');
                debugLog(`Google Docs iframe ${idx + 1} has ${editables.length} potentially editable elements`);
                
                editables.forEach((el, elIdx) => {
                    const rect = el.getBoundingClientRect();
                    debugLog(`Google Docs iframe ${idx + 1} element ${elIdx + 1}:`, {
                        tagName: el.tagName,
                        contentEditable: el.contentEditable,
                        isContentEditable: el.isContentEditable,
                        role: el.getAttribute('role'),
                        className: el.className,
                        id: el.id,
                        visible: rect.width > 0 && rect.height > 0,
                        rect: { width: rect.width, height: rect.height }
                    });
                    
                    if ((el.isContentEditable || el.contentEditable === 'true' || el.contentEditable === '') && 
                        rect.width > 0 && rect.height > 0 && !found.includes(el)) {
                        el.setAttribute('data-gdocs-editor', 'true');
                        found.push(el);
                    }
                });
            } else {
                debugLog(`Cannot access Google Docs iframe ${idx + 1} document (cross-origin or not ready)`);
            }
        } catch (e) {
            debugLog(`Error accessing Google Docs iframe ${idx + 1}:`, e.message);
        }
    });
    
    // Method 2: Check all other iframes (fallback)
    debugLog('Method 2: Checking all other iframes as fallback');
    const allIframes = document.querySelectorAll('iframe');
    debugLog(`Found ${allIframes.length} total iframes to check`);
    
    allIframes.forEach((iframe, idx) => {
        // Skip if already checked in method 1
        if (iframe.src && iframe.src.includes('docs.google.com') || iframe.classList.contains('docs-texteventtarget-iframe')) {
            return;
        }
        
        try {
            debugLog(`Checking general iframe ${idx + 1}:`, {
                src: iframe.src,
                className: iframe.className,
                id: iframe.id
            });
            
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && iframeDoc.body) {
                const body = iframeDoc.body;
                
                // Check if this looks like a document editor (large, contentEditable body)
                const rect = body.getBoundingClientRect();
                const isLargeEditableArea = rect.width > 400 && rect.height > 200;
                
                if ((body.isContentEditable || body.contentEditable === 'true' || body.contentEditable === '') && isLargeEditableArea) {
                    debugLog(`Found potential main editing iframe ${idx + 1}:`, {
                        contentEditable: body.contentEditable,
                        rect: { width: rect.width, height: rect.height },
                        innerText: body.innerText ? body.innerText.substring(0, 100) : 'No text'
                    });
                    
                    body.setAttribute('data-potential-main-editor', 'true');
                    if (!found.includes(body)) {
                        found.push(body);
                    }
                }
            }
        } catch (e) {
            // Silently skip cross-origin iframes
        }
    });
    
    // Method 3: Look for Google Docs specific patterns in the main document
    debugLog('Method 3: Checking main document for Google Docs patterns');
    
    const potentialContainers = [
        '.kix-appview-editor',
        '.kix-appview-editor-container', 
        '.docs-editor',
        '.docs-editor-container',
        '.kix-paginateddocumentplugin',
        '.docs-texteventtarget-iframe',
        '.kix-page',
        '.kix-page-column',
        '.kix-page-content-wrap'
    ];
    
    potentialContainers.forEach(selector => {
        try {
            const containers = document.querySelectorAll(selector);
            debugLog(`Selector "${selector}" found ${containers.length} containers`);
            
            containers.forEach(container => {
                const editables = container.querySelectorAll('[contenteditable], [role="textbox"]');
                debugLog(`Container has ${editables.length} editable descendants`);
                
                editables.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if ((el.isContentEditable || el.contentEditable === 'true' || el.contentEditable === '') && 
                        rect.width > 0 && rect.height > 0 && !found.includes(el)) {
                        debugLog('Found editable element in Google Docs container:', {
                            element: el,
                            tagName: el.tagName,
                            className: el.className,
                            rect: { width: rect.width, height: rect.height }
                        });
                        el.setAttribute('data-gdocs-container-editor', 'true');
                        found.push(el);
                    }
                });
            });
        } catch (e) {
            debugLog(`Error with selector ${selector}:`, e.message);
        }
    });
    
    // Method 4: Enhanced brute force - prioritize large contentEditable elements
    debugLog('Method 4: Enhanced brute force checking all contentEditable elements');
    const allEditables = document.querySelectorAll('[contenteditable], [contenteditable="true"], [contenteditable=""]');
    debugLog(`Found ${allEditables.length} contentEditable elements in main document`);
    
    // Sort by size (larger elements first - more likely to be main editing areas)
    const editablesWithSize = Array.from(allEditables).map(el => {
        const rect = el.getBoundingClientRect();
        return {
            element: el,
            area: rect.width * rect.height,
            rect: rect
        };
    }).sort((a, b) => b.area - a.area);
    
    editablesWithSize.forEach(({element: el, rect}, idx) => {
        debugLog(`ContentEditable ${idx + 1} (sorted by size):`, {
            tagName: el.tagName,
            className: el.className,
            contentEditable: el.contentEditable,
            isContentEditable: el.isContentEditable,
            visible: rect.width > 0 && rect.height > 0,
            rect: { width: rect.width, height: rect.height },
            area: rect.width * rect.height,
            innerText: el.innerText ? el.innerText.substring(0, 50) : 'No text'
        });
        
        if ((el.isContentEditable || el.contentEditable === 'true' || el.contentEditable === '') && 
            rect.width > 0 && rect.height > 0 && 
            !found.includes(el)) {
            
            // Prioritize large editable areas
            if (rect.width * rect.height > 10000) {
                el.setAttribute('data-large-editor', 'true');
            }
            found.push(el);
        }
    });
    
    debugLog(`Enhanced aggressive detection found ${found.length} total editable elements`);
    
    // Sort found elements by priority (iframe bodies first, then large areas, then others)
    found.sort((a, b) => {
        const aIsIframeBody = a.tagName === 'BODY' && a.ownerDocument !== document;
        const bIsIframeBody = b.tagName === 'BODY' && b.ownerDocument !== document;
        const aIsMain = a.hasAttribute('data-gdocs-main-editor');
        const bIsMain = b.hasAttribute('data-gdocs-main-editor');
        const aIsLarge = a.hasAttribute('data-large-editor');
        const bIsLarge = b.hasAttribute('data-large-editor');
        
        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;
        if (aIsIframeBody && !bIsIframeBody) return -1;
        if (!aIsIframeBody && bIsIframeBody) return 1;
        if (aIsLarge && !bIsLarge) return -1;
        if (!aIsLarge && bIsLarge) return 1;
        
        return 0;
    });
    
    return found;
}

// Smart initialization based on document state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    // Document already loaded
    setTimeout(initializeContentScript, 100);
}

// Backup initialization
setTimeout(() => {
    if (!initializationComplete) {
        initializeContentScript();
    }
}, 2000);