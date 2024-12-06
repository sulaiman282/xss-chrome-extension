// Profile Management Module
import { state, updateState, setCurrentProfile, updateProfile } from './state.js';
import { createKeyValueRow } from './ui.js';

export function initializeProfileManagement() {
    const profileSelect = document.getElementById('profileSelect');
    const addProfileBtn = document.getElementById('addProfile');

    // Load initial profile data
    loadProfilesIntoSelect(profileSelect);
    loadProfile(state.currentProfile);

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
            console.log('New profile created:', profileName);
        }
    });

    // Switch profile
    profileSelect.addEventListener('change', (e) => {
        console.log('Switching profile to:', e.target.value);
        setCurrentProfile(e.target.value);
        loadProfile(e.target.value);
    });

    // Add event listeners for all tabs
    setupTabDataBinding();
}

function createNewProfile() {
    return {
        method: document.getElementById('httpMethod').value || 'GET',
        url: document.getElementById('urlInput').value || '',
        headers: [],
        params: [],
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
    
    // Update method and URL
    document.getElementById('httpMethod').value = profile.method || 'GET';
    document.getElementById('urlInput').value = profile.url || '';
    
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
    if (profile.headers && Array.isArray(profile.headers)) {
        profile.headers.forEach(header => {
            const row = createKeyValueRow('headers', header.key || '', header.value || '');
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
                    key: row.querySelector('.key-input')?.value || '',
                    value: row.querySelector('.value-input')?.value || ''
                }));
            break;
            
        case 'xssconfig':
            profile.xssConfig = {
                targetField: document.getElementById('targetField')?.value || '',
                payloadType: document.getElementById('payloadType')?.value || 'basic.txt',
                customPayloads: profile.xssConfig?.customPayloads || []
            };
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
