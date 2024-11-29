// Curl Parser Module
export function parseCurlCommand(curlCommand) {
    if (!curlCommand || !curlCommand.trim().toLowerCase().startsWith('curl')) {
        console.log('Not a curl command:', curlCommand);
        return null;
    }

    try {
        const result = {
            url: '',
            method: 'GET',
            headers: {},
            body: null,
            formData: null,
            params: {}
        };

        // Split the command into parts, respecting quotes and handling escapes
        const parts = curlCommand.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
        console.log('Parsed parts:', parts);

        let i = 1; // Skip 'curl'
        while (i < parts.length) {
            const part = parts[i].replace(/^["']|["']$/g, ''); // Remove quotes
            
            if (part === '\\') {
                i++;
                continue;
            }

            switch (part) {
                case '-X':
                case '--request':
                    if (i + 1 < parts.length) {
                        const method = parts[++i].replace(/['"]/g, '').toUpperCase();
                        if (isValidMethod(method)) {
                            result.method = method;
                        }
                    }
                    break;

                case '-H':
                case '--header':
                    if (i + 1 < parts.length) {
                        const header = parts[++i].replace(/['"]/g, '');
                        const [key, ...values] = header.split(':');
                        if (key && values.length) {
                            const headerKey = key.trim();
                            const headerValue = values.join(':').trim();
                            result.headers[headerKey] = headerValue;
                        }
                    }
                    break;

                case '-d':
                case '--data':
                case '--data-raw':
                case '--data-binary':
                    if (i + 1 < parts.length) {
                        let data = parts[++i].replace(/^['"]\$?|["']$/g, '');
                        
                        // Handle multipart form data
                        if (data.includes('WebKitFormBoundary')) {
                            const { parsedBody, formData } = parseMultipartFormData(data);
                            result.body = parsedBody;
                            result.formData = formData;
                            
                            // Check for _method override
                            if (formData._method) {
                                result.method = formData._method.toUpperCase();
                            }
                            
                            // Set content type if not already set
                            if (!result.headers['Content-Type'] && !result.headers['content-type']) {
                                const boundary = data.match(/----WebKitFormBoundary[^\r\n]*/)?.[0];
                                if (boundary) {
                                    result.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
                                }
                            }
                        } else {
                            // Try parsing as JSON
                            try {
                                result.body = JSON.parse(data);
                                if (!result.headers['Content-Type'] && !result.headers['content-type']) {
                                    result.headers['Content-Type'] = 'application/json';
                                }
                            } catch {
                                // If not JSON, try URL encoded
                                try {
                                    const urlParams = new URLSearchParams(data);
                                    const formData = {};
                                    urlParams.forEach((value, key) => {
                                        formData[key] = parseValue(value);
                                    });
                                    result.body = data;
                                    result.formData = formData;
                                    if (!result.headers['Content-Type'] && !result.headers['content-type']) {
                                        result.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                                    }
                                } catch {
                                    // If all else fails, treat as raw data
                                    result.body = data;
                                }
                            }
                        }
                        
                        // Set method to POST if not explicitly set
                        if (result.method === 'GET') {
                            result.method = 'POST';
                        }
                    }
                    break;

                default:
                    if (!part.startsWith('-') && !result.url) {
                        const url = part.replace(/['"]/g, '');
                        if (isValidUrl(url)) {
                            result.url = url;
                            // Parse URL parameters
                            try {
                                const urlObj = new URL(url);
                                urlObj.searchParams.forEach((value, key) => {
                                    result.params[key] = parseValue(value);
                                });
                            } catch (e) {
                                console.warn('Invalid URL:', url);
                            }
                        }
                    }
                    break;
            }
            i++;
        }

        console.log('Parsed result:', result);
        return result;
    } catch (error) {
        console.error('Error parsing curl command:', error);
        return null;
    }
}

function parseMultipartFormData(body) {
    const formData = {};
    const boundary = body.match(/----WebKitFormBoundary[^\r\n]*/)?.[0];
    
    if (!boundary) {
        console.warn('No boundary found in multipart form data');
        return { parsedBody: body, formData: {} };
    }
    
    // Split the body into parts using the boundary
    const parts = body.split(new RegExp(`--${boundary}\\r\\n`));
    
    parts.forEach(part => {
        // Skip empty parts and the final boundary
        if (!part.trim() || part.includes(`--${boundary}--`)) return;
        
        const match = part.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?\r\n(?:Content-Type:[^\r\n]*\r\n)?\r\n([\s\S]*?)(?:\r\n--)/i);
        if (match) {
            const [, name, filename, value] = match;
            if (name) {
                formData[name] = parseValue(value.trim());
            }
        }
    });
    
    return {
        parsedBody: body,
        formData
    };
}

function parseValue(value) {
    if (!value || value.trim() === '') return '';
    if (value.trim().toLowerCase() === 'null') return null;
    if (value.trim() === '[]') return [];
    if (!isNaN(value) && value.trim() !== '') return Number(value);
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function isValidMethod(method) {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    return validMethods.includes(method?.toUpperCase());
}
