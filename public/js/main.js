// ==========================================
// MAIN APPLICATION BOOTSTRAP (public/js/main.js)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Khởi tạo Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Language Dropdown
    window.toggleLangDropdown = (e) => {
        e?.stopPropagation();
        const menu = document.getElementById("langDropdownMenu");
        if (menu) menu.classList.toggle("show");
    };

    document.addEventListener("click", () => {
        const menu = document.getElementById("langDropdownMenu");
        if (menu) menu.classList.remove("show");
    });

    // 3. Khởi tạo các Subsystem Controllers
    if (typeof window.initAuth === "function") window.initAuth();
    if (typeof window.initConsoleStreamer === "function") window.initConsoleStreamer();
    if (typeof window.initAlerts === "function") window.initAlerts();
    if (typeof window.initCluster === "function") window.initCluster();
    if (typeof window.initWizard === "function") window.initWizard();
    if (typeof window.initVms === "function") window.initVms();
    if (typeof window.initSnapshots === "function") window.initSnapshots();
    if (typeof window.initFirewall === "function") window.initFirewall();
    if (typeof window.initHardware === "function") window.initHardware();
    if (typeof window.initApprovals === "function") window.initApprovals();
    if (typeof window.initAudit === "function") window.initAudit();

    // 4. Tab Navigation
    const tabs = document.querySelectorAll(".nav-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const targetId = tab.getAttribute("data-tab");
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add("active");

            if (targetId === "tab-overview") {
                if (typeof window.loadClusterResources === "function") window.loadClusterResources();
            } else if (targetId === "tab-deploy") {
                if (!window.cachedClusterData || !window.cachedClusterData.length) {
                    if (typeof window.loadClusterResources === "function") window.loadClusterResources();
                }
                if (typeof window.loadVms === "function") window.loadVms();
                if (typeof window.applyRbacUiRestrictions === "function") window.applyRbacUiRestrictions();
            } else if (targetId === "tab-approvals") {
                if (typeof window.loadQuotasAndApprovals === "function") window.loadQuotasAndApprovals();
            } else if (targetId === "tab-audit") {
                if (typeof window.loadAuditLogs === "function") window.loadAuditLogs();
            }
            if (window.lucide) window.lucide.createIcons();
        });
    });

    // 5. Lắng nghe chuyển đổi ngôn ngữ để re-render lại toàn bộ thành phần
    window.addEventListener("portal_language_changed", () => {
        if (window.cachedClusterData && window.cachedClusterData.length > 0 && typeof window.renderClusterView === "function") {
            const searchInput = document.getElementById("vmSearchInput");
            const term = searchInput ? searchInput.value : "";
            window.renderClusterView(window.cachedClusterData, term);
        }
        if (typeof window.loadVms === "function") window.loadVms();
        if (typeof window.loadQuotasAndApprovals === "function") window.loadQuotasAndApprovals();
        if (typeof window.loadAuditLogs === "function") window.loadAuditLogs();
        if (typeof window.loadClusterAlerts === "function") window.loadClusterAlerts();
    });

    // 6. Kiểm tra phiên đăng nhập & Tải dữ liệu ban đầu
    if (typeof window.checkAuthSession === "function") {
        window.checkAuthSession();
    }
    if (typeof window.loadClusterResources === "function") {
        window.loadClusterResources();
    }
    if (typeof window.loadClusterAlerts === "function") {
        window.loadClusterAlerts();
    }

    // 7. Chu kỳ định kỳ quét cảnh báo mỗi 20 giây
    setInterval(() => {
        if (typeof window.loadClusterAlerts === "function") {
            window.loadClusterAlerts();
        }
    }, 20000);
});
