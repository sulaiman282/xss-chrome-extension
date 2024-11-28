// XSS Module
import { getState, getProfile } from './state.js';
import { sendRequest } from './request.js';

export function initializeXSSConfig() {
    const targetValueSelect = document.getElementById('xssTargetValue');
    const payloadTypeSelect = document.getElementById('payloadType');
    const startTestBtn = document.getElementById('startTest');

    // Update target values when params or body changes
    function updateTargetValues() {
        const values = [];
        const state = getState();
        const profile = getProfile(state.currentProfile);

        // Get param values
        if (profile.params) {
            profile.params.forEach(([key, value]) => {
                values.push({
                    name: key,
                    value: value,
                    type: 'param'
                });
            });
        }

        // Get body values based on type
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
                case 'x-www-form-urlencoded':
                    Object.entries(profile.body.content).forEach(([key, value]) => {
                        values.push({
                            name: key,
                            value: value,
                            type: profile.body.type
                        });
                    });
                    break;
            }
        }

        // Update select options
        targetValueSelect.innerHTML = '<option value="">Select a target value</option>';
        values.forEach(({name, value, type}) => {
            const option = document.createElement('option');
            option.value = JSON.stringify({name, type});
            option.textContent = `${type}: ${name} = ${value}`;
            targetValueSelect.appendChild(option);
        });
    }

    // Extract values from nested JSON
    function extractJsonValues(obj, prefix, values) {
        Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                extractJsonValues(value, fullKey, values);
            } else {
                values.push({
                    name: fullKey,
                    value: value,
                    type: 'json'
                });
            }
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

        // Update total count
        const totalCount = document.getElementById('totalCount');
        const payloads = state.xssPayloads[state.currentProfile.xssConfig.payloadType];
        totalCount.textContent = payloads ? payloads.length : 0;
    } catch (error) {
        console.error('Error loading XSS payloads:', error);
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

    // Reset counters
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
                case 'x-www-form-urlencoded':
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
                resultDiv.className = `p-4 rounded ${isMatched ? 'bg-green-100' : 'bg-red-100'}`;
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
