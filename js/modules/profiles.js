// Profile Management Module
import { state, updateState, setCurrentProfile, updateProfile } from './state.js';
import { createKeyValueRow } from './ui.js';

// Event for profile changes
const PROFILE_CHANGED_EVENT = new Event('profileChanged');

// Helper function to toggle body tab visibility
function toggleBodyTab(method) {
    const bodyTab = document.querySelector('.tab-button[data-tab="body"]');
    const bodyTabContent = document.getElementById('bodyTab');
    
    // Show body tab only for methods that can have a body
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        bodyTab.classList.remove('hidden');
    } else {
        bodyTab.classList.add('hidden');
        bodyTabContent.classList.add('hidden');
    }
}

// Helper function to update delete button visibility
function updateDeleteButtonVisibility() {
    const deleteBtn = document.getElementById('deleteProfile');
    const profileCount = Object.keys(state.profiles).length;
    
    if (profileCount <= 1) {
        deleteBtn.classList.add('hidden');
    } else {
        deleteBtn.classList.remove('hidden');
    }
}

function getDefaultHeaders(method, contentType = null) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
    };

    // Add method-specific headers
    switch (method.toUpperCase()) {
        case 'POST':
        case 'PUT':
        case 'PATCH':
            headers['Content-Type'] = contentType || 'application/json';
            break;
        case 'DELETE':
            // Some APIs expect a content-type even for DELETE
            if (contentType) {
                headers['Content-Type'] = contentType;
            }
            break;
    }

    return headers;
}

function updateProfileHeaders(profile) {
    const method = profile.method;
    let contentType = null;

    // Determine content type based on body type
    if (profile.body) {
        switch (profile.body.type) {
            case 'form-data':
                contentType = 'multipart/form-data';
                break;
            case 'x-www-form-urlencoded':
                contentType = 'application/x-www-form-urlencoded';
                break;
            case 'raw':
                // Try to determine if it's JSON
                try {
                    JSON.parse(profile.body.content);
                    contentType = 'application/json';
                } catch {
                    contentType = 'text/plain';
                }
                break;
        }
    }

    // Get default headers with the appropriate content type
    const defaultHeaders = getDefaultHeaders(method, contentType);

    // Merge with existing headers, keeping custom headers but updating defaults
    const updatedHeaders = { ...defaultHeaders };
    
    // Preserve custom headers that aren't in defaults
    if (profile.headers) {
        Object.entries(profile.headers).forEach(([key, value]) => {
            if (!Object.keys(defaultHeaders).includes(key.toLowerCase())) {
                updatedHeaders[key] = value;
            }
        });
    }

    return updatedHeaders;
}

export function initializeProfileManagement() {
    const profileSelect = document.getElementById('profileSelect');
    const addProfileBtn = document.getElementById('addProfile');
    const renameProfileBtn = document.getElementById('renameProfile');
    const deleteProfileBtn = document.getElementById('deleteProfile');
    const clearBtn = document.getElementById('clearBtn');
    const methodSelect = document.getElementById('httpMethod');

    // Load initial profile data
    loadProfilesIntoSelect(profileSelect);
    loadProfile(state.currentProfile);
    updateDeleteButtonVisibility();

    // Method change handler
    methodSelect.addEventListener('change', (e) => {
        toggleBodyTab(e.target.value);
        saveTabData('method');
    });

    // Add new profile
    addProfileBtn.addEventListener('click', () => {
        console.log('Adding new profile');
        const profileName = prompt('Enter profile name:');
        if (profileName && !state.profiles[profileName]) {
            const newProfile = createNewProfile();
            updateProfile(profileName, newProfile);
            
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            profileSelect.appendChild(option);
            profileSelect.value = profileName;
            setCurrentProfile(profileName);
            loadProfile(profileName);
            updateDeleteButtonVisibility();
            console.log('New profile created:', profileName);
        }
    });

    // Rename profile
    renameProfileBtn.addEventListener('click', () => {
        const currentName = state.currentProfile;
        const newName = prompt('Enter new profile name:', currentName);
        
        if (newName && newName !== currentName && !state.profiles[newName]) {
            // Copy the profile with new name
            const profiles = { ...state.profiles };
            profiles[newName] = profiles[currentName];
            delete profiles[currentName];
            
            // Update state
            updateState({ ...state, profiles, currentProfile: newName });
            
            // Update select options
            loadProfilesIntoSelect(profileSelect);
            console.log('Profile renamed from', currentName, 'to', newName);
        }
    });

    // Delete profile
    deleteProfileBtn.addEventListener('click', () => {
        const currentName = state.currentProfile;
        const profileCount = Object.keys(state.profiles).length;
        
        if (profileCount <= 1) {
            alert('Cannot delete the last profile');
            return;
        }
        
        if (confirm(`Are you sure you want to delete profile "${currentName}"?`)) {
            // Get next profile name
            const profiles = { ...state.profiles };
            delete profiles[currentName];
            const nextProfile = Object.keys(profiles)[0];
            
            // Update state
            updateState({ ...state, profiles, currentProfile: nextProfile });
            
            // Update select options and load next profile
            loadProfilesIntoSelect(profileSelect);
            loadProfile(nextProfile);
            updateDeleteButtonVisibility();
            console.log('Profile deleted:', currentName);
        }
    });

    // Switch profile
    profileSelect.addEventListener('change', (e) => {
        console.log('Switching profile to:', e.target.value);
        setCurrentProfile(e.target.value);
        loadProfile(e.target.value);
    });

    // Clear current profile
    clearBtn.addEventListener('click', () => {
        console.log('Clearing current profile');
        const currentProfileName = state.currentProfile;
        const emptyProfile = createNewProfile(true); // true for empty values
        updateProfile(currentProfileName, emptyProfile);
        loadProfile(currentProfileName);
        
        // Hide body tab when resetting to GET
        toggleBodyTab('GET');
    });

    // Add event listeners for all tabs
    setupTabDataBinding();
}

function createNewProfile(empty = false) {
    return {
        method: empty ? 'GET' : (document.getElementById('httpMethod').value || 'GET'),
        url: empty ? '' : (document.getElementById('urlInput').value || ''),
        headers: getDefaultHeaders(empty ? 'GET' : (document.getElementById('httpMethod').value || 'GET')),
        params: [],
        body: {
            type: 'raw',
            content: '',
            fields: []
        },
        auth: {
            type: 'none',
            basic: { username: '', password: '' },
            bearer: { token: '' },
            apiKey: { name: '', value: '', location: '' }
        },
        xssConfig: {
            targetField: '',
            payloadType: 'basic.txt',
            customPayloads: []
        },
        results: {
            tests: [],
            findings: []
        }
    };
}

function loadProfilesIntoSelect(profileSelect) {
    profileSelect.innerHTML = '';
    Object.keys(state.profiles).forEach(profileName => {
        const option = document.createElement('option');
        option.value = profileName;
        option.textContent = profileName;
        if (profileName === state.currentProfile) {
            option.selected = true;
        }
        profileSelect.appendChild(option);
    });
}

function loadProfile(profileName) {
    console.log('Loading profile:', profileName);
    const profile = state.profiles[profileName];
    if (!profile) {
        console.error('Profile not found:', profileName);
        return;
    }
    
    // Update headers with defaults based on current method and body type
    profile.headers = updateProfileHeaders(profile);
    
    // Update state with modified profile
    updateProfile(profileName, profile);
    
    // Update method and URL
    const method = profile.method || 'GET';
    document.getElementById('httpMethod').value = method;
    document.getElementById('urlInput').value = profile.url || '';
    
    // Toggle body tab based on method
    toggleBodyTab(method);
    
    // Update params tab
    updateParamsTab(profile);
    
    // Update auth tab
    updateAuthTab(profile);
    
    // Update headers tab
    updateHeadersTab(profile);
    
    // Update XSS config tab
    updateXSSConfigTab(profile);
    
    // Update results tab
    updateResultsTab(profile);

    // Dispatch profile changed event
    document.dispatchEvent(PROFILE_CHANGED_EVENT);
}

function updateParamsTab(profile) {
    const container = document.getElementById('paramsContainer');
    container.innerHTML = '';
    if (profile.params && Array.isArray(profile.params)) {
        profile.params.forEach(param => {
            const row = createKeyValueRow('params', param.key || '', param.value || '');
            container.appendChild(row);
        });
    }
}

function updateAuthTab(profile) {
    if (!profile.auth) return;
    
    const authType = document.getElementById('authType');
    authType.value = profile.auth.type || 'none';
    
    // Update auth fields based on type
    if (profile.auth.basic) {
        document.getElementById('basicUsername').value = profile.auth.basic.username || '';
        document.getElementById('basicPassword').value = profile.auth.basic.password || '';
    }
    if (profile.auth.bearer) {
        document.getElementById('bearerToken').value = profile.auth.bearer.token || '';
    }
    if (profile.auth.apiKey) {
        document.getElementById('apiKeyName').value = profile.auth.apiKey.name || '';
        document.getElementById('apiKeyValue').value = profile.auth.apiKey.value || '';
        document.getElementById('apiKeyLocation').value = profile.auth.apiKey.location || '';
    }
    
    // Show/hide relevant auth sections
    updateAuthVisibility(profile.auth.type);
}

function updateHeadersTab(profile) {
    const container = document.getElementById('headersContainer');
    container.innerHTML = '';
    if (profile.headers && typeof profile.headers === 'object') {
        Object.entries(profile.headers).forEach(([key, value]) => {
            const row = createKeyValueRow('headers', key, value);
            container.appendChild(row);
        });
    }
}

function updateXSSConfigTab(profile) {
    if (!profile.xssConfig) return;
    
    const targetField = document.getElementById('targetField');
    const payloadType = document.getElementById('payloadType');
    
    if (targetField) targetField.value = profile.xssConfig.targetField || '';
    if (payloadType) payloadType.value = profile.xssConfig.payloadType || 'basic.txt';
}

function updateResultsTab(profile) {
    if (!profile.results) return;
    
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    if (profile.results.tests && Array.isArray(profile.results.tests)) {
        profile.results.tests.forEach(test => {
            const resultElement = document.createElement('div');
            resultElement.className = 'mb-2 p-2 bg-gray-50 rounded';
            resultElement.textContent = test.description || '';
            resultsContainer.appendChild(resultElement);
        });
    }
}

function setupTabDataBinding() {
    // Bind params tab changes
    document.getElementById('paramsContainer')?.addEventListener('change', () => {
        saveTabData('params');
    });

    // Bind auth tab changes
    document.getElementById('authTab')?.addEventListener('change', () => {
        saveTabData('auth');
    });

    // Bind headers tab changes
    document.getElementById('headersContainer')?.addEventListener('change', () => {
        saveTabData('headers');
    });

    // Bind XSS config changes
    document.getElementById('xssconfig')?.addEventListener('change', () => {
        saveTabData('xssconfig');
    });
}

export function saveTabData(tabType) {
    console.log('Saving tab data for:', tabType);
    const profile = { ...state.profiles[state.currentProfile] };
    
    switch(tabType) {
        case 'params':
            profile.params = Array.from(document.getElementById('paramsContainer').querySelectorAll('.key-value-row'))
                .map(row => ({
                    key: row.querySelector('.key-input')?.value || '',
                    value: row.querySelector('.value-input')?.value || ''
                }));
            break;
            
        case 'auth':
            profile.auth = {
                type: document.getElementById('authType')?.value || 'none',
                basic: {
                    username: document.getElementById('basicUsername')?.value || '',
                    password: document.getElementById('basicPassword')?.value || ''
                },
                bearer: {
                    token: document.getElementById('bearerToken')?.value || ''
                },
                apiKey: {
                    name: document.getElementById('apiKeyName')?.value || '',
                    value: document.getElementById('apiKeyValue')?.value || '',
                    location: document.getElementById('apiKeyLocation')?.value || ''
                }
            };
            break;
            
        case 'headers':
            profile.headers = Array.from(document.getElementById('headersContainer').querySelectorAll('.key-value-row'))
                .map(row => ({
                    [row.querySelector('.key-input')?.value || '']: row.querySelector('.value-input')?.value || ''
                })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
            break;
            
        case 'xssconfig':
            profile.xssConfig = {
                targetField: document.getElementById('targetField')?.value || '',
                payloadType: document.getElementById('payloadType')?.value || 'basic.txt',
                customPayloads: profile.xssConfig?.customPayloads || []
            };
            break;
            
        case 'method':
            profile.method = document.getElementById('httpMethod').value;
            profile.headers = updateProfileHeaders(profile);
            break;
    }
    
    console.log('Updating profile with new data:', profile);
    updateProfile(state.currentProfile, profile);
}

function updateAuthVisibility(authType) {
    const authContainers = ['basicAuth', 'bearerAuth', 'apiAuth'];
    authContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.toggle('hidden', !containerId.startsWith(authType));
        }
    });
}
