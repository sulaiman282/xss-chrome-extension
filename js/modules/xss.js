// XSS Module
import { getState, getProfile } from './state.js';
import { sendRequest } from './request.js';
import { updateResults } from './ui.js';
import { getTargetFields } from './body.js';

export function initializeXSSConfig() {
    const targetFieldSelect = document.getElementById('xssTargetField');
    const payloadTypeSelect = document.getElementById('payloadType');
    const customPayloadContainer = document.getElementById('customPayloadContainer');

    // Function to update target field options
    function updateTargetFields() {
        const fields = getTargetFields();
        
        // Save current selection
        const currentValue = targetFieldSelect.value;
        
        // Clear existing options
        targetFieldSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a target field';
        targetFieldSelect.appendChild(defaultOption);
        
        // Add URL as a target
        const urlOption = document.createElement('option');
        urlOption.value = 'url';
        urlOption.textContent = 'URL';
        targetFieldSelect.appendChild(urlOption);
        
        // Add collected fields
        fields.forEach(field => {
            const option = document.createElement('option');
            option.value = JSON.stringify({ name: field.name, type: field.type });
            option.textContent = field.label;
            targetFieldSelect.appendChild(option);
        });
        
        // Restore selection if still valid
        if (currentValue && [...targetFieldSelect.options].some(opt => opt.value === currentValue)) {
            targetFieldSelect.value = currentValue;
        }
    }

    // Add event listeners for params and body changes
    const paramsContainer = document.getElementById('paramsContainer');
    const formDataContainer = document.getElementById('formDataContainer');
    const urlencodedContainer = document.getElementById('urlencodedContainer');
    const bodyContent = document.getElementById('bodyContent');
    const bodyType = document.getElementById('bodyType');

    // Update on container changes
    const observer = new MutationObserver(updateTargetFields);
    observer.observe(paramsContainer, { childList: true, subtree: true });
    observer.observe(formDataContainer, { childList: true, subtree: true });
    observer.observe(urlencodedContainer, { childList: true, subtree: true });

    // Update on body content changes
    bodyContent.addEventListener('input', updateTargetFields);
    bodyType.addEventListener('change', updateTargetFields);

    // Update on field value changes
    document.addEventListener('input', (e) => {
        if (e.target.matches('#paramsContainer input, #formDataContainer input, #urlencodedContainer input')) {
            updateTargetFields();
        }
    });

    targetFieldSelect.addEventListener('change', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.xssConfig.targetField = targetFieldSelect.value;
    });

    payloadTypeSelect.addEventListener('change', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.xssConfig.payloadType = payloadTypeSelect.value;
        
        // Show/hide custom payload container
        if (payloadTypeSelect.value === 'custom') {
            customPayloadContainer.classList.remove('hidden');
        } else {
            customPayloadContainer.classList.add('hidden');
        }
    });

    // Initial update
    updateTargetFields();
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
        
        if (profile.xssConfig.targetField === 'url') {
            // Inject payload into URL parameters
            const urlParams = new URLSearchParams(testProfile.url.split('?')[1] || '');
            urlParams.forEach((value, key) => {
                urlParams.set(key, payload);
            });
            const baseUrl = testProfile.url.split('?')[0];
            testProfile.url = `${baseUrl}?${urlParams.toString()}`;
        } else {
            try {
                const targetField = JSON.parse(profile.xssConfig.targetField);
                
                switch(targetField.type) {
                    case 'param':
                        // Inject payload into specific URL parameter
                        const url = new URL(testProfile.url);
                        url.searchParams.set(targetField.name, payload);
                        testProfile.url = url.toString();
                        break;

                    case 'json':
                        // Inject payload into JSON body
                        let jsonBody = JSON.parse(testProfile.body.content);
                        const fieldPath = targetField.name.split('.');
                        let current = jsonBody;
                        
                        // Navigate to the nested field
                        for (let i = 0; i < fieldPath.length - 1; i++) {
                            current = current[fieldPath[i]];
                        }
                        
                        // Set the value
                        current[fieldPath[fieldPath.length - 1]] = payload;
                        testProfile.body.content = JSON.stringify(jsonBody);
                        break;

                    case 'form-data':
                        // Inject payload into form data
                        if (typeof testProfile.body.content === 'string') {
                            testProfile.body.content = {};
                        }
                        testProfile.body.content[targetField.name] = payload;
                        break;

                    case 'urlencoded':
                        // Inject payload into urlencoded data
                        const urlencodedParams = new URLSearchParams(testProfile.body.content);
                        urlencodedParams.set(targetField.name, payload);
                        testProfile.body.content = urlencodedParams.toString();
                        break;

                    case 'raw':
                        // Replace entire raw body with payload
                        testProfile.body.content = payload;
                        break;
                }
            } catch (error) {
                console.error('Error injecting payload:', error);
                continue;
            }
        }
        
        try {
            const response = await sendRequest(testProfile);
            updateResults(response);
        } catch (error) {
            console.error('Error executing XSS test:', error);
            updateResults({
                status: 'error',
                error: error.message
            });
        }
    }
}
