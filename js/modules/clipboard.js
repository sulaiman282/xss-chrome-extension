// Clipboard Module
import { getState, getProfile } from './state.js';
import { parseCurlCommand } from '../utils/parser.js';
import { createKeyValueRow } from './ui.js';

export function initializeClipboardPaste() {
    const pasteButton = document.getElementById('pasteClipboard');
    
    if (!pasteButton) return; // Exit if button not found
    
    pasteButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            const isCurl = text.trim().toLowerCase().startsWith('curl ');
            
            if (isCurl) {
                const parsed = parseCurlCommand(text);
                updateUIFromParsed(parsed);
            } else {
                // Just update URL if not a cURL command
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

function updateUIFromParsed(parsed) {
    const state = getState();
    const profile = getProfile(state.currentProfile);

    // Update method
    const methodSelect = document.getElementById('httpMethod');
    methodSelect.value = parsed.method;
    profile.method = parsed.method;

    // Update URL
    const urlInput = document.getElementById('urlInput');
    urlInput.value = parsed.url;
    profile.url = parsed.url;

    // Process headers for auth and regular headers
    const headersContainer = document.getElementById('headersContainer');
    const headersTab = document.querySelector('[data-tab="headers"]');
    const regularHeaders = [];
    let authHeader = null;

    parsed.headers.forEach(([key, value]) => {
        if (key.toLowerCase() === 'authorization') {
            authHeader = value;
        } else {
            regularHeaders.push([key, value]);
        }
    });

    // Handle authorization
    if (authHeader) {
        const authType = document.getElementById('authType');
        const authValue = authHeader.trim();

        if (authValue.toLowerCase().startsWith('basic ')) {
            // Handle Basic Auth
            authType.value = 'basic';
            document.getElementById('basicAuth').classList.remove('hidden');
            document.getElementById('bearerAuth').classList.add('hidden');
            document.getElementById('apiAuth').classList.add('hidden');

            try {
                const base64Credentials = authValue.split(' ')[1];
                const credentials = atob(base64Credentials);
                const [username, password] = credentials.split(':');
                
                document.getElementById('basicUsername').value = username || '';
                document.getElementById('basicPassword').value = password || '';
                
                profile.auth = {
                    type: 'basic',
                    username,
                    password
                };
            } catch (e) {
                console.error('Failed to parse Basic auth:', e);
            }
        } else if (authValue.toLowerCase().startsWith('bearer ')) {
            // Handle Bearer Token
            authType.value = 'bearer';
            document.getElementById('basicAuth').classList.add('hidden');
            document.getElementById('bearerAuth').classList.remove('hidden');
            document.getElementById('apiAuth').classList.add('hidden');

            const token = authValue.split(' ')[1];
            document.getElementById('bearerToken').value = token;
            
            profile.auth = {
                type: 'bearer',
                token
            };
        } else {
            // Try to handle as API Key
            authType.value = 'api';
            document.getElementById('basicAuth').classList.add('hidden');
            document.getElementById('bearerAuth').classList.add('hidden');
            document.getElementById('apiAuth').classList.remove('hidden');

            document.getElementById('apiKeyName').value = 'Authorization';
            document.getElementById('apiKeyValue').value = authValue;
            document.getElementById('apiKeyLocation').value = 'header';
            
            profile.auth = {
                type: 'api',
                name: 'Authorization',
                value: authValue,
                location: 'header'
            };
        }
    }

    // Update regular headers
    if (regularHeaders.length > 0) {
        headersTab.classList.remove('hidden');
        headersContainer.innerHTML = '';
        regularHeaders.forEach(([key, value]) => {
            const row = createKeyValueRow('headers', key, value);
            headersContainer.appendChild(row);
        });
        profile.headers = regularHeaders;
    }

    // Update body if present
    if (parsed.body) {
        const bodyTab = document.querySelector('[data-tab="body"]');
        bodyTab.classList.remove('hidden');

        try {
            // Try to parse as JSON
            const jsonBody = JSON.parse(parsed.body);
            const bodyType = document.getElementById('bodyType');
            const bodyContent = document.getElementById('bodyContent');
            
            bodyType.value = 'raw';
            bodyContent.value = JSON.stringify(jsonBody, null, 2);
            
            // Switch to raw body view
            document.getElementById('rawBody').classList.remove('hidden');
            document.getElementById('formDataBody').classList.add('hidden');
            document.getElementById('urlencodedBody').classList.add('hidden');
            
            profile.body = {
                type: 'raw',
                content: bodyContent.value
            };
        } catch (e) {
            // If not JSON, try to parse as form data
            if (parsed.body.includes('=')) {
                const params = new URLSearchParams(parsed.body);
                const bodyType = document.getElementById('bodyType');
                bodyType.value = 'x-www-form-urlencoded';
                
                // Switch to urlencoded view
                document.getElementById('rawBody').classList.add('hidden');
                document.getElementById('formDataBody').classList.add('hidden');
                document.getElementById('urlencodedBody').classList.remove('hidden');
                
                // Clear existing fields
                const urlencodedContainer = document.getElementById('urlencodedContainer');
                urlencodedContainer.innerHTML = '';
                
                // Add fields
                params.forEach((value, key) => {
                    const row = createKeyValueRow('urlencoded', key, value);
                    urlencodedContainer.appendChild(row);
                });
                
                profile.body = {
                    type: 'x-www-form-urlencoded',
                    content: parsed.body
                };
            } else {
                // Treat as raw text
                const bodyType = document.getElementById('bodyType');
                const bodyContent = document.getElementById('bodyContent');
                
                bodyType.value = 'raw';
                bodyContent.value = parsed.body;
                
                // Switch to raw body view
                document.getElementById('rawBody').classList.remove('hidden');
                document.getElementById('formDataBody').classList.add('hidden');
                document.getElementById('urlencodedBody').classList.add('hidden');
                
                profile.body = {
                    type: 'raw',
                    content: parsed.body
                };
            }
        }
    }

    // Update URL parameters if present
    try {
        const urlObj = new URL(parsed.url);
        const params = Array.from(urlObj.searchParams.entries());
        if (params.length > 0) {
            const paramsContainer = document.getElementById('paramsContainer');
            paramsContainer.innerHTML = '';
            params.forEach(([key, value]) => {
                const row = createKeyValueRow('params', key, value);
                paramsContainer.appendChild(row);
            });
            profile.params = params;
        }
    } catch (error) {
        console.error('Failed to parse URL parameters:', error);
    }
}
