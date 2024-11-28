// Request Module
import { getProfile, getState } from './state.js';
import { updateResults } from './ui.js';

export function initializeRequestConfig() {
    const methodSelect = document.getElementById('httpMethod');
    const urlInput = document.getElementById('urlInput');
    const startTestBtn = document.getElementById('startTest');
    const paramsTab = document.querySelector('[data-tab="params"]');
    const bodyTab = document.querySelector('[data-tab="body"]');

    function updateMethodBasedUI() {
        const method = methodSelect.value;
        const hasBody = ['POST', 'PUT'].includes(method);
        
        // Show/hide tabs based on method
        if (hasBody) {
            paramsTab.classList.remove('hidden');
            bodyTab.classList.remove('hidden');
        } else {
            paramsTab.classList.remove('hidden');
            bodyTab.classList.add('hidden');
            // If body tab is active, switch to params
            if (bodyTab.classList.contains('active')) {
                paramsTab.click();
            }
        }
    }

    methodSelect.addEventListener('change', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.method = methodSelect.value;
        updateTargetFields();
        updateMethodBasedUI();
    });

    urlInput.addEventListener('input', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.url = urlInput.value;
    });

    // Initialize test execution
    startTestBtn.addEventListener('click', async () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        
        // Validate XSS config
        if (!profile.xssConfig.targetField || !profile.xssConfig.payloadType) {
            // Show XSS Config tab
            const xssConfigTab = document.querySelector('[data-tab="xssconfig"]');
            xssConfigTab.click();
            
            // Show validation message
            document.getElementById('xssValidationMessage').classList.remove('hidden');
            return;
        }
        
        // Hide validation message if it was shown
        document.getElementById('xssValidationMessage').classList.add('hidden');
        
        // Update counters
        document.getElementById('totalCount').textContent = '1';
        document.getElementById('checkedCount').textContent = '0';
        document.getElementById('matchedCount').textContent = '0';
        document.getElementById('notMatchedCount').textContent = '0';

        try {
            const response = await sendRequest(profile);
            updateResults(response);
        } catch (error) {
            console.error('Error sending request:', error);
        }
    });

    // Initialize UI based on current method
    updateMethodBasedUI();
}

export async function sendRequest(profile) {
    try {
        const response = await fetch(profile.url, {
            method: profile.method,
            headers: Object.fromEntries(profile.headers.map(h => [h.key, h.value])),
            body: profile.method !== 'GET' ? profile.body.content : undefined
        });

        const data = await response.json();
        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        return {
            error: error.message
        };
    }
}

export function updateTargetFields() {
    const state = getState();
    const profile = getProfile(state.currentProfile);
    const method = profile.method;
    const bodyType = profile.body.type;

    const targetFieldSelect = document.getElementById('xssTargetField');
    targetFieldSelect.innerHTML = '';

    // Add URL parameters as potential targets
    const urlOption = document.createElement('option');
    urlOption.value = 'url';
    urlOption.textContent = 'URL Parameters';
    targetFieldSelect.appendChild(urlOption);

    // Add body fields as potential targets for non-GET requests
    if (method !== 'GET') {
        const bodyOption = document.createElement('option');
        bodyOption.value = 'body';
        bodyOption.textContent = 'Request Body';
        targetFieldSelect.appendChild(bodyOption);
    }

    // Add headers as potential targets
    const headerOption = document.createElement('option');
    headerOption.value = 'headers';
    headerOption.textContent = 'Headers';
    targetFieldSelect.appendChild(headerOption);
}
