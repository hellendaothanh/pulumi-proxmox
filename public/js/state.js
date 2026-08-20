// ==========================================
// APPLICATION STATE (public/js/state.js)
// ==========================================

window.currentUser = null;
window.cachedClusterData = [];
window.cachedVms = [];
window.activeFilters = {
    env: "all",
    status: "all",
    search: ""
};

window.getAuthHeaders = function() {
    const token = localStorage.getItem("pulumi_auth_token");
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
};
