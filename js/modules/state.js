// State Management Module
export const state = {
    currentProfile: 'default',
    profiles: {
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
    },
    xssPayloads: {
        basic: [],
        medium: [],
        advance: []
    }
};

export function initializeState() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['aixssState'], (result) => {
            if (result.aixssState) {
                Object.assign(state, result.aixssState);
                console.log('Loaded state from storage:', state);
            }
            resolve(state);
        });
    });
}

function saveStateToStorage() {
    chrome.storage.local.set({ 'aixssState': state }, () => {
        console.log('State saved to storage:', state);
    });
}

export const getState = () => state;

export const updateState = (newState) => {
    Object.assign(state, newState);
    saveStateToStorage();
};

export const getProfile = (profileName) => state.profiles[profileName];

export const updateProfile = (profileName, profileData) => {
    state.profiles[profileName] = profileData;
    saveStateToStorage();
};

export const getCurrentProfile = () => state.profiles[state.currentProfile];

export const setCurrentProfile = (profileName) => {
    state.currentProfile = profileName;
    saveStateToStorage();
};
