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
        startTestBtn.addEventListener('click', () => {
            const validationErrors = validateBeforeStart();
            
            if (validationErrors.length > 0) {
                showValidationPopup(validationErrors);
                return;
            }
            
            // Proceed with XSS test if validation passes
            startXSSTest();
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

function validateBeforeStart() {
    const profile = state.profiles[state.currentProfile];
    const validationItems = [
        {
            name: 'URL',
            status: profile.url && profile.url.trim() && isValidUrl(profile.url),
            message: 'A valid target URL is required'
        },
        {
            name: 'HTTP Method',
            status: !!profile.method,
            message: 'HTTP Method must be selected'
        },
        {
            name: 'Request Body',
            status: !['POST', 'PUT', 'PATCH'].includes(profile.method) || 
                   (profile.body && profile.body.type && (
                       (profile.body.type === 'raw' && profile.body.content && profile.body.content.trim()) ||
                       (['form-data', 'x-www-form-urlencoded'].includes(profile.body.type) && profile.body.fields && profile.body.fields.length > 0)
                   )),
            message: 'Request body is required for POST/PUT/PATCH methods'
        },
        {
            name: 'XSS Configuration',
            status: profile.xssConfig && profile.xssConfig.valueType && profile.xssConfig.targetField && profile.xssConfig.payloadType,
            message: 'Complete XSS configuration is required (Value Type, Target Field, and XSS Level)'
        }
    ];

    return validationItems.filter(item => !item.status);
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function showValidationPopup(validationItems) {
    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    popup.id = 'validationPopup';

    // Create popup content
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4';

    // Add header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center';
    header.innerHTML = `
        <h3 class="text-lg font-medium text-gray-900">Required Items Missing</h3>
        <button class="text-gray-400 hover:text-gray-500" id="closeValidationPopup">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    // Add checklist
    const checklist = document.createElement('div');
    checklist.className = 'space-y-3';
    validationItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex items-start space-x-3';
        itemDiv.innerHTML = `
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>
            <div>
                <p class="font-medium text-gray-900">${item.name}</p>
                <p class="text-sm text-gray-500">${item.message}</p>
            </div>
        `;
        checklist.appendChild(itemDiv);
    });

    // Add message
    const message = document.createElement('p');
    message.className = 'text-sm text-gray-500 mt-4';
    message.textContent = 'Please provide all required information before starting the XSS test.';

    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex space-x-3 mt-5';

    const configureButton = document.createElement('button');
    configureButton.className = 'flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
    configureButton.textContent = 'Configure Now';
    configureButton.onclick = () => {
        document.querySelector('[data-tab="xssconfig"]').click();
        popup.remove();
    };

    const cancelButton = document.createElement('button');
    cancelButton.className = 'flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500';
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => popup.remove();

    buttonContainer.appendChild(configureButton);
    buttonContainer.appendChild(cancelButton);

    // Assemble popup
    content.appendChild(header);
    content.appendChild(checklist);
    content.appendChild(message);
    content.appendChild(buttonContainer);
    popup.appendChild(content);

    // Add close functionality
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });

    // Add to document
    document.body.appendChild(popup);

    // Setup close button
    document.getElementById('closeValidationPopup').onclick = () => popup.remove();
}

async function startXSSTest() {
    const startTestBtn = document.getElementById('startTest');
    const progressContainer = document.getElementById('progressContainer');

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
