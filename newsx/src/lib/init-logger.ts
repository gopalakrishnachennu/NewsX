/**
 * Client-side logger initialization
 * This file runs on first import and sets up ultra-detailed logging
 */

'use client';

import { ultraLogger } from './ultra-logger';

// Initialize logger on client
if (typeof window !== 'undefined') {
    console.log('🚀 Ultra-detailed logging system initialized');
    console.log('📝 Access logs via: window.__logger or window.debugLogs');
    console.log('💾 Logs are saved to: Logs/YYYY-MM-DD.jsonl');

    // Log initialization
    ultraLogger.info('system',
        'Ultra-detailed logging system started. ' +
        'All user interactions (clicks, inputs, scrolls, navigation, errors) will be logged with full context. ' +
        'Logs are stored locally in Logs/ folder as JSON Lines files. ' +
        'Each log entry includes: timestamp, message, context data, user ID (if logged in), session ID, URL, user agent. ' +
        'Purpose: Instant debugging for developers and LLMs. ' +
        'Access logs via window.__logger or window.debugLogs.view()',
        {
            logLocation: 'Logs/YYYY-MM-DD.jsonl',
            features: [
                'Global event tracking',
                'Self-explanatory messages',
                'Local file storage',
                'Auto-flush every 5s',
                'Daily log rotation'
            ]
        }
    );
}

export { ultraLogger };
