# Arabic Transliteration Extension

A Chrome extension that provides real-time Arabic transliteration for text input fields across websites, with special optimization for Google Search.

## Features

- **Real-time transliteration** - Convert romanized Arabic text to Arabic script as you type
- **Universal compatibility** - Works on most websites with text input fields
- **Google Search optimized** - Special support for Google Search interface
- **Smart detection** - Automatically detects and processes input fields, textareas, and contenteditable elements
- **Cursor preservation** - Maintains cursor position during transliteration
- **Dynamic content support** - Handles dynamically added elements via mutation observer

## Installation

### From Chrome Web Store
*Coming soon - extension will be available on Chrome Web Store*

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your browser toolbar

## Usage

1. Click the extension icon in your browser toolbar
2. Toggle the extension ON/OFF using the popup interface
3. Start typing in any text input field in romanized Arabic
4. Watch as your text is automatically converted to Arabic script

## Supported Input Types

- Standard text inputs (`<input type="text">`)
- Search inputs (`<input type="search">`)
- Email inputs (`<input type="email">`)
- URL inputs (`<input type="url">`)
- Telephone inputs (`<input type="tel">`)
- Textareas (`<textarea>`)
- Contenteditable elements
- Elements with textbox/searchbox roles

## File Structure

```
arabic-transliteration-extension/
├── manifest.json                 # Extension manifest
├── background/
│   ├── background.js            # Background script
│   └── transliteration-rules.js # Transliteration logic
├── content-scripts/
│   └── content.js              # Content script for page interaction
├── popup/
│   ├── popup.html              # Extension popup interface
│   ├── popup.css               # Popup styling
│   └── popup.js                # Popup functionality
├── icons/                      # Extension icons
└── assets/
    └── styles.css              # Additional styles
```

## Technical Details

### Architecture
- **Background Script**: Handles transliteration logic and extension state
- **Content Script**: Manages page interaction and real-time processing
- **Popup**: Provides user interface for extension control

### Key Features
- **Mutation Observer**: Detects dynamically added content
- **Event Handling**: Processes input, keyup, and focus events
- **Message Passing**: Communication between scripts via Chrome runtime API
- **Cursor Management**: Preserves text cursor position during updates

## Development

### Prerequisites
- Google Chrome browser
- Basic knowledge of Chrome Extensions API

### Testing
The extension includes several test files for development:
- `test-google-docs.js` - Google Docs specific testing
- `test-homepage.js` - General homepage testing
- `console-test.js` - Console-based testing utilities

### Building for Production
1. Remove test files and debug scripts
2. Optimize code and remove console.log statements
3. Test thoroughly across different websites
4. Package for Chrome Web Store submission

## Browser Compatibility

- **Chrome**: Fully supported (Manifest V2)
- **Edge**: Compatible (Chromium-based)
- **Firefox**: Not currently supported (would require manifest modifications)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### Version 1.0.0
- Initial release
- Real-time Arabic transliteration
- Google Search optimization
- Universal input field support
- Dynamic content detection

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on GitHub.

---

**Note**: This extension is designed to help users type Arabic text more easily. The transliteration rules can be customized in the `transliteration-rules.js` file.
