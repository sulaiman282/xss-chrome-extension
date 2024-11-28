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

export const getState = () => state;
export const updateState = (newState) => {
    Object.assign(state, newState);
};

export const getProfile = (profileName) => state.profiles[profileName];
export const updateProfile = (profileName, profileData) => {
    state.profiles[profileName] = profileData;
};
