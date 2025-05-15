// popup.js - Simplified after moving manual add to landing page

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const saveUrlBtn = document.getElementById("save-url");
    const openLandingBtn = document.getElementById("open-landing");
    const exportBtn = document.getElementById("export-urls");
    const importBtn = document.getElementById("import-button");
    const importFile = document.getElementById("import-urls");
    const statusMessage = document.getElementById("status-message");

    // --- Event Handlers ---

    // Save Current URL
    saveUrlBtn.addEventListener("click", async () => {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url || !(tab.url.startsWith("http:") || tab.url.startsWith("https:"))) {
                showStatus("Cannot save this page. Invalid URL.", 3000);
                return;
            }
            // Directly add URL to storage
            addCurrentUrlToStorage(tab.url, tab.title);

        } catch (error) {
            console.error("Error saving current URL:", error);
            showStatus(`Error: ${error.message}`, 5000);
        }
    });

    // Open Landing Page
    openLandingBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("landing.html") });
    });

    // Export Data
    exportBtn.addEventListener("click", () => {
        chrome.storage.local.get({ categories: [] }, (result) => {
            let dataToExport = { categories: result.categories };
            if (!dataToExport.categories || dataToExport.categories.length === 0 || dataToExport.categories.every(c => c.urls.length === 0)) {
                showStatus("No data to export.", 3000);
                return;
            }
            let blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
            let url = URL.createObjectURL(blob);
            let a = document.createElement("a");
            a.href = url;
            a.download = "yoorls_data.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatus("Data exported successfully!");
        });
    });

    // Trigger Import File Selection
    importBtn.addEventListener("click", () => {
        importFile.click();
    });

    // Handle Import File Selection
    importFile.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && Array.isArray(importedData.categories)) {
                    if (confirm("This will overwrite your current saved URLs and categories. Are you sure?")) {
                        chrome.storage.local.set({ categories: importedData.categories }, () => {
                            if (chrome.runtime.lastError) {
                                showStatus(`Error importing: ${chrome.runtime.lastError.message}`, 5000);
                            } else {
                                showStatus("Data imported successfully!");
                                // No dropdown to update here anymore
                            }
                        });
                    }
                } else {
                    showStatus("Invalid import file format. Expected JSON with a 'categories' array.", 5000);
                }
            } catch (error) {
                console.error("Error parsing import file:", error);
                showStatus(`Error importing data: ${error.message}`, 5000);
            }
            importFile.value = "";
        };
        reader.onerror = () => {
            showStatus("Error reading file.", 5000);
            importFile.value = "";
        };
        reader.readAsText(file);
    });

    // --- Helper Functions ---

    // Simplified function to add the current tab's URL to the default category
    function addCurrentUrlToStorage(url, title) {
        chrome.storage.local.get({ categories: [] }, (result) => {
            let categories = result.categories || [];
            let defaultCategory = categories.find(cat => cat.id === "default");

            // Ensure default category exists
            if (!defaultCategory) {
                defaultCategory = { id: "default", name: "Uncategorized", urls: [] };
                categories.unshift(defaultCategory);
            }

            // Check if URL already exists globally
            const urlExists = categories.some(cat => cat.urls.some(u => u.url === url));
            if (urlExists) {
                showStatus("URL already exists in your saved list.", 3000);
                return;
            }

            // Add the URL to the default category
            defaultCategory.urls.push({
                url: url,
                icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
                name: generateShortName(url, title), // Use short name
                dateAdded: Date.now()
            });

            // Save updated categories
            chrome.storage.local.set({ categories: categories }, () => {
                if (chrome.runtime.lastError) {
                    showStatus(`Error saving: ${chrome.runtime.lastError.message}`, 5000);
                } else {
                    showStatus(`URL saved to "${defaultCategory.name}"!`);
                }
            });
        });
    }
    
    // Generate a shorter name (use title if short, otherwise hostname)
    function generateShortName(url, title) {
        try {
            // Prefer title if it's reasonably short
            if (title && title.length < 35) { 
                return title;
            }
            // Otherwise, use hostname without www.
            const hostname = new URL(url).hostname;
            return hostname.replace(/^www\./, ''); 
        } catch (e) {
            console.warn("Could not generate short name for invalid URL:", url);
            return title || url; // Fallback
        }
    }

    // Show Status Message
    function showStatus(message, duration = 2000) {
        statusMessage.textContent = message;
        statusMessage.style.display = "block";
        if (statusMessage.timeoutId) {
            clearTimeout(statusMessage.timeoutId);
        }
        statusMessage.timeoutId = setTimeout(() => {
            statusMessage.style.display = "none";
            statusMessage.timeoutId = null;
        }, duration);
    }

});

