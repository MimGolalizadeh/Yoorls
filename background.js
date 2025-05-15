chrome.runtime.onInstalled.addListener((details) => {
  const defaultCategories = [
    { id: 'default', name: 'Uncategorized', urls: [] }
  ];

  if (details.reason === 'install') {
    chrome.storage.local.set({ categories: defaultCategories }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error initializing storage:', chrome.runtime.lastError);
      } else {
        console.log('Extension installed. Storage initialized with default category.');
      }
    });
  } else if (details.reason === 'update') {
    // Perform any necessary data migrations or updates here
    console.log('Extension updated. Performing any necessary data migrations.');
    // For example, you might want to check if the categories exist and add the default one if not
    chrome.storage.local.get('categories', (result) => {
      if (!result.categories || result.categories.length === 0) {
        chrome.storage.local.set({ categories: defaultCategories }, () => {
          console.log('Added default category during update.');
        });
      }
    });
  }
});