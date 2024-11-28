// Parser Module
export function parseCurlCommand(curlCommand) {
    const result = {
        method: 'GET',
        url: '',
        headers: [],
        body: null
    };

    const tokens = curlCommand.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
    let i = 1; // Skip 'curl'

    while (i < tokens.length) {
        const token = tokens[i].replace(/^["']|["']$/g, '');

        switch (token) {
            case '-X':
            case '--request':
                result.method = tokens[++i].replace(/^["']|["']$/g, '');
                break;

            case '-H':
            case '--header':
                const header = tokens[++i].replace(/^["']|["']$/g, '');
                const [key, ...valueParts] = header.split(':');
                const value = valueParts.join(':').trim();
                result.headers.push([key, value]);
                break;

            case '-d':
            case '--data':
            case '--data-raw':
                result.body = tokens[++i].replace(/^["']|["']$/g, '');
                if (!result.method || result.method === 'GET') {
                    result.method = 'POST';
                }
                break;

            default:
                if (!token.startsWith('-') && !result.url) {
                    result.url = token;
                }
                break;
        }
        i++;
    }

    return result;
}

export function parseUrlParams(url) {
    try {
        const urlObj = new URL(url);
        return Array.from(urlObj.searchParams.entries());
    } catch (error) {
        return [];
    }
}
