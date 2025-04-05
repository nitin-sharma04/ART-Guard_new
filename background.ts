// art-guard/background.ts

// Listen for tab updates and inject content script
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    try {
      // Ensure we have the necessary permissions
      const permissions = await chrome.permissions.contains({
        permissions: ['scripting'],
        origins: [tab.url]
      });

      if (!permissions) {
        console.error('Missing required permissions');
        return;
      }

      // Check if content script is already injected
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        console.log('Content script already active in tab', tabId);
      } catch (error) {
        // Content script not injected, inject it now
        console.log('Injecting content script into tab', tabId);
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-script.js']
        });
      }
    } catch (err) {
      console.error('Content script injection failed:', err);
    }
  }
});

// Listen for messages from popup and relay to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    // Check if content script is injected
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) {
        sendResponse({ active: false, error: 'No active tab found' });
        return;
      }

      // Make sure we're on a valid page
      if (!tab.url || !tab.url.startsWith('http')) {
        sendResponse({ active: false, error: 'Not a valid webpage' });
        return;
      }

      // Wrap async operations in an IIFE
      (async () => {
        try {
          // Try to send a test message to content script
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          if (response && response.active) {
            console.log('Content script is active');
            sendResponse({ active: true });
          } else {
            throw new Error('Content script not responding properly');
          }
        } catch (err) {
          console.log('Content script not active, attempting to inject', err);
          try {
            // Ensure we have the necessary permissions
            const permissions = await chrome.permissions.contains({
              permissions: ['scripting'],
              origins: [tab.url]
            });

            if (!permissions) {
              sendResponse({ active: false, error: 'Missing required permissions' });
              return;
            }

            // If content script doesn't respond, inject it
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content-script.js']
            });
            
            // Verify injection was successful
            try {
              const verifyResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
              if (verifyResponse && verifyResponse.active) {
                console.log('Content script successfully injected');
                sendResponse({ active: true, injected: true });
              } else {
                sendResponse({ active: false, error: 'Content script injection failed verification' });
              }
            } catch (verifyErr) {
              sendResponse({ active: false, error: 'Content script injection failed verification' });
            }
          } catch (err) {
            console.error('Failed to inject content script:', err);
            sendResponse({ active: false, error: String(err) });
          }
        }
      })();
    });
    return true; // Keep message channel open for async response
  }
});