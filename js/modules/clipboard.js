// Clipboard Module
import { getState, getProfile } from './state.js';
import { updateMethod } from './method.js';

export function initializeClipboardPaste() {
    const pasteButton = document.getElementById('pasteClipboard');
    
    pasteButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            const curlData = parseCurlCommand(text);
            
            if (!curlData) {
                console.error('Invalid cURL command');
                return;
            }
            
            // Update profile with parsed data
            const state = getState();
            const profile = getProfile(state.currentProfile);
            
            // Update URL
            profile.url = curlData.url;
            const urlInput = document.getElementById('urlInput');
            if (urlInput) urlInput.value = curlData.url;
            
            // Update method (handle _method override correctly)
            const urlParams = new URLSearchParams(new URL(curlData.url).search);
            const methodOverride = urlParams.get('_method');
            profile.method = methodOverride || curlData.method;
            updateMethod(profile.method);
            
            // Update headers
            profile.headers = curlData.headers;
            updateHeadersUI(curlData.headers);
            
            // Update body
            if (curlData.body) {
                profile.body = curlData.body;
                const bodyTypeSelect = document.getElementById('bodyType');
                const bodyContent = document.getElementById('bodyContent');
                const formDataBody = document.getElementById('formDataBody');
                const urlencodedBody = document.getElementById('urlencodedBody');

                // Determine content type
                const contentType = curlData.headers['content-type'] || '';
                
                if (contentType.includes('application/json')) {
                    if (bodyTypeSelect) bodyTypeSelect.value = 'raw';
                    if (bodyContent) {
                        bodyContent.classList.remove('hidden');
                        bodyContent.value = JSON.stringify(curlData.body, null, 2);
                    }
                    if (formDataBody) formDataBody.classList.add('hidden');
                    if (urlencodedBody) urlencodedBody.classList.add('hidden');
                } else if (contentType.includes('multipart/form-data')) {
                    if (bodyTypeSelect) bodyTypeSelect.value = 'form-data';
                    if (bodyContent) bodyContent.classList.add('hidden');
                    if (formDataBody) {
                        formDataBody.classList.remove('hidden');
                        updateFormDataUI(curlData.body);
                    }
                    if (urlencodedBody) urlencodedBody.classList.add('hidden');
                } else if (contentType.includes('application/x-www-form-urlencoded')) {
                    if (bodyTypeSelect) bodyTypeSelect.value = 'x-www-form-urlencoded';
                    if (bodyContent) bodyContent.classList.add('hidden');
                    if (formDataBody) formDataBody.classList.add('hidden');
                    if (urlencodedBody) {
                        urlencodedBody.classList.remove('hidden');
                        updateUrlEncodedUI(curlData.body);
                    }
                } else {
                    if (bodyTypeSelect) bodyTypeSelect.value = 'none';
                    if (bodyContent) bodyContent.classList.add('hidden');
                    if (formDataBody) formDataBody.classList.add('hidden');
                    if (urlencodedBody) urlencodedBody.classList.add('hidden');
                }
            }
            
            // Update params
            if (curlData.params) {
                profile.params = curlData.params;
                updateParamsUI(curlData.params);
            }
            
        } catch (error) {
            console.error('Error pasting cURL command:', error);
        }
    });
}

function parseCurlCommand(curlCommand) {
    try {
        const lines = curlCommand.split('\n').map(line => line.trim());
        let url = '', method = 'GET', headers = {}, body = null, params = [];
        
        // Extract URL and method
        const urlMatch = lines[0].match(/'([^']+)'/);
        if (urlMatch) {
            url = urlMatch[1];
            const urlObj = new URL(url);
            params = Array.from(urlObj.searchParams.entries());
        }
        
        // Extract method
        if (lines[0].includes('--request') || lines[0].includes('-X')) {
            const methodMatch = lines[0].match(/(?:--request|-X)\s+(\w+)/);
            if (methodMatch) {
                method = methodMatch[1];
            }
        }
        
        // Extract headers and body
        let inBody = false;
        let bodyContent = [];
        let contentType = '';
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('-H') || line.startsWith('--header')) {
                const headerMatch = line.match(/'([^:]+):\s*([^']+)'/);
                if (headerMatch) {
                    const [_, name, value] = headerMatch;
                    headers[name.toLowerCase()] = value;
                    if (name.toLowerCase() === 'content-type') {
                        contentType = value;
                    }
                }
            } else if (line.includes('--data-raw') || line.includes('--data')) {
                inBody = true;
                const bodyMatch = line.match(/'(.+)'/);
                if (bodyMatch) {
                    bodyContent.push(bodyMatch[1]);
                }
            } else if (inBody && line !== '\\') {
                const bodyMatch = line.match(/'(.+)'/);
                if (bodyMatch) {
                    bodyContent.push(bodyMatch[1]);
                }
            }
        }
        
        // Parse body based on content type
        if (bodyContent.length > 0) {
            const rawBody = bodyContent.join('');
            if (contentType.includes('application/json')) {
                try {
                    body = JSON.parse(rawBody);
                } catch (e) {
                    console.error('Error parsing JSON body:', e);
                }
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                body = {};
                const searchParams = new URLSearchParams(rawBody);
                for (const [key, value] of searchParams) {
                    body[key] = value;
                }
            } else if (contentType.includes('multipart/form-data')) {
                body = parseMultipartFormData(rawBody);
            } else {
                body = rawBody;
            }
        }
        
        return { url, method, headers, body, params };
    } catch (error) {
        console.error('Error parsing cURL command:', error);
        return null;
    }
}

function parseMultipartFormData(rawBody) {
    const formData = {};
    try {
        const parts = rawBody.split('&');
        for (const part of parts) {
            const [key, value] = part.split('=');
            if (key && value) {
                formData[decodeURIComponent(key)] = decodeURIComponent(value);
            }
        }
    } catch (e) {
        console.error('Error parsing multipart form data:', e);
    }
    return formData;
}

function updateFormDataUI(formData) {
    const container = document.getElementById('formDataBody');
    if (!container) return;
    
    container.innerHTML = '';
    for (const [key, value] of Object.entries(formData)) {
        const row = document.createElement('div');
        row.className = 'flex space-x-2 mb-2';
        row.innerHTML = `
            <input type="text" class="form-input flex-1" value="${key}" readonly>
            <input type="text" class="form-input flex-1" value="${value}" readonly>
        `;
        container.appendChild(row);
    }
}

function updateUrlEncodedUI(data) {
    const container = document.getElementById('urlencodedBody');
    if (!container) return;
    
    container.innerHTML = '';
    for (const [key, value] of Object.entries(data)) {
        const row = document.createElement('div');
        row.className = 'flex space-x-2 mb-2';
        row.innerHTML = `
            <input type="text" class="form-input flex-1" value="${key}" readonly>
            <input type="text" class="form-input flex-1" value="${value}" readonly>
        `;
        container.appendChild(row);
    }
}

function updateHeadersUI(headers) {
    const container = document.getElementById('headersContainer');
    if (!container) return;
    
    container.innerHTML = '';
    for (const [name, value] of Object.entries(headers)) {
        const row = document.createElement('div');
        row.className = 'flex space-x-2 mb-2';
        row.innerHTML = `
            <input type="text" class="form-input flex-1" value="${name}" readonly>
            <input type="text" class="form-input flex-1" value="${value}" readonly>
        `;
        container.appendChild(row);
    }
}

function updateParamsUI(params) {
    const container = document.getElementById('paramsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    for (const [key, value] of params) {
        const row = document.createElement('div');
        row.className = 'flex space-x-2 mb-2';
        row.innerHTML = `
            <input type="text" class="form-input flex-1" value="${key}" readonly>
            <input type="text" class="form-input flex-1" value="${value}" readonly>
        `;
        container.appendChild(row);
    }
}
