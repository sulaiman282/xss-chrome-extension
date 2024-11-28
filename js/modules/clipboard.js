// Clipboard Module
import { getState, getProfile } from './state.js';
import { parseCurlCommand } from '../utils/parser.js';

export function initializeClipboardPaste() {
    const pasteButton = document.getElementById('pasteClipboard');
    
    pasteButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text.trim().toLowerCase().startsWith('curl ')) {
                const parsed = parseCurlCommand(text);
                updateUIFromParsed(parsed);
            } else {
                document.getElementById('urlInput').value = text;
                const state = getState();
                const profile = getProfile(state.currentProfile);
                profile.url = text;
            }
        } catch (error) {
            console.error('Failed to read clipboard:', error);
        }
    });
}

export function updateUIFromParsed(parsed) {
    const state = getState();
    const profile = getProfile(state.currentProfile);

    // Update method
    document.getElementById('httpMethod').value = parsed.method;
    profile.method = parsed.method;

    // Update URL
    document.getElementById('urlInput').value = parsed.url;
    profile.url = parsed.url;

    // Update headers
    const headersContainer = document.getElementById('headersContainer');
    headersContainer.innerHTML = '';
    parsed.headers.forEach(([key, value]) => {
        const row = createKeyValueRow('headers', key, value);
        headersContainer.appendChild(row);
    });
    profile.headers = parsed.headers;

    // Update body
    if (parsed.body) {
        const bodyInput = document.getElementById('bodyContent');
        bodyInput.value = parsed.body;
        profile.body.content = parsed.body;
    }

    // Update parameters if present in URL
    const urlObj = new URL(parsed.url);
    const params = Array.from(urlObj.searchParams.entries());
    if (params.length > 0) {
        const paramsContainer = document.getElementById('paramsContainer');
        paramsContainer.innerHTML = '';
        params.forEach(([key, value]) => {
            const row = createKeyValueRow('params', key, value);
            paramsContainer.appendChild(row);
        });
    }
}
