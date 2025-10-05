// Initialize the default state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isEnabled: false }); // Default to enabled
});

// Handle icon click
chrome.action.onClicked.addListener(async () => {
  // Get the current state

  const { isEnabled } = await chrome.storage.local.get("isEnabled");

  // Toggle the state
  const newState = !isEnabled;
  await chrome.storage.local.set({ isEnabled: newState });

  // Broadcast the new state to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: "updateState", isEnabled: newState });
    });
  });

  // Update the extension icon
//  const newIcon = newState ? "icon-on.png" : "icon-off.png";
//  chrome.action.setIcon({ path: newIcon });
});
