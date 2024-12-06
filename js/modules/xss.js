// XSS Module
import { state, updateProfile } from './state.js';
import { sendRequest } from './request.js';

export function initializeXSSConfig() {
    const valueType = document.getElementById('valueType');
    const valueSelect = document.getElementById('valueSelect');
    const xssLevel = document.getElementById('xssLevel');
    const startTestBtn = document.getElementById('startTest');
    const progressContainer = document.getElementById('progressContainer');

    if (valueType && valueSelect && xssLevel && startTestBtn) {
        // Load initial config from profile
        loadXSSConfig();

        // Listen for profile changes
        document.addEventListener('profileChanged', loadXSSConfig);
        
        // Handle value type change
        valueType.addEventListener('change', () => {
            updateValueSelect();
            saveXSSConfig();
        });

        // Handle value selection change
        valueSelect.addEventListener('change', () => {
            saveXSSConfig();
        });

        // Handle XSS level change
        xssLevel.addEventListener('change', () => {
            saveXSSConfig();
        });

        // Handle start test button
        startTestBtn.addEventListener('click', async () => {
            if (!validateXssConfig()) {
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

        // Listen for real-time updates to params and body
        const paramsContainer = document.getElementById('paramsContainer');
        if (paramsContainer) {
            // Use MutationObserver to watch for changes in params
            const paramsObserver = new MutationObserver(() => {
                if (valueType.value === 'params') {
                    updateValueSelect();
                }
            });
            
            paramsObserver.observe(paramsContainer, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            });

            // Also listen for input events on param fields
            paramsContainer.addEventListener('input', (event) => {
                if (event.target.tagName === 'INPUT' && valueType.value === 'params') {
                    updateValueSelect();
                }
            });
        }

        // Watch for body changes
        const bodyContainer = document.getElementById('bodyTabContent');
        if (bodyContainer) {
            // Use MutationObserver to watch for changes in body
            const bodyObserver = new MutationObserver(() => {
                if (valueType.value === 'body') {
                    updateValueSelect();
                }
            });
            
            bodyObserver.observe(bodyContainer, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            });

            // Also listen for input events on body fields
            bodyContainer.addEventListener('input', (event) => {
                if (event.target.tagName === 'INPUT' && valueType.value === 'body') {
                    updateValueSelect();
                }
            });

            // Listen for changes in body type
            document.getElementById('bodyType')?.addEventListener('change', () => {
                if (valueType.value === 'body') {
                    updateValueSelect();
                }
            });
        }

        // Listen for specific update events
        document.addEventListener('paramsUpdated', () => {
            if (valueType.value === 'params') {
                updateValueSelect();
            }
        });

        document.addEventListener('bodyUpdated', () => {
            if (valueType.value === 'body') {
                updateValueSelect();
            }
        });
    }
}

function loadXSSConfig() {
    const profile = state.profiles[state.currentProfile];
    if (!profile.xssConfig) {
        profile.xssConfig = {
            valueType: '',
            targetField: '',
            payloadType: 'basic'
        };
    }

    const valueType = document.getElementById('valueType');
    const valueSelect = document.getElementById('valueSelect');
    const xssLevel = document.getElementById('xssLevel');

    valueType.value = profile.xssConfig.valueType || '';
    xssLevel.value = profile.xssConfig.payloadType || 'basic';

    // Update value select options and set saved value
    updateValueSelect();
    if (profile.xssConfig.targetField) {
        valueSelect.value = profile.xssConfig.targetField;
    }
}

function saveXSSConfig() {
    const profile = { ...state.profiles[state.currentProfile] };
    const valueType = document.getElementById('valueType');
    const valueSelect = document.getElementById('valueSelect');
    const xssLevel = document.getElementById('xssLevel');

    profile.xssConfig = {
        valueType: valueType.value,
        targetField: valueSelect.value,
        payloadType: xssLevel.value
    };

    updateProfile(state.currentProfile, profile);
}

function updateValueSelect() {
    const valueType = document.getElementById('valueType');
    const valueSelect = document.getElementById('valueSelect');
    const profile = state.profiles[state.currentProfile];
    
    // Store the currently selected value
    const currentValue = valueSelect.value;
    
    // Clear and disable value select
    valueSelect.innerHTML = '<option value="">Select Value</option>';
    valueSelect.disabled = !valueType.value;
    
    if (!valueType.value) return;

    // Get available values based on value type
    const values = valueType.value === 'params' ? 
        getParamValues() : 
        getBodyValues();

    // Populate value select dropdown with only value fields
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value.key;
        option.textContent = value.key;
        valueSelect.appendChild(option);
    });

    // Restore the previously selected value if it still exists
    if (currentValue && Array.from(valueSelect.options).some(opt => opt.value === currentValue)) {
        valueSelect.value = currentValue;
    } else {
        // If the previously selected value no longer exists, trigger save to update profile
        saveXSSConfig();
    }
}

function getParamValues() {
    const values = [];
    const paramsContainer = document.getElementById('paramsContainer');
    
    if (paramsContainer) {
        paramsContainer.querySelectorAll('div').forEach(field => {
            const keyInput = field.querySelector('input[type="text"]');
            const valueInput = field.querySelector('div input');
            if (keyInput?.value && valueInput?.value && !isObjectOrArray(valueInput.value)) {
                values.push({ 
                    key: keyInput.value,
                    value: valueInput.value 
                });
            }
        });
    }
    
    return values;
}

function getBodyValues() {
    const values = [];
    const bodyType = document.getElementById('bodyType')?.value;
    const profile = state.profiles[state.currentProfile];

    if (!profile.body) return values;

    switch (bodyType) {
        case 'form-data':
        case 'x-www-form-urlencoded':
            if (profile.body.fields) {
                profile.body.fields.forEach(field => {
                    if (field.key && field.value && !isObjectOrArray(field.value)) {
                        values.push({
                            key: field.key,
                            value: field.value
                        });
                    }
                });
            }
            break;
            
        case 'raw':
            try {
                const content = profile.body.content;
                if (!content) break;
                
                // Try parsing as JSON
                const jsonBody = JSON.parse(content);
                const flattenedValues = flattenObject(jsonBody);
                Object.entries(flattenedValues).forEach(([key, value]) => {
                    if (!isObjectOrArray(value)) {
                        values.push({ key, value });
                    }
                });
            } catch {
                // If not JSON, try parsing as URL encoded
                const pairs = profile.body.content.split(/[&\n]/);
                pairs.forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key && value && !isObjectOrArray(value)) {
                        values.push({ 
                            key: key.trim(),
                            value: value.trim()
                        });
                    }
                });
            }
            break;
    }
    
    return values;
}

// Helper function to check if a value is an object or array
function isObjectOrArray(value) {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null;
        } catch {
            return false;
        }
    }
    return typeof value === 'object' && value !== null;
}

// Helper function to flatten nested objects
function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(acc, flattenObject(obj[key], pre + key));
        } else {
            acc[pre + key] = obj[key];
        }
        return acc;
    }, {});
}

function validateXssConfig() {
    const valueType = document.getElementById('valueType').value;
    const valueSelect = document.getElementById('valueSelect').value;
    const startButton = document.getElementById('startTest');
    
    // Add validation message containers if they don't exist
    let messageContainer = document.getElementById('xssValidationMessage');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'xssValidationMessage';
        messageContainer.className = 'text-red-600 text-sm mt-2';
        document.getElementById('xssconfig')?.appendChild(messageContainer);
    }
    
    if (!valueType || !valueSelect) {
        messageContainer.textContent = 'Please select both value type and target field';
        startButton.disabled = true;
        return false;
    }
    
    messageContainer.textContent = '';
    startButton.disabled = false;
    return true;
}

export async function executeXSSTest() {
    const profile = state.profiles[state.currentProfile];
    const valueType = document.getElementById('valueType').value;
    const targetField = document.getElementById('valueSelect').value;
    const xssLevel = document.getElementById('xssLevel').value;
    
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
            const paramIndex = requestData.params.findIndex(([key]) => key === targetField);
            if (paramIndex !== -1) {
                requestData.params[paramIndex][1] = payload;
            }
        } else if (valueType === 'body') {
            if (typeof requestData.body === 'object') {
                requestData.body[targetField] = payload;
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

export async function loadXSSPayloads() {
    const state = state;
    const profile = state.profiles[state.currentProfile];
    
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
