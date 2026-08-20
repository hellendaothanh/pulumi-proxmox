// ==========================================
// UTILITY FUNCTIONS (public/js/utils.js)
// ==========================================

window.formatBytes = function(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

window.copyToClipboard = function(text, btnElement) {
    if (!navigator.clipboard) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
    } else {
        navigator.clipboard.writeText(text);
    }
    if (btnElement) {
        const originalText = btnElement.innerHTML;
        btnElement.classList.add("copied");
        const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
        btnElement.innerHTML = `<i data-lucide="check" class="copy-icon-sm"></i> <span>${isEn ? 'Copied!' : 'Đã chép!'}</span>`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            btnElement.innerHTML = originalText;
            btnElement.classList.remove("copied");
            if (window.lucide) window.lucide.createIcons();
        }, 1800);
    }
};

window.showToast = function(message, type = "info", duration = 4000) {
    let toast = document.getElementById("appToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";
        toast.className = "app-toast";
        document.body.appendChild(toast);
    }

    toast.className = `app-toast toast-${type} show`;
    let icon = "info";
    if (type === "error") icon = "alert-octagon";
    if (type === "warning") icon = "alert-triangle";
    if (type === "success") icon = "check-circle";

    toast.innerHTML = `<i data-lucide="${icon}" style="width:18px;height:18px;flex-shrink:0;"></i> <span>${message}</span>`;
    if (window.lucide) window.lucide.createIcons();

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
};

window.showRbacAlert = function(message) {
    window.showToast(message, "error", 5000);
};

window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

window.confirmDialog = function(viMsg, enMsg) {
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    return window.confirm(isEn ? enMsg : viMsg);
};
