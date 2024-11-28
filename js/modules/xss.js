// XSS Module
import { getState, getProfile } from './state.js';
import { sendRequest } from './request.js';
import { updateResults } from './ui.js';

export function initializeXSSConfig() {
    const targetFieldSelect = document.getElementById('xssTargetField');
    const payloadTypeSelect = document.getElementById('payloadType');

    targetFieldSelect.addEventListener('change', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.xssConfig.targetField = targetFieldSelect.value;
    });

    payloadTypeSelect.addEventListener('change', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.xssConfig.payloadType = payloadTypeSelect.value;
    });
}

export async function loadXSSPayloads() {
    const state = getState();
    try {
        const basicResponse = await fetch('payloads/basic.txt');
        const mediumResponse = await fetch('payloads/medium.txt');
        const advanceResponse = await fetch('payloads/advance.txt');

        state.xssPayloads.basic = (await basicResponse.text()).split('\n').filter(Boolean);
        state.xssPayloads.medium = (await mediumResponse.text()).split('\n').filter(Boolean);
        state.xssPayloads.advance = (await advanceResponse.text()).split('\n').filter(Boolean);
    } catch (error) {
        console.error('Error loading XSS payloads:', error);
    }
}

export async function executeXSSTest() {
    const state = getState();
    const profile = getProfile(state.currentProfile);
    const payloads = state.xssPayloads[profile.xssConfig.payloadType.split('.')[0]];
    
    for (const payload of payloads) {
        const testProfile = JSON.parse(JSON.stringify(profile)); // Deep clone
        
        switch (profile.xssConfig.targetField) {
            case 'url':
                // Inject payload into URL parameters
                const urlParams = new URLSearchParams(testProfile.url.split('?')[1] || '');
                urlParams.forEach((value, key) => {
                    urlParams.set(key, payload);
                });
                testProfile.url = `${testProfile.url.split('?')[0]}?${urlParams.toString()}`;
                break;
                
            case 'body':
                // Inject payload into body
                if (typeof testProfile.body.content === 'string') {
                    testProfile.body.content = payload;
                } else if (typeof testProfile.body.content === 'object') {
                    Object.keys(testProfile.body.content).forEach(key => {
                        testProfile.body.content[key] = payload;
                    });
                }
                break;
                
            case 'headers':
                // Inject payload into headers
                testProfile.headers.forEach(header => {
                    header[1] = payload;
                });
                break;
        }
        
        const response = await sendRequest(testProfile);
        updateResults(response);
        
        // Add delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
