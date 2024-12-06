// Headers management module
export const DEFAULT_CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function getDefaultHeaders(method, bodyType = null) {
    // Common headers for all requests
    const headers = {
        'User-Agent': DEFAULT_CHROME_USER_AGENT,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };

    // Add method-specific headers
    switch (method.toUpperCase()) {
        case 'GET':
            headers['Accept'] = 'application/json, text/plain, */*';
            break;

        case 'POST':
        case 'PUT':
        case 'PATCH':
            headers['Accept'] = 'application/json, text/plain, */*';
            
            // Set Content-Type based on body type
            switch (bodyType) {
                case 'form-data':
                    // Don't set Content-Type for form-data as it's set automatically with boundary
                    break;
                case 'x-www-form-urlencoded':
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    break;
                case 'raw':
                default:
                    headers['Content-Type'] = 'application/json';
                    break;
            }
            break;

        case 'DELETE':
            headers['Accept'] = 'application/json, text/plain, */*';
            // Some APIs might require Content-Type for DELETE with body
            if (bodyType) {
                headers['Content-Type'] = 'application/json';
            }
            break;

        case 'OPTIONS':
            headers['Access-Control-Request-Method'] = '*';
            headers['Access-Control-Request-Headers'] = '*';
            break;
    }

    return headers;
}

export function updateHeadersDisplay(container, headers) {
    if (!container) return;
    
    // Clear existing headers
    container.innerHTML = '';
    
    // Add each header as a row
    Object.entries(headers).forEach(([key, value]) => {
        const row = createHeaderRow(key, value);
        container.appendChild(row);
    });
    
    // Add an empty row for new headers
    container.appendChild(createHeaderRow('', ''));
}

function createHeaderRow(key, value) {
    const row = document.createElement('div');
    row.className = 'flex space-x-2 mb-2 items-center header-row';
    
    // Key input
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'w-1/3 px-2 py-1 border rounded header-key';
    keyInput.value = key;
    keyInput.placeholder = 'Header name';
    
    // Value input
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'flex-1 px-2 py-1 border rounded header-value';
    valueInput.value = value;
    valueInput.placeholder = 'Header value';
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'p-1 text-red-600 hover:text-red-800';
    deleteBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
    `;
    deleteBtn.onclick = () => row.remove();
    
    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(deleteBtn);
    
    return row;
}

export function getHeadersFromDisplay(container) {
    const headers = {};
    
    if (!container) return headers;
    
    container.querySelectorAll('.header-row').forEach(row => {
        const key = row.querySelector('.header-key').value.trim();
        const value = row.querySelector('.header-value').value.trim();
        
        if (key && value) {
            headers[key] = value;
        }
    });
    
    return headers;
}

export function mergeWithDefaultHeaders(existingHeaders, method, bodyType) {
    const defaultHeaders = getDefaultHeaders(method, bodyType);
    
    // Start with default headers
    const mergedHeaders = { ...defaultHeaders };
    
    // Add or override with existing custom headers
    Object.entries(existingHeaders).forEach(([key, value]) => {
        // Preserve custom headers that aren't defaults
        if (!Object.keys(defaultHeaders).map(k => k.toLowerCase()).includes(key.toLowerCase())) {
            mergedHeaders[key] = value;
        }
    });
    
    return mergedHeaders;
}
