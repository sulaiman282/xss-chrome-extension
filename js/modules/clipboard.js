// Clipboard Module
import { getState, getProfile } from './state.js';
import { updateMethod } from './method.js';
import { createKeyValueRow } from './ui.js';

export function initializeClipboardPaste() {
    const pasteButton = document.getElementById('pasteClipboard');
    
    pasteButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            console.log('Raw clipboard content:', text);
            const curlData = parseCurlCommand(text);
            
            if (!curlData) {
                console.error('Invalid cURL command');
                return;
            }
            
            // Update profile with parsed data
            const state = getState();
            const profile = getProfile(state.currentProfile);
            
            // Update URL if valid
            if (isValidUrl(curlData.url)) {
                profile.url = curlData.url;
                const urlInput = document.getElementById('urlInput');
                if (urlInput) urlInput.value = curlData.url;
            }
            
            // Update method (handle _method override)
            if (curlData.formData && curlData.formData._method) {
                profile.method = curlData.formData._method.toUpperCase();
            } else if (isValidMethod(curlData.method)) {
                profile.method = curlData.method;
            }
            updateMethod(profile.method);
            
            // Update headers and handle Authorization
            if (curlData.headers && Object.keys(curlData.headers).length > 0) {
                const headers = { ...curlData.headers };
                
                // Handle Authorization header
                const authHeader = headers['Authorization'] || headers['authorization'];
                if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
                    // Set bearer token auth
                    const token = authHeader.substring(7).trim();
                    profile.auth = {
                        type: 'bearer',
                        token: token
                    };
                    
                    // Update UI
                    const authType = document.getElementById('authType');
                    const bearerToken = document.getElementById('bearerToken');
                    if (authType && bearerToken) {
                        authType.value = 'bearer';
                        bearerToken.value = token;
                        // Trigger change event to show bearer token input
                        authType.dispatchEvent(new Event('change'));
                    }
                    
                    // Remove Authorization header
                    delete headers['Authorization'];
                    delete headers['authorization'];
                }
                
                profile.headers = headers;
                updateHeadersUI(headers);
            }
            
            // Update body if present and valid
            if (curlData.body) {
                profile.body = curlData.body;
                if (curlData.formData) {
                    profile.formData = curlData.formData;
                }
                updateBodyUI(curlData);
            }
            
            // Update params if valid
            if (curlData.params && Object.keys(curlData.params).length > 0) {
                profile.params = curlData.params;
                updateParamsUI(curlData.params);
            }
            
        } catch (error) {
            console.error('Error processing clipboard:', error);
        }
    });
}

function updateHeadersUI(headers) {
    const container = document.getElementById('headersContainer');
    if (!container) return;
    
    // Clear existing headers
    container.innerHTML = '';
    
    // Add each header using the UI function
    Object.entries(headers).forEach(([key, value]) => {
        const row = createKeyValueRow('headers', key, value);
        container.appendChild(row);
    });
}

function updateParamsUI(params) {
    const container = document.getElementById('paramsContainer');
    if (!container) return;
    
    // Clear existing params
    container.innerHTML = '';
    
    // Add each param using the UI function
    Object.entries(params).forEach(([key, value]) => {
        const row = createKeyValueRow('params', key, value);
        container.appendChild(row);
    });
}

function updateBodyUI(curlData) {
    const bodyTypeSelect = document.getElementById('bodyType');
    const bodyContent = document.getElementById('bodyContent');
    const formDataBody = document.getElementById('formDataBody');
    const urlencodedBody = document.getElementById('urlencodedBody');

    if (!bodyTypeSelect || !bodyContent) return;

    const contentType = curlData.headers['Content-Type'] || curlData.headers['content-type'] || '';
    
    try {
        if (contentType.includes('application/json')) {
            bodyTypeSelect.value = 'raw';
            bodyContent.classList.remove('hidden');
            bodyContent.value = typeof curlData.body === 'string' ? curlData.body : JSON.stringify(curlData.body, null, 2);
            if (formDataBody) formDataBody.classList.add('hidden');
            if (urlencodedBody) urlencodedBody.classList.add('hidden');
        } else if (contentType.includes('multipart/form-data')) {
            bodyTypeSelect.value = 'form-data';
            bodyContent.classList.add('hidden');
            if (formDataBody) {
                formDataBody.classList.remove('hidden');
                updateFormDataUI(curlData.formData || {});
            }
            if (urlencodedBody) urlencodedBody.classList.add('hidden');
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            bodyTypeSelect.value = 'x-www-form-urlencoded';
            bodyContent.classList.add('hidden');
            if (urlencodedBody) {
                urlencodedBody.classList.remove('hidden');
                updateUrlEncodedUI(curlData.formData || {});
            }
            if (formDataBody) formDataBody.classList.add('hidden');
        } else {
            bodyTypeSelect.value = 'raw';
            bodyContent.classList.remove('hidden');
            bodyContent.value = typeof curlData.body === 'string' ? curlData.body : JSON.stringify(curlData.body);
            if (formDataBody) formDataBody.classList.add('hidden');
            if (urlencodedBody) urlencodedBody.classList.add('hidden');
        }
        
        // Trigger change event
        bodyTypeSelect.dispatchEvent(new Event('change'));
    } catch (error) {
        console.error('Error updating body UI:', error);
    }
}

function updateFormDataUI(formData) {
    const container = document.getElementById('formDataBody');
    if (!container) return;
    
    // Clear existing form data
    container.innerHTML = '';
    
    // Add each form field using the UI function
    Object.entries(formData).forEach(([key, value]) => {
        const row = createKeyValueRow('form-data', key, value === null ? '' : value);
        container.appendChild(row);
    });
}

function updateUrlEncodedUI(data) {
    const container = document.getElementById('urlencodedBody');
    if (!container) return;
    
    // Clear existing urlencoded data
    container.innerHTML = '';
    
    // Add each field using the UI function
    Object.entries(data).forEach(([key, value]) => {
        const row = createKeyValueRow('urlencoded', key, value === null ? '' : value);
        container.appendChild(row);
    });
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function isValidMethod(method) {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return validMethods.includes(method?.toUpperCase());
}

function parseCurlCommand(curlCommand) {
    // Import the curlParser module
    const { parseCurlCommand: parser } = require('./curlParser.js');
    return parser(curlCommand);
}
