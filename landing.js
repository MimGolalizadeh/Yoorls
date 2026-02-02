// landing.js - Fix for manual URL addition and initialization

// Global variable to hold the categories data, loaded from storage
let categoriesData = [];
let currentViewMode = "all"; // "all" or specific category ID

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const addCategoryBtn = document.getElementById("add-category");
    const toggleAddUrlBtn = document.getElementById("toggle-add-url");
    const quickAddSection = document.getElementById("quick-add-section");
    const searchInput = document.getElementById("search-input");
    const sortSelect = document.getElementById("sort-select");
    const columnsSelect = document.getElementById("columns-select");
    const viewAllBtn = document.getElementById("view-all-btn");

    const manualUrlInput = document.getElementById("manual-url");
    const manualNameInput = document.getElementById("manual-name");
    const manualCategorySelect = document.getElementById("manual-category");
    const newCategoryNameInput = document.getElementById("new-category-name");
    const addManualUrlBtn = document.getElementById("add-manual-url");

    // --- Modal Elements ---
    const addCategoryModal = document.getElementById("add-category-modal");
    const closeAddCategoryModalBtn = document.getElementById("close-add-category-modal");
    const saveCategoryBtn = document.getElementById("save-category");
    const cancelCategoryBtn = document.getElementById("cancel-category");
    const categoryNameInput = document.getElementById("category-name-input");

    const editUrlModal = document.getElementById("edit-url-modal");
    const closeEditUrlModalBtn = document.getElementById("close-edit-url-modal");
    const saveEditUrlBtn = document.getElementById("save-edit-url");
    const cancelEditUrlBtn = document.getElementById("cancel-edit-url");
    const editUrlInput = document.getElementById("edit-url-input");
    const editNameInput = document.getElementById("edit-name-input");

    const renameCategoryModal = document.getElementById("rename-category-modal");
    const closeRenameCategoryModalBtn = document.getElementById("close-rename-category-modal");
    const saveRenameCategoryBtn = document.getElementById("save-rename-category");
    const cancelRenameCategoryBtn = document.getElementById("cancel-rename-category");
    const renameCategoryInput = document.getElementById("rename-category-input");

    const editIconModal = document.getElementById("edit-icon-modal");
    const closeEditIconModalBtn = document.getElementById("close-edit-icon-modal");
    const saveEditIconBtn = document.getElementById("save-edit-icon");
    const cancelEditIconBtn = document.getElementById("cancel-edit-icon");
    const editIconInput = document.getElementById("edit-icon-input");
    const iconPreview = document.getElementById("icon-preview");

    // --- Initial Load ---
    loadCategoriesAndRender(); // This will also call populateCategorySelect once data is loaded
    loadColumnsPreference(); // Load saved column preference

    // --- Event Handlers ---
    addCategoryBtn.addEventListener("click", openAddCategoryModal);
    toggleAddUrlBtn.addEventListener("click", () => {
        quickAddSection.style.display = quickAddSection.style.display === "none" ? "block" : "none";
    });
    searchInput.addEventListener("input", handleSearch);
    sortSelect.addEventListener("change", handleSort);
    columnsSelect.addEventListener("change", handleColumnsChange);
    viewAllBtn.addEventListener("click", handleViewAll);

    // --- Modal Event Handlers ---
    closeAddCategoryModalBtn.addEventListener("click", closeAddCategoryModal);
    cancelCategoryBtn.addEventListener("click", closeAddCategoryModal);
    saveCategoryBtn.addEventListener("click", saveNewCategory);
    addCategoryModal.addEventListener("click", (e) => {
        if (e.target === addCategoryModal) closeAddCategoryModal();
    });
    categoryNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveNewCategory();
    });

    closeEditUrlModalBtn.addEventListener("click", closeEditUrlModal);
    cancelEditUrlBtn.addEventListener("click", closeEditUrlModal);
    saveEditUrlBtn.addEventListener("click", saveEditUrlChanges);
    editUrlModal.addEventListener("click", (e) => {
        if (e.target === editUrlModal) closeEditUrlModal();
    });
    editUrlInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveEditUrlChanges();
    });
    editNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveEditUrlChanges();
    });

    closeRenameCategoryModalBtn.addEventListener("click", closeRenameCategoryModal);
    cancelRenameCategoryBtn.addEventListener("click", closeRenameCategoryModal);
    saveRenameCategoryBtn.addEventListener("click", saveRenameCategory);
    renameCategoryModal.addEventListener("click", (e) => {
        if (e.target === renameCategoryModal) closeRenameCategoryModal();
    });
    renameCategoryInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveRenameCategory();
    });

    closeEditIconModalBtn.addEventListener("click", closeEditIconModal);
    cancelEditIconBtn.addEventListener("click", closeEditIconModal);
    saveEditIconBtn.addEventListener("click", saveEditIcon);
    editIconModal.addEventListener("click", (e) => {
        if (e.target === editIconModal) closeEditIconModal();
    });
    editIconInput.addEventListener("input", updateIconPreview);

    manualCategorySelect.addEventListener("change", () => {
        newCategoryNameInput.style.display = manualCategorySelect.value === "_new" ? "block" : "none";
    });
    addManualUrlBtn.addEventListener("click", handleManualAddUrl);
});

// Listen for storage changes so the UI updates when data is imported/changed elsewhere
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.categories) {
        categoriesData = changes.categories.newValue || [];
        // ensure default category exists
        let defaultCategoryExists = categoriesData.find(cat => cat.id === "default");
        if (!defaultCategoryExists) {
            categoriesData.unshift({ id: "default", name: "Uncategorized", urls: [] });
            saveCategories();
        }
        populateSidebar();
        renderCategories(document.getElementById("search-input") ? document.getElementById("search-input").value : "");
        populateCategorySelect();
    }
});

// --- Utility Functions ---
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '•'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close">×</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    });

    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

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
        populateSidebar(); // Populate sidebar with categories
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

// --- Column Preference Functions ---
function loadColumnsPreference() {
    chrome.storage.local.get({ columnPreference: "4" }, (result) => {
        const columns = result.columnPreference;
        const columnsSelect = document.getElementById("columns-select");
        if (columnsSelect) {
            columnsSelect.value = columns;
        }
        applyColumnLayout(columns);
    });
}

function handleColumnsChange() {
    const columnsSelect = document.getElementById("columns-select");
    const columns = columnsSelect.value;
    chrome.storage.local.set({ columnPreference: columns }, () => {
        applyColumnLayout(columns);
    });
}

function applyColumnLayout(columns) {
    const container = document.getElementById("categories-container");
    if (!container) return;
    
    // Remove all column classes
    container.classList.remove("cols-2", "cols-3", "cols-4", "cols-5", "cols-6", "cols-8");
    
    // Add the new column class
    container.classList.add(`cols-${columns}`);

    // Also set inline grid template to guarantee immediate layout change
    // (CSS class sets a --cols variable; setting it inline avoids timing/ specificity issues)
    try {
        container.style.gridTemplateColumns = `repeat(${parseInt(columns, 10) || 4}, 1fr)`;
    } catch (e) {
        // ignore if invalid
    }
}

// --- Sidebar Functions ---
function populateSidebar() {
    const categoriesList = document.getElementById("categories-list");
    if (!categoriesList) return;
    
    categoriesList.innerHTML = "";
    
    (categoriesData || []).forEach(category => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.className = "category-item";
        button.dataset.categoryId = category.id;
        button.textContent = category.name;
        
        button.addEventListener("click", () => handleCategoryClick(category.id));
        li.appendChild(button);
        categoriesList.appendChild(li);
    });
}

function handleViewAll() {
    currentViewMode = "all";
    
    // Update sidebar button states
    document.getElementById("view-all-btn").classList.add("active");
    document.querySelectorAll(".category-item").forEach(item => {
        item.classList.remove("active");
    });
    
    // Exit single-category view if open and render all categories
    exitSingleCategoryView();
    renderCategories();
}

function handleCategoryClick(categoryId) {
    currentViewMode = categoryId;
    
    // Update sidebar button states
    document.getElementById("view-all-btn").classList.remove("active");
    document.querySelectorAll(".category-item").forEach(item => {
        item.classList.remove("active");
    });
    document.querySelector(`[data-category-id="${categoryId}"]`).classList.add("active");
    
    // Render filtered category and enter single-category view
    renderCategoryFilter(categoryId);
    enterSingleCategoryView();
}

function renderCategoryFilter(categoryId) {
    const container = document.getElementById("categories-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    // Restore column layout
    chrome.storage.local.get({ columnPreference: "4" }, (result) => {
        const columns = result.columnPreference;
        applyColumnLayout(columns);
    });
    
    const selectedCategory = categoriesData.find(cat => cat.id === categoryId);
    if (selectedCategory) {
        const categoryElement = createCategoryElement(selectedCategory, selectedCategory.urls, true);
        // mark fullpage so CSS expands it
        categoryElement.classList.add('fullpage');
        container.appendChild(categoryElement);
    }
}

function enterSingleCategoryView() {
    const wrapper = document.querySelector('.main-wrapper');
    if (wrapper) wrapper.classList.add('single-category-open');

    // add back button if not exists
    if (!document.getElementById('category-back-btn')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'category-back-btn';
        backBtn.className = 'category-back-btn';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', exitSingleCategoryView);
        document.body.appendChild(backBtn);
    }
}

function exitSingleCategoryView() {
    const wrapper = document.querySelector('.main-wrapper');
    if (wrapper) wrapper.classList.remove('single-category-open');
    const container = document.getElementById('categories-container');
    if (container) {
        // re-render all categories
        container.classList.remove('single-view');
        renderCategories();
    }
    const backBtn = document.getElementById('category-back-btn');
    if (backBtn) backBtn.remove();
}

// --- Rendering ---
function renderCategories(searchTerm = "") {
    const container = document.getElementById("categories-container");
    if (!container) return; // Guard against missing container
    container.innerHTML = "";
    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    // Restore column layout after clearing HTML
    chrome.storage.local.get({ columnPreference: "4" }, (result) => {
        const columns = result.columnPreference;
        applyColumnLayout(columns);
    });

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

function createCategoryElement(category, urls, isFullPage = false) {
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

    // If not full page (view all), limit visible URLs to 5 and show a "View more" entry when needed
    const maxPreview = 5;
    const urlsToShow = isFullPage ? sortedUrls : sortedUrls.slice(0, maxPreview);
    urlsToShow.forEach(urlData => {
        listContainer.appendChild(createUrlElement(urlData, category.id));
    });

    if (!isFullPage && sortedUrls.length > maxPreview) {
        const moreLi = document.createElement('li');
        moreLi.className = 'url-item view-more';
        const moreLink = document.createElement('a');
        moreLink.className = 'url-link';
        moreLink.href = '#';
        moreLink.textContent = `View more (${sortedUrls.length})`;
        moreLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleCategoryClick(category.id);
        });
        moreLi.appendChild(moreLink);
        listContainer.appendChild(moreLi);
    }

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
    
    // Use a placeholder SVG as fallback instead of missing icon.png
    const fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect fill='%23ddd' width='32' height='32'/%3E%3Ctext x='16' y='20' font-size='14' text-anchor='middle' fill='%23999'%3E%3C/text%3E%3C/svg%3E";

    urlElement.innerHTML = `
        <img src="${faviconSrc}" alt="" class="favicon" onerror="this.onerror=null; this.src='${fallbackSvg}';">
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
function openAddCategoryModal() {
    const categoryNameInput = document.getElementById("category-name-input");
    categoryNameInput.value = "";
    document.getElementById("add-category-modal").style.display = "flex";
    categoryNameInput.focus();
}

function closeAddCategoryModal() {
    document.getElementById("add-category-modal").style.display = "none";
}

function saveNewCategory() {
    const categoryNameInput = document.getElementById("category-name-input");
    const categoryName = categoryNameInput.value.trim();
    
    if (categoryName) {
        const newCategory = { id: `cat_${Date.now()}`, name: categoryName, urls: [] };
        categoriesData.push(newCategory);
        saveCategories();
        populateSidebar();
        renderCategories();
        populateCategorySelect();
        closeAddCategoryModal();
    } else {
        showToast("Please enter a category name.", 'error');
    }
}

function handleAddCategory() {
    // This function is no longer used, kept for compatibility
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
        showToast("Please enter a URL.", 'error');
        return;
    }
    const fullUrl = ensureScheme(urlValue);

    try {
        new URL(fullUrl);
    } catch (e) {
        showToast("The entered URL is invalid. Please check and try again.", 'error');
        return;
    }

    const nameValue = manualNameInput.value.trim() || generateShortName(fullUrl);
    let categoryIdOrNew = manualCategorySelect.value;
    let newCategoryName = newCategoryNameInput.value.trim();

    if (categoryIdOrNew === "_new") {
        if (!newCategoryName) {
            showToast("Please enter a name for the new category.", 'error');
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
        showToast("URL already exists in your saved list.", 'warning');
        return;
    }

    if (categoryId === "_new" && newCategoryName) {
        if (categoriesData.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase())) {
            showToast(`Category "${newCategoryName}" already exists.`, 'warning');
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
    showToast(`URL added to "${targetCategory.name}"!`, 'success');
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

    const exportLi = document.createElement("li");
    exportLi.textContent = "Export Category";
    exportLi.addEventListener("click", () => { handleExportCategory(categoryId); closeContextMenu(); });
    ul.appendChild(exportLi);

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

    const editIconLi = document.createElement("li");
    editIconLi.textContent = "Edit Icon";
    editIconLi.addEventListener("click", () => { handleEditIcon(url, categoryId); closeContextMenu(); });
    ul.appendChild(editIconLi);

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
    window.renamingCategoryId = categoryId;
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) return;
    document.getElementById("rename-category-input").value = category.name;
    document.getElementById("rename-category-modal").style.display = "flex";
    document.getElementById("rename-category-input").focus();
}

function closeRenameCategoryModal() {
    document.getElementById("rename-category-modal").style.display = "none";
    window.renamingCategoryId = null;
}

function saveRenameCategory() {
    if (!window.renamingCategoryId) return;
    
    const newName = document.getElementById("rename-category-input").value.trim();
    const category = categoriesData.find(cat => cat.id === window.renamingCategoryId);
    
    if (!category) {
        closeRenameCategoryModal();
        return;
    }
    
    if (newName && newName !== category.name) {
        category.name = newName;
        saveCategories();
        populateSidebar();
        renderCategories();
        populateCategorySelect();
        showToast("Category renamed successfully", "success");
    }
    
    closeRenameCategoryModal();
}

function handleEditIcon(url, categoryId) {
    window.editingIconData = { url, categoryId };
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) return;
    const urlData = category.urls.find(u => u.url === url);
    if (!urlData) return;
    
    const editIconInput = document.getElementById("edit-icon-input");
    const iconPreview = document.getElementById("icon-preview");
    editIconInput.value = urlData.icon || "";
    iconPreview.src = urlData.icon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=48`;
    document.getElementById("edit-icon-modal").style.display = "flex";
    editIconInput.focus();
}

function closeEditIconModal() {
    document.getElementById("edit-icon-modal").style.display = "none";
    window.editingIconData = null;
}

function updateIconPreview() {
    const editIconInput = document.getElementById("edit-icon-input");
    const iconPreview = document.getElementById("icon-preview");
    const iconUrl = editIconInput.value.trim();
    
    if (iconUrl) {
        iconPreview.src = iconUrl;
        iconPreview.onerror = () => {
            iconPreview.src = `https://www.google.com/s2/favicons?domain=${new URL(window.editingIconData.url).hostname}&sz=48`;
        };
    } else {
        iconPreview.src = `https://www.google.com/s2/favicons?domain=${new URL(window.editingIconData.url).hostname}&sz=48`;
    }
}

function saveEditIcon() {
    if (!window.editingIconData) return;
    
    const newIconUrl = document.getElementById("edit-icon-input").value.trim();
    const { url, categoryId } = window.editingIconData;
    
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) {
        closeEditIconModal();
        return;
    }
    
    const urlIndex = category.urls.findIndex(u => u.url === url);
    if (urlIndex > -1) {
        category.urls[urlIndex].icon = newIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
        saveCategories();
        renderCategories(document.getElementById("search-input") ? document.getElementById("search-input").value : "");
        showToast("Icon updated successfully", "success");
    }
    
    closeEditIconModal();
}

function handleDeleteCategory(categoryId) {
    if (confirm("Are you sure you want to delete this category? URLs will be moved to Uncategorized.")) {
        const defaultCategory = categoriesData.find(cat => cat.id === "default");
        const categoryToDelete = categoriesData.find(cat => cat.id === categoryId);
        if (categoryToDelete && defaultCategory && categoryId !== "default") {
            defaultCategory.urls.push(...categoryToDelete.urls);
            categoriesData = categoriesData.filter(cat => cat.id !== categoryId);
            saveCategories();
            populateSidebar();
            handleViewAll();
            populateCategorySelect();
        } else if (categoryId === "default") {
            showToast("Cannot delete the default 'Uncategorized' category.", 'warning');
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

    // Store the current values for reference
    window.editingUrlData = { originalUrl, categoryId, urlData };

    // Populate the modal with current values
    document.getElementById("edit-url-input").value = urlData.url;
    document.getElementById("edit-name-input").value = urlData.name || "";

    // Show the modal
    document.getElementById("edit-url-modal").style.display = "flex";
    document.getElementById("edit-url-input").focus();
}

function closeEditUrlModal() {
    document.getElementById("edit-url-modal").style.display = "none";
    window.editingUrlData = null;
}

function saveEditUrlChanges() {
    if (!window.editingUrlData) return;

    const newUrlValue = document.getElementById("edit-url-input").value.trim();
    const newNameValue = document.getElementById("edit-name-input").value.trim();
    const { originalUrl, categoryId, urlData } = window.editingUrlData;

    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) {
        closeEditUrlModal();
        return;
    }

    let urlChanged = false;
    let nameChanged = false;
    let finalUrl = urlData.url;
    let finalName = urlData.name;

    if (newUrlValue && newUrlValue !== originalUrl) {
        const fullNewUrl = ensureScheme(newUrlValue);
        try {
            new URL(fullNewUrl); // Validate new URL
            finalUrl = fullNewUrl;
            urlChanged = true;
        } catch (e) {
            showToast("Invalid URL entered. Please check and try again.", 'error');
            return;
        }
    }

    if (newNameValue !== undefined) {
        finalName = newNameValue || generateShortName(finalUrl);
        nameChanged = true;
    }

    if (urlChanged || nameChanged) {
        const urlIndex = category.urls.findIndex(u => u.url === originalUrl);
        if (urlIndex > -1) {
            category.urls[urlIndex].url = finalUrl;
            category.urls[urlIndex].name = finalName;
            if (urlChanged) {
                category.urls[urlIndex].icon = `https://www.google.com/s2/favicons?domain=${new URL(finalUrl).hostname}&sz=32`;
            }
            saveCategories();
            renderCategories(document.getElementById("search-input") ? document.getElementById("search-input").value : "");
        }
    }

    closeEditUrlModal();
}

// --- Export Category ---
function handleExportCategory(categoryId) {
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) return;

    // Export only this category as a JSON file
    const dataToExport = { categories: [category] };
    let blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `yoorls_${category.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ Category "${category.name}" exported successfully!`, 'success');
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

