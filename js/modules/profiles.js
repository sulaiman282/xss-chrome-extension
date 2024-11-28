// Profile Management Module
import { state, updateState } from './state.js';
import { createKeyValueRow } from './ui.js';

export function initializeProfileManagement() {
    const profileSelect = document.getElementById('profileSelect');
    const addProfileBtn = document.getElementById('addProfile');

    addProfileBtn.addEventListener('click', () => {
        const profileName = prompt('Enter profile name:');
        if (profileName && !state.profiles[profileName]) {
            state.profiles[profileName] = {
                ...state.profiles.default,
                method: document.getElementById('httpMethod').value,
                url: document.getElementById('urlInput').value
            };
            
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            profileSelect.appendChild(option);
            profileSelect.value = profileName;
            state.currentProfile = profileName;
        }
    });

    profileSelect.addEventListener('change', (e) => {
        state.currentProfile = e.target.value;
        loadProfile(state.currentProfile);
    });
}

function loadProfile(profileName) {
    const profile = state.profiles[profileName];
    
    // Update UI elements
    document.getElementById('httpMethod').value = profile.method;
    document.getElementById('urlInput').value = profile.url;
    
    // Update headers
    const headersContainer = document.getElementById('headersContainer');
    headersContainer.innerHTML = '';
    profile.headers.forEach(header => {
        const row = createKeyValueRow('headers', header.key, header.value);
        headersContainer.appendChild(row);
    });
    
    // Update params
    const paramsContainer = document.getElementById('paramsContainer');
    paramsContainer.innerHTML = '';
    profile.params.forEach(param => {
        const row = createKeyValueRow('params', param.key, param.value);
        paramsContainer.appendChild(row);
    });
}

export function updateProfile(type) {
    if (!state.currentProfile) return;
    
    const profile = state.profiles[state.currentProfile];
    
    switch(type) {
        case 'auth':
            const authType = document.getElementById('authType').value;
            profile.auth = {
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
            profile.headers = Array.from(headersContainer.querySelectorAll('.key-value-row')).map(row => {
                const [keyInput, valueInput] = row.querySelectorAll('input');
                return {
                    key: keyInput.value,
                    value: valueInput.value
                };
            });
            break;
        case 'params':
            const paramsContainer = document.getElementById('paramsContainer');
            profile.params = Array.from(paramsContainer.querySelectorAll('.key-value-row')).map(row => {
                const [keyInput, valueInput] = row.querySelectorAll('input');
                return {
                    key: keyInput.value,
                    value: valueInput.value
                };
            });
            break;
    }
}
