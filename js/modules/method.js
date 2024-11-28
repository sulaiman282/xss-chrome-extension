// Method handling module
import { getState, getProfile } from './state.js';

export function initializeMethodHandling() {
    const methodSelect = document.getElementById('httpMethod');
    const bodyTab = document.querySelector('[data-tab="body"]');
    const headersTab = document.querySelector('[data-tab="headers"]');

    if (methodSelect && bodyTab && headersTab) {
        methodSelect.addEventListener('change', () => {
            const method = methodSelect.value;
            updateTabVisibility(method);
        });

        // Initial visibility
        updateTabVisibility(methodSelect.value);
    }
}

function updateTabVisibility(method) {
    const bodyTab = document.querySelector('[data-tab="body"]');
    const headersTab = document.querySelector('[data-tab="headers"]');
    const bodyTabContent = document.getElementById('bodyTab');

    // Show/hide body tab based on method
    // Show body for POST, PUT, PATCH
    if (method === 'GET' || method === 'DELETE') {
        bodyTab.classList.add('hidden');
        if (bodyTabContent) {
            bodyTabContent.classList.add('hidden');
        }
    } else {
        bodyTab.classList.remove('hidden');
        // Only show body content if it's the active tab
        if (bodyTabContent && bodyTab.classList.contains('active')) {
            bodyTabContent.classList.remove('hidden');
        }
    }

    // Always show headers tab
    headersTab.classList.remove('hidden');
}

// Function to be called when method changes programmatically
export function updateMethod(method) {
    const methodSelect = document.getElementById('httpMethod');
    if (methodSelect) {
        methodSelect.value = method;
        updateTabVisibility(method);
    }
}
