// State Management Module
export const state = loadStateFromStorage() || {
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

function loadStateFromStorage() {
    const savedState = sessionStorage.getItem('aixssState');
    return savedState ? JSON.parse(savedState) : null;
}

function saveStateToStorage() {
    sessionStorage.setItem('aixssState', JSON.stringify(state));
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
