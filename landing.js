// landing.js - Fix for manual URL addition and initialization

// Global variable to hold the categories data, loaded from storage
let categoriesData = [];

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const addCategoryBtn = document.getElementById("add-category");
    const searchInput = document.getElementById("search-input");
    const sortSelect = document.getElementById("sort-select");

    const manualUrlInput = document.getElementById("manual-url");
    const manualNameInput = document.getElementById("manual-name");
    const manualCategorySelect = document.getElementById("manual-category");
    const newCategoryNameInput = document.getElementById("new-category-name");
    const addManualUrlBtn = document.getElementById("add-manual-url");

    // --- Initial Load ---
    loadCategoriesAndRender(); // This will also call populateCategorySelect once data is loaded

    // --- Event Handlers ---
    addCategoryBtn.addEventListener("click", handleAddCategory);
    searchInput.addEventListener("input", handleSearch);
    sortSelect.addEventListener("change", handleSort);

    manualCategorySelect.addEventListener("change", () => {
        newCategoryNameInput.style.display = manualCategorySelect.value === "_new" ? "block" : "none";
    });
    addManualUrlBtn.addEventListener("click", handleManualAddUrl);
});

// --- Utility Functions ---
function ensureScheme(url) {
    if (!url.match(/^https?:\/\//i) && !url.match(/^file:\/\//i) && !url.match(/^ftp:\/\//i) && !url.match(/^javascript:/i)) {
        return "http://" + url;
    }
    return url;
}

function generateShortName(url) {
    try {
        const fullUrl = ensureScheme(url);
        const urlObj = new URL(fullUrl);
        let shortName = urlObj.hostname;
        if (shortName.startsWith("www.")) {
            shortName = shortName.substring(4);
        }
        const commonTlds = [".com", ".org", ".net", ".co.uk", ".io", ".dev"];
        for (const tld of commonTlds) {
            if (shortName.endsWith(tld)) {
                shortName = shortName.substring(0, shortName.length - tld.length);
                break;
            }
        }
        return shortName || url; 
    } catch (e) {
        console.error("Could not generate short name for URL:", url, e);
        return url;
    }
}

// --- Data Handling ---
function loadCategoriesAndRender() {
    chrome.storage.local.get({ categories: [] }, (result) => {
        categoriesData = result.categories || [];
        let defaultCategoryExists = categoriesData.find(cat => cat.id === "default");
        if (!defaultCategoryExists) {
            categoriesData.unshift({ id: "default", name: "Uncategorized", urls: [] });
            saveCategories(); // Save only if default was actually added
        }
        renderCategories();
        populateCategorySelect(); // Call after categoriesData is confirmed and potentially updated
    });
}

function saveCategories() {
    chrome.storage.local.set({ categories: categoriesData }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving categories:", chrome.runtime.lastError);
        }
    });
}

// --- Rendering ---
function renderCategories(searchTerm = "") {
    const container = document.getElementById("categories-container");
    if (!container) return; // Guard against missing container
    container.innerHTML = "";
    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    (categoriesData || []).forEach(category => {
        let urlsToDisplay = category.urls;
        if (lowerSearchTerm) {
            urlsToDisplay = category.urls.filter(item =>
                (item.url && item.url.toLowerCase().includes(lowerSearchTerm)) ||
                (item.name && item.name.toLowerCase().includes(lowerSearchTerm))
            );
        }
        if (urlsToDisplay.length > 0 || !lowerSearchTerm || (categoriesData || []).length === 1) {
            const categoryElement = createCategoryElement(category, urlsToDisplay);
            container.appendChild(categoryElement);
        }
    });
}

function createCategoryElement(category, urls) {
    let categoryElement = document.createElement("div");
    categoryElement.className = "category";
    categoryElement.dataset.categoryId = category.id;

    let categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";
    let categoryNameH2 = document.createElement("h2");
    categoryNameH2.textContent = category.name;
    let categoryMenuDiv = document.createElement("div");
    categoryMenuDiv.className = "category-menu";
    categoryMenuDiv.innerHTML = "<span>&#8942;</span>";
    categoryHeader.appendChild(categoryNameH2);
    categoryHeader.appendChild(categoryMenuDiv);

    let listContainer = document.createElement("ul");
    listContainer.className = "url-list";
    const sortSelect = document.getElementById("sort-select");
    const sortedUrls = sortUrls(urls, sortSelect ? sortSelect.value : "date-desc");
    sortedUrls.forEach(urlData => {
        listContainer.appendChild(createUrlElement(urlData, category.id));
    });

    categoryElement.appendChild(categoryHeader);
    categoryElement.appendChild(listContainer);

    categoryElement.addEventListener("dragover", handleDragOver);
    categoryElement.addEventListener("dragleave", handleDragLeave);
    categoryElement.addEventListener("drop", handleDrop);
    categoryMenuDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        showCategoryContextMenu(e, category.id);
    });
    return categoryElement;
}

function createUrlElement(urlData, categoryId) {
    let urlElement = document.createElement("li");
    urlElement.className = "url-item";
    urlElement.draggable = true;
    urlElement.dataset.url = urlData.url;
    urlElement.dataset.categoryId = categoryId;

    const faviconHostname = new URL(urlData.url).hostname;
    const faviconSrc = urlData.icon || `https://www.google.com/s2/favicons?domain=${faviconHostname}&sz=32`;
    const defaultIcon = chrome.runtime.getURL("icon.png"); // Assuming icon.png is your default

    urlElement.innerHTML = `
        <img src="${faviconSrc}" alt="" class="favicon" onerror="this.onerror=null; this.src='${defaultIcon}';">
        <a href="${urlData.url}" target="_blank" class="url-link" title="${urlData.url}\nAdded: ${new Date(urlData.dateAdded).toLocaleString()}">${urlData.name || generateShortName(urlData.url)}</a>
        <button class="remove-url-btn" title="Remove URL">×</button>
    `;

    urlElement.querySelector(".remove-url-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        handleRemoveUrl(urlData.url);
    });
    urlElement.addEventListener("dragstart", handleDragStart);
    urlElement.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showUrlContextMenu(e, urlData.url, categoryId);
    });
    return urlElement;
}

// --- Event Handlers for Page Actions ---
function handleAddCategory() {
    const categoryName = prompt("Enter new category name:");
    if (categoryName && categoryName.trim()) {
        const newCategory = { id: `cat_${Date.now()}`, name: categoryName.trim(), urls: [] };
        categoriesData.push(newCategory);
        saveCategories();
        renderCategories();
        populateCategorySelect();
    }
}

function handleSearch() {
    const searchInput = document.getElementById("search-input");
    renderCategories(searchInput ? searchInput.value : "");
}

function handleSort() {
    const searchInput = document.getElementById("search-input");
    renderCategories(searchInput ? searchInput.value : "");
}

// --- Manual URL Add Logic ---
function handleManualAddUrl() {
    const manualUrlInput = document.getElementById("manual-url");
    const manualNameInput = document.getElementById("manual-name");
    const manualCategorySelect = document.getElementById("manual-category");
    const newCategoryNameInput = document.getElementById("new-category-name");

    let urlValue = manualUrlInput.value.trim();
    if (!urlValue) {
        alert("Please enter a URL.");
        return;
    }
    const fullUrl = ensureScheme(urlValue);

    try {
        new URL(fullUrl);
    } catch (e) {
        alert("The entered URL is invalid. Please check and try again.");
        return;
    }

    const nameValue = manualNameInput.value.trim() || generateShortName(fullUrl);
    let categoryIdOrNew = manualCategorySelect.value;
    let newCategoryName = newCategoryNameInput.value.trim();

    if (categoryIdOrNew === "_new") {
        if (!newCategoryName) {
            alert("Please enter a name for the new category.");
            return;
        }
        addUrlToStorage(fullUrl, nameValue, "_new", newCategoryName, manualUrlInput, manualNameInput, newCategoryNameInput);
    } else if (!categoryIdOrNew || categoryIdOrNew === "") { // Added check for empty string
        alert("Please select a category or choose to create a new one.");
        return;
    } else {
        addUrlToStorage(fullUrl, nameValue, categoryIdOrNew, null, manualUrlInput, manualNameInput, newCategoryNameInput);
    }
}

function addUrlToStorage(url, name, categoryId, newCategoryName = null, manualUrlInput, manualNameInput, newCategoryNameInput) {
    if (!categoriesData) { // Safeguard
        console.error("categoriesData is not initialized in addUrlToStorage");
        alert("Error: Data not ready. Please try again.");
        return;
    }

    let targetCategory = null;
    let categoryCreated = false;

    let trulyExists = false;
    for (const cat of categoriesData) {
        if (cat.urls.some(u => u.url === url)) {
            trulyExists = true;
            break;
        }
    }
    if (trulyExists) {
        alert("URL already exists in your saved list.");
        return;
    }

    if (categoryId === "_new" && newCategoryName) {
        if (categoriesData.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase())) {
            alert(`Category "${newCategoryName}" already exists.`);
            const existingCat = categoriesData.find(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase());
            if (existingCat) document.getElementById("manual-category").value = existingCat.id;
            document.getElementById("new-category-name").style.display = 'none';
            return;
        }
        targetCategory = { id: `cat_${Date.now()}`, name: newCategoryName, urls: [] };
        categoriesData.push(targetCategory);
        categoryCreated = true;
    } else {
        targetCategory = categoriesData.find(cat => cat.id === categoryId);
        if (!targetCategory) {
            console.warn(`Category ID "${categoryId}" not found, falling back to default.`);
            targetCategory = categoriesData.find(cat => cat.id === "default");
            if (!targetCategory) {
                alert("Critical Error: Default category missing. Cannot add URL.");
                return;
            }
        }
    }

    targetCategory.urls.push({
        url: url,
        icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
        name: name || generateShortName(url),
        dateAdded: Date.now()
    });

    saveCategories();
    renderCategories(document.getElementById("search-input") ? document.getElementById("search-input").value : "");
    manualUrlInput.value = "";
    manualNameInput.value = "";
    newCategoryNameInput.value = "";
    newCategoryNameInput.style.display = "none";
    
    if (categoryCreated) {
        populateCategorySelect();
        document.getElementById("manual-category").value = targetCategory.id;
    } else {
        document.getElementById("manual-category").value = "default"; // Reset to default after adding to existing
    }
    alert(`URL added to "${targetCategory.name}"!`);
}

function populateCategorySelect() {
    const manualCategorySelect = document.getElementById("manual-category");
    if (!manualCategorySelect) return;
    
    const currentSelection = manualCategorySelect.value;
    manualCategorySelect.innerHTML = '';

    const newOpt = document.createElement("option");
    newOpt.value = "_new";
    newOpt.textContent = "-- New Category --";
    manualCategorySelect.appendChild(newOpt);

    const sortedCategories = [...(categoriesData || [])].sort((a, b) => {
        if (a.id === 'default') return -1;
        if (b.id === 'default') return 1;
        return a.name.localeCompare(b.name);
    });

    let defaultCategoryPresent = false;
    sortedCategories.forEach(cat => {
        if(cat.id === 'default') defaultCategoryPresent = true;
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        manualCategorySelect.appendChild(option);
    });

    if (sortedCategories.some(cat => cat.id === currentSelection)) {
        manualCategorySelect.value = currentSelection;
    } else if (defaultCategoryPresent) {
        manualCategorySelect.value = "default";
    } else if (sortedCategories.length > 0) {
        manualCategorySelect.value = sortedCategories[0].id; // Fallback to first available if default somehow missing
    } else {
         manualCategorySelect.value = "_new"; // If no categories at all (should not happen with default logic)
    }
    
    const newCategoryNameInput = document.getElementById("new-category-name");
    if (newCategoryNameInput) {
        newCategoryNameInput.style.display = manualCategorySelect.value === "_new" ? "block" : "none";
    }
}

// --- Drag and Drop --- 
function handleDragStart(e) {
    const urlItemElement = e.target.closest('.url-item');
    if (!urlItemElement) return;
    e.dataTransfer.setData("application/json", JSON.stringify({ url: urlItemElement.dataset.url, sourceCategoryId: urlItemElement.dataset.categoryId }));
    e.dataTransfer.effectAllowed = "move";
    urlItemElement.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const draggedElement = document.querySelector('.url-item.dragging');
    if (draggedElement) draggedElement.classList.remove('dragging');

    const targetCategoryId = e.currentTarget.dataset.categoryId;
    try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data.sourceCategoryId !== targetCategoryId) {
            moveUrl(data.url, data.sourceCategoryId, targetCategoryId);
        }
    } catch (error) {
        console.error("Error processing drop data:", error);
    }
}

function moveUrl(url, sourceCatId, targetCatId) {
    const sourceCategory = categoriesData.find(cat => cat.id === sourceCatId);
    const targetCategory = categoriesData.find(cat => cat.id === targetCatId);
    if (!sourceCategory || !targetCategory) return;

    const urlIndex = sourceCategory.urls.findIndex(item => item.url === url);
    if (urlIndex === -1) return;

    const [urlData] = sourceCategory.urls.splice(urlIndex, 1);
    targetCategory.urls.push(urlData);
    saveCategories();
    renderCategories(document.getElementById("search-input") ? document.getElementById("search-input").value : "");
}

// --- Context Menu Logic ---
function showCategoryContextMenu(event, categoryId) {
    event.preventDefault();
    closeContextMenu();
    if (categoryId === "default") return;

    const menu = document.createElement("div");
    menu.className = "context-menu-style";
    menu.style.top = `${event.pageY}px`;
    menu.style.left = `${event.pageX}px`;
    const ul = document.createElement("ul");

    const renameLi = document.createElement("li");
    renameLi.textContent = "Rename Category";
    renameLi.addEventListener("click", () => { handleRenameCategory(categoryId); closeContextMenu(); });
    ul.appendChild(renameLi);

    const deleteLi = document.createElement("li");
    deleteLi.textContent = "Delete Category";
    deleteLi.className = "danger";
    deleteLi.addEventListener("click", () => { handleDeleteCategory(categoryId); closeContextMenu(); });
    ul.appendChild(deleteLi);

    menu.appendChild(ul);
    document.body.appendChild(menu);
    document.addEventListener("click", closeContextMenu, { once: true });
}

function showUrlContextMenu(event, url, categoryId) {
    event.preventDefault();
    closeContextMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu-style";
    menu.style.top = `${event.pageY}px`;
    menu.style.left = `${event.pageX}px`;
    const ul = document.createElement("ul");

    const editLi = document.createElement("li");
    editLi.textContent = "Edit URL/Name";
    editLi.addEventListener("click", () => { handleEditUrl(url, categoryId); closeContextMenu(); });
    ul.appendChild(editLi);

    const deleteLi = document.createElement("li");
    deleteLi.textContent = "Delete URL";
    deleteLi.className = "danger";
    deleteLi.addEventListener("click", () => { handleRemoveUrl(url); closeContextMenu(); });
    ul.appendChild(deleteLi);

    menu.appendChild(ul);
    document.body.appendChild(menu);
    document.addEventListener("click", closeContextMenu, { once: true });
}

function closeContextMenu() {
    const existingMenu = document.querySelector(".context-menu-style");
    if (existingMenu) existingMenu.remove();
}

function handleRenameCategory(categoryId) {
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) return;
    const newName = prompt("Enter new name for category:", category.name);
    if (newName && newName.trim() && newName.trim() !== category.name) {
        category.name = newName.trim();
        saveCategories();
        renderCategories();
        populateCategorySelect();
    }
}

function handleDeleteCategory(categoryId) {
    if (confirm("Are you sure you want to delete this category? URLs will be moved to Uncategorized.")) {
        const defaultCategory = categoriesData.find(cat => cat.id === "default");
        const categoryToDelete = categoriesData.find(cat => cat.id === categoryId);
        if (categoryToDelete && defaultCategory && categoryId !== "default") {
            defaultCategory.urls.push(...categoryToDelete.urls);
            categoriesData = categoriesData.filter(cat => cat.id !== categoryId);
            saveCategories();
            renderCategories();
            populateCategorySelect();
        } else if (categoryId === "default") {
            alert("Cannot delete the default 'Uncategorized' category.");
        }
    }
}

function handleRemoveUrl(urlToRemove) {
    let found = false;
    (categoriesData || []).forEach(category => {
        const urlIndex = category.urls.findIndex(item => item.url === urlToRemove);
        if (urlIndex > -1) {
            category.urls.splice(urlIndex, 1);
            found = true;
        }
    });
    if (found) {
        saveCategories();
        renderCategories(document.getElementById("search-input") ? document.getElementById("search-input").value : "");
    } else {
        // alert("URL not found."); // Can be noisy if called from multiple places
    }
}

function handleEditUrl(originalUrl, categoryId) {
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) return;
    const urlData = category.urls.find(u => u.url === originalUrl);
    if (!urlData) return;

    const newUrlValue = prompt("Enter new URL:", urlData.url);
    const newNameValue = prompt("Enter new name (leave blank to auto-generate):", urlData.name);

    let urlChanged = false;
    let nameChanged = false;
    let finalUrl = urlData.url;
    let finalName = urlData.name;

    if (newUrlValue && newUrlValue.trim() && newUrlValue.trim() !== originalUrl) {
        const fullNewUrl = ensureScheme(newUrlValue.trim());
        try {
            new URL(fullNewUrl); // Validate new URL
            finalUrl = fullNewUrl;
            urlChanged = true;
        } catch (e) {
            alert("Invalid new URL entered. URL not changed.");
            return; // Don't proceed if new URL is invalid
        }
    }

    if (newNameValue !== null) { // Allow empty string to clear name
      if (newNameValue.trim() === "") {
        finalName = generateShortName(finalUrl);
        nameChanged = true;
      } else if (newNameValue.trim() !== urlData.name) {
        finalName = newNameValue.trim();
        nameChanged = true;
      }
    } else if (urlChanged && (!newNameValue || newNameValue.trim() === "")) {
        // If URL changed and name was blank, regenerate name from new URL
        finalName = generateShortName(finalUrl);
        nameChanged = true;
    }
    
    if(urlChanged || nameChanged){
        urlData.url = finalUrl;
        urlData.name = finalName;
        if(urlChanged){
             urlData.icon = `https://www.google.com/s2/favicons?domain=${new URL(finalUrl).hostname}&sz=32`;
        }
        saveCategories();
        renderCategories(document.getElementById("search-input") ? document.getElementById("search-input").value : "");
    }
}

// --- Sorting Logic ---
function sortUrls(urls, sortType) {
    return [...(urls || [])].sort((a, b) => {
        const nameA = (a.name || generateShortName(a.url)).toLowerCase();
        const nameB = (b.name || generateShortName(b.url)).toLowerCase();
        const dateA = a.dateAdded;
        const dateB = b.dateAdded;
        switch (sortType) {
            case "name-asc": return nameA.localeCompare(nameB);
            case "name-desc": return nameB.localeCompare(nameA);
            case "date-asc": return dateA - dateB;
            case "date-desc": return dateB - dateA;
            default: return 0;
        }
    });
}

