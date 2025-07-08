# Changelog

All notable changes to the Arabic Transliteration Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Firefox compatibility
- Custom transliteration rules
- Multiple Arabic dialects support
- Keyboard shortcuts
- Settings page for advanced configuration

## [1.0.0] - 2025-07-08

### Added
- Real-time Arabic transliteration for text input fields
- Support for Google Search and other websites
- Universal input field detection (input, textarea, contenteditable)
- Smart element validation and filtering
- Cursor position preservation during transliteration
- Dynamic content support via MutationObserver
- Background script for transliteration logic
- Content script for page interaction
- Popup interface for extension control
- Event handling for input, keyup, and focus events
- Message passing between scripts
- Extension state management
- Chrome extension manifest v2 compliance

### Technical Implementation
- Optimized selector targeting for better performance
- Event delegation for efficient event handling
- Debounced processing to prevent excessive API calls
- Error handling for robust operation
- Cross-browser compatibility considerations

### Supported Input Types
- Standard text inputs (type="text", "search", "email", "url", "tel")
- Textareas
- Contenteditable elements
- Role-based elements (textbox, searchbox, combobox)
- Google Search specific selectors

### Browser Support
- Google Chrome (primary)
- Microsoft Edge (Chromium-based)

---

## Release Notes

### Version 1.0.0
This is the initial release of the Arabic Transliteration Extension. The extension provides seamless real-time transliteration of romanized Arabic text to Arabic script across web pages, with special optimization for popular sites like Google Search.

**Key Features:**
- ✅ Real-time transliteration as you type
- ✅ Works on most websites with text inputs
- ✅ Google Search optimization
- ✅ Smart input field detection
- ✅ Cursor position preservation
- ✅ Dynamic content support
- ✅ Easy toggle on/off functionality

**Known Limitations:**
- Currently supports Chrome/Edge only
- Fixed transliteration rules (customization planned for future versions)
- Manifest V2 (migration to V3 planned)

**Coming Next:**
- Chrome Web Store publication
- User feedback integration
- Performance optimizations
- Additional language support
