// XSS Module
import { getState, getProfile } from './state.js';
import { sendRequest } from './request.js';

export function initializeXSSConfig() {
    const valueType = document.getElementById('valueType');
    const valueSelect = document.getElementById('valueSelect');
    const xssLevel = document.getElementById('xssLevel');
    const startTestBtn = document.getElementById('startTest');
    const progressContainer = document.getElementById('progressContainer');

    if (valueType && valueSelect && xssLevel && startTestBtn) {
        // Handle value type change
        valueType.addEventListener('change', () => {
            const state = getState();
            const profile = getProfile(state.currentProfile);
            
            // Clear and disable value select
            valueSelect.innerHTML = '<option value="">Select Value</option>';
            valueSelect.disabled = !valueType.value;
            
            if (valueType.value) {
                // Get available values based on value type
                let values = [];
                if (valueType.value === 'params') {
                    values = getParamValues(profile);
                } else if (valueType.value === 'body') {
                    values = getBodyValues(profile);
                }
                
                // Populate value select dropdown
                values.forEach(({key, value}) => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = `${key} (${value})`;
                    valueSelect.appendChild(option);
                });
            }
            
            updateStartButton();
        });

        // Handle value selection change
        valueSelect.addEventListener('change', updateStartButton);

        // Handle XSS level change
        xssLevel.addEventListener('change', updateStartButton);

        // Handle start test button
        startTestBtn.addEventListener('click', async () => {
            if (!valueType.value || !valueSelect.value || !xssLevel.value) {
                console.error('Please select all required fields');
                return;
            }
            
            startTestBtn.textContent = 'Testing...';
            startTestBtn.disabled = true;
            
            if (progressContainer) {
                progressContainer.classList.remove('hidden');
            }
            
            try {
                await executeXSSTest();
            } catch (error) {
                console.error('Error during XSS test:', error);
            } finally {
                startTestBtn.textContent = 'Start Test';
                startTestBtn.disabled = false;
                if (progressContainer) {
                    progressContainer.classList.add('hidden');
                }
            }
        });

        // Listen for params and body updates to refresh value select options
        document.addEventListener('paramsUpdated', () => {
            if (valueType.value === 'params') {
                valueType.dispatchEvent(new Event('change'));
            }
        });

        document.addEventListener('bodyUpdated', () => {
            if (valueType.value === 'body') {
                valueType.dispatchEvent(new Event('change'));
            }
        });
    }
}

function updateStartButton() {
    const valueType = document.getElementById('valueType');
    const valueSelect = document.getElementById('valueSelect');
    const xssLevel = document.getElementById('xssLevel');
    const startTestBtn = document.getElementById('startTest');

    if (valueType && valueSelect && xssLevel && startTestBtn) {
        startTestBtn.disabled = !(valueType.value && valueSelect.value && xssLevel.value);
    }
}

function getParamValues(profile) {
    const values = [];
    if (profile.params) {
        for (const [key, value] of profile.params) {
            values.push({ key, value });
        }
    }
    return values;
}

function getBodyValues(profile) {
    const values = [];
    if (profile.body) {
        if (typeof profile.body === 'object') {
            // For JSON and form data
            for (const [key, value] of Object.entries(profile.body)) {
                values.push({ key, value });
            }
        } else {
            // For raw body, split by common separators
            const pairs = profile.body.split(/[&\n]/);
            pairs.forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) {
                    values.push({ 
                        key: key.trim(), 
                        value: value.trim() 
                    });
                }
            });
        }
    }
    return values;
}

export async function loadXSSPayloads() {
    const state = getState();
    const profile = getProfile(state.currentProfile);
    
    try {
        const response = await fetch(chrome.runtime.getURL(`../payloads/${profile.xssConfig.xssLevel}.txt`));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const payloads = text.split('\n').filter(line => line.trim());
        
        // Store payloads
        state.xssPayloads[profile.xssConfig.xssLevel] = payloads;
        
        // Update total count
        const totalCount = document.getElementById('totalCount');
        const matchedCount = document.getElementById('matchedCount');
        const progressBar = document.getElementById('progressBar');
        
        if (totalCount) totalCount.textContent = payloads.length;
        if (matchedCount) matchedCount.textContent = '0';
        if (progressBar) progressBar.style.width = '0%';
        
    } catch (error) {
        console.error('Error loading XSS payloads:', error);
        throw error;
    }
}

export async function executeXSSTest() {
    const state = getState();
    const profile = getProfile(state.currentProfile);
    const valueType = document.getElementById('valueType')?.value;
    const targetKey = document.getElementById('valueSelect')?.value;
    const xssLevel = document.getElementById('xssLevel')?.value;
    
    if (!valueType || !targetKey || !xssLevel) {
        throw new Error('Missing required configuration');
    }
    
    // Load payloads if not already loaded
    if (!state.xssPayloads[xssLevel]) {
        profile.xssConfig.xssLevel = xssLevel;
        await loadXSSPayloads();
    }
    
    const payloads = state.xssPayloads[xssLevel];
    let matchedCount = 0;
    
    for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        
        // Create a copy of the request data
        const requestData = {
            url: profile.url,
            method: profile.method,
            headers: { ...profile.headers },
            body: profile.body ? JSON.parse(JSON.stringify(profile.body)) : null,
            params: profile.params ? [...profile.params] : []
        };
        
        // Inject payload
        if (valueType === 'params') {
            const paramIndex = requestData.params.findIndex(([key]) => key === targetKey);
            if (paramIndex !== -1) {
                requestData.params[paramIndex][1] = payload;
            }
        } else if (valueType === 'body') {
            if (typeof requestData.body === 'object') {
                requestData.body[targetKey] = payload;
            }
        }
        
        try {
            const response = await sendRequest(requestData);
            const responseText = await response.text();
            
            // Check if payload is reflected
            if (responseText.includes(payload)) {
                matchedCount++;
                const matchedCountElem = document.getElementById('matchedCount');
                if (matchedCountElem) {
                    matchedCountElem.textContent = matchedCount;
                }
            }
            
            // Update progress bar
            const progress = ((i + 1) / payloads.length) * 100;
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
        } catch (error) {
            console.error('Error testing payload:', error);
        }
    }
}
