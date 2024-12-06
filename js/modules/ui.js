// UI Module
import { saveTabData } from './profiles.js';

export function initializeTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Skip if tab is hidden
            if (tab.classList.contains('hidden')) {
                return;
            }

            const target = tab.dataset.tab;

            // Update tab buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update content visibility
            contents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });

            const activeContent = document.getElementById(`${target}Tab`);
            if (activeContent) {
                activeContent.classList.remove('hidden');
                activeContent.classList.add('active');
            }
        });
    });
}

export function initializeKeyValuePairs() {
    // Headers
    const addHeaderBtn = document.querySelector('#headersTab [data-action="add"]');
    if (addHeaderBtn) {
        addHeaderBtn.addEventListener('click', () => {
            console.log('Adding header pair');
            addKeyValuePair('headers');
        });
    }

    // Params
    const addParamBtn = document.querySelector('#paramsTab [data-action="add"]');
    if (addParamBtn) {
        addParamBtn.addEventListener('click', () => {
            console.log('Adding param pair');
            addKeyValuePair('params');
        });
    }

    // Initialize existing rows
    document.querySelectorAll('.key-value-row input').forEach(input => {
        input.addEventListener('change', () => {
            const row = input.closest('.key-value-row');
            const container = row.closest('[id$="Container"]');
            const type = container.id.replace('Container', '');
            saveTabData(type);
        });
    });
}

function addKeyValuePair(type) {
    const container = document.getElementById(`${type}Container`);
    if (!container) {
        console.error(`Container not found: ${type}Container`);
        return;
    }
    
    const row = createKeyValueRow(type);
    container.appendChild(row);
    
    // Add event listeners for inputs
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            saveTabData(type);
        });
    });
}

export function createKeyValueRow(type, key = '', value = '', isFile = false) {
    const row = document.createElement('div');
    row.className = 'key-value-row flex space-x-2 items-center mb-2';
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'key-input form-input rounded-md border-gray-300 flex-1';
    keyInput.placeholder = 'Key';
    keyInput.value = key;

    const valueInput = document.createElement('input');
    valueInput.type = isFile ? 'file' : 'text';
    valueInput.className = 'value-input form-input rounded-md border-gray-300 flex-1';
    valueInput.placeholder = 'Value';
    if (!isFile) valueInput.value = value;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'p-1 text-red-600 hover:text-red-800';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => {
        row.remove();
        saveTabData(type);
    };

    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(deleteBtn);

    return row;
}

export function updateResults(response) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }
    
    resultsContainer.innerHTML = '';

    if (response.error) {
        resultsContainer.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                ${response.error}
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = `
        <div class="space-y-4">
            <div class="bg-gray-100 p-4 rounded">
                <h3 class="font-medium">Response Status: ${response.status}</h3>
                <pre class="mt-2 whitespace-pre-wrap">${JSON.stringify(response.data, null, 2)}</pre>
            </div>
        </div>
    `;
}
