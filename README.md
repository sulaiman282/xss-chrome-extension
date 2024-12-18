# AiXSS - XSS Vulnerability Testing Extension

A modern, Postman-like Chrome extension for testing XSS vulnerabilities in web applications.

## Features

- **Profile Management**: Create and manage multiple testing profiles
- **Request Configuration**:
  - HTTP method selection (GET, POST, PUT, DELETE)
  - Custom headers and parameters
  - Multiple payload types (raw, multipart)
  - Authorization support
- **Clipboard Integration**: Paste and parse curl commands
- **Test Results**:
  - Real-time response viewing
  - Vulnerability detection
  - Results export (CSV/TXT)
- **Modern UI**: Clean, responsive interface with tabs

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory

## Development

- Run in development mode with hot reload:
  ```bash
   npm run dev
   ```

## Usage

1. **Configure Request**:
   - Select HTTP method
   - Enter target URL
   - Add headers, parameters, and payload
   - Configure authorization if needed

2. **Execute Test**:
   - Click "Start Test" to send the request
   - View real-time responses
   - Check matched vulnerabilities

3. **Manage Results**:
   - View current responses
   - Check matched vulnerabilities
   - Export results as needed

## Security Note

This tool is intended for ethical security testing only. Always obtain proper authorization before testing any web application for vulnerabilities.

## License

MIT License
#   x s s - c h r o m e - e x t e n s i o n  
 