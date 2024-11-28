// Auth Module
import { getState, getProfile } from './state.js';

export function initializeAuth() {
    const authType = document.getElementById('authType');
    const authContents = document.querySelectorAll('.auth-content');
    
    authType.addEventListener('change', () => {
        // Hide all auth content sections
        authContents.forEach(content => content.classList.add('hidden'));
        
        // Show selected auth content
        const selectedType = authType.value;
        if (selectedType !== 'none') {
            document.getElementById(`${selectedType}Auth`).classList.remove('hidden');
        }
        
        // Update profile
        const state = getState();
        const profile = getProfile(state.currentProfile);
        
        switch (selectedType) {
            case 'none':
                profile.auth = { type: 'none' };
                break;
                
            case 'basic':
                profile.auth = {
                    type: 'basic',
                    username: document.getElementById('basicUsername').value,
                    password: document.getElementById('basicPassword').value
                };
                break;
                
            case 'bearer':
                profile.auth = {
                    type: 'bearer',
                    token: document.getElementById('bearerToken').value
                };
                break;
                
            case 'api':
                profile.auth = {
                    type: 'api',
                    name: document.getElementById('apiKeyName').value,
                    value: document.getElementById('apiKeyValue').value,
                    location: document.getElementById('apiKeyLocation').value
                };
                break;
        }
    });
    
    // Add input change listeners for auth fields
    const authInputs = document.querySelectorAll('#authTab input, #authTab select');
    authInputs.forEach(input => {
        input.addEventListener('change', () => {
            const state = getState();
            const profile = getProfile(state.currentProfile);
            const selectedType = authType.value;
            
            switch (selectedType) {
                case 'basic':
                    profile.auth = {
                        type: 'basic',
                        username: document.getElementById('basicUsername').value,
                        password: document.getElementById('basicPassword').value
                    };
                    break;
                    
                case 'bearer':
                    profile.auth = {
                        type: 'bearer',
                        token: document.getElementById('bearerToken').value
                    };
                    break;
                    
                case 'api':
                    profile.auth = {
                        type: 'api',
                        name: document.getElementById('apiKeyName').value,
                        value: document.getElementById('apiKeyValue').value,
                        location: document.getElementById('apiKeyLocation').value
                    };
                    break;
            }
        });
    });
}
