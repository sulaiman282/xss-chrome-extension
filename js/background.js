// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage with default settings
    chrome.storage.local.set({
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
                }
            }
        },
        currentProfile: 'default'
    });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'sendRequest') {
        sendRequest(request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;  // Will respond asynchronously
    }
});

// Send request with better support for PUT requests and multipart form data
async function sendRequest(requestData) {
    const { url, method, headers, body, xssConfig } = requestData;
    
    try {
        // Convert headers array to object
        const headerObj = {};
        headers.forEach(h => headerObj[h.key] = h.value);
        
        // Prepare request options
        const options = {
            method: method,
            headers: headerObj,
            credentials: 'include'  // Include cookies
        };

        // Handle body data
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            if (body.type === 'multipart') {
                const formData = new FormData();
                body.content.forEach(field => {
                    if (field.type === 'file' && field.file) {
                        formData.append(field.key, field.file);
                    } else {
                        formData.append(field.key, field.value);
                    }
                });
                
                // For PUT/DELETE methods, add _method field
                if (method !== 'POST') {
                    formData.append('_method', method);
                }
                
                // Remove Content-Type header as browser will set it with boundary
                delete options.headers['content-type'];
                options.body = formData;
            } else {
                options.body = body.content;
            }
        }

        // Send the request
        const response = await fetch(url, options);
        
        // Parse response
        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        // Return response data
        return {
            success: true,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData
        };
    } catch (error) {
        console.error('Request error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Analyze response for potential XSS vulnerabilities
function analyzeResponse(response) {
    const vulnerabilities = [];
    const responseText = response.body.toLowerCase();

    // Check if our payload is reflected without encoding
    if (responseText.includes('<script>') || responseText.includes('javascript:')) {
        vulnerabilities.push({
            type: 'Reflected XSS',
            severity: 'High',
            description: 'Unencoded script tags or javascript: protocol detected in response'
        });
    }

    // Check for missing security headers
    const headers = response.headers;
    if (!headers['content-security-policy']) {
        vulnerabilities.push({
            type: 'Missing Headers',
            severity: 'Medium',
            description: 'Content Security Policy (CSP) header is missing'
        });
    }

    if (!headers['x-xss-protection']) {
        vulnerabilities.push({
            type: 'Missing Headers',
            severity: 'Low',
            description: 'X-XSS-Protection header is missing'
        });
    }

    return vulnerabilities;
}
