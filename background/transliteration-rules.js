// transliteration-rules.js
// Arabic Transliteration Rules based on Arabizi conventions

class ArabicTransliterator {
    constructor() {
        // Transliteration rules - ORDER MATTERS!
        // Longer and more specific patterns must come first to avoid partial matches.
        this.rules = [
            // --- 1. Multi-character patterns (digraphs) ---
            // These should always be checked before single letters.
            { pattern: /sh/gi, arabic: 'ش' }, // 'sh' for Sheen
            { pattern: /th/gi, arabic: 'ث' }, // 'th' for Thaa (soft 'th' like in 'thin')
            { pattern: /dh/gi, arabic: 'ذ' }, // 'dh' for Dhaal (soft 'th' like in 'this')
            { pattern: /ch/gi, arabic: 'ش' }, // Common alternative for 'sh' in some dialects

            // --- 2. Numerical substitutions (Arabizi numbers) ---
            // These are highly specific and should be prioritized.
            { pattern: /3/g, arabic: 'ع' },   // 'Ain (guttural stop)
            { pattern: /7/g, arabic: 'ح' },   // Hha (strong 'h' from throat)
            { pattern: /5/g, arabic: 'خ' },   // Kha (guttural 'kh' sound)
            { pattern: /2/g, arabic: 'ء' },   // Hamza (glottal stop)
            { pattern: /9/g, arabic: 'ق' },   // Qaf (deep 'k' sound)
            { pattern: /6/g, arabic: 'ط' },   // Ta emphatic (strong 't')
            { pattern: /8/g, arabic: 'غ' },   // Ghain (guttural 'gh' sound)

            // --- 3. Emphatic consonants (capital letters) ---
            // Must come before their non-emphatic lowercase counterparts.
            { pattern: /S/g, arabic: 'ص' },   // Sad (emphatic 's')
            { pattern: /D/g, arabic: 'ض' },   // Dad (emphatic 'd')
            { pattern: /Z/g, arabic: 'ظ' },   // Zha (emphatic 'z')
            // Optional: You could add { pattern: /T/g, arabic: 'ط' } but '6' is more common for Ta emphatic.
            // Optional: You could add { pattern: /H/g, arabic: 'ح' } but '7' is more common for Hha.

            // --- 4. Standard single letters (general case-insensitive) ---
            // These are the most common mappings.
            { pattern: /a/gi, arabic: 'ا' },   // Alif (long 'a' or placeholder)
            { pattern: /b/gi, arabic: 'ب' },   // Ba
            { pattern: /t/gi, arabic: 'ت' },   // Ta
            { pattern: /j/gi, arabic: 'ج' },   // Jeem
            { pattern: /d/gi, arabic: 'د' },   // Dal
            { pattern: /r/gi, arabic: 'ر' },   // Ra
            { pattern: /z/gi, arabic: 'ز' },   // Zay
            { pattern: /s/gi, arabic: 'س' },   // Seen
            { pattern: /f/gi, arabic: 'ف' },   // Fa
            { pattern: /k/gi, arabic: 'ك' },   // Kaf
            { pattern: /l/gi, arabic: 'ل' },   // Lam
            { pattern: /m/gi, arabic: 'م' },   // Meem
            { pattern: /n/gi, arabic: 'ن' },   // Noon
            { pattern: /h/gi, arabic: 'ه' },   // Ha (soft 'h')
            { pattern: /w/gi, arabic: 'و' },   // Waw (consonant or long 'oo' sound)
            { pattern: /y/gi, arabic: 'ي' },   // Ya (consonant or long 'ee' sound)
            { pattern: /p/gi, arabic: 'ب' },   // 'P' doesn't exist in Arabic, commonly mapped to 'B'

            // --- 5. Vowel mappings (often redundant with alif/waw/ya but cover common spellings) ---
            // These are generally flexible in Arabizi, mapping to long vowels or similar sounds.
            { pattern: /e/gi, arabic: 'ي' },   // 'E' sound often maps to Ya
            { pattern: /i/gi, arabic: 'ي' },   // 'I' sound often maps to Ya
            { pattern: /o/gi, arabic: 'و' },   // 'O' sound often maps to Waw
            { pattern: /u/gi, arabic: 'و' }    // 'U' sound often maps to Waw
        ];

        // Configuration settings
        this.isEnabled = true;
        this.keyboardLayout = 'AZERTY'; // Currently supports 'QWERTY', 'AZERTY' for future.

        // Define characters that act as word/segment separators for real-time processing.
        // This ensures words are processed independently.
        this.separators = [' ', '.', ',', '!', '?', ';', ':', '(', ')', '[', ']', '{', '}', '-', '_', '+', '=', '*', '/', '\\', '|', '&', '%', '$', '#', '@', '^', '~', '`', '<', '>', '"', "'"];
    }

    /**
     * Main transliteration function.
     * Applies all defined rules sequentially to a given input string.
     * This function is used for both full string conversions and segments of real-time input.
     *
     * @param {string} input - The Latin (Arabizi) text to transliterate.
     * @returns {string} - The transliterated Arabic text.
     */
    transliterate(input) {
        if (!input) {
            return '';
        }

        let result = input;
        // Apply transliteration rules in the defined order.
        // The order ensures that more specific patterns are matched before general ones.
        for (const rule of this.rules) {
            result = result.replace(rule.pattern, rule.arabic);
        }
        return result;
    }

    /**
     * Real-time transliteration for input events.
     * This function processes the current input field value, identifies the active
     * word/segment around the cursor, and provides a live, transliterated preview.
     * It handles multi-character transliteration correctly as you type.
     *
     * @param {string} currentText - The full current value of the input field.
     * @param {number} cursorPosition - The current cursor position in the input field.
     * @returns {object} - An object containing the new transliterated text and the adjusted cursor position.
     */
    transliterateRealTime(currentText, cursorPosition) {
        if (!this.isEnabled) {
            return { text: currentText, newCursorPosition: cursorPosition };
        }

        // 1. Identify the boundaries of the "active segment" (the word or sequence) around the cursor.
        // This allows independent transliteration of the part being currently edited.
        let leftBoundary = -1; // Index of the last separator to the left of the cursor
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (this.separators.includes(currentText[i])) {
                leftBoundary = i;
                break;
            }
        }

        let rightBoundary = currentText.length; // Index of the first separator to the right of the cursor
        for (let i = cursorPosition; i < currentText.length; i++) {
            if (this.separators.includes(currentText[i])) {
                rightBoundary = i;
                break;
            }
        }

        // 2. Split the current text into three logical parts:
        //    a. `committedPrefix`: Text before the active segment (fully transliterated words).
        //    b. `activeSegment`: The word/punctuation sequence currently being typed/edited.
        //    c. `suffix`: Text after the active segment (fully transliterated words).
        const committedPrefix = currentText.substring(0, leftBoundary + 1);
        const activeSegment = currentText.substring(leftBoundary + 1, rightBoundary);
        const suffix = currentText.substring(rightBoundary);

        // 3. Transliterate each part independently using the main `transliterate` function.
        // This ensures rules like 'sh' -> 'ش' apply correctly within the activeSegment.
        const transliteratedCommittedPrefix = this.transliterate(committedPrefix);
        const transliteratedActiveSegment = this.transliterate(activeSegment);
        const transliteratedSuffix = this.transliterate(suffix);

        // 4. Reconstruct the full transliterated text.
        const newText = transliteratedCommittedPrefix + transliteratedActiveSegment + transliteratedSuffix;

        // 5. Calculate the new cursor position.
        // The most robust method for this type of transliterator is to transliterate
        // the portion of the original input string up to the original cursor position.
        // The length of this transliterated substring becomes the new cursor position.
        const previewUpToCursor = this.transliterate(currentText.substring(0, cursorPosition));
        const newCursorPosition = previewUpToCursor.length;

        return {
            text: newText,
            newCursorPosition: newCursorPosition
        };
    }

    /**
     * Get a preview of what the input would look like transliterated.
     * This function simply calls the main `transliterate` function.
     * @param {string} input - The Latin (Arabizi) text to preview.
     * @returns {string} - The transliterated Arabic text preview.
     */
    getPreview(input) {
        return this.transliterate(input);
    }

    /**
     * Enable or disable the transliterator functionality.
     * @param {boolean} enabled - True to enable, false to disable.
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Set the keyboard layout (e.g., 'QWERTY', 'AZERTY').
     * This method is a placeholder for future enhancements where rules might
     * need to be adjusted based on the keyboard layout.
     * @param {string} layout - The keyboard layout string.
     */
    setKeyboardLayout(layout) {
        this.keyboardLayout = layout;
        // TODO: Implement logic here to adjust rules if specific layouts require different mappings.
    }

    /**
     * Check if the transliterator is currently enabled.
     * @returns {boolean} - True if enabled, false otherwise.
     */
    isTransliteratorEnabled() {
        return this.isEnabled;
    }

    /**
     * Get all available transliteration rules.
     * Useful for debugging, displaying rules to the user, or testing.
     * @returns {Array} - An array of rule objects (pattern source, arabic character, flags).
     */
    getRules() {
        return this.rules.map(rule => ({
            pattern: rule.pattern.source, // Regex source string
            arabic: rule.arabic,         // Arabic character
            flags: rule.pattern.flags    // Regex flags (e.g., 'gi')
        }));
    }

    /**
     * Run a set of predefined test cases to verify the transliteration.
     * @returns {Array} - An array of test case objects, each with input and expected output.
     */
    runTests() {
        const testCases = [
            'ahlan',      // أهلان
            'marhaba',    // مرحبا
            'salam',      // سلام
            'shukran',    // شكران
            'ma3lesh',    // معلش
            'khalas',    // خلاص
            'habibi',    // حبيبي
            '7abibi',    // حبيبي
            'ya3ni',      // يعني
            'mesh kida',  // مش كدا
            'el kitab',   // ال كتاب
            'ana raye7',   // أنا رايح (using 7 for ح is common)
            'ana rayeH',   // أنا رايح (capital H for Hha is supported)
            '9alb',      // قلب
            '6abeeb',    // طبيب
            '8areeb',    // غريب
            'Soura',      // صورة (with emphatic S)
            'Doha',      // ضها (with emphatic D)
            'Zahra',      // ظهرا (with emphatic Z)
            'kifak?',    // كيفك؟ (with punctuation)
            '2amar',      // قمر (hamza)
            'wallahi',    // واللهي (vowel mapping)
            'jameel',    // جميل (vowel mapping)
            'fen',        // فين (vowel mapping)
            'kbir',      // كبير (no explicit vowel, relies on consonants)
            'Ana b7ibbak.', // أنا بحبك. (mixed Arabizi, punctuation)
            'Ismou 3amr.', // إسمو عمرو. (mixed Arabizi, punctuation)
            'chou esmak?', // شو اسمك؟ (with ch)
            'Hello World!', // هلو ورلد! (non-Arabic characters remain)
            'Thabt',      // ثبت
            'Dhakira',    // ذاكرا
            'Shams',      // شمس
            'Beit',      // بيت (diphthong, maps via 'b', 'e', 'i', 't')
            'Awlad',      // أولاد (diphthong, maps via 'a', 'w', 'l', 'a', 'd')
        ];

        return testCases.map(testCase => ({
            input: testCase,
            output: this.transliterate(testCase)
        }));
    }
}

// Remove the old CommonJS and global window assignments
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = ArabicTransliterator;
// }
// window.ArabicTransliterator = ArabicTransliterator;

// Add this line to explicitly export the class for ES Modules
export { ArabicTransliterator };