// popup.js - Minimal Modern Design

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const saveUrlBtn = document.getElementById("save-url");
    const openLandingBtn = document.getElementById("open-landing");
    const exportBtn = document.getElementById("export-urls");
    const importBtn = document.getElementById("import-button");
    const importFile = document.getElementById("import-urls");
    const updateBtn = document.getElementById("update-button");
    const updateFile = document.getElementById("update-urls");
    const statusMessage = document.getElementById("status-message");
    const statusText = document.getElementById("status-text");
    const menuToggle = document.getElementById("menu-toggle");
    const dropdownMenu = document.getElementById("dropdown-menu");

    // --- Event Handlers ---

    // Dropdown Menu Toggle
    menuToggle.addEventListener("click", () => {
        dropdownMenu.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".dropdown")) {
            dropdownMenu.classList.remove("show");
        }
    });

    // Save Current URL
    saveUrlBtn.addEventListener("click", async () => {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url || !(tab.url.startsWith("http:") || tab.url.startsWith("https:"))) {
                showStatus("Cannot save this page. Invalid URL.", "warning", 3000);
                return;
            }
            // Directly add URL to storage
            addCurrentUrlToStorage(tab.url, tab.title);

        } catch (error) {
            console.error("Error saving current URL:", error);
            showStatus(`Error: ${error.message}`, "danger", 5000);
        }
    });

    // Open Landing Page
    openLandingBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("landing.html") });
    });

    // Export Data
    exportBtn.addEventListener("click", () => {
        // Close dropdown
        dropdownMenu.classList.remove("show");
        
        chrome.storage.local.get({ categories: [] }, (result) => {
            let dataToExport = { categories: result.categories };
            if (!dataToExport.categories || dataToExport.categories.length === 0 || dataToExport.categories.every(c => c.urls.length === 0)) {
                showStatus("No data to export.", "info", 3000);
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
            showStatus("✓ Data exported successfully!", "success", 3000);
        });
    });

    // Trigger Import File Selection
    importBtn.addEventListener("click", () => {
        // Close dropdown
        dropdownMenu.classList.remove("show");
        
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
                                showStatus(`Error importing: ${chrome.runtime.lastError.message}`, "danger", 5000);
                            } else {
                                showStatus("✓ Data imported successfully!", "success", 3000);
                            }
                        });
                    }
                } else {
                    showStatus("Invalid import file format. Expected JSON with a 'categories' array.", "danger", 5000);
                }
            } catch (error) {
                console.error("Error parsing import file:", error);
                showStatus(`Error importing data: ${error.message}`, "danger", 5000);
            }
            importFile.value = "";
        };
        reader.onerror = () => {
            showStatus("Error reading file.", "danger", 5000);
            importFile.value = "";
        };
        reader.readAsText(file);
    });

    // Trigger Update File Selection
    updateBtn.addEventListener("click", () => {
        // Close dropdown
        dropdownMenu.classList.remove("show");
        
        updateFile.click();
    });

    // Handle Update File Selection (merge mode)
    updateFile.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && Array.isArray(importedData.categories)) {
                    chrome.storage.local.get({ categories: [] }, (result) => {
                        let currentCategories = result.categories || [];
                        
                        // Merge logic: add only new categories from the imported file
                        let addedCount = 0;
                        importedData.categories.forEach(importedCat => {
                            // Check if category already exists by name or id
                            const categoryExists = currentCategories.some(
                                cat => cat.id === importedCat.id || cat.name === importedCat.name
                            );
                            
                            if (!categoryExists) {
                                // Add the entire new category with all its URLs
                                currentCategories.push(importedCat);
                                addedCount++;
                            }
                        });
                        
                        if (addedCount === 0) {
                            showStatus("No new categories to add. All categories already exist.", "info", 3000);
                            return;
                        }
                        
                        chrome.storage.local.set({ categories: currentCategories }, () => {
                            if (chrome.runtime.lastError) {
                                showStatus(`Error updating: ${chrome.runtime.lastError.message}`, "danger", 5000);
                            } else {
                                showStatus(`✓ Data updated! ${addedCount} new category(ies) added.`, "success", 3000);
                            }
                        });
                    });
                } else {
                    showStatus("Invalid update file format. Expected JSON with a 'categories' array.", "danger", 5000);
                }
            } catch (error) {
                console.error("Error parsing update file:", error);
                showStatus(`Error updating data: ${error.message}`, "danger", 5000);
            }
            updateFile.value = "";
        };
        reader.onerror = () => {
            showStatus("Error reading file.", "danger", 5000);
            updateFile.value = "";
        };
        reader.readAsText(file);
    });

    // --- Helper Functions ---

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
                showStatus("URL already exists in your saved list.", "info", 3000);
                return;
            }

            // Add the URL to the default category
            defaultCategory.urls.push({
                url: url,
                icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
                name: generateShortName(url, title),
                dateAdded: Date.now()
            });

            // Save updated categories
            chrome.storage.local.set({ categories: categories }, () => {
                if (chrome.runtime.lastError) {
                    showStatus(`Error saving: ${chrome.runtime.lastError.message}`, "danger", 5000);
                } else {
                    showStatus(`✓ URL saved to "${defaultCategory.name}"!`, "success", 3000);
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

    // Show Status Message with type
    function showStatus(message, type = "info", duration = 2000) {
        statusText.textContent = message;
        statusMessage.className = `alert alert-${type}`;
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


