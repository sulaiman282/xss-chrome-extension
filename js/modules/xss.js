// XSS Module
import { getState, getProfile } from './state.js';
import { sendRequest } from './request.js';

function getAllValues(profile) {
    const values = [];
    
    // Get URL parameters
    if (profile.params) {
        profile.params.forEach(([key, value]) => {
            values.push({
                name: key,
                value: value,
                type: 'param'
            });
        });
    }
    
    // Get body values
    if (profile.body) {
        switch (profile.body.type) {
            case 'raw':
                try {
                    const jsonBody = JSON.parse(profile.body.content);
                    extractJsonValues(jsonBody, '', values);
                } catch (e) {
                    // If not JSON, add as single value
                    values.push({
                        name: 'body',
                        value: profile.body.content,
                        type: 'raw'
                    });
                }
                break;
                
            case 'form-data':
                Object.entries(profile.body.content).forEach(([key, value]) => {
                    if (value && typeof value === 'string') {
                        values.push({
                            name: key,
                            value: value,
                            type: 'form-data'
                        });
                    }
                });
                break;
                
            case 'x-www-form-urlencoded':
                Object.entries(profile.body.content).forEach(([key, value]) => {
                    values.push({
                        name: key,
                        value: value,
                        type: 'urlencoded'
                    });
                });
                break;
        }
    }
    
    return values;
}

function extractJsonValues(obj, prefix, values) {
    Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            extractJsonValues(value, fullKey, values);
        } else if (value && typeof value === 'string') {
            values.push({
                name: fullKey,
                value: value,
                type: 'json'
            });
        }
    });
}

export function initializeXSSConfig() {
    const targetValueSelect = document.getElementById('xssTargetValue');
    const payloadTypeSelect = document.getElementById('payloadType');
    const startTestBtn = document.getElementById('startTest');
    
    function updateTargetValues() {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        const values = getAllValues(profile);
        
        // Update select options
        targetValueSelect.innerHTML = '<option value="">Select a target value</option>';
        values.forEach(({name, value, type}) => {
            const option = document.createElement('option');
            option.value = JSON.stringify({name, type});
            option.textContent = `${type}: ${name} = ${value}`;
            targetValueSelect.appendChild(option);
        });
    }
    
    // Add event listeners
    document.addEventListener('paramsUpdated', updateTargetValues);
    document.addEventListener('bodyUpdated', updateTargetValues);
    
    // Initial update
    updateTargetValues();
    
    // Store selected values in profile
    targetValueSelect.addEventListener('change', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.xssConfig.targetValue = targetValueSelect.value;
    });
    
    payloadTypeSelect.addEventListener('change', () => {
        const state = getState();
        const profile = getProfile(state.currentProfile);
        profile.xssConfig.payloadType = payloadTypeSelect.value;
        
        // Update total count
        loadXSSPayloads();
    });
}

export async function loadXSSPayloads() {
    const state = getState();
    const profile = getProfile(state.currentProfile);
    
    try {
        // Use chrome.runtime.getURL to get the correct path
        const response = await fetch(chrome.runtime.getURL(`../payloads/${profile.xssConfig.payloadType}`));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const payloads = text.split('\n').filter(line => line.trim());
        
        // Store payloads
        state.xssPayloads[profile.xssConfig.payloadType] = payloads;
        
        // Update total count
        document.getElementById('totalCount').textContent = payloads.length;
        document.getElementById('matchedCount').textContent = '0';
        document.getElementById('notMatchedCount').textContent = '0';
        
    } catch (error) {
        console.error('Error loading XSS payloads:', error);
        throw error;
    }
}

export async function executeXSSTest() {
    const state = getState();
    const profile = getProfile(state.currentProfile);
    const startTestBtn = document.getElementById('startTest');
    const payloads = state.xssPayloads[profile.xssConfig.payloadType];
    
    if (!payloads || !profile.xssConfig.targetValue) {
        console.error('No payloads or target value selected');
        return;
    }
    
    // Update button state
    startTestBtn.textContent = 'In Progress...';
    startTestBtn.disabled = true;
    
    // Reset counters and results
    let matchedCount = 0;
    let notMatchedCount = 0;
    document.getElementById('matchedCount').textContent = '0';
    document.getElementById('notMatchedCount').textContent = '0';
    document.getElementById('results').innerHTML = '';
    
    try {
        const targetValue = JSON.parse(profile.xssConfig.targetValue);
        
        for (const payload of payloads) {
            const testProfile = JSON.parse(JSON.stringify(profile)); // Deep clone
            
            // Inject payload based on target type
            switch (targetValue.type) {
                case 'param':
                    const url = new URL(testProfile.url);
                    url.searchParams.set(targetValue.name, payload);
                    testProfile.url = url.toString();
                    break;
                    
                case 'json':
                    let jsonBody = JSON.parse(testProfile.body.content);
                    const fieldPath = targetValue.name.split('.');
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
                    if (typeof testProfile.body.content === 'string') {
                        testProfile.body.content = {};
                    }
                    testProfile.body.content[targetValue.name] = payload;
                    break;
                    
                case 'urlencoded':
                    if (typeof testProfile.body.content === 'string') {
                        testProfile.body.content = {};
                    }
                    testProfile.body.content[targetValue.name] = payload;
                    break;
                    
                case 'raw':
                    testProfile.body.content = payload;
                    break;
            }
            
            try {
                const response = await sendRequest(testProfile);
                const responseText = response.text || '';
                
                // Check if payload is present in response
                const isMatched = responseText.includes(payload);
                
                // Update counters
                if (isMatched) {
                    matchedCount++;
                    document.getElementById('matchedCount').textContent = matchedCount;
                } else {
                    notMatchedCount++;
                    document.getElementById('notMatchedCount').textContent = notMatchedCount;
                }
                
                // Add result to UI
                const resultDiv = document.createElement('div');
                resultDiv.className = `p-4 rounded mb-2 ${isMatched ? 'bg-green-100' : 'bg-red-100'}`;
                resultDiv.innerHTML = `
                    <div class="font-medium ${isMatched ? 'text-green-800' : 'text-red-800'}">${isMatched ? 'Matched' : 'Not Matched'}</div>
                    <div class="text-sm mt-1">Payload: ${payload}</div>
                    <div class="text-sm mt-1">Status: ${response.status}</div>
                `;
                document.getElementById('results').appendChild(resultDiv);
                
                // Add small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('Request failed:', error);
                notMatchedCount++;
                document.getElementById('notMatchedCount').textContent = notMatchedCount;
            }
        }
    } catch (error) {
        console.error('Test execution failed:', error);
    } finally {
        // Update button state
        startTestBtn.textContent = 'Completed';
        startTestBtn.disabled = true;
    }
}
