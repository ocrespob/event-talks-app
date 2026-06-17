// State Management
let allUpdates = [];
let filteredUpdates = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedUpdateForTweet = null;

// Progress Ring Configuration
const CIRCUMFERENCE = 2 * Math.PI * 12; // 2 * PI * r (r=12) -> ~75.4

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeIcon: document.getElementById('theme-icon'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    filterTagsContainer: document.getElementById('filter-tags-container'),
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    updatesGrid: document.getElementById('updates-grid'),
    
    // Tweet Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    progressRingCircle: document.getElementById('progress-ring-circle'),
    charCountText: document.getElementById('char-count-text'),
    tweetPreviewContent: document.getElementById('tweet-preview-content'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    tweetPublishBtn: document.getElementById('tweet-publish-btn'),
    
    // Toast Container
    toastContainer: document.getElementById('toast-container')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    initProgressRing();
    fetchUpdates();
});

// Setup Progress Ring SVG
function initProgressRing() {
    elements.progressRingCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    elements.progressRingCircle.style.strokeDashoffset = CIRCUMFERENCE;
}

// Event Listeners
function setupEventListeners() {
    // Refresh Actions
    elements.refreshBtn.addEventListener('click', () => fetchUpdates(true));
    elements.retryBtn.addEventListener('click', () => fetchUpdates(true));
    
    // Export Actions
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Theme Actions
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Search Actions
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchClearBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        handleSearchInput();
    });
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        handleSearchInput();
    });
    
    // Filter Tags
    elements.filterTagsContainer.addEventListener('click', (e) => {
        const tag = e.target.closest('.filter-tag');
        if (!tag) return;
        
        // Remove active class from all tags
        document.querySelectorAll('.filter-tag').forEach(btn => btn.classList.remove('active'));
        tag.classList.add('active');
        
        currentFilter = tag.dataset.type;
        applyFiltersAndSearch();
    });
    
    // Tweet Modal Actions
    elements.modalCloseBtn.addEventListener('click', closeTweetModal);
    elements.modalCancelBtn.addEventListener('click', closeTweetModal);
    elements.tweetTextarea.addEventListener('input', handleTweetInput);
    elements.tweetPublishBtn.addEventListener('click', publishTweet);
    
    // Close modal on clicking backdrop
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.tweetModal.style.display !== 'none') {
            closeTweetModal();
        }
    });
}

// Fetch Updates from Flask API
async function fetchUpdates(forceRefresh = false) {
    setLoadingState(true);
    
    try {
        const url = forceRefresh ? '/api/updates?refresh=true' : '/api/updates';
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allUpdates = data.updates;
            updateLastUpdatedTime(data.last_updated);
            updateFilterCounts();
            applyFiltersAndSearch();
            
            if (forceRefresh) {
                showToast('Release notes successfully refreshed!', 'success');
            }
        } else {
            throw new Error(data.error || 'Unknown error occurred while parsing the feed.');
        }
    } catch (error) {
        console.error('Error fetching updates:', error);
        setLoadingState(false, error.message);
        showToast('Failed to load release notes.', 'error');
    }
}

// Handle Loading / Success / Error DOM States
function setLoadingState(isLoading, errorMessage = null) {
    if (isLoading) {
        elements.loadingState.style.display = 'flex';
        elements.updatesGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.errorState.style.display = 'none';
        
        // Spinner styling on Header button
        elements.refreshIcon.classList.add('fa-spin-custom');
        elements.refreshBtn.disabled = true;
        
        const dot = document.querySelector('.status-dot');
        dot.className = 'status-dot loading';
        elements.lastUpdatedText.textContent = 'Updating...';
    } else {
        elements.loadingState.style.display = 'none';
        elements.refreshIcon.classList.remove('fa-spin-custom');
        elements.refreshBtn.disabled = false;
        
        const dot = document.querySelector('.status-dot');
        dot.className = 'status-dot green';
        
        if (errorMessage) {
            elements.updatesGrid.style.display = 'none';
            elements.emptyState.style.display = 'none';
            elements.errorState.style.display = 'flex';
            elements.errorMessage.textContent = errorMessage;
        }
    }
}

// Update Last Updated Timestamp
function updateLastUpdatedTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    elements.lastUpdatedText.textContent = `Last refreshed at ${timeString}`;
}

// Search Input Logic
function handleSearchInput() {
    searchQuery = elements.searchInput.value.trim().toLowerCase();
    
    // Toggle Search Clear Button
    if (searchQuery.length > 0) {
        elements.searchClearBtn.style.display = 'block';
    } else {
        elements.searchClearBtn.style.display = 'none';
    }
    
    applyFiltersAndSearch();
}

// Update counters inside Filter Buttons
function updateFilterCounts() {
    const counts = {
        all: allUpdates.length,
        Feature: 0,
        Announcement: 0,
        Issue: 0,
        Deprecated: 0,
        Changed: 0
    };
    
    allUpdates.forEach(update => {
        const type = update.type;
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        }
    });
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.Feature;
    document.getElementById('count-announcement').textContent = counts.Announcement;
    document.getElementById('count-issue').textContent = counts.Issue;
    document.getElementById('count-deprecated').textContent = counts.Deprecated;
    document.getElementById('count-changed').textContent = counts.Changed;
}

// Core Filter and Search function
function applyFiltersAndSearch() {
    filteredUpdates = allUpdates.filter(update => {
        // Filter by category
        const matchesCategory = (currentFilter === 'all' || update.type === currentFilter);
        
        // Filter by search query (checks type, date, and text content)
        const textToSearch = `${update.type} ${update.date} ${update.content_text}`.toLowerCase();
        const matchesSearch = textToSearch.includes(searchQuery);
        
        return matchesCategory && matchesSearch;
    });
    
    renderGrid();
}

// Helper to return badge colors based on update type
function getTypeColors(type) {
    switch(type) {
        case 'Feature':
            return { color: 'var(--color-feature)', bg: 'var(--bg-feature)' };
        case 'Announcement':
            return { color: 'var(--color-announcement)', bg: 'var(--bg-announcement)' };
        case 'Issue':
            return { color: 'var(--color-issue)', bg: 'var(--bg-issue)' };
        case 'Deprecated':
            return { color: 'var(--color-deprecated)', bg: 'var(--bg-deprecated)' };
        case 'Changed':
            return { color: 'var(--color-changed)', bg: 'var(--bg-changed)' };
        default:
            return { color: 'var(--color-fallback)', bg: 'var(--bg-fallback)' };
    }
}

// Render the updates list inside Grid container
function renderGrid() {
    setLoadingState(false);
    elements.updatesGrid.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        elements.updatesGrid.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.updatesGrid.style.display = 'grid';
    
    filteredUpdates.forEach(update => {
        const colors = getTypeColors(update.type);
        
        const card = document.createElement('article');
        card.className = 'update-card';
        // Set custom CSS variables on the card for dynamic accents
        card.style.setProperty('--badge-color', colors.color);
        card.style.setProperty('--badge-bg', colors.bg);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta-left">
                    <span class="card-badge">${update.type}</span>
                    <span class="card-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${update.date}
                    </span>
                </div>
            </div>
            <div class="card-body">
                ${update.content_html}
            </div>
            <div class="card-footer">
                <a href="${update.link}" target="_blank" class="btn btn-secondary btn-card" title="View official release notes">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Docs
                </a>
                <button class="btn btn-secondary btn-card copy-btn" title="Copy text to clipboard">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>
                <button class="btn btn-tweet btn-card tweet-btn" title="Tweet this update">
                    <i class="fa-brands fa-x-twitter"></i> Tweet
                </button>
            </div>
        `;
        
        // Copy button event listener
        card.querySelector('.copy-btn').addEventListener('click', () => {
            copyUpdateToClipboard(update);
        });
        
        // Tweet button event listener
        card.querySelector('.tweet-btn').addEventListener('click', () => {
            openTweetModal(update);
        });
        
        elements.updatesGrid.appendChild(card);
    });
}

// Helper to copy text content to clipboard
function copyUpdateToClipboard(update) {
    const textToCopy = `BigQuery ${update.type} (${update.date}):\n\n${update.content_text}\n\nRead more: ${update.link}`;
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast('Copied release note details to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy to clipboard.', 'error');
        });
}

// Open Tweet Composer Modal
function openTweetModal(update) {
    selectedUpdateForTweet = update;
    
    // Create pre-filled content for X/Twitter intent
    // Twitter links are automatically shortened to 23 chars. 
    // We budget text length to fit within 280 characters safely.
    const hashtags = "\n#GoogleCloud #BigQuery";
    const header = `📢 BigQuery ${update.type} (${update.date}):\n`;
    const footer = `\n\nRead more: ${update.link}${hashtags}`;
    
    // Calculate space for description snippet
    // Estimate links as 23 characters (standard Twitter URL wrap)
    const estimatedLinkLength = 23;
    const reservedLength = header.length + "\n\nRead more: ".length + estimatedLinkLength + hashtags.length;
    const maxDescLength = 280 - reservedLength - 5; // buffer for spacing/quotes
    
    let description = update.content_text.replace(/\s+/g, ' '); // collapse whitespaces
    
    if (description.length > maxDescLength) {
        description = description.substring(0, maxDescLength) + '...';
    }
    
    const initialTweet = `${header}"${description}"${footer}`;
    
    elements.tweetTextarea.value = initialTweet;
    elements.tweetModal.style.display = 'flex';
    elements.tweetTextarea.focus();
    
    handleTweetInput(); // Trigger count calculation on load
}

// Close Tweet Composer Modal
function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
    selectedUpdateForTweet = null;
}

// Character Count & SVG Progress Ring Logic
function handleTweetInput() {
    const text = elements.tweetTextarea.value;
    
    // Twitter's URL shortening: Twitter treats any URL as 23 characters.
    // Let's implement Twitter-compatible character calculation:
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedLength = text.length;
    const urls = text.match(urlRegex) || [];
    
    urls.forEach(url => {
        computedLength = computedLength - url.length + 23;
    });
    
    const remaining = 280 - computedLength;
    elements.charCountText.textContent = remaining;
    
    // Update live preview
    elements.tweetPreviewContent.textContent = text;
    
    // Handle progress circle
    const percentage = Math.min(Math.max(computedLength / 280, 0), 1);
    const offset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    elements.progressRingCircle.style.strokeDashoffset = offset;
    
    // Color thresholds for progress ring
    if (computedLength >= 280) {
        elements.progressRingCircle.style.stroke = 'var(--color-deprecated)'; // Red
        elements.charCountText.style.color = 'var(--color-deprecated)';
        elements.tweetPublishBtn.disabled = true;
    } else if (computedLength >= 260) {
        elements.progressRingCircle.style.stroke = 'var(--color-issue)'; // Yellow/Orange
        elements.charCountText.style.color = 'var(--color-issue)';
        elements.tweetPublishBtn.disabled = false;
    } else {
        elements.progressRingCircle.style.stroke = 'var(--accent-blue)'; // Default Blue
        elements.charCountText.style.color = 'var(--text-secondary)';
        elements.tweetPublishBtn.disabled = false;
    }
}

// Publish Tweet via Twitter Web Intent
function publishTweet() {
    const text = elements.tweetTextarea.value;
    
    // Basic length validation
    // Recalculate computed length for security check
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedLength = text.length;
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
        computedLength = computedLength - url.length + 23;
    });
    
    if (computedLength > 280) {
        showToast('Tweet exceeds X character limit of 280!', 'error');
        return;
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
    closeTweetModal();
    showToast('Redirected to X (Twitter) Web Intent!', 'success');
}

// Toast Notifications System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Fade out and remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('fadeOut');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// Export Filtered Updates to CSV
function exportToCSV() {
    if (filteredUpdates.length === 0) {
        showToast('No updates available to export.', 'error');
        return;
    }
    
    const headers = ['ID', 'Date', 'Type', 'Content Text', 'Link'];
    const rows = filteredUpdates.map(update => [
        update.id,
        update.date,
        update.type,
        update.content_text,
        update.link
    ]);
    
    const escapeCSV = val => {
        if (val === undefined || val === null) return '';
        let formatted = String(val).replace(/"/g, '""');
        if (formatted.includes(',') || formatted.includes('"') || formatted.includes('\n') || formatted.includes('\r')) {
            formatted = `"${formatted}"`;
        }
        return formatted;
    };
    
    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const filterStr = currentFilter !== 'all' ? `_${currentFilter.toLowerCase()}` : '';
    link.setAttribute("download", `bigquery_release_notes_${dateStr}${filterStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredUpdates.length} updates to CSV!`, 'success');
}

// Initialize theme state from localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        elements.themeIcon.className = 'fa-regular fa-moon';
    } else {
        document.body.classList.remove('light-mode');
        elements.themeIcon.className = 'fa-regular fa-sun';
    }
}

// Toggle between Dark and Light themes
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    if (isLight) {
        localStorage.setItem('theme', 'light');
        elements.themeIcon.className = 'fa-regular fa-moon';
        showToast('Swapped to Light Theme', 'info');
    } else {
        localStorage.setItem('theme', 'dark');
        elements.themeIcon.className = 'fa-regular fa-sun';
        showToast('Swapped to Dark Theme', 'info');
    }
}
