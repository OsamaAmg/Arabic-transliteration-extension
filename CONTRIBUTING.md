# Contributing to Arabic Transliteration Extension

Thank you for your interest in contributing to the Arabic Transliteration Extension! This document provides guidelines for contributing to this project.

## 🤝 How to Contribute

### Reporting Issues
- Use the [GitHub Issues](https://github.com/OsamaAmg/Arabic-transliteration-extension/issues) page
- Check if the issue already exists before creating a new one
- Provide detailed information about the problem
- Include steps to reproduce the issue
- Mention your Chrome version and operating system

### Suggesting Features
- Open a new issue with the "enhancement" label
- Describe the feature and its benefits
- Provide examples of how it would work
- Consider the impact on performance and security

### Code Contributions

#### Setup Development Environment
1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature
4. Load the extension in Chrome (Developer Mode)
5. Make your changes and test thoroughly

#### Pull Request Process
1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Ensure security best practices
   - Test your changes thoroughly

3. **Commit your changes**
   ```bash
   git commit -m "Add: Brief description of changes"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots if applicable

## 📋 Code Style Guidelines

### JavaScript
- Use ES6+ features
- Use `const` and `let` instead of `var`
- Use arrow functions where appropriate
- Add JSDoc comments for functions
- Use meaningful variable names

### Example:
```javascript
/**
 * Processes input element for transliteration
 * @param {HTMLElement} element - The input element to process
 * @returns {boolean} - Success status
 */
function processElement(element) {
    if (!element || !isValidInputElement(element)) {
        return false;
    }
    
    // Process the element...
    return true;
}
```

### Security Requirements
- No `eval()` or dynamic code execution
- No `innerHTML` usage (use `textContent` instead)
- Validate all user input
- Use minimal permissions
- No external network requests

### Performance Guidelines
- Minimize DOM queries
- Use event delegation where possible
- Avoid memory leaks
- Profile performance impact
- Keep code size minimal

## 🧪 Testing

### Before Submitting
1. Test on multiple websites (Google, social media, forms)
2. Verify all Arabic letters work correctly
3. Check toggle functionality
4. Test cursor position preservation
5. Ensure no console errors
6. Verify performance impact is minimal

### Test Cases
- Input fields: `<input type="text">`, `<textarea>`, `[contenteditable]`
- Websites: Google Search, Gmail, Facebook, Twitter
- Functionality: Enable/disable, keyboard shortcuts, popup
- Edge cases: Empty fields, long text, special characters

## 📚 Documentation

### Required Documentation
- Update README.md if adding new features
- Add JSDoc comments for new functions
- Update technical documentation if architecture changes
- Include examples for new transliteration rules

### Documentation Style
- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Keep technical accuracy

## 🔧 Development Tools

### Recommended Extensions
- ESLint for code quality
- Prettier for code formatting
- Chrome DevTools for debugging

### Debug Commands
```bash
# Debug content script
F12 → Console (on any webpage)

# Debug background script
chrome://extensions/ → Background page

# Debug popup
Right-click extension icon → Inspect popup
```

## 📝 Commit Message Guidelines

### Format
```
Type: Brief description

Detailed description (if needed)

Closes #issue-number
```

### Types
- `Add`: New feature
- `Fix`: Bug fix
- `Update`: Modify existing feature
- `Remove`: Delete code/feature
- `Docs`: Documentation changes
- `Style`: Code style changes
- `Test`: Testing changes
- `Refactor`: Code refactoring

### Examples
```
Add: Support for custom transliteration rules

Users can now define their own transliteration mappings
through the extension popup interface.

Closes #42
```

## 🚫 What Not to Contribute

- Breaking changes without discussion
- Features that compromise security
- Code that significantly impacts performance
- Overly complex solutions
- Duplicate functionality
- Non-Arabic language support (out of scope)

## 🆘 Getting Help

- **Documentation**: Check [Technical Documentation](TECHNICAL-DOCUMENTATION.md)
- **Issues**: Search existing GitHub issues
- **Questions**: Open a new issue with the "question" label

## 📜 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professionalism

### Unacceptable Behavior
- Harassment or discrimination
- Spam or self-promotion
- Sharing private information
- Disruptive behavior

## 🎯 Priority Areas

We particularly welcome contributions in these areas:

1. **Performance Optimization**
   - Reducing memory usage
   - Improving response times
   - Optimizing DOM operations

2. **Security Enhancements**
   - Security audits
   - Vulnerability fixes
   - Permission minimization

3. **User Experience**
   - UI/UX improvements
   - Accessibility features
   - Better error handling

4. **Testing**
   - Automated test creation
   - Cross-browser compatibility
   - Edge case handling

5. **Documentation**
   - Code documentation
   - User guides
   - API documentation

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Chrome Web Store credits (if applicable)

---

Thank you for contributing to the Arabic Transliteration Extension! Your help makes this project better for everyone. 🙏

**Questions?** Feel free to open an issue or reach out to the maintainers.
