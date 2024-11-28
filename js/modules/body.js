// Function to create a new form field row
function createFormField(container) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'grid grid-cols-12 gap-2 items-center';

    // Key input (3 columns)
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Key';
    keyInput.className = 'form-input rounded-md border-gray-300 w-full col-span-3';

    // Value input (6 columns)
    let valueWrapper = document.createElement('div');
    valueWrapper.className = 'col-span-6';
    let valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Value';
    valueInput.className = 'form-input rounded-md border-gray-300 w-full';
    valueWrapper.appendChild(valueInput);

    // Type select (2 columns)
    const typeSelect = document.createElement('select');
    typeSelect.className = 'form-select rounded-md border-gray-300 w-full col-span-2';

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
    removeBtn.onclick = () => fieldDiv.remove();

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

        valueInput.replaceWith(newValueInput);
        valueInput = newValueInput;
    });

    fieldDiv.appendChild(keyInput);
    fieldDiv.appendChild(valueWrapper);
    fieldDiv.appendChild(typeSelect);
    fieldDiv.appendChild(removeBtn);

    container.appendChild(fieldDiv);
}

// Function to get all available target fields
export function getTargetFields() {
    const fields = [];
    const bodyType = document.getElementById('bodyType').value;

    // Get params fields
    document.querySelectorAll('#paramsContainer > div').forEach(field => {
        const [key] = field.children;
        if (key.value) {
            fields.push({
                name: key.value,
                type: 'param',
                label: `Param: ${key.value}`
            });
        }
    });

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
                const [key, valueWrapper, type] = field.children;
                if (key.value) {
                    fields.push({
                        name: key.value,
                        type: 'form-data',
                        label: `Form Data: ${key.value}`
                    });
                }
            });
            break;

        case 'x-www-form-urlencoded':
            document.querySelectorAll('#urlencodedContainer > div').forEach(field => {
                const [key] = field.children;
                if (key.value) {
                    fields.push({
                        name: key.value,
                        type: 'urlencoded',
                        label: `Form URL: ${key.value}`
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
    });

    // Add form field buttons
    addFormField.addEventListener('click', () => createFormField(formDataContainer));
    addUrlEncodedField.addEventListener('click', () => createFormField(urlencodedContainer));

    // Add initial fields
    createFormField(formDataContainer);
    createFormField(urlencodedContainer);
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
