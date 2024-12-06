import { initializeTabs, initializeKeyValuePairs } from './modules/ui.js';
import { initializeRequestConfig } from './modules/request.js';
import { initializeXSSConfig, loadXSSPayloads } from './modules/xss.js';
import { initializeClipboardPaste } from './modules/clipboard.js';
import { initializeProfileManagement } from './modules/profiles.js';
import { initializeBodyHandling } from './modules/body.js';
import { initializeAuth } from './modules/auth.js';
import { initializeMethodHandling } from './modules/method.js';
import { initializeState } from './modules/state.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing popup...');
    
    try {
        // Initialize state first
        await initializeState();
        
        // Initialize UI
        initializeTabs();
        initializeKeyValuePairs();
        
        // Initialize Profile Management
        initializeProfileManagement();
        
        // Initialize Request Configuration
        initializeRequestConfig();
        
        // Initialize Body Handling
        initializeBodyHandling();
        
        // Initialize Method Handling
        initializeMethodHandling();
        
        // Initialize Auth
        initializeAuth();
        
        // Initialize XSS Configuration
        initializeXSSConfig();
        
        // Initialize Clipboard Integration
        initializeClipboardPaste();
        
        // Load XSS Payloads
        loadXSSPayloads();
        
        console.log('Popup initialization complete');
    } catch (error) {
        console.error('Error initializing popup:', error);
    }
});