import { initializeTabs, initializeKeyValuePairs } from './modules/ui.js';
import { initializeRequestConfig } from './modules/request.js';
import { initializeXSSConfig, loadXSSPayloads } from './modules/xss.js';
import { initializeClipboardPaste } from './modules/clipboard.js';
import { initializeProfileManagement } from './modules/profiles.js';
import { initializeBodyHandling } from './modules/body.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing popup...');
    
    // Initialize UI
    initializeTabs();
    initializeKeyValuePairs();
    
    // Initialize Profile Management
    initializeProfileManagement();
    
    // Initialize Request Configuration
    initializeRequestConfig();
    
    // Initialize Body Handling
    initializeBodyHandling();
    
    // Initialize XSS Configuration
    initializeXSSConfig();
    
    // Initialize Clipboard Integration
    initializeClipboardPaste();
    
    // Load XSS Payloads
    loadXSSPayloads();
    
    console.log('Popup initialization complete');
});