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

    // Kiểm tra trạng thái đăng nhập khi load trang
    async function checkAuthSession() {
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
        const iconName = currentAuthUser.avatar || (currentAuthUser.role === 'admin' ? 'shield-check' : (currentAuthUser.role === 'viewer' ? 'eye' : 'code-2'));
        if (userAvatar) {
            userAvatar.innerHTML = `<i data-lucide="${iconName}" class="user-svg-icon"></i>`;
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
    function applyRbacUiRestrictions() {
        const userRole = currentAuthUser ? currentAuthUser.role : "viewer";
        const envRadios = document.querySelectorAll("input[name='environment']");
        const deployTabBtn = document.querySelector(".nav-tab[data-tab='tab-deploy']");
        const btnSubmitVm = document.getElementById("btnSubmit");

        // 1. Viewer: Vô hiệu hóa nút tạo VM, nút xóa, nút power
        if (userRole === "viewer") {
            if (deployTabBtn) deployTabBtn.style.opacity = "0.5";
            if (btnSubmitVm) {
                btnSubmitVm.disabled = true;
                btnSubmitVm.title = "Tài khoản Viewer không có quyền tạo VM";
            }
        } else {
            if (deployTabBtn) deployTabBtn.style.opacity = "1";
            if (btnSubmitVm) {
                btnSubmitVm.disabled = false;
                btnSubmitVm.title = "";
            }
        }

        // 2. Developer: Khóa các tùy chọn STAGING / PROD
        const isDevOnly = userRole === "developer";
        envRadios.forEach(r => {
            if (isDevOnly) {
                if (r.value !== "dev") {
                    r.disabled = true;
                    r.closest(".env-radio-card")?.classList.add("disabled-option");
                } else {
                    r.checked = true;
                }
            } else {
                r.disabled = (userRole === "viewer");
                r.closest(".env-radio-card")?.classList.remove("disabled-option");
            }
        });
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

    function showToast(msg) {
        let toast = document.getElementById("appToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "appToast";
            toast.className = "app-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2200);
    }

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

        const nodesCardsHtml = filteredNodes.map(node => {
            // Lấy IP chính của node từ network
            const primaryNet = node.networks.find(n => n.address) || node.networks[0] || {};
            const nodeIp = primaryNet.address || "192.168.1.x";

            // Tính % CPU & RAM
            const cpuPercent = (node.cpu ? (node.cpu * 100).toFixed(1) : 0);
            const memUsed = formatBytes(node.mem);
            const memMax = formatBytes(node.maxmem);
            const memPercent = node.maxmem ? ((node.mem / node.maxmem) * 100).toFixed(1) : 0;

            // Storages list HTML
            const storagesHtml = node.storages.map(st => {
                const used = formatBytes(st.used);
                const total = formatBytes(st.total);
                const free = formatBytes(st.avail);
                const percent = st.total ? ((st.used / st.total) * 100).toFixed(1) : 0;

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
                    <div class="storage-item">
                        <div class="storage-item-header">
                            <div class="storage-name">
                                <i data-lucide="database" class="field-icon"></i>
                                <span>${st.storage}</span>
                                <span class="storage-type-tag">${st.type}</span>
                            </div>
                            <div class="storage-usage-text">${used} / ${total} (${percent}%)</div>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${percent}%;"></div>
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
                                ${isRunning ? `
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
                                `}
                                <button class="btn-action-sm btn-action-snap" onclick="openVmSnapshots('${node.node}', ${vm.vmid}, '${vm.name}')" title="Quản lý Snapshots">
                                    <i data-lucide="camera" class="btn-icon-sm"></i>
                                    <span>Snapshot</span>
                                </button>
                                <button class="btn-action-sm" onclick="showVmDetail('${node.node}', ${vm.vmid})" title="Xem cấu hình Proxmox">
                                    <i data-lucide="eye" class="btn-icon-sm"></i>
                                    <span>Chi tiết</span>
                                </button>
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
                alert(`Lỗi thao tác nguồn: ${data.error || "Không rõ nguyên nhân"}`);
            }
        } catch (err) {
            alert(`Lỗi kết nối tới Server: ${err.message}`);
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
                    alert(`Lỗi tạo snapshot: ${data.error || "Không rõ nguyên nhân"}`);
                }
            } catch (err) {
                alert(`Lỗi kết nối: ${err.message}`);
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
                alert(`Lỗi khôi phục snapshot: ${data.error || "Không rõ nguyên nhân"}`);
            }
        } catch (err) {
            alert(`Lỗi kết nối: ${err.message}`);
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
                alert(`Lỗi xóa snapshot: ${data.error || "Không rõ nguyên nhân"}`);
            }
        } catch (err) {
            alert(`Lỗi kết nối: ${err.message}`);
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
                                <button class="btn-danger-sm" onclick="destroyVm('${vm.stackName}', ${vm.protection})">
                                    <i data-lucide="trash" class="btn-icon-sm"></i>
                                    Xóa
                                </button>
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

    window.applyScriptPreset = (type) => {
        const userDataTextarea = document.getElementById("userData");
        if (!userDataTextarea) return;

        if (type === "clear") {
            userDataTextarea.value = "";
            showToast("Đã xóa nội dung script cấu hình.");
            return;
        }

        if (scriptPresets[type]) {
            userDataTextarea.value = scriptPresets[type];
            showToast(`Đã áp dụng mẫu cấu hình '${type.toUpperCase()}'!`);
        }
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

        if (count === 1) {
            payload = {
                name: rawBaseName,
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

                const assignedNode = selectedNodes[(i - 1) % selectedNodes.length];
                vmsList.push({
                    name: vmName,
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
                appendLog(`[Portal] ${result.message}`);
                // Chuyển sang tab Logs để xem
                document.querySelector('.nav-tab[data-tab="tab-logs"]').click();
                setTimeout(loadVms, 3000);
            } else {
                appendLog(`[Portal Error] ${result.error}`);
            }
        } catch (err) {
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

    if (btnRefreshAudit) {
        btnRefreshAudit.addEventListener("click", loadAuditLogs);
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
            const res = await fetch(`/api/vms/${stackName}${force ? '?force=true' : ''}`, { method: "DELETE" });
            const result = await res.json();
            
            if (result.success) {
                appendLog(`[Portal] ${result.message}`);
                document.querySelector('.nav-tab[data-tab="tab-logs"]').click();
            } else {
                alert(`Không thể xóa: ${result.error}`);
                appendLog(`[Portal Error] ${result.error}`);
            }
            setTimeout(loadVms, 3000);
        } catch (err) {
            appendLog(`[Portal Error] ${err.message}`);
        }
    };

    // Tự động load dữ liệu Proxmox ngay khi mở trang
    loadClusterResources();
});
