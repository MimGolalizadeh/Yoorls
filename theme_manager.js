// theme_manager.js

document.addEventListener("DOMContentLoaded", () => {
    const themeSelect = document.getElementById("theme-select");
    const themeToggle = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement;

    // Function to apply the theme
    function applyTheme(theme) {
        if (theme === "dark") {
            htmlElement.setAttribute("data-theme", "dark");
        } else {
            htmlElement.setAttribute("data-theme", "light"); // Default to light
        }
        // Save the preference
        chrome.storage.local.set({ selectedTheme: theme });
    }

    // Load saved theme preference
    chrome.storage.local.get("selectedTheme", (data) => {
        const savedTheme = data.selectedTheme || "light"; // Default to light if no preference
        applyTheme(savedTheme);
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
        if (themeToggle) {
            themeToggle.checked = savedTheme === "dark";
        }
    });

    // Add event listener to the theme selector dropdown
    if (themeSelect) {
        themeSelect.addEventListener("change", (event) => {
            applyTheme(event.target.value);
        });
    }

    // Add event listener to the toggle button
    if (themeToggle) {
        themeToggle.addEventListener("change", () => {
            const theme = themeToggle.checked ? "dark" : "light";
            applyTheme(theme);
        });
    }
});
