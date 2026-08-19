document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo Lucide Icons ban đầu
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // ==========================================
    // STEPPED PROVISION FORM NAVIGATION WIZARD
    // ==========================================
    window.goToStep = (stepNumber) => {
        const steps = [
            document.getElementById("step1Details"),
            document.getElementById("step2Details"),
            document.getElementById("step3Details"),
            document.getElementById("step4Details"),
        ];

        steps.forEach((step, index) => {
            if (!step) return;
            if (index + 1 === stepNumber) {
                step.open = true;
                step.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } else {
                step.open = false;
            }
        });

        if (window.lucide) window.lucide.createIcons();
    };

    // ==========================================
    // USER AUTHENTICATION & RBAC STATE
    // ==========================================
    let currentAuthToken = localStorage.getItem("pulumi_auth_token") || "";
    let currentAuthUser = null;
    let currentAlertData = null;

    const loginModal = document.getElementById("loginModal");
    const loginForm = document.getElementById("loginForm");
    const loginUsername = document.getElementById("loginUsername");
    const loginPassword = document.getElementById("loginPassword");
    const loginErrorMsg = document.getElementById("loginErrorMsg");
    const loginErrorText = document.getElementById("loginErrorText");
    const btnSubmitLogin = document.getElementById("btnSubmitLogin");

    const userProfileBadge = document.getElementById("userProfileBadge");
    const userAvatar = document.getElementById("userAvatar");
    const userDisplayName = document.getElementById("userDisplayName");
    const userRoleBadge = document.getElementById("userRoleBadge");
    const btnLogout = document.getElementById("btnLogout");

    // Quick Fill Form Demo User
    window.fillLoginForm = (username) => {
        if (loginUsername) loginUsername.value = username;
        if (loginPassword) {
            loginPassword.value = "";
            loginPassword.focus();
        }
        if (loginErrorMsg) loginErrorMsg.classList.add("hidden");

        document.querySelectorAll(".btn-demo-user").forEach(btn => {
            if (btn.querySelector("strong")?.textContent === username) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    };

    // Toggle hiển thị / ẩn mật khẩu khi đăng nhập
    const btnToggleLoginPass = document.getElementById("btnToggleLoginPass");
    if (btnToggleLoginPass && loginPassword) {
        btnToggleLoginPass.addEventListener("click", () => {
            const isPassword = loginPassword.type === "password";
            loginPassword.type = isPassword ? "text" : "password";
            btnToggleLoginPass.innerHTML = isPassword 
                ? `<i data-lucide="eye-off" style="width:16px;height:16px;color:#818cf8;"></i>` 
                : `<i data-lucide="eye" style="width:16px;height:16px;"></i>`;
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // Hàm lấy headers xác thực đính kèm mọi request
    window.getAuthHeaders = () => {
        const headers = { "Content-Type": "application/json" };
        if (currentAuthToken) {
            headers["Authorization"] = `Bearer ${currentAuthToken}`;
        }
        if (currentAuthUser) {
            headers["x-user-name"] = currentAuthUser.username;
            headers["x-user-role"] = currentAuthUser.role;
        }
        return headers;
    };

    // ==========================================
    // SSO & CENTRALIZED AUTHENTICATION STATE
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const callbackToken = urlParams.get("token");
    const authError = urlParams.get("auth_error");

    if (callbackToken) {
        localStorage.setItem("pulumi_auth_token", callbackToken);
        currentAuthToken = callbackToken;
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (authError) {
        const ssoErrorBanner = document.getElementById("ssoErrorBanner");
        const ssoErrorText = document.getElementById("ssoErrorText");
        if (ssoErrorBanner && ssoErrorText) {
            ssoErrorText.textContent = authError;
            ssoErrorBanner.classList.remove("hidden");
        }
        showToast(`⛔ Đăng nhập thất bại: ${authError}`);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    window.initiateSsoLogin = async (provider) => {
        try {
            const res = await fetch(`/api/auth/login/${provider}?returnUrl=/`, {
                headers: { "Accept": "application/json" }
            });
            const data = await res.json();
            if (data.success && data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                showToast(`⛔ Lỗi khởi tạo SSO: ${data.error || 'Không nhận được authUrl'}`);
            }
        } catch (err) {
            window.location.href = `/api/auth/login/${provider}`;
        }
    };

    async function loadAuthProviders() {
        try {
            const res = await fetch("/api/auth/providers");
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const ssoProviders = data.data.filter(p => p.id !== "local" && p.enabled);
                const ssoSection = document.getElementById("ssoSection");
                const ssoDivider = document.querySelector(".sso-divider");
                const ssoButtonsContainer = document.getElementById("ssoButtonsContainer");

                if (ssoProviders.length === 0) {
                    if (ssoSection) ssoSection.style.display = "none";
                    if (ssoDivider) ssoDivider.style.display = "none";
                } else {
                    if (ssoSection) ssoSection.style.display = "block";
                    if (ssoDivider) ssoDivider.style.display = "flex";
                    if (ssoButtonsContainer) {
                        ssoButtonsContainer.innerHTML = ssoProviders.map(p => {
                            if (p.id === "google") {
                                return `
                                    <button type="button" class="btn-sso btn-sso-google" onclick="initiateSsoLogin('google')">
                                        <svg class="sso-icon-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                                        <span>${p.name}</span>
                                    </button>
                                `;
                            } else if (p.id === "github") {
                                return `
                                    <button type="button" class="btn-sso btn-sso-github" onclick="initiateSsoLogin('github')">
                                        <svg class="sso-icon-svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                                        <span>${p.name}</span>
                                    </button>
                                `;
                            } else {
                                return `
                                    <button type="button" class="btn-sso btn-sso-oidc" onclick="initiateSsoLogin('oidc')">
                                        <i data-lucide="shield" class="btn-icon-xs" style="color:#a855f7;"></i>
                                        <span>${p.name}</span>
                                    </button>
                                `;
                            }
                        }).join("");
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
            }
        } catch {}
    }

    // Kiểm tra trạng thái đăng nhập khi load trang
    async function checkAuthSession() {
        loadAuthProviders();

        if (!currentAuthToken) {
            showLoginModal();
            return;
        }

        try {
            const res = await fetch("/api/auth/me", {
                headers: { "Authorization": `Bearer ${currentAuthToken}` }
            });
            if (!res.ok) {
                localStorage.removeItem("pulumi_auth_token");
                currentAuthToken = "";
                currentAuthUser = null;
                showLoginModal();
                return;
            }
            const data = await res.json();
            if (data.success && data.data) {
                currentAuthUser = data.data;
                hideLoginModal();
                updateUserInterfaceProfile();
                applyRbacUiRestrictions();
                loadAuditLogs();
                loadQuotasAndApprovals();
            } else {
                localStorage.removeItem("pulumi_auth_token");
                currentAuthToken = "";
                currentAuthUser = null;
                showLoginModal();
            }
        } catch {
            showLoginModal();
        }
    }

    function showLoginModal() {
        if (loginModal) {
            loginModal.classList.remove("hidden");
            if (window.lucide) window.lucide.createIcons();
        }
    }

    function hideLoginModal() {
        if (loginModal) loginModal.classList.add("hidden");
    }

    function updateUserInterfaceProfile() {
        if (!currentAuthUser) return;
        const userProviderBadge = document.getElementById("userProviderBadge");
        if (userProviderBadge) {
            if (currentAuthUser.provider && currentAuthUser.provider !== "local") {
                userProviderBadge.textContent = currentAuthUser.providerName || currentAuthUser.provider.toUpperCase();
                userProviderBadge.classList.remove("hidden");
            } else {
                userProviderBadge.classList.add("hidden");
            }
        }

        if (userAvatar) {
            if (currentAuthUser.avatar && (currentAuthUser.avatar.startsWith("http://") || currentAuthUser.avatar.startsWith("https://"))) {
                userAvatar.innerHTML = `<img src="${currentAuthUser.avatar}" alt="Avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`;
            } else {
                const iconName = currentAuthUser.avatar || (currentAuthUser.role === 'admin' ? 'shield-check' : (currentAuthUser.role === 'viewer' ? 'eye' : 'code-2'));
                userAvatar.innerHTML = `<i data-lucide="${iconName}" class="user-svg-icon"></i>`;
            }
        }
        if (userDisplayName) userDisplayName.textContent = currentAuthUser.displayName || currentAuthUser.username;
        if (userRoleBadge) {
            userRoleBadge.textContent = currentAuthUser.role.toUpperCase();
            userRoleBadge.className = `user-role-badge role-${currentAuthUser.role.toLowerCase()}`;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    // Xử lý submit Login Form
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = (loginUsername.value || "").trim();
            const password = (loginPassword.value || "").trim();

            btnSubmitLogin.disabled = true;
            btnSubmitLogin.querySelector(".spinner")?.classList.remove("hidden");
            loginErrorMsg?.classList.add("hidden");

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (data.success && data.data) {
                    currentAuthToken = data.data.token;
                    currentAuthUser = data.data.user;
                    localStorage.setItem("pulumi_auth_token", currentAuthToken);

                    hideLoginModal();
                    updateUserInterfaceProfile();
                    applyRbacUiRestrictions();
                    showToast(`Chào mừng ${currentAuthUser.displayName} (${currentAuthUser.role.toUpperCase()}) đăng nhập thành công!`);

                    loadClusterResources();
                    loadAuditLogs();
                    loadQuotasAndApprovals();
                } else {
                    loginErrorText.textContent = data.error || "Tên đăng nhập hoặc mật khẩu không chính xác.";
                    loginErrorMsg?.classList.remove("hidden");
                }
            } catch (err) {
                loginErrorText.textContent = `Lỗi kết nối tới Server: ${err.message}`;
                loginErrorMsg?.classList.remove("hidden");
            } finally {
                btnSubmitLogin.disabled = false;
                btnSubmitLogin.querySelector(".spinner")?.classList.add("hidden");
            }
        });
    }

    // Xử lý Đăng xuất
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?")) {
                try {
                    await fetch("/api/auth/logout", {
                        method: "POST",
                        headers: getAuthHeaders()
                    });
                } catch {}

                localStorage.removeItem("pulumi_auth_token");
                currentAuthToken = "";
                currentAuthUser = null;
                showToast("Đã đăng xuất an toàn.");
                showLoginModal();
            }
        });
    }

    // Modal Đổi Mật Khẩu
    const changePasswordModal = document.getElementById("changePasswordModal");
    const btnChangePasswordModal = document.getElementById("btnChangePasswordModal");
    const btnClosePasswordModal = document.getElementById("btnClosePasswordModal");
    const btnCancelChangePassword = document.getElementById("btnCancelChangePassword");
    const changePasswordForm = document.getElementById("changePasswordForm");
    const oldPasswordInput = document.getElementById("oldPasswordInput");
    const newPasswordInput = document.getElementById("newPasswordInput");
    const confirmPasswordInput = document.getElementById("confirmPasswordInput");
    const changePassError = document.getElementById("changePassError");
    const btnSubmitChangePassword = document.getElementById("btnSubmitChangePassword");

    if (btnChangePasswordModal) {
        btnChangePasswordModal.addEventListener("click", () => {
            if (changePasswordForm) changePasswordForm.reset();
            if (changePassError) changePassError.classList.add("hidden");
            changePasswordModal.classList.remove("hidden");
            if (window.lucide) window.lucide.createIcons();
        });
    }

    const closeChangePass = () => changePasswordModal.classList.add("hidden");
    if (btnClosePasswordModal) btnClosePasswordModal.addEventListener("click", closeChangePass);
    if (btnCancelChangePassword) btnCancelChangePassword.addEventListener("click", closeChangePass);

    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const oldPassword = oldPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (newPassword !== confirmPassword) {
                changePassError.textContent = "Mật khẩu xác nhận không khớp!";
                changePassError.classList.remove("hidden");
                return;
            }

            btnSubmitChangePassword.disabled = true;
            btnSubmitChangePassword.querySelector(".spinner")?.classList.remove("hidden");

            try {
                const res = await fetch("/api/auth/change-password", {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ oldPassword, newPassword })
                });
                const data = await res.json();
                if (data.success) {
                    closeChangePass();
                    showToast("🎉 Đổi mật khẩu thành công! Mật khẩu mới có hiệu lực ngay.");
                    loadAuditLogs();
                } else {
                    changePassError.textContent = data.error || "Không thể đổi mật khẩu.";
                    changePassError.classList.remove("hidden");
                }
            } catch (err) {
                changePassError.textContent = `Lỗi: ${err.message}`;
                changePassError.classList.remove("hidden");
            } finally {
                btnSubmitChangePassword.disabled = false;
                btnSubmitChangePassword.querySelector(".spinner")?.classList.add("hidden");
            }
        });
    }

    // Áp dụng chính sách hiển thị giao diện theo 3 Role (Admin, Developer, Viewer)
    // Áp dụng chính sách hiển thị giao diện theo 3 Role (Admin, Developer, Viewer)
    function applyRbacUiRestrictions() {
        const userRole = currentAuthUser ? currentAuthUser.role : "viewer";
        const envRadios = document.querySelectorAll("input[name='environment']");
        const deployTabBtn = document.querySelector(".nav-tab[data-tab='tab-deploy']");
        const btnSubmitVm = document.getElementById("btnSubmit");

        // 1. Viewer: Vô hiệu hóa nút tạo VM, cảnh báo trực quan
        if (userRole === "viewer") {
            if (deployTabBtn) {
                deployTabBtn.title = "Tài khoản Viewer chỉ có quyền xem, không được phép tạo VM";
                deployTabBtn.style.opacity = "0.6";
            }
            if (btnSubmitVm) {
                btnSubmitVm.disabled = true;
                btnSubmitVm.title = "⛔ Tài khoản Viewer không có quyền tạo máy ảo";
                btnSubmitVm.innerHTML = `<i data-lucide="lock" class="btn-icon"></i> <span>Chỉ Xem (Không có quyền Tạo VM)</span>`;
            }
        } else {
            if (deployTabBtn) {
                deployTabBtn.title = "";
                deployTabBtn.style.opacity = "1";
            }
            if (btnSubmitVm) {
                btnSubmitVm.disabled = false;
                btnSubmitVm.title = "";
                btnSubmitVm.innerHTML = `<span class="spinner hidden"></span><span class="btn-text">Triển Khai VM</span>`;
            }
        }

        // 2. Developer: Hiển thị nhãn (Cần Phê Duyệt) trên STAGING / PROD
        const isDevOnly = userRole === "developer";
        envRadios.forEach(r => {
            r.disabled = (userRole === "viewer");
            if (isDevOnly && r.value !== "dev") {
                r.closest(".env-radio-card")?.classList.add("requires-approval-option");
                r.title = "Cần Quản Trị Viên phê duyệt";
            } else {
                r.closest(".env-radio-card")?.classList.remove("requires-approval-option");
                r.title = "";
            }
        });

        // Tự động re-render lại cluster view & VM list để cập nhật các nút thao tác
        if (cachedClusterData && cachedClusterData.length > 0) {
            renderClusterView(cachedClusterData, currentSearchTerm);
        }
        loadVms();
        if (window.lucide) window.lucide.createIcons();
    }

    checkAuthSession();

    // Tabs Navigation
    const tabs = document.querySelectorAll(".nav-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const targetId = tab.getAttribute("data-tab");
            document.getElementById(targetId).classList.add("active");

            if (targetId === "tab-overview") {
                loadClusterResources();
            } else if (targetId === "tab-deploy") {
                if (!cachedClusterData.length) {
                    loadClusterResources();
                }
                loadVms();
                applyRbacUiRestrictions();
            } else if (targetId === "tab-approvals") {
                loadQuotasAndApprovals();
            } else if (targetId === "tab-audit") {
                loadAuditLogs();
            }
            if (window.lucide) window.lucide.createIcons();
        });
    });

    // Helper format bytes
    function formatBytes(bytes, decimals = 2) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Helper format Uptime
    function formatUptime(seconds) {
        if (!seconds) return "-";
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    }

    // Helper Copy to Clipboard & Toast
    window.copyToClipboard = (text, btn) => {
        if (!text || text === "-" || text === "N/A" || text.includes("Chờ") || text === "Pending") return;
        
        const doVisualFeedback = () => {
            if (btn) {
                const originalHtml = btn.innerHTML;
                btn.classList.add("copied");
                showToast(`Đã sao chép: ${text}`);
                setTimeout(() => {
                    btn.classList.remove("copied");
                    btn.innerHTML = originalHtml;
                    if (window.lucide) window.lucide.createIcons();
                }, 1500);
            } else {
                showToast(`Đã sao chép: ${text}`);
            }
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(doVisualFeedback).catch(() => {
                fallbackCopy(text);
                doVisualFeedback();
            });
        } else {
            fallbackCopy(text);
            doVisualFeedback();
        }
    };

    function fallbackCopy(text) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
    }

    // Helper Toast & RBAC Alert Box
    window.showToast = (msg, type = "info") => {
        let toast = document.getElementById("appToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "appToast";
            toast.className = "app-toast";
            document.body.appendChild(toast);
        }
        toast.className = `app-toast toast-${type} show`;
        toast.innerHTML = (type === "error" ? "⛔ " : (type === "warning" ? "⚠️ " : "ℹ️ ")) + msg;
        setTimeout(() => {
            toast.classList.remove("show");
        }, type === "error" ? 4500 : 2500);
    };

    window.showRbacAlert = (message) => {
        showToast(message, "error");
        alert(message);
    };

    // Helper Environment & Tags Badges
    function getEnvironmentTag(tags) {
        if (!tags) return "";
        const list = Array.isArray(tags) ? tags : String(tags).split(/[,;\s]+/);
        const lowerList = list.map(t => t.trim().toLowerCase());
        if (lowerList.some(t => t === "pro" || t === "prod" || t === "production")) {
            return `<span class="tag-env tag-env-pro"><span class="env-indicator-dot pro"></span>PROD</span>`;
        }
        if (lowerList.some(t => t === "stag" || t === "staging")) {
            return `<span class="tag-env tag-env-stag"><span class="env-indicator-dot stag"></span>STAGING</span>`;
        }
        if (lowerList.some(t => t === "dev")) {
            return `<span class="tag-env tag-env-dev"><span class="env-indicator-dot dev"></span>DEV</span>`;
        }
        return "";
    }

    function getCustomTags(tags) {
        if (!tags || !tags.length) return "";
        const envs = ["dev", "stag", "staging", "pro", "prod", "production"];
        const list = Array.isArray(tags) ? tags : String(tags).split(/[,;\s]+/);
        const filtered = list.map(t => t.trim()).filter(t => t && !envs.includes(t.toLowerCase()));
        if (!filtered.length) return "";
        return filtered.map(t => `<span class="tag-custom">#${t}</span>`).join(" ");
    }

    // Helper trích xuất thông tin & dung lượng ổ đĩa của VM
    function getVmDiskSize(vm) {
        if (!vm) return "N/A";
        const cfg = vm.config || {};

        // Quét các bus lưu trữ phổ biến trên Proxmox: scsi0..3, virtio0..3, sata0..3, ide0..3
        for (const prefix of ["scsi", "virtio", "sata", "ide"]) {
            for (let i = 0; i < 4; i++) {
                const val = cfg[`${prefix}${i}`];
                if (val && typeof val === "string") {
                    // Match dạng "size=32G" hoặc "size=100G" hoặc "size=10240M"
                    const m = val.match(/size=([0-9.]+[GMKTP]?i?B?)/i);
                    if (m && m[1]) return m[1].toUpperCase();
                    // Match dạng "zfs-storage:vm-100-disk-0,size=30G"
                    const m2 = val.match(/,([0-9.]+[GMKTP]?)/i);
                    if (m2 && m2[1] && isNaN(Number(m2[1]))) return m2[1].toUpperCase();
                }
            }
        }

        // Fallback sang trường maxdisk từ status/qemu API nếu có
        if (vm.maxdisk && vm.maxdisk > 0) {
            return formatBytes(vm.maxdisk);
        }

        return "Disk: N/A";
    }

    function renderEnvBadge(env) {
        const e = (env || "dev").toLowerCase();
        if (e === "pro" || e === "prod" || e === "production") {
            return `<span class="tag-env tag-env-pro"><span class="env-indicator-dot pro"></span>PROD</span>`;
        }
        if (e === "stag" || e === "staging") {
            return `<span class="tag-env tag-env-stag"><span class="env-indicator-dot stag"></span>STAGING</span>`;
        }
        return `<span class="tag-env tag-env-dev"><span class="env-indicator-dot dev"></span>DEV</span>`;
    }

    function renderCustomTags(tags) {
        return getCustomTags(tags);
    }

    function getNodePrimaryStorageType(node) {
        if (!node.storages || !node.storages.length) return "lvm";
        const hasZfs = node.storages.some(s => s.storage && s.storage.includes("zfs") && s.active !== 0);
        if (hasZfs) return "zfs";
        const hasLvm = node.storages.some(s => s.storage && s.storage.includes("lvm") && s.active !== 0);
        if (hasLvm) return "lvm";
        return "dir";
    }

    // ==========================================
    // 1. TẢI TÀI NGUYÊN TOÀN CỤM PROXMOX (CLUSTER)
    // ==========================================
    const clusterContainer = document.getElementById("clusterContainer");
    const btnRefreshResources = document.getElementById("btnRefreshResources");
    let cachedClusterData = [];

    async function loadClusterResources() {
        clusterContainer.innerHTML = `
            <div class="card text-center text-muted">
                <span class="spinner" style="margin: 20px auto; display:block;"></span>
                Đang quét thông tin Nodes, Storages, Images và VM từ Proxmox API...
            </div>
        `;

        try {
            const res = await fetch("/api/resources");
            const contentType = res.headers.get("content-type") || "";
            
            if (!res.ok) {
                const text = await res.text();
                clusterContainer.innerHTML = `<div class="card text-center text-error">Lỗi Proxmox API [${res.status}]: ${text}</div>`;
                return;
            }

            if (!contentType.includes("application/json")) {
                const text = await res.text();
                clusterContainer.innerHTML = `<div class="card text-center text-error">Máy chủ trả về phản hồi không phải JSON: ${text.slice(0, 150)}...</div>`;
                return;
            }

            const data = await res.json();

            if (!data.success || !data.data || data.data.length === 0) {
                clusterContainer.innerHTML = `<div class="card text-center text-error">Không lấy được dữ liệu cụm Proxmox: ${data.error || 'Dữ liệu trống'}</div>`;
                return;
            }

            // Sắp xếp tự nhiên tên Node theo thứ tự chữ cái & số (node01, node02, node03, node04, node05...)
            data.data.sort((a, b) => a.node.localeCompare(b.node, undefined, { numeric: true, sensitivity: 'base' }));

            // Sắp xếp VM trên từng node theo VM ID tăng dần
            data.data.forEach(node => {
                if (node.vms && Array.isArray(node.vms)) {
                    node.vms.sort((a, b) => (a.vmid || 0) - (b.vmid || 0));
                }
            });

            cachedClusterData = data.data;
            renderClusterView(data.data, currentSearchTerm);
            populateDeployForm(data.data);
        } catch (err) {
            clusterContainer.innerHTML = `<div class="card text-center text-error">Lỗi kết nối API: ${err.message}</div>`;
        }
    }

    let currentSearchTerm = "";

    function renderClusterView(nodes, searchTerm = "") {
        const term = (searchTerm || "").trim().toLowerCase();

        // Lọc danh sách nodes hoặc VMs nếu có searchTerm
        const filteredNodes = nodes.map(node => {
            if (!term) return node;

            const nodeMatches = (node.node || "").toLowerCase().includes(term);
            const filteredVms = (node.vms || []).filter(vm => {
                const nameMatches = (vm.name || "").toLowerCase().includes(term);
                const idMatches = String(vm.vmid || "").includes(term);
                const statusMatches = (typeof vm.status === "object" ? vm.status?.status : vm.status || "").toLowerCase().includes(term);
                const ipMatches = (vm.agentIps || []).some(ip => ip.toLowerCase().includes(term));
                const tagMatches = (Array.isArray(vm.tags) ? vm.tags.join(" ") : String(vm.tags || "")).toLowerCase().includes(term);
                return nameMatches || idMatches || statusMatches || ipMatches || tagMatches;
            });

            if (nodeMatches) {
                return node; // Nếu tìm trúng tên node thì hiển thị toàn bộ VM của node đó
            }

            return {
                ...node,
                vms: filteredVms,
                _matchedVmsCount: filteredVms.length
            };
        }).filter(node => !term || (node.node || "").toLowerCase().includes(term) || (node.vms && node.vms.length > 0));

        if (filteredNodes.length === 0) {
            clusterContainer.innerHTML = `
                <div class="card text-center text-muted" style="padding: 40px 20px;">
                    <i data-lucide="search-x" style="width:40px;height:40px;margin:0 auto 12px;opacity:0.6;display:block;"></i>
                    <h3 style="color:#f8fafc; font-size:16px; margin-bottom:6px;">Không tìm thấy máy ảo hoặc Node phù hợp</h3>
                    <p style="font-size:13px;">Không có kết quả nào khớp với từ khóa "<strong>${searchTerm}</strong>". Thử tìm theo Tên VM, VM ID, IP hoặc Tags.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // Tạo thanh Mục Lục Node (Node Quick Nav Index)
        const nodeIndexHtml = `
            <div class="node-quick-nav">
                <div class="quick-nav-header">
                    <div class="quick-nav-title">
                        <i data-lucide="compass" class="nav-icon"></i>
                        <span>Mục Lục Node (${filteredNodes.length} Nodes)</span>
                    </div>
                    <div class="quick-nav-actions">
                        <button class="btn-toggle-all" onclick="expandAllNodes(true)">
                            <i data-lucide="chevrons-down" class="btn-icon-xs"></i>
                            <span>Mở tất cả</span>
                        </button>
                        <button class="btn-toggle-all" onclick="expandAllNodes(false)">
                            <i data-lucide="chevrons-up" class="btn-icon-xs"></i>
                            <span>Thu gọn</span>
                        </button>
                    </div>
                </div>
                <div class="quick-nav-chips">
                    ${filteredNodes.map(node => {
                        const vmCount = node.vms ? node.vms.length : 0;
                        const runningCount = node.vms ? node.vms.filter(v => (typeof v.status === "object" ? v.status?.status : v.status) === "running").length : 0;
                        const storageType = getNodePrimaryStorageType(node);
                        return `
                            <button class="node-chip-link" onclick="focusAndScrollToNode('${node.node}')" title="Chuyển nhanh đến ${node.node}">
                                <span class="status-dot online"></span>
                                <strong>${node.node}</strong>
                                <span class="chip-vm-count">${runningCount}/${vmCount} VMs</span>
                                <span class="chip-storage-tag">${storageType.toUpperCase()}</span>
                            </button>
                        `;
                    }).join("")}
                </div>
            </div>
        `;

        const storageThresh = (currentAlertData && currentAlertData.thresholds) ? currentAlertData.thresholds.storagePercent : 85;
        const cpuThresh = (currentAlertData && currentAlertData.thresholds) ? currentAlertData.thresholds.cpuPercent : 85;
        const ramThresh = (currentAlertData && currentAlertData.thresholds) ? currentAlertData.thresholds.ramPercent : 85;

        const nodesCardsHtml = filteredNodes.map(node => {
            // Lấy IP chính của node từ network
            const primaryNet = node.networks.find(n => n.address) || node.networks[0] || {};
            const nodeIp = primaryNet.address || "192.168.1.x";

            // Tính % CPU & RAM
            const cpuPercent = Number(node.cpu ? (node.cpu * 100).toFixed(1) : 0);
            const memUsed = formatBytes(node.mem);
            const memMax = formatBytes(node.maxmem);
            const memPercent = Number(node.maxmem ? ((node.mem / node.maxmem) * 100).toFixed(1) : 0);
            const isNodeOverloaded = (cpuPercent >= cpuThresh) || (memPercent >= ramThresh);

            // Storages list HTML
            const storagesHtml = node.storages.map(st => {
                const used = formatBytes(st.used);
                const total = formatBytes(st.total);
                const free = formatBytes(st.avail);
                const percent = Number(st.total ? ((st.used / st.total) * 100).toFixed(1) : 0);
                const isStorageDanger = percent >= storageThresh;

                // Các file contents (ISO, Disk, VM)
                const contentsHtml = st.contents && st.contents.length > 0 ? `
                    <div class="storage-files-list">
                        ${st.contents.map(c => `
                            <div class="storage-file-row">
                                <span style="display:flex;align-items:center;gap:5px;"><i data-lucide="file-text" style="width:12px;height:12px;opacity:0.7;"></i> ${c.volid.split('/').pop()}</span>
                                <span>${formatBytes(c.size)}</span>
                            </div>
                        `).join("")}
                    </div>
                ` : `<div class="text-muted" style="font-size:11px; margin-top:6px;">(Không có file hoặc không hỗ trợ đọc content)</div>`;

                return `
                    <div class="storage-item ${isStorageDanger ? 'storage-danger' : ''}">
                        <div class="storage-item-header">
                            <div class="storage-name">
                                <i data-lucide="database" class="field-icon"></i>
                                <span>${st.storage}</span>
                                <span class="storage-type-tag">${st.type}</span>
                                ${isStorageDanger ? `<span class="badge-storage-danger">🚨 Vượt ngưỡng (${percent}% ≥ ${storageThresh}%)</span>` : ''}
                            </div>
                            <div class="storage-usage-text ${isStorageDanger ? 'text-danger' : ''}">${used} / ${total} (${percent}%)</div>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${isStorageDanger ? 'progress-bar-danger' : ''}" style="width: ${percent}%;"></div>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-muted); display:flex; justify-content:space-between;">
                            <span>Khả dụng: <strong>${free}</strong></span>
                            <button class="storage-files-toggle" onclick="toggleStorageFiles('${node.node}-${st.storage}')">
                                <span>Xem Files (${st.contents ? st.contents.length : 0})</span>
                                <i data-lucide="chevron-down" style="width:12px;height:12px;"></i>
                            </button>
                        </div>
                        <div id="files-${node.node}-${st.storage}" style="display: none;">
                            ${contentsHtml}
                        </div>
                    </div>
                `;
            }).join("");

            // VMs list HTML on this node
            const vmsHtml = node.vms && node.vms.length > 0 ? node.vms.map(vm => {
                const statusStr = typeof vm.status === "object" ? (vm.status?.status || "unknown") : (vm.status || "unknown");
                const isRunning = statusStr === "running";
                const envTagHtml = getEnvironmentTag(vm.tags);
                const customTagsHtml = getCustomTags(vm.tags);

                const ipBadges = vm.agentIps && vm.agentIps.length > 0 
                    ? `<div class="ip-chips-grid">${vm.agentIps.map(ip => `
                        <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="Click để sao chép IP">
                            <i data-lucide="network" style="width:11px;height:11px;opacity:0.7;"></i>
                            <span>${ip}</span>
                            <i data-lucide="copy" class="copy-icon-sm"></i>
                        </button>
                    `).join("")}</div>`
                    : `<span class="text-muted" style="font-size:11px;">${isRunning ? "Chờ Agent..." : "—"}</span>`;

                return `
                    <tr>
                        <td class="vm-name-cell">
                            <div class="vm-name-title">
                                <span class="vm-name-text" title="${vm.name}">${vm.name}</span>
                                ${vm.config?.protection ? '<span class="badge-protected" title="Bảo vệ xoá"><i data-lucide="shield-alert" class="badge-svg"></i></span>' : ''}
                            </div>
                            <div class="vm-tags-row">
                                <span class="vm-id-badge">#${vm.vmid}</span>
                                ${envTagHtml}
                                ${customTagsHtml}
                            </div>
                        </td>
                        <td>
                            <span class="status-indicator ${isRunning ? 'status-running' : 'status-stopped'}">
                                <span class="status-dot ${isRunning ? 'online' : ''}"></span>
                                ${isRunning ? 'Running' : (statusStr === 'stopped' ? 'Stopped' : statusStr)}
                            </span>
                        </td>
                        <td class="vm-ip-cell">${ipBadges}</td>
                        <td class="vm-specs-cell">
                            <span class="spec-pill"><i data-lucide="cpu" class="spec-icon"></i> ${vm.cpus} vCPU</span>
                            <span class="spec-pill"><i data-lucide="layers" class="spec-icon"></i> ${formatBytes(vm.maxmem)}</span>
                            <span class="spec-pill"><i data-lucide="hard-drive" class="spec-icon"></i> ${getVmDiskSize(vm)}</span>
                        </td>
                        <td class="text-right vm-actions-cell">
                            <div class="vm-action-btn-group">
                                ${(() => {
                                    const role = currentAuthUser ? currentAuthUser.role : "viewer";
                                    const vmEnv = (vm.tags && Array.isArray(vm.tags) ? vm.tags.find(t => ["pro","prod","stag","staging","dev"].includes(t.toLowerCase())) : "dev") || "dev";
                                    const isProdOrStag = ["pro","prod","stag","staging"].includes(vmEnv.toLowerCase());
                                    const isDevForbidden = (role === "developer" && isProdOrStag);

                                    if (role === "viewer") {
                                        return `<span class="badge-optional" style="font-size:10.5px; opacity:0.6;"><i data-lucide="eye" style="width:11px;height:11px;"></i> Chỉ xem</span>`;
                                    }

                                    let powerBtns = "";
                                    if (isDevForbidden) {
                                        powerBtns = `<span class="badge-optional" title="Môi trường ${vmEnv.toUpperCase()} - Chỉ Admin mới có quyền điều khiển" style="font-size:10.5px; color:#f59e0b; border-color:rgba(245,158,11,0.3);"><i data-lucide="lock" style="width:11px;height:11px;"></i> ${vmEnv.toUpperCase()} Lock</span>`;
                                    } else {
                                        powerBtns = isRunning ? `
                                            <button class="btn-power-op btn-power-reboot" onclick="triggerVmPower('${node.node}', ${vm.vmid}, 'reboot')" title="Khởi động lại an toàn (Reboot)">
                                                <i data-lucide="rotate-cw" class="action-icon-xs"></i>
                                            </button>
                                            <button class="btn-power-op btn-power-stop" onclick="triggerVmPower('${node.node}', ${vm.vmid}, 'shutdown')" title="Tắt nguồn an toàn (ACPI Shutdown)">
                                                <i data-lucide="power" class="action-icon-xs"></i>
                                            </button>
                                        ` : `
                                            <button class="btn-power-op btn-power-start" onclick="triggerVmPower('${node.node}', ${vm.vmid}, 'start')" title="Bật nguồn máy ảo (Start)">
                                                <i data-lucide="play" class="action-icon-xs"></i>
                                            </button>
                                        `;
                                    }

                                    const snapBtn = isDevForbidden ? '' : `
                                        <button class="btn-action-sm btn-action-snap" onclick="openVmSnapshots('${node.node}', ${vm.vmid}, '${vm.name}')" title="Quản lý Snapshots">
                                            <i data-lucide="camera" class="btn-icon-sm"></i>
                                            <span>Snapshot</span>
                                        </button>
                                    `;

                                    const fwBtn = isDevForbidden ? '' : `
                                        <button class="btn-action-sm" style="border-color:rgba(56,189,248,0.3); color:#38bdf8;" onclick="openVmFirewall('${node.node}', ${vm.vmid}, '${vm.name}')" title="Quản lý Firewall & Mở/Đóng Port">
                                            <i data-lucide="shield" class="btn-icon-sm"></i>
                                            <span>Firewall</span>
                                        </button>
                                    `;

                                    const hotplugBtn = isDevForbidden ? '' : `
                                        <button class="btn-action-sm btn-action-hotplug" onclick="openVmHotplug('${node.node}', ${vm.vmid}, '${vm.name}')" title="Cấu hình nóng vCPU, RAM & Quản lý đĩa">
                                            <i data-lucide="cpu" class="btn-icon-sm"></i>
                                            <span>Cấu hình</span>
                                        </button>
                                    `;

                                    return `
                                        ${powerBtns}
                                        ${hotplugBtn}
                                        ${fwBtn}
                                        ${snapBtn}
                                        <button class="btn-action-sm" onclick="showVmDetail('${node.node}', ${vm.vmid})" title="Xem cấu hình Proxmox">
                                            <i data-lucide="eye" class="btn-icon-sm"></i>
                                            <span>Chi tiết</span>
                                        </button>
                                    `;
                                })()}
                            </div>
                        </td>
                    </tr>
                `;
            }).join("") : `<tr><td colspan="5" class="text-center text-muted" style="padding: 24px;">Không có máy ảo nào trên node này</td></tr>`;

            return `
                <div class="node-block" id="node-block-${node.node}">
                    <div class="node-header" onclick="toggleNodeCollapse('${node.node}')" title="Nhấp để đóng/mở chi tiết Node ${node.node}">
                        <div class="node-title-group">
                            <button class="btn-node-toggle" id="btn-toggle-${node.node}">
                                <i data-lucide="chevron-down" class="toggle-icon"></i>
                            </button>
                            <i data-lucide="server" class="icon-accent" style="width:24px;height:24px;"></i>
                            <div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <h3>Node: ${node.node}</h3>
                                    ${getNodePrimaryStorageType(node) === 'zfs' 
                                        ? '<span class="storage-pill storage-pill-zfs"><i data-lucide="database" class="pill-icon"></i> ZFS Pool</span>' 
                                        : (getNodePrimaryStorageType(node) === 'lvm' ? '<span class="storage-pill storage-pill-lvm"><i data-lucide="hard-drive" class="pill-icon"></i> LVM-Thin</span>' : '<span class="storage-pill storage-pill-dir"><i data-lucide="folder" class="pill-icon"></i> Directory</span>')}
                                    <span class="node-vm-badge">${node.vms ? node.vms.length : 0} VMs</span>
                                </div>
                                <button class="copy-chip" onclick="event.stopPropagation(); copyToClipboard('${nodeIp}', this)" title="Click để sao chép IP Node">
                                    <i data-lucide="network" class="chip-icon"></i>
                                    <span>IP: ${nodeIp}</span>
                                    <i data-lucide="copy" class="copy-icon"></i>
                                </button>
                            </div>
                        </div>
                        <div class="node-stats-summary" onclick="event.stopPropagation();">
                            <div class="stat-box">
                                <span class="stat-label">CPU Sử Dụng</span>
                                <span class="stat-value">${cpuPercent}%</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">RAM Đã Dùng</span>
                                <span class="stat-value">${memUsed} / ${memMax} (${memPercent}%)</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">Uptime</span>
                                <span class="stat-value">${formatUptime(node.uptime)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="node-collapsible-body" id="node-body-${node.node}">
                        <div class="node-content-grid">
                            <!-- Storages Column -->
                            <div>
                                <div class="sub-section-title">
                                    <i data-lucide="hard-drive" class="field-icon"></i>
                                    <span>Storages & Disks (Local / LVM / ZFS)</span>
                                </div>
                                <div class="storage-list">
                                    ${storagesHtml}
                                </div>
                            </div>

                            <!-- VMs Column -->
                            <div>
                                <div class="sub-section-title">
                                    <i data-lucide="monitor" class="field-icon"></i>
                                    <span>Danh Sách Máy Ảo (${node.vms.length} VMs)</span>
                                </div>
                                <div class="table-responsive">
                                    <table class="vms-overview-table">
                                        <thead>
                                            <tr>
                                                <th style="min-width: 140px;">Máy Ảo & ID</th>
                                                <th style="min-width: 95px;">Trạng Thái</th>
                                                <th style="min-width: 120px;">Địa Chỉ IP</th>
                                                <th style="min-width: 130px;">Cấu Hình</th>
                                                <th class="text-right" style="min-width: 220px;">Thao Tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${vmsHtml}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        clusterContainer.innerHTML = nodeIndexHtml + nodesCardsHtml;

        if (window.lucide) window.lucide.createIcons();
    }

    btnRefreshResources.addEventListener("click", loadClusterResources);
    loadClusterResources();

    // ==========================================
    // TÌM KIẾM TỨC THÌ (INSTANT SEARCH)
    // ==========================================
    const vmSearchInput = document.getElementById("vmSearchInput");
    const btnClearSearch = document.getElementById("btnClearSearch");

    if (vmSearchInput) {
        vmSearchInput.addEventListener("input", (e) => {
            currentSearchTerm = e.target.value;
            if (btnClearSearch) {
                if (currentSearchTerm.length > 0) {
                    btnClearSearch.classList.remove("hidden");
                } else {
                    btnClearSearch.classList.add("hidden");
                }
            }
            if (cachedClusterData.length > 0) {
                renderClusterView(cachedClusterData, currentSearchTerm);
            }
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener("click", () => {
            if (vmSearchInput) {
                vmSearchInput.value = "";
                currentSearchTerm = "";
                btnClearSearch.classList.add("hidden");
                vmSearchInput.focus();
                if (cachedClusterData.length > 0) {
                    renderClusterView(cachedClusterData, "");
                }
            }
        });
    }

    // ==========================================
    // NÚT LÊN ĐẦU TRANG (BACK TO TOP)
    // ==========================================
    const btnBackToTop = document.getElementById("btnBackToTop");
    if (btnBackToTop) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 280) {
                btnBackToTop.classList.remove("hidden");
            } else {
                btnBackToTop.classList.add("hidden");
            }
        });

        btnBackToTop.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

    // ==========================================
    // QUẢN LÝ MỤC LỤC & ĐÓNG/MỞ CHI TIẾT NODE (COLLAPSIBLE NODES)
    // ==========================================
    window.toggleNodeCollapse = (nodeName) => {
        const body = document.getElementById(`node-body-${nodeName}`);
        const btn = document.getElementById(`btn-toggle-${nodeName}`);
        if (!body) return;

        const isCollapsed = body.classList.toggle("collapsed");
        if (btn) {
            btn.classList.toggle("collapsed", isCollapsed);
        }
    };

    window.expandAllNodes = (expand = true) => {
        const bodies = document.querySelectorAll(".node-collapsible-body");
        const btns = document.querySelectorAll(".btn-node-toggle");

        bodies.forEach(body => {
            if (expand) {
                body.classList.remove("collapsed");
            } else {
                body.classList.add("collapsed");
            }
        });

        btns.forEach(btn => {
            if (expand) {
                btn.classList.remove("collapsed");
            } else {
                btn.classList.add("collapsed");
            }
        });
    };

    window.focusAndScrollToNode = (nodeName) => {
        const targetNode = document.getElementById(`node-block-${nodeName}`);
        const body = document.getElementById(`node-body-${nodeName}`);
        const btn = document.getElementById(`btn-toggle-${nodeName}`);

        if (targetNode) {
            // Mở node nếu đang bị đóng
            if (body && body.classList.contains("collapsed")) {
                body.classList.remove("collapsed");
                if (btn) btn.classList.remove("collapsed");
            }

            // Cuộn mượt đến node (trừ hao chiều cao của Sticky Navbar + Sticky Quick Nav)
            const quickNav = document.querySelector(".node-quick-nav");
            const navHeight = quickNav ? quickNav.offsetHeight + 24 : 120;
            const elementPosition = targetNode.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });

            // Hiệu ứng highlight phát sáng nhẹ để người dùng nhận diện
            targetNode.classList.add("node-highlight");
            setTimeout(() => {
                targetNode.classList.remove("node-highlight");
            }, 1800);
        }
    };

    window.toggleStorageFiles = (id) => {
        const el = document.getElementById(`files-${id}`);
        if (el) {
            el.style.display = el.style.display === "none" ? "block" : "none";
        }
    };

    // Modal chi tiết VM
    const vmModal = document.getElementById("vmModal");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const modalVmTitle = document.getElementById("modalVmTitle");
    const modalVmBody = document.getElementById("modalVmBody");

    btnCloseModal.addEventListener("click", () => vmModal.classList.add("hidden"));
    vmModal.addEventListener("click", (e) => {
        if (e.target === vmModal) vmModal.classList.add("hidden");
    });

    window.showVmDetail = (nodeName, vmid) => {
        const node = cachedClusterData.find(n => n.node === nodeName);
        if (!node) return;
        const vm = node.vms.find(v => v.vmid === vmid);
        if (!vm) return;

        const statusStr = typeof vm.status === "object" ? (vm.status?.status || "unknown") : (vm.status || "unknown");
        const isRunning = statusStr === "running";
        const diskDisplay = getVmDiskSize(vm);

        modalVmTitle.textContent = `Chi Tiết Máy Ảo: ${vm.name} (ID: ${vmid})`;
        modalVmBody.innerHTML = `
            <div class="modal-grid">
                <div class="modal-field">
                    <div class="modal-label">Node Lưu Trữ</div>
                    <div class="modal-value">${nodeName}</div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">Trạng Thái</div>
                    <div class="modal-value">
                        <span class="status-indicator ${isRunning ? 'status-running' : 'status-stopped'}">
                            <span class="status-dot ${isRunning ? 'online' : ''}"></span>
                            ${isRunning ? 'Đang chạy (Running)' : (statusStr === 'stopped' ? 'Đã tắt (Stopped)' : statusStr)}
                        </span>
                    </div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">CPU Cores & Type</div>
                    <div class="modal-value">${vm.config?.cores || vm.cpus} Cores (${vm.config?.cpu || "default"})</div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">RAM Đã Gán</div>
                    <div class="modal-value">${formatBytes(vm.maxmem)}</div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">Dung Lượng Ổ Đĩa (Disk Size)</div>
                    <div class="modal-value">${diskDisplay}</div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">Machine Type</div>
                    <div class="modal-value">${vm.config?.machine || "i440fx"}</div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">Protection Mode</div>
                    <div class="modal-value">${vm.config?.protection ? '<span class="badge-protected"><i data-lucide="shield-check" class="badge-svg"></i> Protected</span>' : '<span class="text-muted">Tắt (No)</span>'}</div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">Địa Chỉ IP (Agent)</div>
                    <div class="modal-value">
                        ${vm.agentIps && vm.agentIps.length ? vm.agentIps.map(ip => `
                            <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="Click để sao chép IP">
                                <span>${ip}</span>
                                <i data-lucide="copy" class="copy-icon-sm"></i>
                            </button>
                        `).join(" ") : "Chưa có IP (Cần QEMU Guest Agent)"}
                    </div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">Network Bridge & VLAN</div>
                    <div class="modal-value">
                        ${(() => {
                            const net0Str = vm.config?.net0 || "";
                            const vlanMatch = net0Str.match(/tag=(\d+)/);
                            const vlanDisplay = vlanMatch ? `VLAN ${vlanMatch[1]}` : (vm.config?.vlan ? `VLAN ${vm.config.vlan}` : "Untagged");
                            const bridgeMatch = net0Str.match(/bridge=([a-zA-Z0-9_-]+)/);
                            const bridgeDisplay = bridgeMatch ? bridgeMatch[1] : (vm.config?.bridge || "vmbr0");
                            return `${bridgeDisplay} (${vlanDisplay})`;
                        })()}
                    </div>
                </div>
                <div class="modal-field">
                    <div class="modal-label">Ổ Đĩa Khởi Động (Boot)</div>
                    <div class="modal-value">${vm.config?.boot || "scsi0"}</div>
                </div>
            </div>

            <div class="modal-label" style="margin-bottom:6px;">Toàn Bộ Cấu Hình Gốc (Proxmox Config Raw)</div>
            <div class="raw-config-box">${JSON.stringify(vm.config, null, 2)}</div>
        `;

        vmModal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
    };

    // ==========================================
    // VM LIFECYCLE CONTROLS (POWER, SNAPSHOTS)
    // ==========================================

    // 1. Thao tác nguồn VM (Start, Stop, Shutdown, Reboot, Reset)
    window.triggerVmPower = async (nodeName, vmid, action) => {
        let actionLabel = "thao tác nguồn";
        if (action === "start") actionLabel = "Bật nguồn (Start)";
        if (action === "shutdown") actionLabel = "Tắt nguồn an toàn (ACPI Shutdown)";
        if (action === "stop") actionLabel = "Tắt nóng (Force Stop)";
        if (action === "reboot") actionLabel = "Khởi động lại (Reboot)";
        if (action === "reset") actionLabel = "Reset cưỡng bức (Force Reset)";

        if (action === "stop" || action === "reset") {
            if (!confirm(`⚠️ Bạn có chắc muốn thực hiện ${actionLabel} cho VM #${vmid} không? Thao tác tắt đột ngột có thể làm mất dữ liệu chưa lưu!`)) {
                return;
            }
        }

        showToast(`⚡ Đang gửi lệnh ${actionLabel} tới VM #${vmid}...`);

        try {
            const res = await fetch(`/api/nodes/${nodeName}/vms/${vmid}/power`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ Đã gửi lệnh ${actionLabel} thành công!`);
                // Tự động tải lại sau 2.5s để cập nhật trạng thái
                setTimeout(() => {
                    if (typeof loadClusterResources === "function") loadClusterResources();
                }, 2500);
            } else {
                showRbacAlert(`⛔ Lỗi thao tác nguồn: ${data.error || "Không rõ nguyên nhân"}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối tới Server: ${err.message}`);
        }
    };



    // 3. Quản Lý Snapshot Máy Ảo
    const snapshotModal = document.getElementById("snapshotModal");
    const btnCloseSnapshotModal = document.getElementById("btnCloseSnapshotModal");
    const snapshotModalTitle = document.getElementById("snapshotModalTitle");
    const formCreateSnapshot = document.getElementById("formCreateSnapshot");
    const snapNameInput = document.getElementById("snapNameInput");
    const snapDescInput = document.getElementById("snapDescInput");
    const snapVmStateInput = document.getElementById("snapVmStateInput");
    const snapshotListBody = document.getElementById("snapshotListBody");

    let currentSnapshotVm = { node: "", vmid: 0, name: "" };

    if (btnCloseSnapshotModal && snapshotModal) {
        btnCloseSnapshotModal.addEventListener("click", () => snapshotModal.classList.add("hidden"));
        snapshotModal.addEventListener("click", (e) => {
            if (e.target === snapshotModal) snapshotModal.classList.add("hidden");
        });
    }

    window.openVmSnapshots = async (nodeName, vmid, vmName) => {
        if (!snapshotModal) return;
        currentSnapshotVm = { node: nodeName, vmid: Number(vmid), name: vmName };
        snapshotModalTitle.textContent = `Snapshots: ${vmName || 'VM'} (#${vmid}) @ ${nodeName}`;
        
        // Reset form
        if (snapNameInput) snapNameInput.value = `snap-${Date.now().toString().slice(-6)}`;
        if (snapDescInput) snapDescInput.value = "";
        if (snapVmStateInput) snapVmStateInput.checked = false;

        snapshotModal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
        await loadVmSnapshots();
    };

    async function loadVmSnapshots() {
        if (!snapshotListBody || !currentSnapshotVm.node || !currentSnapshotVm.vmid) return;
        snapshotListBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">Đang tải danh sách snapshot...</td></tr>`;

        try {
            const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots`);
            const data = await res.json();

            if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
                snapshotListBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">Chưa có bản snapshot nào.</td></tr>`;
                return;
            }

            // Lọc các snapshot hợp lệ (bỏ qua 'current')
            const validSnaps = data.data.filter(s => s.name && s.name !== "current");
            if (validSnaps.length === 0) {
                snapshotListBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">Chưa có bản snapshot nào.</td></tr>`;
                return;
            }

            snapshotListBody.innerHTML = validSnaps.map(snap => {
                const snapTime = snap.snaptime ? new Date(snap.snaptime * 1000).toLocaleString() : "-";
                const isCurrent = snap.current === 1;
                return `
                    <tr>
                        <td>
                            <strong style="color:#f8fafc;">${snap.name}</strong>
                            ${isCurrent ? '<span class="tag-deployed" style="margin-left:6px;">Hiện Tại</span>' : ''}
                        </td>
                        <td style="font-family:'JetBrains Mono',monospace; font-size:11.5px; color:#cbd5e1;">${snapTime}</td>
                        <td class="text-muted" style="font-size:12px;">${snap.description || "(Không có mô tả)"}</td>
                        <td>${snap.vmstate ? '<span class="tag-env tag-env-pro">Có RAM</span>' : '<span class="text-muted" style="font-size:11px;">Không</span>'}</td>
                        <td class="text-right">
                            <div style="display:inline-flex; gap:6px;">
                                <button class="btn-action-sm" onclick="rollbackVmSnapshot('${snap.name}')" title="Khôi phục máy ảo về bản snapshot này">
                                    <i data-lucide="rotate-ccw" class="btn-icon-sm"></i>
                                    <span>Khôi phục</span>
                                </button>
                                <button class="btn-danger-sm" onclick="deleteVmSnapshot('${snap.name}')" title="Xóa snapshot này">
                                    <i data-lucide="trash-2" class="btn-icon-sm"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            snapshotListBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger" style="padding: 20px;">Lỗi tải snapshot: ${err.message}</td></tr>`;
        }
    }

    if (formCreateSnapshot) {
        formCreateSnapshot.addEventListener("submit", async (e) => {
            e.preventDefault();
            const snapname = snapNameInput.value.trim();
            const description = snapDescInput.value.trim();
            const vmstate = snapVmStateInput.checked;

            if (!snapname) {
                alert("Vui lòng nhập tên Snapshot!");
                return;
            }

            const btnSubmit = document.getElementById("btnSubmitSnapshot");
            if (btnSubmit) btnSubmit.disabled = true;
            showToast(`📸 Đang tạo snapshot '${snapname}'...`);

            try {
                const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ snapname, description, vmstate })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`✅ Tạo snapshot '${snapname}' thành công!`);
                    if (snapNameInput) snapNameInput.value = `snap-${Date.now().toString().slice(-6)}`;
                    if (snapDescInput) snapDescInput.value = "";
                    await loadVmSnapshots();
                } else {
                    showRbacAlert(`⛔ Lỗi tạo snapshot: ${data.error || "Không rõ nguyên nhân"}`);
                }
            } catch (err) {
                showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    window.rollbackVmSnapshot = async (snapname) => {
        if (!confirm(`🔄 Bạn có chắc muốn KHÔI PHỤC máy ảo về bản snapshot '${snapname}' không? Các thay đổi sau thời điểm snapshot sẽ bị đảo ngược!`)) {
            return;
        }

        showToast(`🔄 Đang khôi phục về snapshot '${snapname}'...`);
        try {
            const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots/${snapname}/rollback`, {
                method: "POST",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ Đã khôi phục về snapshot '${snapname}' thành công!`);
                await loadVmSnapshots();
                if (typeof loadClusterResources === "function") loadClusterResources();
            } else {
                showRbacAlert(`⛔ Lỗi khôi phục snapshot: ${data.error || "Không rõ nguyên nhân"}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
        }
    };

    window.deleteVmSnapshot = async (snapname) => {
        if (!confirm(`🗑️ Bạn có chắc muốn XÓA bản snapshot '${snapname}' không? Thao tác này không thể hoàn tác!`)) {
            return;
        }

        showToast(`🗑️ Đang xóa snapshot '${snapname}'...`);
        try {
            const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots/${snapname}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ Đã xóa snapshot '${snapname}' thành công!`);
                await loadVmSnapshots();
            } else {
                showRbacAlert(`⛔ Lỗi xóa snapshot: ${data.error || "Không rõ nguyên nhân"}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
        }
    };

    // ==========================================
    // VISUAL FIREWALL & SECURITY GROUPS
    // ==========================================
    let currentFirewallVm = null;
    const firewallModal = document.getElementById("firewallModal");
    const btnCloseFirewallModal = document.getElementById("btnCloseFirewallModal");
    const firewallRulesTableBody = document.getElementById("firewallRulesTableBody");
    const formCreateFirewallRule = document.getElementById("formCreateFirewallRule");
    const toggleVmFirewall = document.getElementById("toggleVmFirewall");
    const firewallEnableStatusText = document.getElementById("firewallEnableStatusText");

    if (btnCloseFirewallModal && firewallModal) {
        btnCloseFirewallModal.addEventListener("click", () => {
            firewallModal.classList.add("hidden");
            currentFirewallVm = null;
        });
    }

    window.openVmFirewall = async (node, vmid, vmname) => {
        currentFirewallVm = { node, vmid, vmname };
        document.getElementById("firewallModalTitle").textContent = `Firewall & Security Groups: ${vmname || `VM #${vmid}`}`;
        document.getElementById("firewallModalSubtitle").textContent = `Node: ${node} | VMID: ${vmid} — Quản lý Inbound/Outbound Port Rules`;
        firewallModal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
        await loadVmFirewall();
    };

    async function loadVmFirewall() {
        if (!currentFirewallVm || !firewallRulesTableBody) return;

        firewallRulesTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;"><span class="spinner" style="display:inline-block; vertical-align:middle; margin-right:8px;"></span> Đang tải quy tắc Firewall...</td></tr>`;

        try {
            const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall`, {
                headers: getAuthHeaders(),
            });
            const result = await res.json();

            if (result.success && result.data) {
                const { rules, options } = result.data;
                const isEnabled = options && (options.enable === 1 || options.enable === true || options.enable === "1");

                if (toggleVmFirewall) {
                    toggleVmFirewall.checked = isEnabled;
                }
                if (firewallEnableStatusText) {
                    firewallEnableStatusText.textContent = isEnabled ? "Firewall: ON (Đang bảo vệ)" : "Firewall: OFF (Tắt)";
                    firewallEnableStatusText.style.color = isEnabled ? "#38bdf8" : "#94a3b8";
                }

                if (!rules || rules.length === 0) {
                    firewallRulesTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 28px;">Chưa có quy tắc Firewall nào. Sử dụng <strong>1-Click Presets</strong> ở trên hoặc form bên dưới để thêm rule.</td></tr>`;
                    return;
                }

                const role = currentAuthUser ? currentAuthUser.role : "viewer";
                const isViewer = role === "viewer";

                firewallRulesTableBody.innerHTML = rules.map((r, index) => {
                    const rulePos = r.pos !== undefined ? r.pos : index;
                    const isRuleActive = (r.enable === 1 || r.enable === true || r.enable === "1" || r.enable === undefined);
                    const action = (r.action || "ACCEPT").toUpperCase();
                    const actionBadge = action === "ACCEPT" 
                        ? `<span class="tag-deployed" style="font-size:11px;"><i data-lucide="check" class="badge-svg"></i> ACCEPT</span>` 
                        : (action === "DROP" 
                            ? `<span class="tag-env tag-env-pro" style="font-size:11px;"><i data-lucide="shield-alert" class="badge-svg"></i> DROP</span>` 
                            : `<span class="tag-env tag-env-stag" style="font-size:11px;"><i data-lucide="alert-triangle" class="badge-svg"></i> REJECT</span>`);

                    const direction = (r.type || "in").toUpperCase();
                    const proto = (r.proto || "ANY").toUpperCase();
                    const dport = r.dport || "ALL";
                    const source = r.source || "0.0.0.0/0";
                    const comment = r.comment || '<span class="text-muted">—</span>';

                    return `
                        <tr style="${!isRuleActive ? 'opacity: 0.55;' : ''}">
                            <td>
                                <input type="checkbox" ${isRuleActive ? 'checked' : ''} ${isViewer ? 'disabled' : ''} onchange="toggleVmFirewallRule(${rulePos}, this.checked)" title="Bật/Tắt Rule">
                            </td>
                            <td>${actionBadge}</td>
                            <td><strong style="color:${direction === 'IN' ? '#38bdf8' : '#a855f7'}; font-size:12px;">${direction}</strong></td>
                            <td><code style="color:#e2e8f0; font-size:11.5px;">${proto}</code></td>
                            <td><strong style="color:#f8fafc; font-family:'JetBrains Mono',monospace; font-size:12px;">${dport}</strong></td>
                            <td style="font-family:'JetBrains Mono',monospace; font-size:11px; color:#94a3b8;">${source}</td>
                            <td style="font-size:11.5px; color:#cbd5e1;">${comment}</td>
                            <td class="text-right">
                                ${isViewer ? '<span class="text-muted" style="font-size:11px;">Chỉ xem</span>' : `
                                    <button class="btn-action-fw" onclick="deleteVmFirewallRule(${rulePos})" title="Xóa Rule">
                                        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                                        <span>Xóa</span>
                                    </button>
                                `}
                            </td>
                        </tr>
                    `;
                }).join("");

                if (window.lucide) window.lucide.createIcons();
            } else {
                firewallRulesTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">Không thể tải danh sách Firewall: ${result.error || 'Lỗi không xác định'}</td></tr>`;
            }
        } catch (err) {
            firewallRulesTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-error" style="padding: 24px;">Lỗi kết nối: ${err.message}</td></tr>`;
        }
    }

    // Toggle Firewall Master Switch
    if (toggleVmFirewall) {
        toggleVmFirewall.addEventListener("change", async (e) => {
            if (!currentFirewallVm) return;
            const enable = e.target.checked ? 1 : 0;
            showToast(`⚙️ Đang ${enable ? 'Bật' : 'Tắt'} Firewall VM #${currentFirewallVm.vmid}...`);

            try {
                const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/options`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ enable })
                });
                const result = await res.json();
                if (result.success) {
                    showToast(`✅ Đã ${enable ? 'Bật' : 'Tắt'} Firewall thành công!`);
                    await loadVmFirewall();
                } else {
                    showRbacAlert(`⛔ ${result.error}`);
                    e.target.checked = !enable;
                }
            } catch (err) {
                showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
                e.target.checked = !enable;
            }
        });
    }

    // 1-Click Security Presets Quick Handler
    window.applyFirewallPreset = async (presetType) => {
        if (!currentFirewallVm) return;

        let ruleData = null;
        if (presetType === "ssh") {
            ruleData = { action: "ACCEPT", type: "in", proto: "tcp", dport: "22", comment: "Allow SSH Remote Access" };
        } else if (presetType === "web") {
            ruleData = { action: "ACCEPT", type: "in", proto: "tcp", dport: "80,443", comment: "Allow Web HTTP/HTTPS" };
        } else if (presetType === "database") {
            ruleData = { action: "ACCEPT", type: "in", proto: "tcp", dport: "5432,3306", comment: "Allow DB (Postgres/MySQL)" };
        } else if (presetType === "redis") {
            ruleData = { action: "ACCEPT", type: "in", proto: "tcp", dport: "6379", comment: "Allow Redis Inbound" };
        } else if (presetType === "k8s") {
            ruleData = { action: "ACCEPT", type: "in", proto: "tcp", dport: "6443", comment: "Allow K8s API Server" };
        } else if (presetType === "ping") {
            ruleData = { action: "ACCEPT", type: "in", proto: "icmp", dport: "", comment: "Allow ICMP Echo/Ping" };
        }

        if (!ruleData) return;

        showToast(`🛡️ Đang áp dụng preset mở port ${ruleData.dport || ruleData.proto}...`);

        try {
            const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(ruleData)
            });
            const result = await res.json();
            if (result.success) {
                showToast(`✅ Đã thêm quy tắc ${ruleData.comment} thành công!`);
                await loadVmFirewall();
            } else {
                showRbacAlert(`⛔ Lỗi thêm preset: ${result.error}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
        }
    };

    // Form Submit: Thêm Rule Firewall Thủ Công
    if (formCreateFirewallRule) {
        formCreateFirewallRule.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentFirewallVm) return;

            const action = document.getElementById("fwAction").value;
            const type = document.getElementById("fwType").value;
            const proto = document.getElementById("fwProto").value;
            const dport = document.getElementById("fwDport").value;
            const source = document.getElementById("fwSource").value;
            const comment = document.getElementById("fwComment").value;

            const btnSubmit = document.getElementById("btnSubmitFwRule");
            if (btnSubmit) btnSubmit.disabled = true;
            showToast(`🛡️ Đang thêm quy tắc Firewall mới...`);

            try {
                const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ action, type, proto, dport, source, comment })
                });
                const result = await res.json();
                if (result.success) {
                    showToast(`✅ Đã thêm quy tắc Firewall thành công!`);
                    formCreateFirewallRule.reset();
                    await loadVmFirewall();
                } else {
                    showRbacAlert(`⛔ Lỗi: ${result.error}`);
                }
            } catch (err) {
                showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Toggle Bật/Tắt từng Rule
    window.toggleVmFirewallRule = async (pos, enable) => {
        if (!currentFirewallVm) return;
        showToast(`⚙️ Đang ${enable ? 'bật' : 'tắt'} Rule #${pos}...`);
        try {
            const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules/${pos}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ enable: enable ? 1 : 0 })
            });
            const result = await res.json();
            if (result.success) {
                showToast(`✅ Đã cập nhật trạng thái Rule #${pos}!`);
                await loadVmFirewall();
            } else {
                showRbacAlert(`⛔ Lỗi: ${result.error}`);
                await loadVmFirewall();
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            await loadVmFirewall();
        }
    };

    // Xóa Rule Firewall
    window.deleteVmFirewallRule = async (pos) => {
        if (!confirm(`🗑️ Bạn có chắc muốn XÓA quy tắc Firewall #${pos} này không?`)) return;
        if (!currentFirewallVm) return;

        showToast(`🗑️ Đang xóa Rule #${pos}...`);
        try {
            const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules/${pos}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const result = await res.json();
            if (result.success) {
                showToast(`✅ Đã xóa quy tắc Firewall thành công!`);
                await loadVmFirewall();
            } else {
                showRbacAlert(`⛔ Lỗi xóa: ${result.error}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
        }
    };

    // ==========================================
    // 2. FORM KHỞI TẠO VM ĐỘNG (DYNAMIC FORM)
    // ==========================================
    const nodeSelect = document.getElementById("nodeName");
    const datastoreSelect = document.getElementById("datastoreId");
    const imageSelect = document.getElementById("diskImageId");
    const bridgeSelect = document.getElementById("bridge");
    const vmNameInput = document.getElementById("vmName");
    const vmCountInput = document.getElementById("vmCount");
    const vmCountVal = document.getElementById("vmCountVal");
    const singleNodeSection = document.getElementById("singleNodeSection");
    const multiNodeSection = document.getElementById("multiNodeSection");
    const nodesCheckboxContainer = document.getElementById("nodesCheckboxContainer");
    const vmClusterPreview = document.getElementById("vmClusterPreview");
    const previewList = document.getElementById("previewList");
    const previewHeaderTitle = document.getElementById("previewHeaderTitle");

    function populateDeployForm(clusterData) {
        if (!clusterData || clusterData.length === 0 || !nodeSelect) return;

        const currentNode = nodeSelect.value;
        nodeSelect.innerHTML = clusterData.map(node => {
            const primaryNet = node.networks?.find(n => n.address) || node.networks?.[0] || {};
            const ip = primaryNet.address ? ` - ${primaryNet.address}` : "";
            const statusText = node.status === "online" ? "Online" : "Offline";
            return `<option value="${node.node}">[${statusText}] ${node.node}${ip}</option>`;
        }).join("");

        if (currentNode && clusterData.some(n => n.node === currentNode)) {
            nodeSelect.value = currentNode;
        }

        // Render Checkboxes cho Multi-Node Distribution kèm chi tiết Resources và Storage thật
        if (nodesCheckboxContainer) {
            nodesCheckboxContainer.innerHTML = clusterData.map((node) => {
                const primaryNet = node.networks?.find(n => n.address) || node.networks?.[0] || {};
                const ip = primaryNet.address || "N/A";
                const isOnline = node.status === "online";
                const freeMem = Math.max(0, (node.maxmem || 0) - (node.mem || 0));
                const memPct = node.maxmem ? Math.round(((node.mem || 0) / node.maxmem) * 100) : 0;
                const cpuPct = Math.round((node.cpu || 0) * 100);

                const vmStorages = (node.storages || []).filter(s => s.active !== 0 && s.storage !== "local");
                const storagePills = vmStorages.map(s => {
                    const isZfs = s.storage.includes("zfs");
                    const iconName = isZfs ? "database" : "hard-drive";
                    return `<span class="storage-pill ${isZfs ? 'storage-pill-zfs' : 'storage-pill-lvm'}"><i data-lucide="${iconName}" class="pill-icon"></i> <strong>${s.storage}</strong>: ${formatBytes(s.avail)} trống</span>`;
                }).join(" ");

                const storagesListStr = vmStorages.map(s => s.storage).join(",");

                return `
                    <label class="node-check-card ${isOnline ? 'checked' : ''}" data-node="${node.node}" data-storages="${storagesListStr}">
                        <input type="checkbox" name="clusterNodes" value="${node.node}" ${isOnline ? 'checked' : ''}>
                        <div class="node-check-info">
                            <div class="node-check-name">
                                <span style="display:flex;align-items:center;gap:6px;">
                                    <span class="status-dot ${isOnline ? 'online' : ''}" style="width:7px;height:7px;"></span>
                                    ${node.node}
                                </span>
                                <small class="node-check-sub">IP: ${ip}</small>
                            </div>
                            <div class="node-metric-line">
                                <span><i data-lucide="memory-stick" class="pill-icon"></i> RAM Trống: <strong>${formatBytes(freeMem)}</strong> / ${formatBytes(node.maxmem)} (${memPct}%)</span>
                            </div>
                            <div class="node-metric-line">
                                <span><i data-lucide="cpu" class="pill-icon"></i> CPU: <strong>${node.maxcpu || 0} vCPU</strong> (${cpuPct}% đang dùng)</span>
                            </div>
                            <div class="node-storages-pills-row">
                                ${storagePills || '<span class="text-muted" style="font-size:10px;">Không có VM Datastore</span>'}
                            </div>
                        </div>
                    </label>
                `;
            }).join("");

            nodesCheckboxContainer.querySelectorAll("input[type='checkbox']").forEach(cb => {
                cb.addEventListener("change", (e) => {
                    const card = e.target.closest(".node-check-card");
                    if (card) {
                        card.classList.toggle("checked", e.target.checked);
                    }
                    updateClusterPreview();
                });
            });
        }

        // Tạo động các tab bộ lọc theo chính xác tên Storage của cluster (ví dụ: zfs-storage, zfs, local-lvm)
        const filterTabsContainer = document.querySelector(".node-filter-tabs");
        if (filterTabsContainer) {
            const uniqueStorageNames = Array.from(new Set(clusterData.flatMap(n => (n.storages || []).filter(s => s.active !== 0 && s.storage !== "local").map(s => s.storage))));
            let tabsHtml = `<button type="button" class="node-filter-btn active" data-filter="all"><i data-lucide="layers" class="pill-icon"></i> Tất Cả (${clusterData.length})</button>`;
            for (const stName of uniqueStorageNames) {
                const count = clusterData.filter(n => (n.storages || []).some(s => s.storage === stName && s.active !== 0)).length;
                const isZfs = stName.includes("zfs");
                const iconName = isZfs ? "database" : "hard-drive";
                tabsHtml += `<button type="button" class="node-filter-btn" data-filter="${stName}"><i data-lucide="${iconName}" class="pill-icon"></i> ${stName} (${count})</button>`;
            }
            filterTabsContainer.innerHTML = tabsHtml;

            filterTabsContainer.querySelectorAll(".node-filter-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    filterTabsContainer.querySelectorAll(".node-filter-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    const filter = btn.dataset.filter;

                    document.querySelectorAll(".node-check-card").forEach(card => {
                        const cardStorages = (card.dataset.storages || "").split(",");
                        const cb = card.querySelector("input[type='checkbox']");
                        const matches = filter === "all" || cardStorages.includes(filter);

                        if (matches) {
                            card.style.display = "flex";
                            if (cb) {
                                cb.checked = true;
                                card.classList.add("checked");
                            }
                        } else {
                            card.style.display = "none";
                            if (cb) {
                                cb.checked = false;
                                card.classList.remove("checked");
                            }
                        }
                    });

                    // Tự động đồng bộ chọn storage tương ứng trong dropdown
                    if (filter !== "all" && datastoreSelect) {
                        if (Array.from(datastoreSelect.options).some(o => o.value === filter)) {
                            datastoreSelect.value = filter;
                        }
                    }

                    updateClusterPreview();
                });
            });
        }

        // Lắng nghe chọn thẻ Environment Radio
        document.querySelectorAll(".env-radio-card").forEach(card => {
            card.addEventListener("click", () => {
                document.querySelectorAll(".env-radio-card").forEach(c => c.classList.remove("active"));
                card.classList.add("active");
                const radio = card.querySelector("input[type='radio']");
                if (radio) radio.checked = true;
            });
        });

        updateNodeSpecificFields();
        updateClusterPreview();
    }

    function updateClusterPreview() {
        if (!vmCountInput || !vmNameInput) return;
        const count = parseInt(vmCountInput.value) || 1;
        const rawBaseName = vmNameInput.value.trim() || "vm";
        
        vmCountVal.textContent = `${count} VM${count > 1 ? 's' : ''}`;

        if (count === 1) {
            if (singleNodeSection) singleNodeSection.classList.remove("hidden");
            if (multiNodeSection) multiNodeSection.classList.add("hidden");
            if (vmClusterPreview) vmClusterPreview.classList.add("hidden");
            if (btnText) btnText.textContent = "Triển Khai VM";
            return;
        }

        // Chế độ tạo cụm Cluster > 1 VM
        if (singleNodeSection) singleNodeSection.classList.add("hidden");
        if (multiNodeSection) multiNodeSection.classList.remove("hidden");
        if (vmClusterPreview) vmClusterPreview.classList.remove("hidden");
        if (btnText) btnText.textContent = `Triển Khai Cụm ${count} Máy Ảo`;

        // Lấy danh sách Node ĐANG HIỂN THỊ và ĐÃ CHECK
        let selectedNodes = [];
        if (nodesCheckboxContainer) {
            const visibleCheckedBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']:checked");
            selectedNodes = Array.from(visibleCheckedBoxes).map(cb => cb.value);

            // Nếu người dùng bỏ tick hết các thẻ đang hiển thị, fallback lấy toàn bộ node đang hiển thị của filter
            if (selectedNodes.length === 0) {
                const visibleBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']");
                selectedNodes = Array.from(visibleBoxes).map(cb => cb.value);
            }
        }
        
        if (selectedNodes.length === 0 && cachedClusterData.length > 0) {
            selectedNodes = [cachedClusterData[0].node];
        }
        if (selectedNodes.length === 0) {
            selectedNodes = ["node01"];
        }

        if (previewHeaderTitle) {
            previewHeaderTitle.textContent = `Xem trước phân bổ cụm (${count} Máy Ảo trên ${selectedNodes.length} Nodes):`;
        }

        // Tự động sinh tên VM tăng dần: vd postgresql01, postgresql02, postgresql03
        const previewItems = [];
        for (let i = 1; i <= count; i++) {
            const numStr = i < 10 ? `0${i}` : `${i}`;
            let generatedName = "";
            if (rawBaseName.endsWith("-") || rawBaseName.endsWith("_")) {
                generatedName = `${rawBaseName}${numStr}`;
            } else if (/\d+$/.test(rawBaseName)) {
                const baseWithoutNum = rawBaseName.replace(/\d+$/, '');
                generatedName = `${baseWithoutNum}${numStr}`;
            } else {
                generatedName = `${rawBaseName}${numStr}`;
            }

            const assignedNode = selectedNodes[(i - 1) % selectedNodes.length];
            previewItems.push({
                name: generatedName,
                nodeName: assignedNode
            });
        }

        if (previewList) {
            previewList.innerHTML = previewItems.map(item => `
                <div class="preview-chip">
                    <span class="preview-chip-name">${item.name}</span>
                    <span class="preview-chip-arrow">➔</span>
                    <span class="preview-chip-node">${item.nodeName}</span>
                </div>
            `).join("");
        }
    }

    if (vmCountInput) vmCountInput.addEventListener("input", updateClusterPreview);
    if (vmNameInput) vmNameInput.addEventListener("input", updateClusterPreview);

    function updateNodeSpecificFields() {
        if (!nodeSelect || !cachedClusterData.length) return;
        const selectedNodeName = nodeSelect.value;
        const selectedNode = cachedClusterData.find(n => n.node === selectedNodeName);
        if (!selectedNode) return;

        // Cập nhật Node IP chip
        const nodeInfoChip = document.getElementById("nodeInfoChip");
        if (nodeInfoChip) {
            const primaryNet = selectedNode.networks?.find(n => n.address) || selectedNode.networks?.[0] || {};
            const nodeIp = primaryNet.address || "";
            if (nodeIp) {
                nodeInfoChip.innerHTML = `
                    <button type="button" class="copy-chip-sm" onclick="copyToClipboard('${nodeIp}', this)" title="Click để sao chép IP Node">
                        <i data-lucide="network" class="copy-icon-sm"></i>
                        <span>Node IP: ${nodeIp}</span>
                        <i data-lucide="copy" class="copy-icon-sm"></i>
                    </button>
                `;
                if (window.lucide) window.lucide.createIcons();
            } else {
                nodeInfoChip.innerHTML = "";
            }
        }

        // 1. Cập nhật Datastores / Storages (loại bỏ 'local' vì không chứa VM disk)
        const validStorages = (selectedNode.storages || []).filter(st => st.active !== 0 && st.storage !== "local");
        if (validStorages.length > 0) {
            datastoreSelect.innerHTML = validStorages.map(st => {
                const free = formatBytes(st.avail);
                const total = formatBytes(st.total);
                return `<option value="${st.storage}">${st.storage} (${st.type || 'storage'} - Trống: ${free} / ${total})</option>`;
            }).join("");

            // Ưu tiên chọn zfs-storage, zfs hoặc local-lvm
            const preferred = validStorages.find(st => st.storage === "zfs-storage") ||
                              validStorages.find(st => st.storage.includes("zfs")) ||
                              validStorages.find(st => st.storage.includes("lvm")) || 
                              validStorages[0];
            if (preferred) {
                datastoreSelect.value = preferred.storage;
            }
        } else {
            datastoreSelect.innerHTML = `<option value="local-lvm">local-lvm (Mặc định)</option>`;
        }

        // Cập nhật thẻ hiển thị tài nguyên còn lại của Node (Live Resource Breakdown)
        const nodeResourceCard = document.getElementById("nodeResourceCard");
        if (nodeResourceCard) {
            const freeMem = Math.max(0, (selectedNode.maxmem || 0) - (selectedNode.mem || 0));
            const memPct = selectedNode.maxmem ? Math.round(((selectedNode.mem || 0) / selectedNode.maxmem) * 100) : 0;
            const cpuPct = Math.round((selectedNode.cpu || 0) * 100);

            const storageBadgesHtml = validStorages.map(st => {
                const isZfs = st.storage.includes("zfs");
                const iconName = isZfs ? "database" : "hard-drive";
                return `<span class="storage-pill ${isZfs ? 'storage-pill-zfs' : 'storage-pill-lvm'}"><i data-lucide="${iconName}" class="pill-icon"></i> <strong>${st.storage}</strong>: ${formatBytes(st.avail)} trống</span>`;
            }).join(" ");

            nodeResourceCard.innerHTML = `
                <div class="node-resource-header">
                    <span style="display:flex;align-items:center;gap:6px;"><i data-lucide="activity" class="pill-icon"></i> Tài nguyên khả dụng: <strong>${selectedNode.node}</strong></span>
                    <span class="status-indicator status-running"><span class="status-dot online"></span> Sẵn sàng</span>
                </div>
                <div class="node-resource-metrics">
                    <div class="resource-metric-box">
                        <span class="resource-metric-title"><i data-lucide="memory-stick" style="width:12px;height:12px;"></i> RAM Còn Trống</span>
                        <span class="resource-metric-val">${formatBytes(freeMem)} / ${formatBytes(selectedNode.maxmem)}</span>
                        <small class="text-muted" style="font-size:10px;">Đã dùng ${memPct}%</small>
                    </div>
                    <div class="resource-metric-box">
                        <span class="resource-metric-title"><i data-lucide="cpu" style="width:12px;height:12px;"></i> CPU Cores & Tải</span>
                        <span class="resource-metric-val">${selectedNode.maxcpu || 0} vCPU Cores</span>
                        <small class="text-muted" style="font-size:10px;">Mức tải hiện tại: ${cpuPct}%</small>
                    </div>
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                    <span>Ổ Đĩa Chứa VM (Datastores):</span>
                    <div class="resource-storage-list">${storageBadgesHtml || '<span class="text-muted">Không có</span>'}</div>
                </div>
            `;
            nodeResourceCard.style.display = "flex";
            if (window.lucide) window.lucide.createIcons();
        }

        // 2. Cập nhật Network Bridges
        if (selectedNode.networks && selectedNode.networks.length > 0) {
            const bridges = selectedNode.networks.filter(n => n.type === "bridge" || (n.iface && n.iface.startsWith("vmbr")));
            if (bridges.length > 0) {
                bridgeSelect.innerHTML = bridges.map(b => {
                    const addr = b.address ? ` (${b.address})` : "";
                    const comment = b.comment ? ` - ${b.comment}` : "";
                    return `<option value="${b.iface}">${b.iface}${addr}${comment}</option>`;
                }).join("");
            } else {
                bridgeSelect.innerHTML = `<option value="vmbr0">vmbr0 (Mặc định)</option>`;
            }
        } else {
            bridgeSelect.innerHTML = `<option value="vmbr0">vmbr0 (Mặc định)</option>`;
        }

        // 3. Cập nhật Images / ISOs / Templates từ toàn bộ Storages của Node
        const allImages = [];
        if (selectedNode.storages) {
            for (const st of selectedNode.storages) {
                if (st.contents && Array.isArray(st.contents)) {
                    for (const item of st.contents) {
                        const volid = item.volid || "";
                        const lower = volid.toLowerCase();
                        if (
                            item.content === "iso" || 
                            item.format === "iso" || 
                            item.content === "vztmpl" ||
                            lower.endsWith(".img") || 
                            lower.endsWith(".iso") || 
                            lower.endsWith(".qcow2") || 
                            lower.endsWith(".raw")
                        ) {
                            allImages.push({
                                volid: item.volid,
                                name: volid.split("/").pop() || volid,
                                storage: st.storage,
                                size: item.size,
                            });
                        }
                    }
                }
            }
        }

        if (allImages.length > 0) {
            imageSelect.innerHTML = allImages.map(img => {
                const sizeStr = img.size ? ` - ${formatBytes(img.size)}` : "";
                return `<option value="${img.volid}">💿 ${img.name} (${img.storage}${sizeStr})</option>`;
            }).join("");
        } else {
            imageSelect.innerHTML = `
                <option value="local:iso/rocky-9-cloud.img">local:iso/rocky-9-cloud.img (Rocky Linux 9 Cloud)</option>
                <option value="local:iso/ubuntu-22.04-cloud.img">local:iso/ubuntu-22.04-cloud.img (Ubuntu 22.04)</option>
                <option value="local:iso/debian-12-cloud.img">local:iso/debian-12-cloud.img (Debian 12)</option>
            `;
        }

        if (typeof updateStepSummaries === "function") {
            updateStepSummaries();
        }
    }

    if (nodeSelect) {
        nodeSelect.addEventListener("change", updateNodeSpecificFields);
    }

    // ==========================================
    // 3. HARDWARE SPECS INPUTS (2-Way Sync Number Input & Slider)
    // ==========================================
    function setupSyncedInput(numberId, rangeId) {
        const numInput = document.getElementById(numberId);
        const rangeInput = document.getElementById(rangeId);
        if (!numInput) return;

        if (rangeInput) {
            rangeInput.addEventListener("input", (e) => {
                numInput.value = e.target.value;
            });
            numInput.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    rangeInput.value = val;
                }
            });
        }
    }

    setupSyncedInput("cores", "coresRange");
    setupSyncedInput("memoryGb", "memoryGbRange");
    setupSyncedInput("diskSizeGb", "diskSizeGbRange");

    const vlanInput = document.getElementById("vlanTag");
    const vlanTagVal = document.getElementById("vlanTagVal");
    if (vlanInput && vlanTagVal) {
        vlanInput.addEventListener("input", (e) => {
            const val = parseInt(e.target.value, 10);
            if (val > 0) {
                vlanTagVal.textContent = `VLAN ${val}`;
                vlanTagVal.style.color = "#38bdf8";
                vlanTagVal.style.background = "rgba(56, 189, 248, 0.15)";
                vlanTagVal.style.borderColor = "rgba(56, 189, 248, 0.35)";
            } else {
                vlanTagVal.textContent = "Untagged";
                vlanTagVal.style.color = "#818cf8";
                vlanTagVal.style.background = "rgba(79, 70, 229, 0.12)";
                vlanTagVal.style.borderColor = "rgba(79, 70, 229, 0.2)";
            }
        });
    }

    const terminal = document.getElementById("terminal");
    const btnClearLogs = document.getElementById("btnClearLogs");
    const btnCopyLogs = document.getElementById("btnCopyLogs");
    let activeProgressLine = null;
    let progressStartTime = null;
    let progressInterval = null;
    let currentProgressAction = "Updating";

    if (btnCopyLogs) {
        btnCopyLogs.addEventListener("click", () => {
            if (!terminal) return;
            const logLines = Array.from(terminal.querySelectorAll(".terminal-line"))
                .map(el => el.textContent)
                .filter(t => t && t.trim().length > 0)
                .join("\n");

            if (!logLines || logLines.trim().length === 0) {
                showToast("Nhật ký đang trống!");
                return;
            }

            copyToClipboard(logLines, btnCopyLogs);
            showToast("📋 Đã sao chép toàn bộ nhật ký!");
        });
    }

    if (btnClearLogs) {
        btnClearLogs.addEventListener("click", () => {
            if (progressInterval) clearInterval(progressInterval);
            activeProgressLine = null;
            progressStartTime = null;
            progressInterval = null;
            currentProgressAction = "Updating";
            terminal.innerHTML = '<div class="terminal-line text-info">[System] Logs cleared.</div>';
        });
    }

    function cleanAnsi(str) {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    }

    function appendLog(rawText) {
        if (typeof rawText !== "string") return;

        // 1. Nhận diện các sự kiện tiến trình từ server
        if (rawText.startsWith("PROGRESS_START:")) {
            const action = rawText.split(":")[1] || "Updating";
            currentProgressAction = action;
            if (progressInterval) clearInterval(progressInterval);
            progressStartTime = Date.now();

            if (!activeProgressLine) {
                activeProgressLine = document.createElement("div");
                activeProgressLine.className = "terminal-line progress-updating";
                terminal.appendChild(activeProgressLine);
            } else {
                activeProgressLine.className = "terminal-line progress-updating";
            }
            activeProgressLine.textContent = `[RUNNING] @ ${action}... [0s]`;

            progressInterval = setInterval(() => {
                if (activeProgressLine && progressStartTime) {
                    const sec = Math.floor((Date.now() - progressStartTime) / 1000);
                    activeProgressLine.textContent = `[RUNNING] @ ${currentProgressAction}... [${sec}s]`;
                    terminal.scrollTop = terminal.scrollHeight;
                }
            }, 1000);

            terminal.scrollTop = terminal.scrollHeight;
            return;
        }

        if (rawText.startsWith("PROGRESS_TICK:")) {
            const parts = rawText.split(":");
            const action = parts[1] || currentProgressAction;
            const sec = parts[2] || (progressStartTime ? Math.floor((Date.now() - progressStartTime) / 1000) : "0");
            if (activeProgressLine) {
                activeProgressLine.textContent = `[RUNNING] @ ${action}... [${sec}s]`;
                terminal.scrollTop = terminal.scrollHeight;
            }
            return;
        }

        if (rawText.startsWith("PROGRESS_END:")) {
            const parts = rawText.split(":");
            const action = parts[1] || currentProgressAction;
            if (progressInterval) clearInterval(progressInterval);
            progressInterval = null;
            if (activeProgressLine) {
                const finalSec = progressStartTime ? Math.floor((Date.now() - progressStartTime) / 1000) : 0;
                activeProgressLine.textContent = `[DONE] @ ${action} hoàn tất [${finalSec}s]`;
                activeProgressLine.classList.remove("progress-updating");
                activeProgressLine.classList.add("text-info");
            }
            activeProgressLine = null;
            progressStartTime = null;
            return;
        }
        
        // 2. Tách thành từng dòng độc lập để xử lý
        const rawLines = rawText.split(/\r?\n/);

        for (const rawLine of rawLines) {
            const text = cleanAnsi(rawLine);
            const trimmed = text.trim();

            if (!trimmed) continue;

            // Bỏ qua tuyệt đối nếu dòng chỉ toàn dấu chấm (.)
            if (trimmed.replace(/\./g, '').trim() === '') {
                if (activeProgressLine && progressStartTime) {
                    const sec = Math.floor((Date.now() - progressStartTime) / 1000);
                    activeProgressLine.textContent = `⏳ @ ${currentProgressAction}... [${sec}s]`;
                    terminal.scrollTop = terminal.scrollHeight;
                }
                continue;
            }

            // Bắt đầu tiến trình nếu phát hiện dòng @ updating, @ destroying
            const progressMatch = trimmed.match(/^@?\s*(updating|destroying|deleting|refreshing|previewing)/i);
            if (progressMatch) {
                currentProgressAction = progressMatch[1].charAt(0).toUpperCase() + progressMatch[1].slice(1).toLowerCase();
                if (currentProgressAction === "Deleting") currentProgressAction = "Destroying";
                
                if (progressInterval) clearInterval(progressInterval);
                progressStartTime = Date.now();

                if (!activeProgressLine) {
                    activeProgressLine = document.createElement("div");
                    activeProgressLine.className = "terminal-line progress-updating";
                    terminal.appendChild(activeProgressLine);
                } else {
                    activeProgressLine.className = "terminal-line progress-updating";
                }
                
                activeProgressLine.textContent = `⏳ @ ${currentProgressAction}... [0s]`;

                progressInterval = setInterval(() => {
                    if (activeProgressLine && progressStartTime) {
                        const sec = Math.floor((Date.now() - progressStartTime) / 1000);
                        activeProgressLine.textContent = `⏳ @ ${currentProgressAction}... [${sec}s]`;
                        terminal.scrollTop = terminal.scrollHeight;
                    }
                }, 1000);

                terminal.scrollTop = terminal.scrollHeight;
                continue;
            }

            // Nếu là dòng kết thúc (SUCCESS / ERROR / DESTROYED / FATAL)
            const isCompletion = trimmed.includes("SUCCESS") || trimmed.includes("ERROR") || 
                                 trimmed.includes("DESTROYED") || trimmed.includes("FATAL") || 
                                 trimmed.includes("Outputs:") || trimmed.includes("Resources:");

            if (isCompletion && activeProgressLine) {
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                if (progressStartTime) {
                    const finalSec = Math.floor((Date.now() - progressStartTime) / 1000);
                    activeProgressLine.textContent = `⏳ @ ${currentProgressAction} hoàn tất [${finalSec}s]`;
                    activeProgressLine.classList.remove("progress-updating");
                    activeProgressLine.classList.add("text-info");
                }
                activeProgressLine = null;
                progressStartTime = null;
            }

            // In dòng log thông thường
            const line = document.createElement("div");
            line.className = "terminal-line";
            if (trimmed.includes("DESTROYED") || trimmed.includes("[DESTROYED]")) {
                line.classList.add("log-destroyed-highlight");
                showToast("🗑️ " + trimmed.replace(/^\[DESTROYED\]\s*/, ''));
                if (typeof loadClusterResources === "function") loadClusterResources();
                if (typeof loadVms === "function") loadVms();
            } else if (trimmed.includes("ERROR") || trimmed.includes("error") || trimmed.includes("failed") || trimmed.includes("❌")) {
                line.classList.add("text-error");
            } else if (trimmed.includes("SUCCESS") || trimmed.includes("created") || trimmed.includes("updated") || trimmed.includes("✅")) {
                line.classList.add("text-success");
            } else if (trimmed.includes("[System]") || trimmed.includes("[PULUMI]") || trimmed.includes("⚙️") || trimmed.includes("🚀") || trimmed.includes("🗑️")) {
                line.classList.add("text-info");
            }
            line.textContent = text;
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;
        }
    }

    // Kết nối SSE để nhận live logs
    const eventSource = new EventSource("/api/logs/stream");
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            appendLog(data.message);
        } catch (e) {
            appendLog(event.data);
        }
    };

    // Load danh sách VM Pulumi Stacks
    const vmTableBody = document.getElementById("vmTableBody");
    const btnRefresh = document.getElementById("btnRefresh");

    async function loadVms() {
        try {
            const res = await fetch("/api/vms");
            const data = await res.json();
            
            if (data.success && data.data.length > 0) {
                // Sắp xếp tự nhiên theo tên VM / Stack
                data.data.sort((a, b) => (a.vmName || a.stackName).localeCompare(b.vmName || b.stackName, undefined, { numeric: true, sensitivity: 'base' }));

                vmTableBody.innerHTML = data.data.map(vm => {
                    const vmIpBadges = vm.ips && vm.ips.length > 0 
                        ? vm.ips.map(ip => `
                            <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="Click để sao chép IP">
                                <span>${ip}</span>
                                <i data-lucide="copy" class="copy-icon-sm"></i>
                            </button>
                        `).join(" ") 
                        : (vm.status === "Deployed" ? '<span class="text-muted" style="font-size:11.5px;">Chờ Agent...</span>' : '-');

                    const envBadge = renderEnvBadge(vm.environment);
                    const customTagsHtml = renderCustomTags(vm.tags);

                    const role = currentAuthUser ? currentAuthUser.role : "viewer";
                    const isProdOrStag = ["pro","prod","stag","staging"].includes((vm.environment || "dev").toLowerCase());
                    const canDelete = role === "admin" || (role === "developer" && !isProdOrStag);

                    let actionCellHtml = "";
                    const fwQuickBtn = (vm.vmId && vm.nodeName && role !== "viewer") ? `
                        <button class="btn-action-sm btn-action-hotplug" style="margin-right:4px;" onclick="openVmHotplug('${vm.nodeName}', ${vm.vmId}, '${vm.vmName}')" title="Cấu hình nóng vCPU, RAM & Quản lý đĩa">
                            <i data-lucide="cpu" class="btn-icon-sm"></i>
                            <span>Cấu hình</span>
                        </button>
                        <button class="btn-action-sm" style="border-color:rgba(56,189,248,0.3); color:#38bdf8; margin-right:4px;" onclick="openVmFirewall('${vm.nodeName}', ${vm.vmId}, '${vm.vmName}')" title="Mở/Đóng Port Firewall">
                            <i data-lucide="shield" class="btn-icon-sm"></i>
                            <span>Port</span>
                        </button>
                    ` : '';

                    if (role === "viewer") {
                        actionCellHtml = `<span class="badge-optional" style="font-size:11px; opacity:0.6;"><i data-lucide="lock" style="width:11px;height:11px;"></i> Chỉ xem</span>`;
                    } else if (role === "developer" && isProdOrStag) {
                        actionCellHtml = `
                            <div style="display:flex; justify-content:flex-end; align-items:center;">
                                ${fwQuickBtn}
                                <span class="badge-optional" title="Môi trường ${vm.environment.toUpperCase()} - Chỉ Admin mới có quyền xóa" style="font-size:11px; color:#ef4444; border-color:rgba(239,68,68,0.3);"><i data-lucide="shield-alert" style="width:11px;height:11px;"></i> Protected</span>
                            </div>
                        `;
                    } else {
                        actionCellHtml = `
                            <div style="display:flex; justify-content:flex-end; align-items:center;">
                                ${fwQuickBtn}
                                <button class="btn-danger-sm" onclick="destroyVm('${vm.stackName}', ${vm.protection})">
                                    <i data-lucide="trash" class="btn-icon-sm"></i>
                                    Xóa
                                </button>
                            </div>
                        `;
                    }

                    return `
                        <tr>
                            <td>
                                <strong>${vm.vmName}</strong> 
                                ${vm.protection ? '<span class="badge-protected" title="Protection Enabled"><i data-lucide="shield-alert" class="badge-svg"></i> Protected</span>' : ''}
                                <br><small class="text-muted">${vm.stackName}</small>
                            </td>
                            <td>
                                <div>${envBadge}</div>
                                ${customTagsHtml ? `<div style="margin-top:4px;">${customTagsHtml}</div>` : ''}
                            </td>
                            <td>${vm.nodeName || "-"}</td>
                            <td><code>${vm.vmId || "Pending"}</code></td>
                            <td>${vmIpBadges}</td>
                            <td><span class="tag-deployed"><i data-lucide="check-circle" class="badge-svg"></i> ${vm.status}</span></td>
                            <td class="text-right">
                                ${actionCellHtml}
                            </td>
                        </tr>
                    `;
                }).join("");

                if (window.lucide) window.lucide.createIcons();
            } else {
                vmTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Chưa có VM nào được tạo qua Portal</td></tr>`;
            }
        } catch (err) {
            vmTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-error">Lỗi khi tải danh sách: ${err.message}</td></tr>`;
        }
    }

    btnRefresh.addEventListener("click", loadVms);

    // ==========================================
    // SCRIPT PRESETS CHO POST-PROVISIONING HOOKS
    // ==========================================
    const scriptPresets = {
        debian: `#cloud-config
# Cho phép Root đăng nhập qua SSH Key & Bật QEMU Guest Agent trên Debian
disable_root: false
ssh_pwauth: true
preserve_hostname: false

package_update: true
packages:
  - qemu-guest-agent
  - sudo
  - curl
  - htop

runcmd:
  # 1. Cấu hình SSHD cho phép root login bằng SSH Key
  - sed -i -e 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
  - sed -i -e 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  - mkdir -p /root/.ssh && chmod 700 /root/.ssh
  - touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys
  - systemctl restart sshd || systemctl restart ssh
  # 2. Kích hoạt QEMU Guest Agent để Proxmox nhận diện IP và ACPI Power
  - systemctl enable --now qemu-guest-agent
  - echo "Debian initialized with Root SSH Key & QEMU Agent" > /root/bootstrap.log`,

        qemu: `#cloud-config
# Tự động cập nhật gói và bật QEMU Guest Agent
package_update: true
packages:
  - qemu-guest-agent
runcmd:
  - systemctl enable --now qemu-guest-agent
  - echo "QEMU Guest Agent active" > /root/agent.log`,

        docker: `#cloud-config
# Cài đặt tự động Docker Engine & Docker Compose
package_update: true
packages:
  - qemu-guest-agent
  - curl
  - git
  - htop
  - ca-certificates
runcmd:
  - systemctl enable --now qemu-guest-agent
  - curl -fsSL https://get.docker.com -o get-docker.sh
  - sh get-docker.sh
  - usermod -aG docker root
  - systemctl enable --now docker
  - echo "Docker installed successfully" > /root/bootstrap.log`,

        nginx: `#cloud-config
# Cài đặt Nginx Web Server & QEMU Guest Agent
package_update: true
packages:
  - qemu-guest-agent
  - nginx
  - curl
  - ufw
runcmd:
  - systemctl enable --now qemu-guest-agent
  - systemctl enable --now nginx
  - echo "<h1>🚀 Deployed via Proxmox Pulumi Portal</h1><p>VM IP: $(hostname -I)</p>" > /usr/share/nginx/html/index.html
  - ufw allow 'Nginx Full'
  - ufw --force enable`,

        security: `#cloud-config
# Tối ưu bảo mật hệ thống & Cấu hình UFW Firewall
package_update: true
packages:
  - qemu-guest-agent
  - fail2ban
  - ufw
  - unattended-upgrades
runcmd:
  - systemctl enable --now qemu-guest-agent
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw --force enable
  - systemctl enable --now fail2ban
  - echo "Security hardening completed." > /root/hardening.log`
    };

    // ==========================================
    // WORKLOAD TYPE & APP CATALOG STACKS
    // ==========================================
    window.handleResourceTypeChange = (type) => {
        const cardQemu = document.getElementById("cardTypeQemu");
        const cardLxc = document.getElementById("cardTypeLxc");
        const instanceLabel = document.getElementById("instanceNameLabel");
        const vmNameInput = document.getElementById("vmName");

        if (type === "lxc") {
            cardLxc?.classList.add("active");
            cardQemu?.classList.remove("active");
            if (instanceLabel) instanceLabel.textContent = "Tên Container / Tiền Tố (LXC Base Name)";
            if (vmNameInput && !vmNameInput.value) vmNameInput.placeholder = "vd: lxc-redis, lxc-nginx, lxc-node...";
            // Gợi ý phần cứng nhẹ cho LXC
            applyHardwarePreset(1, 1, 8);
            showToast("📦 Đã chọn chế độ 'LXC Container' (Siêu nhẹ, tối ưu RAM/CPU)!");
        } else {
            cardQemu?.classList.add("active");
            cardLxc?.classList.remove("active");
            if (instanceLabel) instanceLabel.textContent = "Tên Máy Ảo / Tiền Tố (VM Base Name)";
            if (vmNameInput && !vmNameInput.value) vmNameInput.placeholder = "vd: ubuntu-server, db-master, k8s-node...";
            applyHardwarePreset(2, 2, 20);
            showToast("🖥️ Đã chọn chế độ 'QEMU Virtual Machine' (Hệ điều hành độc lập)!");
        }
    };

    const appCatalogStacks = {
        postgres: {
            name: "pg-cluster",
            cores: 2,
            ramGb: 4,
            diskGb: 40,
            tags: "database, postgresql, ha",
            script: `#cloud-config
# ===================================================
# 🐘 1-Click PostgreSQL 16 Enterprise Production Stack
# ===================================================
package_update: true
packages:
  - qemu-guest-agent
  - curl
  - ca-certificates
  - gnupg
  - ufw
runcmd:
  - systemctl enable --now qemu-guest-agent
  - install -d /etc/apt/keyrings
  - curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
  - echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  - apt-get update -y
  - apt-get install -y postgresql-16 postgresql-contrib-16
  - systemctl enable --now postgresql
  - sudo -u postgres psql -c "CREATE DATABASE appdb;"
  - sudo -u postgres psql -c "CREATE USER appuser WITH ENCRYPTED PASSWORD 'AppSecurePass#2026';"
  - sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;"
  - sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf
  - echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/16/main/pg_hba.conf
  - systemctl restart postgresql
  - ufw allow 5432/tcp
  - ufw allow 22/tcp
  - ufw --force enable
  - echo "PostgreSQL 16 Enterprise deployed successfully." > /root/app_stack.log`
        },

        redis: {
            name: "redis-sentinel",
            cores: 2,
            ramGb: 2,
            diskGb: 20,
            tags: "cache, redis, in-memory",
            script: `#cloud-config
# ===================================================
# ⚡ 1-Click Redis 7 High-Performance Cache & Sentinel
# ===================================================
package_update: true
packages:
  - qemu-guest-agent
  - redis-server
  - redis-sentinel
  - ufw
runcmd:
  - systemctl enable --now qemu-guest-agent
  - sed -i 's/bind 127.0.0.1 ::1/bind 0.0.0.0/g' /etc/redis/redis.conf
  - sed -i 's/protected-mode yes/protected-mode no/g' /etc/redis/redis.conf
  - echo "requirepass RedisSecurePass#2026" >> /etc/redis/redis.conf
  - echo "maxmemory 1500mb" >> /etc/redis/redis.conf
  - echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
  - systemctl restart redis-server
  - systemctl enable --now redis-server
  - ufw allow 6379/tcp
  - ufw allow 26379/tcp
  - ufw allow 22/tcp
  - ufw --force enable
  - echo "Redis 7 In-Memory Cache active on port 6379." > /root/app_stack.log`
        },

        minio: {
            name: "minio-s3",
            cores: 2,
            ramGb: 4,
            diskGb: 50,
            tags: "storage, s3, minio",
            script: `#cloud-config
# ===================================================
# 🪣 1-Click MinIO Enterprise S3 Compatible Storage
# ===================================================
package_update: true
packages:
  - qemu-guest-agent
  - curl
  - ufw
runcmd:
  - systemctl enable --now qemu-guest-agent
  - curl -O https://dl.min.io/server/minio/release/linux-amd64/minio
  - chmod +x minio && mv minio /usr/local/bin/
  - useradd -r minio-user -s /sbin/nologin
  - mkdir -p /data/minio && chown -R minio-user:minio-user /data/minio
  - mkdir -p /etc/minio
  - |
    cat << 'EOF' > /etc/minio/minio.conf
    MINIO_ROOT_USER=minioadmin
    MINIO_ROOT_PASSWORD=MinioSecurePassword#2026
    MINIO_VOLUMES="/data/minio"
    MINIO_OPTS="--console-address :9001"
    EOF
  - |
    cat << 'EOF' > /etc/systemd/system/minio.service
    [Unit]
    Description=MinIO Object Storage
    Documentation=https://min.io/docs/minio/linux/index.html
    Wants=network-online.target
    After=network-online.target

    [Service]
    WorkingDirectory=/usr/local/
    User=minio-user
    Group=minio-user
    EnvironmentFile=/etc/minio/minio.conf
    ExecStart=/usr/local/bin/minio server $MINIO_OPTS $MINIO_VOLUMES
    Restart=always
    LimitNOFILE=65536

    [Install]
    WantedBy=multi-user.target
    EOF
  - systemctl daemon-reload
  - systemctl enable --now minio
  - ufw allow 9000/tcp
  - ufw allow 9001/tcp
  - ufw allow 22/tcp
  - ufw --force enable
  - echo "MinIO S3 active on port 9000 & Web Console on port 9001." > /root/app_stack.log`
        },

        k3s: {
            name: "k3s-node",
            cores: 4,
            ramGb: 8,
            diskGb: 60,
            tags: "k8s, kubernetes, k3s",
            script: `#cloud-config
# ===================================================
# ⛵ 1-Click Lightweight Kubernetes Node (k3s)
# ===================================================
package_update: true
packages:
  - qemu-guest-agent
  - curl
  - iptables
  - ufw
runcmd:
  - systemctl enable --now qemu-guest-agent
  - curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
  - mkdir -p /root/.kube && cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
  - ufw allow 6443/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw allow 22/tcp
  - ufw --force enable
  - echo "Kubernetes (k3s) single-node cluster ready. Kubeconfig at /etc/rancher/k3s/k3s.yaml." > /root/app_stack.log`
        }
    };

    window.applyAppCatalog = (stackKey) => {
        const stack = appCatalogStacks[stackKey];
        if (!stack) return;

        const vmNameInput = document.getElementById("vmName");
        const tagsInput = document.getElementById("customTags");
        const userDataTextarea = document.getElementById("userData");

        if (vmNameInput && !vmNameInput.value) {
            vmNameInput.value = `${stack.name}-${Math.random().toString(36).substring(2, 5)}`;
        }
        if (tagsInput) tagsInput.value = stack.tags;
        if (userDataTextarea) userDataTextarea.value = stack.script;

        applyHardwarePreset(stack.cores, stack.ramGb, stack.diskGb);

        document.querySelectorAll(".app-catalog-card").forEach(c => c.classList.remove("active"));
        event?.currentTarget?.classList.add("active");

        showToast(`🚀 Đã nạp trọn bộ Stack ứng dụng '${stackKey.toUpperCase()}' kèm phần cứng & bootstrap script!`);
    };

    window.applyHardwarePreset = (cores, ramGb, diskGb) => {
        const coresInput = document.getElementById("cores");
        const coresRange = document.getElementById("coresRange");
        const ramInput = document.getElementById("memoryGb");
        const ramRange = document.getElementById("memoryGbRange");
        const diskInput = document.getElementById("diskSizeGb");
        const diskRange = document.getElementById("diskSizeGbRange");

        if (coresInput) coresInput.value = cores;
        if (coresRange) coresRange.value = cores;
        if (ramInput) ramInput.value = ramGb;
        if (ramRange) ramRange.value = ramGb;
        if (diskInput) diskInput.value = diskGb;
        if (diskRange) diskRange.value = diskGb;

        // Cập nhật active class cho preset buttons
        document.querySelectorAll(".btn-hw-preset").forEach(btn => {
            const specText = btn.querySelector(".hw-preset-spec")?.textContent || "";
            if (specText.includes(`${cores} vCPU`) && specText.includes(`${ramGb}GB`) && specText.includes(`${diskGb}GB`)) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        showToast(`⚡ Đã áp dụng Template Phần Cứng: ${cores} vCPU · ${ramGb} GB RAM · ${diskGb} GB Disk!`);
    };

    // Hàm kiểm tra tính hợp lệ của Form và tự động mở đúng Step nếu thiếu dữ liệu
    function validateCreateVmForm() {
        // Xóa các highlight lỗi cũ
        document.querySelectorAll(".input-field-error").forEach(el => el.classList.remove("input-field-error"));

        const count = parseInt(document.getElementById("vmCount")?.value || "1");

        // 1. Kiểm tra Bước 1: Tên máy ảo
        const vmNameInput = document.getElementById("vmName");
        if (!vmNameInput || !vmNameInput.value.trim()) {
            goToStep(1);
            vmNameInput?.classList.add("input-field-error");
            setTimeout(() => {
                vmNameInput?.scrollIntoView({ behavior: "smooth", block: "center" });
                vmNameInput?.focus();
            }, 100);
            showToast("⚠️ Vui lòng nhập 'Tên Máy Ảo / Tiền Tố (VM Base Name)'!", "warning");
            return false;
        }

        // 2. Kiểm tra Bước 2: Node & Storage & Image
        if (count === 1) {
            const nodeSelect = document.getElementById("nodeName");
            if (!nodeSelect || !nodeSelect.value) {
                goToStep(2);
                nodeSelect?.classList.add("input-field-error");
                setTimeout(() => {
                    nodeSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
                    nodeSelect?.focus();
                }, 100);
                showToast("⚠️ Vui lòng chọn 'Proxmox Node'!", "warning");
                return false;
            }

            const datastoreSelect = document.getElementById("datastoreId");
            if (!datastoreSelect || !datastoreSelect.value) {
                goToStep(2);
                datastoreSelect?.classList.add("input-field-error");
                setTimeout(() => {
                    datastoreSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
                    datastoreSelect?.focus();
                }, 100);
                showToast("⚠️ Vui lòng chọn 'Ổ Lưu Trữ VM Disk'!", "warning");
                return false;
            }
        } else {
            // Cluster multi-node: phải chọn ít nhất 1 node
            const checkedNodes = document.querySelectorAll("input[name='nodes']:checked");
            if (checkedNodes.length === 0) {
                goToStep(2);
                showToast("⚠️ Vui lòng chọn ít nhất một Node để phân bổ Cluster!", "warning");
                return false;
            }
        }

        const diskImageSelect = document.getElementById("diskImageId");
        if (!diskImageSelect || !diskImageSelect.value) {
            goToStep(2);
            diskImageSelect?.classList.add("input-field-error");
            setTimeout(() => {
                diskImageSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
                diskImageSelect?.focus();
            }, 100);
            showToast("⚠️ Vui lòng chọn 'Image Hệ Điều Hành (Cloud-Init / ISO)'!", "warning");
            return false;
        }

        // 3. Kiểm tra Bước 3: vCPU, RAM, Disk Size
        const coresInput = document.getElementById("cores");
        if (!coresInput || !coresInput.value || parseInt(coresInput.value) < 1) {
            goToStep(3);
            coresInput?.classList.add("input-field-error");
            setTimeout(() => {
                coresInput?.scrollIntoView({ behavior: "smooth", block: "center" });
                coresInput?.focus();
            }, 100);
            showToast("⚠️ Vui lòng cung cấp số lượng 'vCPU Cores' hợp lệ (>= 1)!", "warning");
            return false;
        }

        const ramInput = document.getElementById("memoryGb");
        if (!ramInput || !ramInput.value || parseInt(ramInput.value) < 1) {
            goToStep(3);
            ramInput?.classList.add("input-field-error");
            setTimeout(() => {
                ramInput?.scrollIntoView({ behavior: "smooth", block: "center" });
                ramInput?.focus();
            }, 100);
            showToast("⚠️ Vui lòng cung cấp dung lượng 'RAM' hợp lệ (>= 1 GB)!", "warning");
            return false;
        }

        const diskInput = document.getElementById("diskSizeGb");
        if (!diskInput || !diskInput.value || parseInt(diskInput.value) < 5) {
            goToStep(3);
            diskInput?.classList.add("input-field-error");
            setTimeout(() => {
                diskInput?.scrollIntoView({ behavior: "smooth", block: "center" });
                diskInput?.focus();
            }, 100);
            showToast("⚠️ Vui lòng cung cấp dung lượng 'Ổ Đĩa OS' hợp lệ (>= 5 GB)!", "warning");
            return false;
        }

        return true;
    }

    // Xóa viền đỏ khi người dùng bắt đầu nhập liệu vào ô
    document.querySelectorAll("#createVmForm input, #createVmForm select").forEach(el => {
        el.addEventListener("input", () => el.classList.remove("input-field-error"));
        el.addEventListener("change", () => el.classList.remove("input-field-error"));
    });

    // Xử lý tạo VM mới
    const form = document.getElementById("createVmForm");
    const btnSubmit = document.getElementById("btnSubmit");
    const btnText = btnSubmit.querySelector(".btn-text");
    const spinner = btnSubmit.querySelector(".spinner");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Kiểm tra hợp lệ trước khi submit
        if (!validateCreateVmForm()) {
            return;
        }

        const formData = new FormData(form);
        const count = parseInt(formData.get("vmCount")) || 1;
        const rawBaseName = (formData.get("name") || "vm").trim();
        const environment = formData.get("environment") || "dev";
        const tags = (formData.get("tags") || "").split(/[,;\s]+/).map(t => t.trim()).filter(Boolean);
        const cpuType = formData.get("cpuType") || "host";
        const datastoreId = formData.get("datastoreId");
        const diskImageId = formData.get("diskImageId");
        const bridge = formData.get("bridge");
        const vlanTagRaw = formData.get("vlanTag");
        const vlanTag = (vlanTagRaw && parseInt(vlanTagRaw, 10) > 0) ? parseInt(vlanTagRaw, 10) : undefined;
        const cores = parseInt(formData.get("cores"));
        const memoryMb = parseInt(formData.get("memoryGb")) * 1024;
        const diskSizeGb = parseInt(formData.get("diskSizeGb"));
        const sshPublicKey = formData.get("sshPublicKey");
        const userData = formData.get("userData");
        const upgrade = formData.get("upgrade") === "on";
        const protection = formData.get("protection") === "on";

        let payload;

        const resourceType = formData.get("resourceType") || "qemu";

        if (count === 1) {
            payload = {
                name: rawBaseName,
                resourceType,
                nodeName: formData.get("nodeName") || "node01",
                environment,
                tags,
                cpuType,
                datastoreId,
                diskImageId,
                bridge,
                vlanTag,
                cores,
                memoryMb,
                diskSizeGb,
                sshPublicKey,
                userData,
                upgrade,
                protection,
            };
        } else {
            // Lấy các node đang hiển thị và được check theo filter hiện tại
            let selectedNodes = [];
            if (nodesCheckboxContainer) {
                const visibleCheckedBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']:checked");
                selectedNodes = Array.from(visibleCheckedBoxes).map(cb => cb.value);

                if (selectedNodes.length === 0) {
                    const visibleBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']");
                    selectedNodes = Array.from(visibleBoxes).map(cb => cb.value);
                }
            }
            if (selectedNodes.length === 0 && cachedClusterData.length > 0) {
                selectedNodes = [cachedClusterData[0].node];
            }
            if (selectedNodes.length === 0) selectedNodes = ["node01"];

            const vmsList = [];
            for (let i = 1; i <= count; i++) {
                const numStr = i < 10 ? `0${i}` : `${i}`;
                let vmName = "";
                if (rawBaseName.endsWith("-") || rawBaseName.endsWith("_")) {
                    vmName = `${rawBaseName}${numStr}`;
                } else if (/\d+$/.test(rawBaseName)) {
                    const baseWithoutNum = rawBaseName.replace(/\d+$/, '');
                    vmName = `${baseWithoutNum}${numStr}`;
                } else {
                    vmName = `${rawBaseName}${numStr}`;
                }

                // Thu thập danh sách ổ đĩa phụ mở rộng (Secondary Disks)
                const secondaryDisks = [];
                document.querySelectorAll(".secondary-disk-row").forEach(row => {
                    const name = row.querySelector(".sec-disk-name")?.value || "Data Disk";
                    const sizeGb = Number(row.querySelector(".sec-disk-size")?.value) || 20;
                    const store = row.querySelector(".sec-disk-store")?.value || "";
                    if (store && sizeGb > 0) {
                        secondaryDisks.push({ name, sizeGb, datastoreId: store });
                    }
                });

                const assignedNode = selectedNodes[(i - 1) % selectedNodes.length];
                vmsList.push({
                    name: vmName,
                    resourceType,
                    nodeName: assignedNode,
                    environment,
                    tags,
                    cpuType,
                    datastoreId,
                    diskImageId,
                    bridge,
                    vlanTag,
                    cores,
                    memoryMb,
                    diskSizeGb,
                    secondaryDisks: secondaryDisks.length > 0 ? secondaryDisks : undefined,
                    sshPublicKey,
                    userData,
                    upgrade,
                    protection,
                });
            }
            payload = { vms: vmsList };
        }

        btnSubmit.disabled = true;
        btnText.textContent = count > 1 ? `Đang khởi tạo ${count} VMs...` : "Đang khởi tạo...";
        spinner.classList.remove("hidden");

        try {
            const res = await fetch("/api/vms", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const result = await res.json();

            if (result.success) {
                if (result.requiresApproval) {
                    showToast(result.message);
                    appendLog(`[APPROVAL QUEUE] ${result.message}`);
                    document.querySelector('.nav-tab[data-tab="tab-approvals"]').click();
                    loadQuotasAndApprovals();
                } else {
                    appendLog(`[Portal] ${result.message}`);
                    // Chuyển sang tab Logs để xem
                    document.querySelector('.nav-tab[data-tab="tab-logs"]').click();
                    setTimeout(loadVms, 3000);
                }
            } else {
                showRbacAlert(`⛔ ${result.error}`);
                appendLog(`[Portal Error] ${result.error}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối tới Server: ${err.message}`);
            appendLog(`[Portal Error] ${err.message}`);
        } finally {
            btnSubmit.disabled = false;
            btnText.textContent = "Triển Khai VM";
            spinner.classList.add("hidden");
        }
    });

    // ==========================================
    // NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)
    // ==========================================
    const auditTableBody = document.getElementById("auditTableBody");
    const btnRefreshAudit = document.getElementById("btnRefreshAudit");

    async function loadAuditLogs() {
        if (!auditTableBody) return;
        try {
            const res = await fetch("/api/audit-logs", {
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                auditTableBody.innerHTML = data.data.map(log => {
                    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : "-";
                    const isSuccess = log.status === "SUCCESS";
                    const isDenied = log.status === "DENIED";

                    const statusBadge = isSuccess 
                        ? `<span class="tag-deployed"><i data-lucide="check-circle" class="badge-svg"></i> Thành Công</span>` 
                        : (isDenied 
                            ? `<span class="tag-env tag-env-pro"><i data-lucide="shield-alert" class="badge-svg"></i> Từ Chối (RBAC)</span>` 
                            : `<span class="tag-env tag-env-stag"><i data-lucide="alert-triangle" class="badge-svg"></i> Thất Bại</span>`);

                    let roleBadge = `<span class="tag-env tag-env-pro"><i data-lucide="shield-check" class="badge-svg"></i> Admin</span>`;
                    if (log.role === "developer") {
                        roleBadge = `<span class="tag-env tag-env-dev"><i data-lucide="code-2" class="badge-svg"></i> Developer</span>`;
                    } else if (log.role === "viewer") {
                        roleBadge = `<span class="tag-env tag-env-stag"><i data-lucide="eye" class="badge-svg"></i> Viewer</span>`;
                    }

                    return `
                        <tr>
                            <td style="font-family:'JetBrains Mono',monospace; font-size:11.5px; color:#cbd5e1;">${timeStr}</td>
                            <td>
                                <strong>${log.username}</strong>
                                <div style="margin-top:3px;">${roleBadge}</div>
                            </td>
                            <td><code style="color:#38bdf8; font-weight:600;">${log.action}</code></td>
                            <td><strong style="color:#f8fafc;">${log.target || "-"}</strong></td>
                            <td>${log.environment ? renderEnvBadge(log.environment) : '<span class="text-muted">—</span>'}</td>
                            <td>${statusBadge}</td>
                            <td style="font-size:12px; color:#94a3b8; line-height:1.4;">${log.details || "-"}</td>
                        </tr>
                    `;
                }).join("");

                if (window.lucide) window.lucide.createIcons();
            } else {
                auditTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">Chưa có bản ghi nhật ký kiểm toán nào</td></tr>`;
            }
        } catch (err) {
            auditTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 24px;">Lỗi tải Audit Logs: ${err.message}</td></tr>`;
        }
    }

    // ==========================================
    // RESOURCE QUOTAS & APPROVAL WORKFLOW
    // ==========================================
    const approvalsTableBody = document.getElementById("approvalsTableBody");
    const btnRefreshApprovals = document.getElementById("btnRefreshApprovals");
    const approvalBadgeCount = document.getElementById("approvalBadgeCount");

    const quotaVmDisplay = document.getElementById("quotaVmDisplay");
    const quotaVmBar = document.getElementById("quotaVmBar");
    const quotaVmFooter = document.getElementById("quotaVmFooter");

    const quotaCpuDisplay = document.getElementById("quotaCpuDisplay");
    const quotaCpuBar = document.getElementById("quotaCpuBar");
    const quotaCpuFooter = document.getElementById("quotaCpuFooter");

    const quotaRamDisplay = document.getElementById("quotaRamDisplay");
    const quotaRamBar = document.getElementById("quotaRamBar");
    const quotaRamFooter = document.getElementById("quotaRamFooter");

    async function loadQuotasAndApprovals() {
        if (!currentAuthToken) return;

        // 1. Tải Quota & Usage
        try {
            const quotaRes = await fetch("/api/quotas/me", { headers: getAuthHeaders() });
            const quotaData = await quotaRes.json();
            if (quotaData.success && quotaData.data) {
                const { quota, usage, isAdmin } = quotaData.data;

                if (isAdmin) {
                    if (quotaVmDisplay) quotaVmDisplay.textContent = `${usage.vms} VMs (Không Giới Hạn)`;
                    if (quotaVmBar) { quotaVmBar.style.width = "100%"; quotaVmBar.className = "progress-bar-fill"; }
                    if (quotaVmFooter) quotaVmFooter.textContent = `Tài khoản Administrator không bị áp hạn mức`;

                    if (quotaCpuDisplay) quotaCpuDisplay.textContent = `${usage.cores} vCPUs (Không Giới Hạn)`;
                    if (quotaCpuBar) { quotaCpuBar.style.width = "100%"; quotaCpuBar.className = "progress-bar-fill"; }
                    if (quotaCpuFooter) quotaCpuFooter.textContent = `Toàn quyền phân bổ CPU trên toàn cụm`;

                    if (quotaRamDisplay) quotaRamDisplay.textContent = `${(usage.memoryMb / 1024).toFixed(1)} GB (Không Giới Hạn)`;
                    if (quotaRamBar) { quotaRamBar.style.width = "100%"; quotaRamBar.className = "progress-bar-fill"; }
                    if (quotaRamFooter) quotaRamFooter.textContent = `Toàn quyền phân bổ RAM trên toàn cụm`;
                } else {
                    // Quota VMs
                    const vmPercent = Math.min(100, Math.round((usage.vms / quota.maxVms) * 100));
                    if (quotaVmDisplay) quotaVmDisplay.textContent = `${usage.vms} / ${quota.maxVms} VMs`;
                    if (quotaVmBar) {
                        quotaVmBar.style.width = `${vmPercent}%`;
                        quotaVmBar.className = `progress-bar-fill ${vmPercent >= 100 ? 'danger' : (vmPercent >= 75 ? 'warning' : '')}`;
                    }
                    if (quotaVmFooter) quotaVmFooter.textContent = `Đã sử dụng ${usage.vms} trong tối đa ${quota.maxVms} VMs`;

                    // Quota CPU
                    const cpuPercent = Math.min(100, Math.round((usage.cores / quota.maxCores) * 100));
                    if (quotaCpuDisplay) quotaCpuDisplay.textContent = `${usage.cores} / ${quota.maxCores} vCPUs`;
                    if (quotaCpuBar) {
                        quotaCpuBar.style.width = `${cpuPercent}%`;
                        quotaCpuBar.className = `progress-bar-fill ${cpuPercent >= 100 ? 'danger' : (cpuPercent >= 75 ? 'warning' : '')}`;
                    }
                    if (quotaCpuFooter) quotaCpuFooter.textContent = `Đã cấp ${usage.cores} trong tối đa ${quota.maxCores} vCPUs`;

                    // Quota RAM
                    const ramUsedGb = (usage.memoryMb / 1024).toFixed(1);
                    const ramMaxGb = (quota.maxMemoryMb / 1024).toFixed(1);
                    const ramPercent = Math.min(100, Math.round((usage.memoryMb / quota.maxMemoryMb) * 100));
                    if (quotaRamDisplay) quotaRamDisplay.textContent = `${ramUsedGb} / ${ramMaxGb} GB`;
                    if (quotaRamBar) {
                        quotaRamBar.style.width = `${ramPercent}%`;
                        quotaRamBar.className = `progress-bar-fill ${ramPercent >= 100 ? 'danger' : (ramPercent >= 75 ? 'warning' : '')}`;
                    }
                    if (quotaRamFooter) quotaRamFooter.textContent = `Đang dùng ${usage.memoryMb} MB trong tối đa ${quota.maxMemoryMb} MB RAM`;
                }
            }
        } catch (err) {
            console.error("Lỗi tải Quotas:", err);
        }

        // 2. Tải Danh Sách Yêu Cầu Phê Duyệt
        if (!approvalsTableBody) return;
        try {
            const appRes = await fetch("/api/approvals", { headers: getAuthHeaders() });
            const appData = await appRes.json();

            if (appData.success && Array.isArray(appData.data)) {
                const requests = appData.data;
                const pendingCount = requests.filter(r => r.status === "PENDING").length;

                if (approvalBadgeCount) {
                    if (pendingCount > 0) {
                        approvalBadgeCount.textContent = pendingCount;
                        approvalBadgeCount.classList.remove("hidden");
                    } else {
                        approvalBadgeCount.classList.add("hidden");
                    }
                }

                if (requests.length === 0) {
                    approvalsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">Hiện không có yêu cầu phê duyệt nào</td></tr>`;
                    return;
                }

                const isAdmin = currentAuthUser && currentAuthUser.role === "admin";

                approvalsTableBody.innerHTML = requests.map(req => {
                    const timeStr = req.createdAt ? new Date(req.createdAt).toLocaleString() : "-";
                    const isPending = req.status === "PENDING";
                    const isApproved = req.status === "APPROVED";
                    const isRejected = req.status === "REJECTED";

                    let statusBadge = `<span class="tag-env tag-env-stag"><i data-lucide="clock" class="badge-svg"></i> Chờ Admin Duyệt</span>`;
                    if (isApproved) {
                        statusBadge = `<span class="tag-deployed"><i data-lucide="check-circle" class="badge-svg"></i> Đã Duyệt (${req.resolvedBy || 'Admin'})</span>`;
                    } else if (isRejected) {
                        statusBadge = `<span class="tag-env tag-env-pro"><i data-lucide="x-circle" class="badge-svg"></i> Bị Từ Chối</span>`;
                    }

                    const envStr = req.vms && req.vms[0] ? (req.vms[0].environment || "dev").toUpperCase() : "DEV";
                    const vmsNames = req.vms ? req.vms.map(v => `<code>${v.name}</code> (${v.cores}c / ${v.memoryMb}MB)`).join("<br>") : "-";

                    let actionHtml = `<span class="text-muted" style="font-size:12px;">—</span>`;
                    if (isPending && isAdmin) {
                        actionHtml = `
                            <div style="display: flex; gap: 6px; justify-content: flex-end;">
                                <button class="btn-action-approve" onclick="handleApprovalAction('${req.id}', 'approve')">
                                    <i data-lucide="check" style="width:14px;height:14px;"></i> Phê Duyệt
                                </button>
                                <button class="btn-action-reject" onclick="handleApprovalAction('${req.id}', 'reject')">
                                    <i data-lucide="x" style="width:14px;height:14px;"></i> Từ Chối
                                </button>
                            </div>
                        `;
                    } else if (isRejected && req.rejectionReason) {
                        actionHtml = `<span class="text-danger" style="font-size:11.5px;">Lý do: ${req.rejectionReason}</span>`;
                    }

                    return `
                        <tr>
                            <td>
                                <strong style="font-family:'JetBrains Mono',monospace; color:#38bdf8;">${req.id}</strong>
                                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${timeStr}</div>
                            </td>
                            <td>
                                <strong>${req.requestedBy.displayName || req.requestedBy.username}</strong>
                                <div style="font-size:11px; color:#a5b4fc; text-transform:uppercase;">${req.requestedBy.role}</div>
                            </td>
                            <td style="font-size:12px; line-height:1.5;">${vmsNames}</td>
                            <td>${renderEnvBadge(envStr.toLowerCase())}</td>
                            <td style="font-size:12px; color:#cbd5e1; max-width:240px; line-height:1.4;">
                                <strong>${req.reason === "ENV_RESTRICTION" ? "🛡️ Môi Trường Giới Hạn" : "⚠️ Vượt Hạn Mức Quota"}</strong>
                                <div style="font-size:11.5px; color:#94a3b8; margin-top:2px;">${req.reasonDetails}</div>
                            </td>
                            <td>${statusBadge}</td>
                            <td class="text-right">${actionHtml}</td>
                        </tr>
                    `;
                }).join("");

                if (window.lucide) window.lucide.createIcons();
            }
        } catch (err) {
            approvalsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 24px;">Lỗi tải Approval Requests: ${err.message}</td></tr>`;
        }
    }

    window.handleApprovalAction = async (requestId, action) => {
        let rejectionReason = "";
        if (action === "reject") {
            const promptVal = prompt("Vui lòng nhập lý do từ chối yêu cầu này:", "Vượt ngân sách hoặc không đúng mục đích");
            if (promptVal === null) return;
            rejectionReason = promptVal;
        } else {
            if (!confirm(`Bạn có chắc chắn muốn PHÊ DUYỆT yêu cầu '${requestId}' và kích hoạt Pulumi Engine khởi tạo máy ảo không?`)) return;
        }

        try {
            const res = await fetch(`/api/approvals/${requestId}/${action}`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ rejectionReason })
            });
            const data = await res.json();

            if (data.success) {
                showToast(data.message || `Đã xử lý yêu cầu thành công!`);
                loadQuotasAndApprovals();
                loadAuditLogs();
                if (action === "approve") {
                    document.querySelector('.nav-tab[data-tab="tab-logs"]').click();
                    setTimeout(loadVms, 3000);
                }
            } else {
                alert(`Lỗi: ${data.error}`);
            }
        } catch (err) {
            alert(`Lỗi kết nối: ${err.message}`);
        }
    };

    if (btnRefreshApprovals) {
        btnRefreshApprovals.addEventListener("click", loadQuotasAndApprovals);
    }

    window.destroyVm = async (stackName, isProtected) => {
        let force = false;
        if (isProtected) {
            const proceed = confirm(
                `⚠️ LƯU Ý BẢO VỆ: Máy ảo '${stackName}' từng có cờ Protection.\n\nNếu bạn ĐÃ tắt Protection thành 'No' trên Proxmox VE Web UI (hoặc muốn buộc xóa), hãy nhấn OK để tiến hành xóa.`
            );
            if (!proceed) return;
            force = true;
        } else {
            if (!confirm(`Bạn có chắc chắn muốn xóa và hủy tài nguyên cho '${stackName}' không?`)) return;
        }

        try {
            const res = await fetch(`/api/vms/${stackName}${force ? '?force=true' : ''}`, { 
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const result = await res.json();
            
            if (result.success) {
                showToast(`🗑️ Đang tiến hành hủy máy ảo thuộc stack '${stackName}'...`);
                appendLog(`[Portal] ${result.message}`);
                document.querySelector('.nav-tab[data-tab="tab-logs"]').click();
            } else {
                showRbacAlert(`⛔ Không thể xóa: ${result.error}`);
                appendLog(`[Portal Error] ${result.error}`);
            }
            setTimeout(loadVms, 3000);
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            appendLog(`[Portal Error] ${err.message}`);
        }
    };

    // ==========================================
    // CLUSTER RESOURCE ALERTING CONTROLLER
    // ==========================================
    const clusterAlertBanner = document.getElementById("clusterAlertBanner");
    const alertBannerTitle = document.getElementById("alertBannerTitle");
    const alertBannerDetails = document.getElementById("alertBannerDetails");
    const btnBannerViewAlerts = document.getElementById("btnBannerViewAlerts");
    const btnDismissAlertBanner = document.getElementById("btnDismissAlertBanner");

    const btnOpenAlertsModal = document.getElementById("btnOpenAlertsModal");
    const alertManagerModal = document.getElementById("alertManagerModal");
    const btnCloseAlertModal = document.getElementById("btnCloseAlertModal");
    const headerAlertBadgeCount = document.getElementById("headerAlertBadgeCount");
    const modalActiveAlertBadge = document.getElementById("modalActiveAlertBadge");
    const activeAlertSummaryText = document.getElementById("activeAlertSummaryText");
    const activeAlertsContainer = document.getElementById("activeAlertsContainer");
    const alertHistoryTableBody = document.getElementById("alertHistoryTableBody");

    const formAlertConfig = document.getElementById("formAlertConfig");
    const cfgStorageThreshold = document.getElementById("cfgStorageThreshold");
    const cfgCpuThreshold = document.getElementById("cfgCpuThreshold");
    const cfgRamThreshold = document.getElementById("cfgRamThreshold");
    const cfgCheckInterval = document.getElementById("cfgCheckInterval");
    const cfgTelegramEnabled = document.getElementById("cfgTelegramEnabled");
    const cfgTelegramBotToken = document.getElementById("cfgTelegramBotToken");
    const cfgTelegramChatId = document.getElementById("cfgTelegramChatId");
    const cfgWebhookEnabled = document.getElementById("cfgWebhookEnabled");
    const cfgWebhookUrl = document.getElementById("cfgWebhookUrl");
    const alertConfigMsg = document.getElementById("alertConfigMsg");
    const btnTestAlertNotification = document.getElementById("btnTestAlertNotification");
    const btnManualCheckAlerts = document.getElementById("btnManualCheckAlerts");

    async function loadClusterAlerts() {
        try {
            const res = await fetch("/api/alerts", { credentials: "omit" });
            if (!res.ok) return;
            const resJson = await res.json();
            if (!resJson.success || !resJson.data) return;

            currentAlertData = resJson.data;
            const { thresholds, activeAlerts, recentHistory, activeCount } = resJson.data;

            // 1. Cập nhật Badge chuông thông báo
            if (headerAlertBadgeCount) {
                if (activeCount > 0) {
                    headerAlertBadgeCount.textContent = activeCount;
                    headerAlertBadgeCount.classList.remove("hidden");
                } else {
                    headerAlertBadgeCount.classList.add("hidden");
                }
            }

            if (modalActiveAlertBadge) {
                if (activeCount > 0) {
                    modalActiveAlertBadge.textContent = activeCount;
                    modalActiveAlertBadge.classList.remove("hidden");
                } else {
                    modalActiveAlertBadge.classList.add("hidden");
                }
            }

            // 2. Cập nhật Sticky Alert Banner
            if (clusterAlertBanner) {
                if (activeCount > 0) {
                    clusterAlertBanner.classList.remove("hidden");
                    const hasCritical = activeAlerts.some(a => a.severity === "CRITICAL");
                    if (hasCritical) {
                        clusterAlertBanner.classList.add("alert-critical");
                    } else {
                        clusterAlertBanner.classList.remove("alert-critical");
                    }

                    if (alertBannerTitle) {
                        alertBannerTitle.textContent = `🚨 Phát hiện ${activeCount} cảnh báo ngưỡng tài nguyên cụm!`;
                    }
                    if (alertBannerDetails) {
                        const summaries = activeAlerts.map(a => `${a.resourceName} (${a.currentValue}${a.unit} ≥ ${a.thresholdValue}${a.unit})`).join(" • ");
                        alertBannerDetails.textContent = summaries;
                    }
                } else {
                    clusterAlertBanner.classList.add("hidden");
                }
            }

            // 3. Render danh sách Active Alerts trong Modal
            if (activeAlertSummaryText) {
                activeAlertSummaryText.textContent = activeCount > 0
                    ? `Hiện có ${activeCount} tài nguyên đang vượt ngưỡng giám sát an toàn:`
                    : `✅ Toàn bộ tài nguyên trong cụm đang ở mức an toàn (Storage < ${thresholds.storagePercent}%, CPU < ${thresholds.cpuPercent}%, RAM < ${thresholds.ramPercent}%).`;
            }

            if (activeAlertsContainer) {
                if (activeCount === 0) {
                    activeAlertsContainer.innerHTML = `
                        <div class="card text-center text-muted" style="padding: 28px 16px;">
                            <i data-lucide="shield-check" style="width: 36px; height: 36px; color: #22c55e; margin: 0 auto 10px; display: block;"></i>
                            <h4 style="color: #f8fafc; font-size: 14px; margin-bottom: 4px;">Hạ Tầng Hoạt Động Bình Thường</h4>
                            <p style="font-size: 12px; margin: 0;">Không có Storage Pool nào vượt quá ${thresholds.storagePercent}% hoặc Node bị quá tải.</p>
                        </div>
                    `;
                } else {
                    activeAlertsContainer.innerHTML = activeAlerts.map(alert => {
                        const isCritical = alert.severity === "CRITICAL";
                        const timeStr = new Date(alert.timestamp).toLocaleTimeString();
                        return `
                            <div class="alert-card-item ${isCritical ? 'alert-critical' : 'alert-warning'}">
                                <div class="alert-card-info">
                                    <div class="alert-card-title">
                                        <span>${isCritical ? '🚨' : '⚠️'}</span>
                                        <span>${alert.title}</span>
                                        <span class="badge-storage-danger">${alert.severity}</span>
                                    </div>
                                    <div class="alert-card-desc">${alert.message}</div>
                                    <div class="alert-card-meta">
                                        <span><i data-lucide="server" style="width:12px;height:12px;display:inline;"></i> Node: <strong>${alert.node}</strong></span>
                                        <span><i data-lucide="clock" style="width:12px;height:12px;display:inline;"></i> Phát hiện: ${timeStr}</span>
                                    </div>
                                </div>
                                <div class="alert-card-actions">
                                    <button class="btn-dismiss-alert" onclick="dismissClusterAlert('${alert.id}')" title="Ẩn cảnh báo này">
                                        <i data-lucide="check" class="btn-icon-xs"></i> Đã xem
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join("");
                }
            }

            // 4. Render Alert History
            if (alertHistoryTableBody) {
                if (!recentHistory || recentHistory.length === 0) {
                    alertHistoryTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">Chưa có lịch sử cảnh báo nào được ghi nhận</td></tr>`;
                } else {
                    alertHistoryTableBody.innerHTML = recentHistory.map(hist => {
                        const timeStr = new Date(hist.timestamp).toLocaleString();
                        const isResolved = hist.status === "RESOLVED";
                        const isDismissed = hist.status === "DISMISSED";
                        let statusBadge = `<span class="badge-storage-danger">ACTIVE</span>`;
                        if (isResolved) {
                            statusBadge = `<span class="tag-deployed"><i data-lucide="check-circle" class="badge-svg"></i> RESOLVED</span>`;
                        } else if (isDismissed) {
                            statusBadge = `<span class="badge-optional">DISMISSED</span>`;
                        }

                        return `
                            <tr>
                                <td style="font-size:11.5px; color:#94a3b8;">${timeStr}</td>
                                <td><strong>${hist.resourceName}</strong></td>
                                <td><code>${hist.node}</code></td>
                                <td><strong style="color:${hist.currentValue >= hist.thresholdValue ? '#ef4444' : '#22c55e'}">${hist.currentValue}${hist.unit}</strong> (Ngưỡng: ${hist.thresholdValue}${hist.unit})</td>
                                <td><span class="tag-env tag-env-${hist.severity === 'CRITICAL' ? 'pro' : 'stag'}">${hist.severity}</span></td>
                                <td>${statusBadge}</td>
                            </tr>
                        `;
                    }).join("");
                }
            }

            // 5. Fill Config Inputs
            if (thresholds) {
                if (cfgStorageThreshold) cfgStorageThreshold.value = thresholds.storagePercent || 85;
                if (cfgCpuThreshold) cfgCpuThreshold.value = thresholds.cpuPercent || 85;
                if (cfgRamThreshold) cfgRamThreshold.value = thresholds.ramPercent || 85;
                if (cfgCheckInterval) cfgCheckInterval.value = thresholds.checkIntervalSec || 30;
                if (cfgTelegramEnabled) cfgTelegramEnabled.checked = !!thresholds.telegramEnabled;
                if (cfgTelegramBotToken && thresholds.telegramBotToken) cfgTelegramBotToken.value = thresholds.telegramBotToken;
                if (cfgTelegramChatId && thresholds.telegramChatId) cfgTelegramChatId.value = thresholds.telegramChatId;
                if (cfgWebhookEnabled) cfgWebhookEnabled.checked = !!thresholds.webhookEnabled;
                if (cfgWebhookUrl && thresholds.webhookUrl) cfgWebhookUrl.value = thresholds.webhookUrl;
            }

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error("[Cluster Alert] Lỗi tải cảnh báo:", err);
        }
    }

    // Dismiss Alert by ID
    window.dismissClusterAlert = async (alertId) => {
        try {
            await fetch("/api/alerts/dismiss", {
                method: "POST",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ id: alertId })
            });
            showToast("✅ Đã tắt cảnh báo.");
            await loadClusterAlerts();
        } catch (e) {
            showToast("⛔ Không thể tắt cảnh báo.");
        }
    };

    // Open Alert Modal
    if (btnOpenAlertsModal && alertManagerModal) {
        btnOpenAlertsModal.addEventListener("click", () => {
            alertManagerModal.classList.remove("hidden");
            loadClusterAlerts();
        });
    }

    if (btnBannerViewAlerts && alertManagerModal) {
        btnBannerViewAlerts.addEventListener("click", () => {
            alertManagerModal.classList.remove("hidden");
            loadClusterAlerts();
        });
    }

    if (btnCloseAlertModal && alertManagerModal) {
        btnCloseAlertModal.addEventListener("click", () => {
            alertManagerModal.classList.add("hidden");
        });
    }

    if (btnDismissAlertBanner && clusterAlertBanner) {
        btnDismissAlertBanner.addEventListener("click", () => {
            clusterAlertBanner.classList.add("hidden");
        });
    }

    // Modal Sub-tabs Switching
    document.querySelectorAll(".modal-sub-tab").forEach(tabBtn => {
        tabBtn.addEventListener("click", () => {
            const targetPaneId = tabBtn.getAttribute("data-alert-tab");
            document.querySelectorAll(".modal-sub-tab").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".alert-tab-pane").forEach(p => p.classList.remove("active"));

            tabBtn.classList.add("active");
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) targetPane.classList.add("active");
            if (window.lucide) window.lucide.createIcons();
        });
    });

    // Manual Quick Check Alerts
    if (btnManualCheckAlerts) {
        btnManualCheckAlerts.addEventListener("click", async () => {
            showToast("🔍 Đang quét tức thời tài nguyên cụm...");
            try {
                const res = await fetch("/api/alerts/check", {
                    method: "POST",
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`✅ Quét hoàn tất! ${data.data.activeCount} cảnh báo hoạt động.`);
                    await loadClusterAlerts();
                    if (cachedClusterData.length > 0) renderClusterView(cachedClusterData, currentSearchTerm);
                }
            } catch (err) {
                showToast(`⛔ Lỗi: ${err.message}`);
            }
        });
    }

    // Send Test Alert Notification
    if (btnTestAlertNotification) {
        btnTestAlertNotification.addEventListener("click", async () => {
            btnTestAlertNotification.disabled = true;
            showToast("🚀 Đang gửi thông báo thử nghiệm tới Telegram & Webhook...");
            try {
                const res = await fetch("/api/alerts/test", {
                    method: "POST",
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`🔔 Kết quả: ${data.data.details}`);
                    await loadClusterAlerts();
                } else {
                    showRbacAlert(`⛔ Lỗi Test Alert: ${data.error}`);
                }
            } catch (err) {
                showRbacAlert(`⛔ Lỗi: ${err.message}`);
            } finally {
                btnTestAlertNotification.disabled = false;
            }
        });
    }

    // Save Alert Configuration Form
    if (formAlertConfig) {
        formAlertConfig.addEventListener("submit", async (e) => {
            e.preventDefault();
            const storagePercent = Number(cfgStorageThreshold.value) || 85;
            const cpuPercent = Number(cfgCpuThreshold.value) || 85;
            const ramPercent = Number(cfgRamThreshold.value) || 85;
            const checkIntervalSec = Number(cfgCheckInterval.value) || 30;
            const telegramEnabled = !!cfgTelegramEnabled.checked;
            const telegramBotToken = cfgTelegramBotToken.value.trim();
            const telegramChatId = cfgTelegramChatId.value.trim();
            const webhookEnabled = !!cfgWebhookEnabled.checked;
            const webhookUrl = cfgWebhookUrl.value.trim();

            const btnSave = document.getElementById("btnSaveAlertConfig");
            if (btnSave) btnSave.disabled = true;
            showToast("⚙️ Đang lưu cấu hình cảnh báo ngưỡng...");

            try {
                const res = await fetch("/api/alerts/config", {
                    method: "POST",
                    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({
                        storagePercent,
                        cpuPercent,
                        ramPercent,
                        checkIntervalSec,
                        telegramEnabled,
                        telegramBotToken,
                        telegramChatId,
                        webhookEnabled,
                        webhookUrl
                    })
                });
                const result = await res.json();
                if (result.success) {
                    showToast("✅ Đã lưu cấu hình Cảnh Báo Ngưỡng thành công!");
                    await loadClusterAlerts();
                    if (cachedClusterData.length > 0) renderClusterView(cachedClusterData, currentSearchTerm);
                } else {
                    showRbacAlert(`⛔ Lỗi lưu cấu hình: ${result.error}`);
                }
            } catch (err) {
                showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSave) btnSave.disabled = false;
            }
        });
    }

    // ==========================================
    // MULTI-DISK ATTACHMENT IN CREATION WIZARD
    // ==========================================
    const btnAddSecondaryDisk = document.getElementById("btnAddSecondaryDisk");
    const secondaryDisksContainer = document.getElementById("secondaryDisksContainer");

    function createSecondaryDiskRow() {
        if (!secondaryDisksContainer) return;
        const row = document.createElement("div");
        row.className = "secondary-disk-row";

        const currentNode = document.getElementById("nodeName")?.value || "";
        const nodeData = (cachedClusterData || []).find(n => n.node === currentNode);
        const storages = (nodeData && nodeData.storages) ? nodeData.storages : [];
        const optionsHtml = storages.map(s => `<option value="${s.storage}">${s.storage} (${s.type})</option>`).join("") || '<option value="local-lvm">local-lvm</option>';

        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="form-input sec-disk-name" placeholder="Tên đĩa (vd: Data / Logs)" value="Data Disk">
            </div>
            <div class="form-group">
                <input type="number" class="form-input sec-disk-size" placeholder="GB" min="5" max="2000" value="50">
            </div>
            <div class="form-group">
                <select class="form-input sec-disk-store">
                    ${optionsHtml}
                </select>
            </div>
            <button type="button" class="btn-remove-disk" title="Xóa đĩa này" onclick="this.closest('.secondary-disk-row').remove()">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
        `;
        secondaryDisksContainer.appendChild(row);
        if (window.lucide) window.lucide.createIcons();
    }

    if (btnAddSecondaryDisk) {
        btnAddSecondaryDisk.addEventListener("click", createSecondaryDiskRow);
    }

    // ==========================================
    // HARDWARE HOTPLUG & MULTI-DISK MODAL CONTROLLER
    // ==========================================
    let currentHotplugVm = null;
    const hotplugModal = document.getElementById("hotplugModal");
    const btnCloseHotplugModal = document.getElementById("btnCloseHotplugModal");
    const formHotplugCpuRam = document.getElementById("formHotplugCpuRam");
    const formAttachDisk = document.getElementById("formAttachDisk");
    const hotplugDisksTableBody = document.getElementById("hotplugDisksTableBody");

    const hotplugCores = document.getElementById("hotplugCores");
    const hotplugCoresRange = document.getElementById("hotplugCoresRange");
    const hotplugMemoryMb = document.getElementById("hotplugMemoryMb");
    const hotplugMemoryRange = document.getElementById("hotplugMemoryRange");
    const hotplugMemoryGbHint = document.getElementById("hotplugMemoryGbHint");

    // Sync Sliders & Inputs
    if (hotplugCores && hotplugCoresRange) {
        hotplugCores.addEventListener("input", () => { hotplugCoresRange.value = hotplugCores.value; });
        hotplugCoresRange.addEventListener("input", () => { hotplugCores.value = hotplugCoresRange.value; });
    }

    if (hotplugMemoryMb && hotplugMemoryRange) {
        const updateMemHint = (val) => {
            if (hotplugMemoryGbHint) hotplugMemoryGbHint.textContent = `~ ${(val / 1024).toFixed(1)} GB`;
        };
        hotplugMemoryMb.addEventListener("input", () => {
            hotplugMemoryRange.value = hotplugMemoryMb.value;
            updateMemHint(hotplugMemoryMb.value);
        });
        hotplugMemoryRange.addEventListener("input", () => {
            hotplugMemoryMb.value = hotplugMemoryRange.value;
            updateMemHint(hotplugMemoryRange.value);
        });
    }

    // Modal Sub-tabs Switching
    document.querySelectorAll("[data-hotplug-tab]").forEach(tabBtn => {
        tabBtn.addEventListener("click", () => {
            const targetPaneId = tabBtn.getAttribute("data-hotplug-tab");
            document.querySelectorAll("[data-hotplug-tab]").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".hotplug-tab-pane").forEach(p => p.classList.remove("active"));

            tabBtn.classList.add("active");
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) targetPane.classList.add("active");
            if (window.lucide) window.lucide.createIcons();
        });
    });

    if (btnCloseHotplugModal && hotplugModal) {
        btnCloseHotplugModal.addEventListener("click", () => {
            hotplugModal.classList.add("hidden");
            currentHotplugVm = null;
        });
    }

    // Open Hotplug Modal
    window.openVmHotplug = async (node, vmid, vmname) => {
        currentHotplugVm = { node, vmid, vmname };
        document.getElementById("hotplugModalTitle").textContent = `Cấu Hình Nóng & Đa Ổ Đĩa: ${vmname || `VM #${vmid}`}`;
        document.getElementById("hotplugModalSubtitle").textContent = `Node: ${node} | VMID: ${vmid} — Thay đổi vCPU, RAM và Gắn/Mở rộng đĩa tức thời`;
        hotplugModal.classList.remove("hidden");

        await loadVmHardwareDetails();
    };

    async function loadVmHardwareDetails() {
        if (!currentHotplugVm) return;
        const { node, vmid } = currentHotplugVm;

        if (hotplugDisksTableBody) {
            hotplugDisksTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;"><span class="spinner" style="margin:0 auto 6px;display:block;"></span> Đang đọc cấu hình phần cứng Proxmox...</td></tr>`;
        }

        try {
            const res = await fetch(`/api/nodes/${node}/vms/${vmid}/hardware`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!data.success) {
                showRbacAlert(`⛔ Lỗi tải phần cứng: ${data.error}`);
                return;
            }

            const hw = data.data;

            // 1. Điền thông số hiện tại
            const curCpuVal = document.getElementById("curCpuVal");
            const curRamVal = document.getElementById("curRamVal");
            const curHotplugFlags = document.getElementById("curHotplugFlags");
            const curCpuType = document.getElementById("curCpuType");
            const hotplugVmStatusBadge = document.getElementById("hotplugVmStatusBadge");

            if (curCpuVal) curCpuVal.textContent = `${hw.cores} vCPU (${hw.sockets || 1} Sockets)`;
            if (curRamVal) curRamVal.textContent = `${hw.memoryMb} MB (~ ${(hw.memoryMb / 1024).toFixed(1)} GB)`;
            if (curHotplugFlags) curHotplugFlags.textContent = hw.hotplug || "network,disk,usb,memory,cpu";
            if (curCpuType) curCpuType.textContent = hw.cpuType || "host";
            if (hotplugVmStatusBadge) {
                hotplugVmStatusBadge.textContent = (hw.status || "RUNNING").toUpperCase();
            }

            // 2. Set form values
            if (hotplugCores) hotplugCores.value = hw.cores;
            if (hotplugCoresRange) hotplugCoresRange.value = hw.cores;
            if (hotplugMemoryMb) hotplugMemoryMb.value = hw.memoryMb;
            if (hotplugMemoryRange) hotplugMemoryRange.value = hw.memoryMb;
            if (hotplugMemoryGbHint) hotplugMemoryGbHint.textContent = `~ ${(hw.memoryMb / 1024).toFixed(1)} GB`;

            // 3. Render Attached Disks Table
            if (hotplugDisksTableBody) {
                if (!hw.disks || hw.disks.length === 0) {
                    hotplugDisksTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">Không tìm thấy đĩa nào</td></tr>`;
                } else {
                    hotplugDisksTableBody.innerHTML = hw.disks.map(disk => {
                        const isBoot = disk.isBoot;
                        const badgeType = isBoot
                            ? `<span class="disk-badge-boot"><i data-lucide="shield" style="width:10px;height:10px;display:inline;"></i> OS / Boot</span>`
                            : `<span class="disk-badge-data"><i data-lucide="database" style="width:10px;height:10px;display:inline;"></i> Data Disk</span>`;

                        let actions = `
                            <div style="display:flex; justify-content:flex-end; gap:6px; align-items:center;">
                                <button type="button" class="btn-action-sm" style="border-color:rgba(56,189,248,0.3); color:#38bdf8;" onclick="promptResizeDisk('${node}', ${vmid}', '${disk.slot}', '${disk.size}')" title="Mở rộng dung lượng đĩa trực tuyến">
                                    <i data-lucide="maximize-2" class="btn-icon-xs"></i>
                                    <span>Mở Rộng</span>
                                </button>
                        `;

                        if (!isBoot) {
                            actions += `
                                <button type="button" class="btn-danger-sm" onclick="detachSecondaryDisk('${node}', ${vmid}', '${disk.slot}')" title="Gỡ đĩa phụ này">
                                    <i data-lucide="trash-2" class="btn-icon-xs"></i>
                                    <span>Gỡ Đĩa</span>
                                </button>
                            `;
                        }
                        actions += `</div>`;

                        return `
                            <tr>
                                <td><span class="disk-slot-pill">${disk.slot}</span></td>
                                <td><strong>${disk.storage}</strong></td>
                                <td><strong style="color:#38bdf8;">${disk.size}</strong></td>
                                <td>${badgeType}</td>
                                <td class="text-right">${actions}</td>
                            </tr>
                        `;
                    }).join("");
                }
            }

            // 4. Điền danh sách Storage Pools và Available Slots vào Form Attach
            const attachStorageSelect = document.getElementById("attachStorageSelect");
            const nodeData = (cachedClusterData || []).find(n => n.node === node);
            if (attachStorageSelect && nodeData && nodeData.storages) {
                attachStorageSelect.innerHTML = nodeData.storages.map(s => `<option value="${s.storage}">${s.storage} (${s.type}) - ${formatBytes(s.avail)} khả dụng</option>`).join("");
            }

            const attachSlotSelect = document.getElementById("attachSlotSelect");
            if (attachSlotSelect && hw.availableSlots) {
                attachSlotSelect.innerHTML = hw.availableSlots.map(s => `<option value="${s}">${s}</option>`).join("");
            }

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            if (hotplugDisksTableBody) {
                hotplugDisksTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger" style="padding: 20px;">Lỗi: ${err.message}</td></tr>`;
            }
        }
    }

    // Submit Hotplug CPU / RAM
    if (formHotplugCpuRam) {
        formHotplugCpuRam.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentHotplugVm) return;

            const cores = Number(hotplugCores.value);
            const memoryMb = Number(hotplugMemoryMb.value);
            const btnSubmit = document.getElementById("btnSubmitHotplug");
            if (btnSubmit) btnSubmit.disabled = true;

            showToast(`⚡ Đang điều chỉnh cấu hình nóng (${cores} vCPU, ${memoryMb} MB RAM)...`);

            try {
                const res = await fetch(`/api/nodes/${currentHotplugVm.node}/vms/${currentHotplugVm.vmid}/hardware/hotplug`, {
                    method: "PUT",
                    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ cores, memoryMb })
                });
                const result = await res.json();
                if (result.success) {
                    showToast("✅ Đã thay đổi nóng cấu hình phần cứng thành công!");
                    await loadVmHardwareDetails();
                    setTimeout(loadClusterResources, 1500);
                } else {
                    showRbacAlert(`⛔ Lỗi Hotplug: ${result.error}`);
                }
            } catch (err) {
                showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Submit Attach Secondary Disk
    if (formAttachDisk) {
        formAttachDisk.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentHotplugVm) return;

            const storage = document.getElementById("attachStorageSelect").value;
            const sizeGb = Number(document.getElementById("attachSizeGb").value);
            const slot = document.getElementById("attachSlotSelect").value;
            const discard = document.getElementById("attachDiscardCheck").checked;

            const btnSubmit = document.getElementById("btnSubmitAttachDisk");
            if (btnSubmit) btnSubmit.disabled = true;

            showToast(`💾 Đang gắn thêm đĩa ${slot} (${sizeGb} GB trên ${storage})...`);

            try {
                const res = await fetch(`/api/nodes/${currentHotplugVm.node}/vms/${currentHotplugVm.vmid}/disks/attach`, {
                    method: "POST",
                    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ storage, sizeGb, slot, discard })
                });
                const result = await res.json();
                if (result.success) {
                    showToast(`✅ Đã gắn đĩa ${slot} (${sizeGb} GB) thành công!`);
                    await loadVmHardwareDetails();
                    setTimeout(loadClusterResources, 1500);
                } else {
                    showRbacAlert(`⛔ Lỗi gắn đĩa: ${result.error}`);
                }
            } catch (err) {
                showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Prompt Online Disk Resize
    window.promptResizeDisk = async (node, vmid, slot, curSize) => {
        const sizeToAdd = prompt(`💾 MỞ RỘNG DUNG LƯỢNG ĐĨA [${slot}]\nDung lượng hiện tại: ${curSize}\n\nNhập dung lượng muốn TĂNG THÊM (ví dụ: +10G hoặc +50G):`, "+10G");
        if (!sizeToAdd) return;

        showToast(`💾 Đang mở rộng đĩa ${slot} thêm ${sizeToAdd}...`);
        try {
            const res = await fetch(`/api/nodes/${node}/vms/${vmid}/disks/resize`, {
                method: "POST",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ diskSlot: slot, size: sizeToAdd })
            });
            const result = await res.json();
            if (result.success) {
                showToast(`✅ Đã mở rộng đĩa ${slot} thành công!`);
                await loadVmHardwareDetails();
                setTimeout(loadClusterResources, 1500);
            } else {
                showRbacAlert(`⛔ Lỗi mở rộng đĩa: ${result.error}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
        }
    };

    // Detach Secondary Disk
    window.detachSecondaryDisk = async (node, vmid, slot) => {
        if (!confirm(`🗑️ Bạn có chắc chắn muốn GỠ BỎ ổ đĩa phụ '${slot}' khỏi máy ảo #${vmid} không?`)) return;

        showToast(`💾 Đang gỡ bỏ đĩa ${slot}...`);
        try {
            const res = await fetch(`/api/nodes/${node}/vms/${vmid}/disks/${slot}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const result = await res.json();
            if (result.success) {
                showToast(`✅ Đã gỡ bỏ đĩa ${slot} thành công!`);
                await loadVmHardwareDetails();
                setTimeout(loadClusterResources, 1500);
            } else {
                showRbacAlert(`⛔ Lỗi gỡ đĩa: ${result.error}`);
            }
        } catch (err) {
            showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
        }
    };

    // Tự động load dữ liệu Proxmox & Cảnh báo ngay khi mở trang
    loadClusterResources();
    loadClusterAlerts();

    // Chu kỳ tự động kiểm tra cảnh báo nền mỗi 20 giây
    setInterval(loadClusterAlerts, 20000);
});
