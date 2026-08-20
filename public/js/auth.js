// ==========================================
// AUTHENTICATION & RBAC (public/js/auth.js)
// ==========================================

window.initAuth = function() {
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

    // SSO OAuth Callback handling
    const urlParams = new URLSearchParams(window.location.search);
    const callbackToken = urlParams.get("token");
    const authError = urlParams.get("auth_error");

    if (callbackToken) {
        localStorage.setItem("pulumi_auth_token", callbackToken);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (authError) {
        const ssoErrorBanner = document.getElementById("ssoErrorBanner");
        const ssoErrorText = document.getElementById("ssoErrorText");
        if (ssoErrorBanner && ssoErrorText) {
            ssoErrorText.textContent = authError;
            ssoErrorBanner.classList.remove("hidden");
        }
        window.showToast(window.t ? window.t("toast.sso_failed", authError) : `⛔ Đăng nhập thất bại: ${authError}`, "error");
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
                const err = data.error || 'Chưa nhận được Auth URL';
                const ssoErrorBanner = document.getElementById("ssoErrorBanner");
                const ssoErrorText = document.getElementById("ssoErrorText");
                if (ssoErrorBanner && ssoErrorText) {
                    ssoErrorText.innerHTML = `<strong>⚠️ ${err}</strong><br><small style="color:#cbd5e1;">Để kích hoạt SSO, hãy mở file <code>.env</code> và cấu hình Client ID / Secret theo file <code>.env.example</code>.</small>`;
                    ssoErrorBanner.classList.remove("hidden");
                }
                window.showToast(`⚠️ ${err}`, "warning");
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
                const ssoProviders = data.data.filter(p => p.id !== "local");
                const ssoSection = document.getElementById("ssoSection");
                const ssoDivider = document.querySelector(".sso-divider");
                const ssoButtonsContainer = document.getElementById("ssoButtonsContainer");

                if (ssoSection) ssoSection.style.display = "block";
                if (ssoDivider) ssoDivider.style.display = "flex";

                if (ssoButtonsContainer && ssoProviders.length > 0) {
                    const tagSetupNeeded = window.t ? window.t("login.sso_setup_needed") : "Setup Needed";
                    const tagActive = window.t ? window.t("login.sso_active") : "Active";
                    ssoButtonsContainer.innerHTML = ssoProviders.map(p => {
                        const statusTag = !p.configured 
                            ? `<span style="font-size:9.5px; opacity:0.8; background:rgba(245,158,11,0.2); color:#f59e0b; padding:2px 6px; border-radius:4px; margin-left:auto;">${tagSetupNeeded}</span>` 
                            : `<span style="font-size:9.5px; opacity:0.8; background:rgba(34,197,94,0.2); color:#4ade80; padding:2px 6px; border-radius:4px; margin-left:auto;">${tagActive}</span>`;

                        if (p.id === "google") {
                            return `
                                <button type="button" class="btn-sso btn-sso-google" onclick="initiateSsoLogin('google')">
                                    <svg class="sso-icon-svg" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                                    <span data-i18n="login.sso_google">${window.t ? window.t("login.sso_google") : "Google Workspace"}</span>
                                    ${statusTag}
                                </button>
                            `;
                        } else if (p.id === "github") {
                            return `
                                <button type="button" class="btn-sso btn-sso-github" onclick="initiateSsoLogin('github')">
                                    <svg class="sso-icon-svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                                    <span data-i18n="login.sso_github">${window.t ? window.t("login.sso_github") : "GitHub SSO"}</span>
                                    ${statusTag}
                                </button>
                            `;
                        } else {
                            return `
                                <button type="button" class="btn-sso btn-sso-oidc" onclick="initiateSsoLogin('oidc')">
                                    <i data-lucide="shield" class="btn-icon-xs" style="color:#a855f7;"></i>
                                    <span data-i18n="login.sso_oidc">${window.t ? window.t("login.sso_oidc") : "Keycloak / Authelia OIDC"}</span>
                                    ${statusTag}
                                </button>
                            `;
                        }
                    }).join("");
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        } catch {}
    }

    window.addEventListener("portal_language_changed", () => {
        loadAuthProviders();
    });

    window.showLoginModal = function() {
        if (loginModal) {
            loginModal.classList.remove("hidden");
            loadAuthProviders();
            if (window.lucide) window.lucide.createIcons();
        }
    };

    window.hideLoginModal = function() {
        if (loginModal) loginModal.classList.add("hidden");
    };

    function updateUserInterfaceProfile() {
        if (!window.currentUser) return;
        const userProviderBadge = document.getElementById("userProviderBadge");
        if (userProviderBadge) {
            if (window.currentUser.provider && window.currentUser.provider !== "local") {
                userProviderBadge.textContent = window.currentUser.providerName || window.currentUser.provider.toUpperCase();
                userProviderBadge.classList.remove("hidden");
            } else {
                userProviderBadge.classList.add("hidden");
            }
        }

        if (userAvatar) {
            if (window.currentUser.avatar && (window.currentUser.avatar.startsWith("http://") || window.currentUser.avatar.startsWith("https://"))) {
                userAvatar.innerHTML = `<img src="${window.currentUser.avatar}" alt="Avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`;
            } else {
                const iconName = window.currentUser.avatar || (window.currentUser.role === 'admin' ? 'shield-check' : (window.currentUser.role === 'viewer' ? 'eye' : 'code-2'));
                userAvatar.innerHTML = `<i data-lucide="${iconName}" class="user-svg-icon"></i>`;
            }
        }
        if (userDisplayName) userDisplayName.textContent = window.currentUser.displayName || window.currentUser.username;
        if (userRoleBadge) {
            userRoleBadge.textContent = window.currentUser.role.toUpperCase();
            userRoleBadge.className = `user-role-badge role-${window.currentUser.role.toLowerCase()}`;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    window.applyRbacUiRestrictions = function() {
        const userRole = window.currentUser ? window.currentUser.role : "viewer";
        const envRadios = document.querySelectorAll("input[name='environment']");
        const deployTabBtn = document.querySelector(".nav-tab[data-tab='tab-deploy']");
        const btnSubmitVm = document.getElementById("btnSubmit");

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
                const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
                btnSubmitVm.innerHTML = `<span class="spinner hidden"></span><span class="btn-text" data-i18n="wizard.submit_btn">${isEn ? 'Deploy VM' : 'Triển Khai VM'}</span>`;
            }
        }

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

        if (window.cachedClusterData && window.cachedClusterData.length > 0 && typeof window.renderClusterView === "function") {
            window.renderClusterView(window.cachedClusterData);
        }
        if (typeof window.loadVms === "function") window.loadVms();
        if (window.lucide) window.lucide.createIcons();
    };

    window.checkAuthSession = async function() {
        loadAuthProviders();
        const token = localStorage.getItem("pulumi_auth_token");

        if (!token) {
            window.showLoginModal();
            return;
        }

        try {
            const res = await fetch("/api/auth/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                localStorage.removeItem("pulumi_auth_token");
                window.currentUser = null;
                window.showLoginModal();
                return;
            }
            const data = await res.json();
            if (data.success && data.data) {
                window.currentUser = data.data;
                window.hideLoginModal();
                updateUserInterfaceProfile();
                window.applyRbacUiRestrictions();
                if (typeof window.loadAuditLogs === "function") window.loadAuditLogs();
                if (typeof window.loadQuotasAndApprovals === "function") window.loadQuotasAndApprovals();
            } else {
                localStorage.removeItem("pulumi_auth_token");
                window.currentUser = null;
                window.showLoginModal();
            }
        } catch {
            window.showLoginModal();
        }
    };

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
                    localStorage.setItem("pulumi_auth_token", data.data.token);
                    window.currentUser = data.data.user;

                    window.hideLoginModal();
                    updateUserInterfaceProfile();
                    window.applyRbacUiRestrictions();
                    const welcomeMsg = window.t 
                        ? window.t("toast.welcome_login", window.currentUser.displayName, window.currentUser.role.toUpperCase())
                        : `Welcome ${window.currentUser.displayName} (${window.currentUser.role.toUpperCase()})!`;
                    window.showToast(welcomeMsg, "success");

                    if (typeof window.loadClusterResources === "function") window.loadClusterResources();
                    if (typeof window.loadAuditLogs === "function") window.loadAuditLogs();
                    if (typeof window.loadQuotasAndApprovals === "function") window.loadQuotasAndApprovals();
                } else {
                    loginErrorText.textContent = data.error || (window.t ? window.t("login.error_default") : "Invalid username or password.");
                    loginErrorMsg?.classList.remove("hidden");
                }
            } catch (err) {
                loginErrorText.textContent = `${window.t ? (window.getCurrentLang() === 'en' ? 'Server connection error' : 'Lỗi kết nối tới Server') : 'Server error'}: ${err.message}`;
                loginErrorMsg?.classList.remove("hidden");
            } finally {
                btnSubmitLogin.disabled = false;
                btnSubmitLogin.querySelector(".spinner")?.classList.add("hidden");
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (window.confirmDialog("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?", "Are you sure you want to sign out?")) {
                try {
                    await fetch("/api/auth/logout", {
                        method: "POST",
                        headers: window.getAuthHeaders()
                    });
                } catch {}

                localStorage.removeItem("pulumi_auth_token");
                window.currentUser = null;
                window.showToast(window.t ? window.t("toast.logged_out") : "Đã đăng xuất an toàn.");
                window.showLoginModal();
            }
        });
    }

    // Change Password Modal
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
                changePassError.textContent = window.t ? window.t("toast.password_mismatch") : "Mật khẩu xác nhận không khớp!";
                changePassError.classList.remove("hidden");
                return;
            }

            btnSubmitChangePassword.disabled = true;
            btnSubmitChangePassword.querySelector(".spinner")?.classList.remove("hidden");

            try {
                const res = await fetch("/api/auth/change-password", {
                    method: "POST",
                    headers: window.getAuthHeaders(),
                    body: JSON.stringify({ oldPassword, newPassword })
                });
                const data = await res.json();
                if (data.success) {
                    closeChangePass();
                    window.showToast(window.t ? window.t("toast.password_changed") : "🎉 Đổi mật khẩu thành công!", "success");
                    if (typeof window.loadAuditLogs === "function") window.loadAuditLogs();
                } else {
                    changePassError.textContent = data.error || (window.getCurrentLang() === 'en' ? "Unable to change password." : "Không thể đổi mật khẩu.");
                    changePassError.classList.remove("hidden");
                }
            } catch (err) {
                changePassError.textContent = `Error: ${err.message}`;
                changePassError.classList.remove("hidden");
            } finally {
                btnSubmitChangePassword.disabled = false;
                btnSubmitChangePassword.querySelector(".spinner")?.classList.add("hidden");
            }
        });
    }
};
