import { state, updateProfile } from './state.js';

// Function to create a new form field row
function createFormField(container, key = '', value = '', type = 'text') {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'grid grid-cols-12 gap-2 items-center';

    // Key input (3 columns)
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Key';
    keyInput.className = 'form-input rounded-md border-gray-300 w-full col-span-3';
    keyInput.value = key;
    
    // Add input event listener for key changes
    keyInput.addEventListener('input', () => {
        saveBodyData();
        document.dispatchEvent(new Event('fieldsUpdated'));
    });

    // Value input (6 columns)
    let valueWrapper = document.createElement('div');
    valueWrapper.className = 'col-span-6';
    let valueInput = document.createElement('input');
    valueInput.type = type === 'file' ? 'file' : 'text';
    valueInput.placeholder = 'Value';
    valueInput.className = 'form-input rounded-md border-gray-300 w-full';
    if (type !== 'file') valueInput.value = value;
    
    // Add input event listener for value changes
    valueInput.addEventListener('input', () => {
        saveBodyData();
        document.dispatchEvent(new Event('fieldsUpdated'));
    });
    valueWrapper.appendChild(valueInput);

    // Type select (2 columns)
    const typeSelect = document.createElement('select');
    typeSelect.className = 'form-select rounded-md border-gray-300 w-full col-span-2';
    typeSelect.value = type;

    const textOption = document.createElement('option');
    textOption.value = 'text';
    textOption.textContent = 'Text';

    const fileOption = document.createElement('option');
    fileOption.value = 'file';
    fileOption.textContent = 'File';

    typeSelect.appendChild(textOption);
    typeSelect.appendChild(fileOption);

    // Remove button (1 column)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'text-red-600 hover:text-red-800 col-span-1 flex items-center justify-center';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => {
        fieldDiv.remove();
        saveBodyData();
        document.dispatchEvent(new Event('fieldsUpdated'));
    };

    // Add event listener for type change
    typeSelect.addEventListener('change', (e) => {
        const oldValue = valueInput.value;
        const isFileType = e.target.value === 'file';
        const newValueInput = document.createElement('input');

        if (isFileType) {
            newValueInput.type = 'file';
            newValueInput.className = 'form-input rounded-md border-gray-300 w-full';
        } else {
            newValueInput.type = 'text';
            newValueInput.placeholder = 'Value';
            newValueInput.className = 'form-input rounded-md border-gray-300 w-full';
            newValueInput.value = oldValue;
        }

        // Add input event listener for new value input
        newValueInput.addEventListener('input', () => {
            saveBodyData();
            document.dispatchEvent(new Event('fieldsUpdated'));
        });

        valueInput.replaceWith(newValueInput);
        valueInput = newValueInput;
        saveBodyData();
        document.dispatchEvent(new Event('fieldsUpdated'));
    });

    fieldDiv.appendChild(keyInput);
    fieldDiv.appendChild(valueWrapper);
    fieldDiv.appendChild(typeSelect);
    fieldDiv.appendChild(removeBtn);

    container.appendChild(fieldDiv);
    // Trigger update when new field is added
    document.dispatchEvent(new Event('fieldsUpdated'));
}

// Function to get all available target fields
export function getTargetFields() {
    const fields = [];
    const bodyType = document.getElementById('bodyType').value;

    // Get params fields
    const paramsContainer = document.getElementById('paramsContainer');
    if (paramsContainer) {
        paramsContainer.querySelectorAll('div').forEach(field => {
            const keyInput = field.querySelector('input[type="text"]');
            if (keyInput && keyInput.value) {
                fields.push({
                    name: keyInput.value,
                    type: 'param',
                    label: `Param: ${keyInput.value}`
                });
            }
        });
    }

    // Get body fields based on type
    switch(bodyType) {
        case 'raw':
            try {
                const rawContent = document.getElementById('bodyContent').value;
                // Try to parse as JSON
                const jsonContent = JSON.parse(rawContent);
                const jsonFields = extractJsonFields(jsonContent);
                fields.push(...jsonFields);
            } catch (e) {
                // If not valid JSON, add as single field
                fields.push({
                    name: 'body',
                    type: 'raw',
                    label: 'Body (Raw)'
                });
            }
            break;

        case 'form-data':
            document.querySelectorAll('#formDataContainer > div').forEach(field => {
                const keyInput = field.querySelector('input[type="text"]');
                if (keyInput && keyInput.value) {
                    fields.push({
                        name: keyInput.value,
                        type: 'form-data',
                        label: `Form Data: ${keyInput.value}`
                    });
                }
            });
            break;

        case 'x-www-form-urlencoded':
            document.querySelectorAll('#urlencodedContainer > div').forEach(field => {
                const keyInput = field.querySelector('input[type="text"]');
                if (keyInput && keyInput.value) {
                    fields.push({
                        name: keyInput.value,
                        type: 'urlencoded',
                        label: `Form URL: ${keyInput.value}`
                    });
                }
            });
            break;
    }

    return fields;
}

// Helper function to extract fields from JSON object
function extractJsonFields(obj, prefix = '') {
    const fields = [];
    
    for (const [key, value] of Object.entries(obj)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursively extract nested object fields
            fields.push(...extractJsonFields(value, fieldName));
        } else {
            fields.push({
                name: fieldName,
                type: 'json',
                label: `JSON: ${fieldName}`
            });
        }
    }
    
    return fields;
}

// Initialize body type handling
export function initializeBodyHandling() {
    const bodyType = document.getElementById('bodyType');
    const rawBody = document.getElementById('rawBody');
    const formDataBody = document.getElementById('formDataBody');
    const urlencodedBody = document.getElementById('urlencodedBody');
    const formDataContainer = document.getElementById('formDataContainer');
    const urlencodedContainer = document.getElementById('urlencodedContainer');
    const addFormField = document.getElementById('addFormField');
    const addUrlEncodedField = document.getElementById('addUrlEncodedField');
    const bodyContent = document.getElementById('bodyContent');

    // Load initial body data from profile
    loadBodyData();

    // Listen for profile changes
    document.addEventListener('profileChanged', () => {
        loadBodyData();
    });

    // Show/hide appropriate body content based on type
    bodyType.addEventListener('change', (e) => {
        const bodyContents = document.querySelectorAll('.body-content');
        bodyContents.forEach(content => content.classList.add('hidden'));

        switch (e.target.value) {
            case 'raw':
                rawBody.classList.remove('hidden');
                break;
            case 'form-data':
                formDataBody.classList.remove('hidden');
                break;
            case 'x-www-form-urlencoded':
                urlencodedBody.classList.remove('hidden');
                break;
        }
        saveBodyData();
        document.dispatchEvent(new Event('fieldsUpdated'));
    });

    // Add form field buttons
    addFormField.addEventListener('click', () => {
        createFormField(formDataContainer);
        saveBodyData();
    });
    
    addUrlEncodedField.addEventListener('click', () => {
        createFormField(urlencodedContainer);
        saveBodyData();
    });

    // Save raw body content on change
    bodyContent.addEventListener('input', () => {
        saveBodyData();
    });
}

function loadBodyData() {
    const profile = state.profiles[state.currentProfile];
    if (!profile.body) {
        profile.body = {
            type: 'raw',
            content: '',
            fields: []
        };
        updateProfile(state.currentProfile, profile);
    }

    const bodyType = document.getElementById('bodyType');
    const bodyContent = document.getElementById('bodyContent');
    const formDataContainer = document.getElementById('formDataContainer');
    const urlencodedContainer = document.getElementById('urlencodedContainer');

    // Set body type
    bodyType.value = profile.body.type || 'raw';
    
    // Show correct container
    const bodyContents = document.querySelectorAll('.body-content');
    bodyContents.forEach(content => content.classList.add('hidden'));
    
    switch (profile.body.type) {
        case 'raw':
            document.getElementById('rawBody').classList.remove('hidden');
            bodyContent.value = profile.body.content || '';
            break;
            
        case 'form-data':
            document.getElementById('formDataBody').classList.remove('hidden');
            formDataContainer.innerHTML = '';
            if (profile.body.fields) {
                profile.body.fields.forEach(field => {
                    createFormField(formDataContainer, field.key, field.value, field.type);
                });
            }
            break;
            
        case 'x-www-form-urlencoded':
            document.getElementById('urlencodedBody').classList.remove('hidden');
            urlencodedContainer.innerHTML = '';
            if (profile.body.fields) {
                profile.body.fields.forEach(field => {
                    createFormField(urlencodedContainer, field.key, field.value, field.type);
                });
            }
            break;
    }
}

function saveBodyData() {
    const profile = { ...state.profiles[state.currentProfile] };
    const bodyType = document.getElementById('bodyType').value;
    const bodyContent = document.getElementById('bodyContent');

    profile.body = {
        type: bodyType,
        content: '',
        fields: []
    };

    switch (bodyType) {
        case 'raw':
            profile.body.content = bodyContent.value;
            break;
            
        case 'form-data':
            profile.body.fields = Array.from(document.querySelectorAll('#formDataContainer > div')).map(field => {
                const [key, valueWrapper, type] = field.children;
                const value = valueWrapper.children[0];
                return {
                    key: key.value,
                    value: type.value === 'file' ? '' : value.value,
                    type: type.value
                };
            });
            break;
            
        case 'x-www-form-urlencoded':
            profile.body.fields = Array.from(document.querySelectorAll('#urlencodedContainer > div')).map(field => {
                const [key, valueWrapper, type] = field.children;
                const value = valueWrapper.children[0];
                return {
                    key: key.value,
                    value: type.value === 'file' ? '' : value.value,
                    type: type.value
                };
            });
            break;
    }

    updateProfile(state.currentProfile, profile);
}

// Function to get body data based on type
export function getBodyData() {
    const bodyType = document.getElementById('bodyType').value;

    switch (bodyType) {
        case 'raw':
            return document.getElementById('bodyContent').value;

        case 'form-data':
            const formData = new FormData();
            document.querySelectorAll('#formDataContainer > div').forEach(field => {
                const [key, valueWrapper, type] = field.children;
                const value = valueWrapper.children[0];
                if (type.value === 'file' && value.files.length > 0) {
                    formData.append(key.value, value.files[0]);
                } else {
                    formData.append(key.value, value.value);
                }
            });
            return formData;

        case 'x-www-form-urlencoded':
            const params = new URLSearchParams();
            document.querySelectorAll('#urlencodedContainer > div').forEach(field => {
                const [key, valueWrapper] = field.children;
                const value = valueWrapper.children[0];
                params.append(key.value, value.value);
            });
            return params.toString();
    }

    return null;
}
