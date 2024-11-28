// State Management
let currentProfile = 'default';
let profiles = {
    default: {
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        auth: {
            type: 'none',
            credentials: {}
        },
        body: {
            type: 'raw',
            content: ''
        },
        xssConfig: {
            targetField: '',
            payloadType: 'basic.txt'
        }
    }
};

let xssPayloads = {
    basic: [],
    medium: [],
    advance: []
};

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    initializeTabs();
    initializeProfileManagement();
    initializeRequestConfig();
    initializeClipboardPaste();
    initializeTestExecution();
    initializeXSSConfig();
    loadXSSPayloads();
});

// Tab Management
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update tab buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update content visibility
            contents.forEach(content => {
                if (content.id === `${target}Tab`) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });
}

// Profile Management
function initializeProfileManagement() {
    const profileSelect = document.getElementById('profileSelect');
    const addProfileBtn = document.getElementById('addProfile');

    addProfileBtn.addEventListener('click', () => {
        const profileName = prompt('Enter profile name:');
        if (profileName && !profiles[profileName]) {
            profiles[profileName] = {
                ...profiles.default,
                method: document.getElementById('httpMethod').value,
                url: document.getElementById('urlInput').value
            };
            
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            profileSelect.appendChild(option);
            profileSelect.value = profileName;
            currentProfile = profileName;
        }
    });

    profileSelect.addEventListener('change', (e) => {
        currentProfile = e.target.value;
        loadProfile(currentProfile);
    });
}

// Request Configuration
function initializeRequestConfig() {
    const methodSelect = document.getElementById('httpMethod');
    const urlInput = document.getElementById('urlInput');

    // Method change handler
    methodSelect.addEventListener('change', (e) => {
        profiles[currentProfile].method = e.target.value;
        updateTargetFields();
    });

    // URL change handler
    urlInput.addEventListener('change', (e) => {
        profiles[currentProfile].url = e.target.value;
    });

    // Initialize key-value pair handlers
    initializeKeyValuePairs();
}

// Key-Value Pair Management
function initializeKeyValuePairs() {
    // Headers
    document.querySelector('#headersTab button').addEventListener('click', () => {
        addKeyValuePair('headers');
    });

    // Params
    document.querySelector('#paramsTab button').addEventListener('click', () => {
        addKeyValuePair('params');
    });
}

function addKeyValuePair(type) {
    const container = document.getElementById(`${type}Container`);
    const row = document.createElement('div');
    row.className = 'key-value-row mb-2';
    
    row.innerHTML = `
        <input type="text" class="form-input flex-1" placeholder="Key" />
        <input type="text" class="form-input flex-1" placeholder="Value" />
        <button class="delete-btn">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;

    container.appendChild(row);

    // Add delete handler
    row.querySelector('.delete-btn').addEventListener('click', () => {
        row.remove();
        updateProfile(type);
        updateTargetFields();
    });

    // Add change handlers
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            updateProfile(type);
        });
    });
}

// Clipboard Integration
function initializeClipboardPaste() {
    const pasteBtn = document.getElementById('pasteClipboard');
    
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = parseCurlCommand(text);
            
            if (parsed) {
                updateUIFromParsed(parsed);
            }
        } catch (error) {
            console.error('Failed to read clipboard:', error);
        }
    });
}

// Test Execution
function initializeTestExecution() {
    const startTestBtn = document.getElementById('startTest');
    
    startTestBtn.addEventListener('click', async () => {
        const profile = profiles[currentProfile];
        
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
            console.error('Test execution failed:', error);
            // Show error in results
            const currentResponses = document.getElementById('currentResponses');
            currentResponses.innerHTML = `
                <div class="response-item bg-red-50 border-red-200">
                    <p class="text-red-600">Error: ${error.message}</p>
                </div>
            `;
        }
    });
}

// Helper Functions
function loadProfile(profileName) {
    const profile = profiles[profileName];
    
    // Update UI elements
    document.getElementById('httpMethod').value = profile.method;
    document.getElementById('urlInput').value = profile.url;
    
    // Update headers
    const headersContainer = document.getElementById('headersContainer');
    headersContainer.innerHTML = '';
    profile.headers.forEach(header => {
        addKeyValueRow('headers', header.key, header.value);
    });
    
    // Update params
    const paramsContainer = document.getElementById('paramsContainer');
    paramsContainer.innerHTML = '';
    profile.params.forEach(param => {
        addKeyValueRow('params', param.key, param.value);
    });
}

function updateProfile(type) {
    if (!currentProfile) return;
    
    switch(type) {
        case 'auth':
            const authType = document.getElementById('authType').value;
            profiles[currentProfile].auth = {
                type: authType,
                basic: {
                    username: document.getElementById('basicUsername').value,
                    password: document.getElementById('basicPassword').value
                },
                bearer: {
                    token: document.getElementById('bearerToken').value
                },
                apiKey: {
                    name: document.getElementById('apiKeyName').value,
                    value: document.getElementById('apiKeyValue').value,
                    location: document.getElementById('apiKeyLocation').value
                },
                oauth2: {
                    token: document.getElementById('oauth2Token').value
                }
            };
            break;
        case 'headers':
            const headersContainer = document.getElementById('headersContainer');
            profiles[currentProfile].headers = Array.from(headersContainer.querySelectorAll('.key-value-row')).map(row => {
                const [keyInput, valueInput] = row.querySelectorAll('input');
                return {
                    key: keyInput.value,
                    value: valueInput.value
                };
            });
            break;
        case 'params':
            const paramsContainer = document.getElementById('paramsContainer');
            profiles[currentProfile].params = Array.from(paramsContainer.querySelectorAll('.key-value-row')).map(row => {
                const [keyInput, valueInput] = row.querySelectorAll('input');
                return {
                    key: keyInput.value,
                    value: valueInput.value
                };
            });
            break;
        // ... existing cases ...
    }
    
    saveProfiles();
}

async function sendRequest(profile) {
    // Implement the actual request sending logic here
    // This is a placeholder that simulates a response
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                status: 200,
                headers: {
                    'content-type': 'application/json'
                },
                body: {
                    message: 'Test response'
                }
            });
        }, 1000);
    });
}

function updateResults(response) {
    const currentResponses = document.getElementById('currentResponses');
    
    // Update response display
    currentResponses.innerHTML = `
        <div class="response-item">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium">Status: ${response.status}</span>
                <span class="text-sm text-gray-500">${new Date().toLocaleTimeString()}</span>
            </div>
            <pre class="bg-gray-50 p-2 rounded">${JSON.stringify(response.body, null, 2)}</pre>
        </div>
    `;
    
    // Update counters
    document.getElementById('checkedCount').textContent = '1';
    if (response.status === 200) {
        document.getElementById('matchedCount').textContent = '1';
        document.getElementById('notMatchedCount').textContent = '0';
    } else {
        document.getElementById('matchedCount').textContent = '0';
        document.getElementById('notMatchedCount').textContent = '1';
    }
}

// CURL Command Parser
function parseCurlCommand(curlCommand) {
    const parsed = {
        method: 'GET',
        url: '',
        headers: [],
        body: {
            type: 'raw',
            content: ''
        },
        auth: {
            type: 'none',
            basic: { username: '', password: '' },
            bearer: { token: '' },
            apiKey: { name: '', value: '', location: 'header' },
            oauth2: { token: '' }
        }
    };

    // Extract URL
    const urlMatch = curlCommand.match(/curl ['"]([^'"]+)['"]/);
    if (urlMatch) {
        parsed.url = urlMatch[1];
    }

    // Extract headers and look for auth
    const headerMatches = curlCommand.matchAll(/-H ['"]([^'"]+)['"]/g);
    for (const match of headerMatches) {
        const [key, value] = match[1].split(/:\s*/);
        if (key && value) {
            // Check for authorization headers
            if (key.toLowerCase() === 'authorization') {
                if (value.toLowerCase().startsWith('basic ')) {
                    parsed.auth.type = 'basic';
                    const credentials = atob(value.substring(6)).split(':');
                    parsed.auth.basic.username = credentials[0] || '';
                    parsed.auth.basic.password = credentials[1] || '';
                } else if (value.toLowerCase().startsWith('bearer ')) {
                    parsed.auth.type = 'bearer';
                    parsed.auth.bearer.token = value.substring(7);
                } else if (value.toLowerCase().startsWith('token ')) {
                    parsed.auth.type = 'oauth2';
                    parsed.auth.oauth2.token = value.substring(6);
                }
            } else {
                // Check for common API key headers
                const apiKeyHeaders = ['x-api-key', 'api-key', 'apikey'];
                if (apiKeyHeaders.includes(key.toLowerCase())) {
                    parsed.auth.type = 'apiKey';
                    parsed.auth.apiKey.name = key;
                    parsed.auth.apiKey.value = value;
                    parsed.auth.apiKey.location = 'header';
                } else {
                    parsed.headers.push({ key, value });
                }
            }
        }
    }

    // Check URL for API key in query params
    const urlObj = new URL(parsed.url);
    const apiKeyParams = ['api_key', 'apikey', 'key', 'token'];
    for (const [key, value] of urlObj.searchParams.entries()) {
        if (apiKeyParams.includes(key.toLowerCase())) {
            parsed.auth.type = 'apiKey';
            parsed.auth.apiKey.name = key;
            parsed.auth.apiKey.value = value;
            parsed.auth.apiKey.location = 'query';
            break;
        }
    }

    // ... existing body parsing code ...

    return parsed;
}

function updateUIFromParsed(parsed) {
    // Update method
    document.getElementById('httpMethod').value = parsed.method;
    
    // Update URL
    document.getElementById('urlInput').value = parsed.url;
    
    // Update headers
    const headersContainer = document.getElementById('headersContainer');
    headersContainer.innerHTML = '';
    parsed.headers.forEach(header => {
        addKeyValueRow('headers', header.key, header.value);
    });
    
    // Update body
    const bodyTypeSelect = document.getElementById('bodyType');
    const bodyContent = document.getElementById('bodyContent');
    
    bodyTypeSelect.value = parsed.body.type;
    bodyContent.innerHTML = '';
    
    if (parsed.body.type === 'multipart') {
        parsed.body.content.forEach(field => {
            const row = createKeyValueRow('body', field.key, field.value, field.type === 'file');
            bodyContent.appendChild(row);
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.className = 'form-input w-full h-48';
        textarea.value = parsed.body.content;
        bodyContent.appendChild(textarea);
    }

    // Update auth fields
    document.getElementById('authType').value = parsed.auth.type;
    document.getElementById('authType').dispatchEvent(new Event('change'));

    switch(parsed.auth.type) {
        case 'basic':
            document.getElementById('basicUsername').value = parsed.auth.basic.username;
            document.getElementById('basicPassword').value = parsed.auth.basic.password;
            break;
        case 'bearer':
            document.getElementById('bearerToken').value = parsed.auth.bearer.token;
            break;
        case 'apiKey':
            document.getElementById('apiKeyName').value = parsed.auth.apiKey.name;
            document.getElementById('apiKeyValue').value = parsed.auth.apiKey.value;
            document.getElementById('apiKeyLocation').value = parsed.auth.apiKey.location;
            break;
        case 'oauth2':
            document.getElementById('oauth2Token').value = parsed.auth.oauth2.token;
            break;
    }

    // Update XSS target field options
    updateTargetFields();
    
    // Update current profile
    profiles[currentProfile] = {
        ...profiles[currentProfile],
        ...parsed
    };
}

function createKeyValueRow(type, key = '', value = '', isFile = false) {
    const row = document.createElement('div');
    row.className = 'key-value-row mb-2';
    
    if (isFile) {
        row.innerHTML = `
            <input type="text" class="form-input flex-1" placeholder="Key" value="${key || ''}" />
            <input type="file" class="form-input flex-1" />
            <button class="delete-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
    } else {
        row.innerHTML = `
            <input type="text" class="form-input flex-1" placeholder="Key" value="${key || ''}" />
            <input type="text" class="form-input flex-1" placeholder="Value" value="${value || ''}" />
            <button class="delete-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
    }

    // Add delete handler
    row.querySelector('.delete-btn').addEventListener('click', () => {
        row.remove();
        updateProfile(type);
        updateTargetFields();
    });

    // Add change handlers
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            updateProfile(type);
            updateTargetFields();
        });
    });

    return row;
}

function addKeyValueRow(type, key = '', value = '') {
    const container = document.getElementById(`${type}Container`);
    const row = createKeyValueRow(type, key, value);
    container.appendChild(row);
    
    // Update XSS target fields if needed
    if (type === 'params' || type === 'body') {
        updateTargetFields();
    }
}

// Load XSS Payloads
async function loadXSSPayloads() {
    try {
        const response = await fetch(chrome.runtime.getURL('payloads/basic.txt'));
        const text = await response.text();
        xssPayloads.basic = text.split('\n').filter(line => line.trim());
        
        const mediumResponse = await fetch(chrome.runtime.getURL('payloads/medium.txt'));
        xssPayloads.medium = (await mediumResponse.text()).split('\n').filter(line => line.trim());
        
        const advanceResponse = await fetch(chrome.runtime.getURL('payloads/advance.txt'));
        xssPayloads.advance = (await advanceResponse.text()).split('\n').filter(line => line.trim());
    } catch (error) {
        console.error('Failed to load XSS payloads:', error);
    }
}

// Initialize XSS Config
function initializeXSSConfig() {
    const targetField = document.getElementById('xssTargetField');
    const payloadType = document.getElementById('xssPayloadType');
    
    // Update target fields when method or body type changes
    document.getElementById('httpMethod').addEventListener('change', updateTargetFields);
    document.getElementById('bodyType').addEventListener('change', updateTargetFields);
    
    // Save XSS config changes
    targetField.addEventListener('change', () => {
        profiles[currentProfile].xssConfig.targetField = targetField.value;
    });
    
    payloadType.addEventListener('change', () => {
        profiles[currentProfile].xssConfig.payloadType = payloadType.value;
    });
    
    // Handle authorization type changes
    document.getElementById('authType').addEventListener('change', function(e) {
        const authType = e.target.value;
        // Hide all auth field groups
        document.querySelectorAll('.auth-field-group').forEach(el => el.classList.add('hidden'));
        
        // Show relevant auth fields
        switch(authType) {
            case 'basic':
                document.getElementById('basicAuthFields').classList.remove('hidden');
                break;
            case 'bearer':
                document.getElementById('bearerTokenField').classList.remove('hidden');
                break;
            case 'apiKey':
                document.getElementById('apiKeyFields').classList.remove('hidden');
                break;
            case 'oauth2':
                document.getElementById('oauth2Fields').classList.remove('hidden');
                break;
        }
        
        updateProfile('auth');
    });

    // Update auth fields when changed
    document.querySelectorAll('#authFields input, #authFields select').forEach(input => {
        input.addEventListener('change', () => updateProfile('auth'));
    });
}

// Update target fields based on method and body type
function updateTargetFields() {
    const method = document.getElementById('httpMethod').value;
    const bodyType = document.getElementById('bodyType').value;
    const targetField = document.getElementById('xssTargetField');
    const paramsContainer = document.getElementById('paramsContainer');
    const bodyContent = document.getElementById('bodyContent');
    const bodyTab = document.querySelector('[data-tab="body"]');
    const paramsTab = document.querySelector('[data-tab="params"]');
    
    // Reset options
    targetField.innerHTML = '<option value="">Select a field to test</option>';
    
    // Show/hide tabs based on method
    if (method === 'GET') {
        bodyTab.style.display = 'none';
        paramsTab.style.display = '';
        
        // Add URL parameters as options
        const params = Array.from(paramsContainer.querySelectorAll('.key-value-row')).map(row => {
            const keyInput = row.querySelector('input:first-child');
            return keyInput.value;
        });
        
        params.forEach(param => {
            if (param) {
                const option = document.createElement('option');
                option.value = param;
                option.textContent = `URL Parameter: ${param}`;
                targetField.appendChild(option);
            }
        });
    } else {
        bodyTab.style.display = '';
        paramsTab.style.display = 'none';
        
        if (bodyType === 'multipart') {
            // Add form fields as options
            const fields = Array.from(bodyContent.querySelectorAll('.key-value-row')).map(row => {
                const keyInput = row.querySelector('input:first-child');
                return keyInput.value;
            });
            
            fields.forEach(field => {
                if (field) {
                    const option = document.createElement('option');
                    option.value = field;
                    option.textContent = `Form Field: ${field}`;
                    targetField.appendChild(option);
                }
            });
        }
    }
}
