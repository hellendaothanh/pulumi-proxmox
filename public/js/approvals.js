// ==========================================
// RESOURCE QUOTAS & APPROVAL WORKFLOW (public/js/approvals.js)
// ==========================================

window.loadQuotasAndApprovals = async function() {
    const token = localStorage.getItem("pulumi_auth_token");
    if (!token) return;

    const approvalsTableBody = document.getElementById("approvalsTableBody");
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

    // 1. Tải Quota & Usage
    try {
        const quotaRes = await fetch("/api/quotas/me", { headers: window.getAuthHeaders() });
        const quotaData = await quotaRes.json();
        if (quotaData.success && quotaData.data) {
            const { quota, usage, isAdmin } = quotaData.data;
            const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';

            if (isAdmin) {
                if (quotaVmDisplay) quotaVmDisplay.textContent = isEn ? `${usage.vms} VMs (Unlimited)` : `${usage.vms} VMs (Không Giới Hạn)`;
                if (quotaVmBar) { quotaVmBar.style.width = "100%"; quotaVmBar.className = "progress-bar-fill"; }
                if (quotaVmFooter) quotaVmFooter.textContent = isEn ? `Administrator account has unlimited quotas` : `Tài khoản Administrator không bị áp hạn mức`;

                if (quotaCpuDisplay) quotaCpuDisplay.textContent = isEn ? `${usage.cores} vCPUs (Unlimited)` : `${usage.cores} vCPUs (Không Giới Hạn)`;
                if (quotaCpuBar) { quotaCpuBar.style.width = "100%"; quotaCpuBar.className = "progress-bar-fill"; }
                if (quotaCpuFooter) quotaCpuFooter.textContent = isEn ? `Full authority to allocate CPUs across cluster` : `Toàn quyền phân bổ CPU trên toàn cụm`;

                if (quotaRamDisplay) quotaRamDisplay.textContent = isEn ? `${(usage.memoryMb / 1024).toFixed(1)} GB (Unlimited)` : `${(usage.memoryMb / 1024).toFixed(1)} GB (Không Giới Hạn)`;
                if (quotaRamBar) { quotaRamBar.style.width = "100%"; quotaRamBar.className = "progress-bar-fill"; }
                if (quotaRamFooter) quotaRamFooter.textContent = isEn ? `Full authority to allocate RAM across cluster` : `Toàn quyền phân bổ RAM trên toàn cụm`;
            } else {
                const vmPercent = Math.min(100, Math.round((usage.vms / quota.maxVms) * 100));
                if (quotaVmDisplay) quotaVmDisplay.textContent = `${usage.vms} / ${quota.maxVms} VMs`;
                if (quotaVmBar) {
                    quotaVmBar.style.width = `${vmPercent}%`;
                    quotaVmBar.className = `progress-bar-fill ${vmPercent >= 100 ? 'danger' : (vmPercent >= 75 ? 'warning' : '')}`;
                }
                if (quotaVmFooter) quotaVmFooter.textContent = isEn ? `Using ${usage.vms} out of ${quota.maxVms} VMs` : `Đã sử dụng ${usage.vms} trong tối đa ${quota.maxVms} VMs`;

                const cpuPercent = Math.min(100, Math.round((usage.cores / quota.maxCores) * 100));
                if (quotaCpuDisplay) quotaCpuDisplay.textContent = `${usage.cores} / ${quota.maxCores} vCPUs`;
                if (quotaCpuBar) {
                    quotaCpuBar.style.width = `${cpuPercent}%`;
                    quotaCpuBar.className = `progress-bar-fill ${cpuPercent >= 100 ? 'danger' : (cpuPercent >= 75 ? 'warning' : '')}`;
                }
                if (quotaCpuFooter) quotaCpuFooter.textContent = isEn ? `Allocated ${usage.cores} of max ${quota.maxCores} vCPUs` : `Đã cấp ${usage.cores} trong tối đa ${quota.maxCores} vCPUs`;

                const ramUsedGb = (usage.memoryMb / 1024).toFixed(1);
                const ramMaxGb = (quota.maxMemoryMb / 1024).toFixed(1);
                const ramPercent = Math.min(100, Math.round((usage.memoryMb / quota.maxMemoryMb) * 100));
                if (quotaRamDisplay) quotaRamDisplay.textContent = `${ramUsedGb} / ${ramMaxGb} GB`;
                if (quotaRamBar) {
                    quotaRamBar.style.width = `${ramPercent}%`;
                    quotaRamBar.className = `progress-bar-fill ${ramPercent >= 100 ? 'danger' : (ramPercent >= 75 ? 'warning' : '')}`;
                }
                if (quotaRamFooter) quotaRamFooter.textContent = isEn ? `Using ${usage.memoryMb} MB of max ${quota.maxMemoryMb} MB RAM` : `Đang dùng ${usage.memoryMb} MB trong tối đa ${quota.maxMemoryMb} MB RAM`;
            }
        }
    } catch (err) {
        console.error("Lỗi tải Quotas:", err);
    }

    // 2. Tải Danh Sách Yêu Cầu Phê Duyệt
    if (!approvalsTableBody) return;
    try {
        const appRes = await fetch("/api/approvals", { headers: window.getAuthHeaders() });
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

            const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
            if (requests.length === 0) {
                approvalsTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">${isEn ? 'No pending approval requests in queue' : 'Hiện không có yêu cầu phê duyệt nào'}</td></tr>`;
                return;
            }

            const isAdmin = window.currentUser && window.currentUser.role === "admin";
            approvalsTableBody.innerHTML = requests.map(req => {
                const timeStr = req.createdAt ? new Date(req.createdAt).toLocaleString() : "-";
                const isPending = req.status === "PENDING";
                const isApproved = req.status === "APPROVED";
                const isRejected = req.status === "REJECTED";

                let statusBadge = `<span class="tag-env tag-env-stag"><i data-lucide="clock" class="badge-svg"></i> ${isEn ? 'Pending Approval' : 'Chờ Admin Duyệt'}</span>`;
                if (isApproved) {
                    statusBadge = `<span class="tag-deployed"><i data-lucide="check-circle" class="badge-svg"></i> ${isEn ? 'Approved' : 'Đã Duyệt'} (${req.resolvedBy || 'Admin'})</span>`;
                } else if (isRejected) {
                    statusBadge = `<span class="tag-env tag-env-pro"><i data-lucide="x-circle" class="badge-svg"></i> ${isEn ? 'Rejected' : 'Bị Từ Chối'}</span>`;
                }

                const envStr = req.vms && req.vms[0] ? (req.vms[0].environment || "dev").toUpperCase() : "DEV";
                const vmsNames = req.vms ? req.vms.map(v => `<code>${v.name}</code> (${v.cores}c / ${v.memoryMb}MB)`).join("<br>") : "-";

                let actionHtml = `<span class="text-muted" style="font-size:12px;">—</span>`;
                if (isPending && isAdmin) {
                    actionHtml = `
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <button class="btn-action-approve" onclick="handleApprovalAction('${req.id}', 'approve')">
                                <i data-lucide="check" style="width:14px;height:14px;"></i> ${isEn ? 'Approve' : 'Phê Duyệt'}
                            </button>
                            <button class="btn-action-reject" onclick="handleApprovalAction('${req.id}', 'reject')">
                                <i data-lucide="x" style="width:14px;height:14px;"></i> ${isEn ? 'Reject' : 'Từ Chối'}
                            </button>
                        </div>
                    `;
                } else if (isRejected && req.rejectionReason) {
                    actionHtml = `<span class="text-danger" style="font-size:11.5px;">${isEn ? 'Reason: ' : 'Lý do: '}${req.rejectionReason}</span>`;
                }

                const reasonTitle = req.reason === "ENV_RESTRICTION" 
                    ? (isEn ? "🛡️ Environment Restriction" : "🛡️ Môi Trường Giới Hạn") 
                    : (isEn ? "⚠️ Exceeded Quota Limit" : "⚠️ Vượt Hạn Mức Quota");

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
                        <td>${window.renderEnvBadge ? window.renderEnvBadge(envStr.toLowerCase()) : envStr}</td>
                        <td style="font-size:12px; color:#cbd5e1; max-width:240px; line-height:1.4;">
                            <strong>${reasonTitle}</strong>
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
};

window.handleApprovalAction = async function(requestId, action) {
    let rejectionReason = "";
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    if (action === "reject") {
        const promptVal = prompt(
            isEn ? "Please enter rejection reason:" : "Vui lòng nhập lý do từ chối yêu cầu này:",
            isEn ? "Budget limit exceeded or invalid scope" : "Vượt ngân sách hoặc không đúng mục đích"
        );
        if (promptVal === null) return;
        rejectionReason = promptVal;
    } else {
        if (!window.confirmDialog(`Bạn có chắc chắn muốn PHÊ DUYỆT yêu cầu '${requestId}' và kích hoạt Pulumi Engine khởi tạo máy ảo không?`, `Are you sure you want to APPROVE request '${requestId}' and trigger Pulumi Engine?`)) return;
    }

    try {
        const res = await fetch(`/api/approvals/${requestId}/${action}`, {
            method: "POST",
            headers: window.getAuthHeaders(),
            body: JSON.stringify({ rejectionReason })
        });
        const data = await res.json();

        if (data.success) {
            window.showToast(data.message || `Đã xử lý yêu cầu thành công!`, "success");
            await window.loadQuotasAndApprovals();
            if (typeof window.loadAuditLogs === "function") window.loadAuditLogs();
            if (action === "approve") {
                document.querySelector('.nav-tab[data-tab="tab-logs"]')?.click();
                setTimeout(() => { if (typeof window.loadVms === "function") window.loadVms(); }, 3000);
            }
        } else {
            alert(`Lỗi: ${data.error}`);
        }
    } catch (err) {
        alert(`Lỗi kết nối: ${err.message}`);
    }
};

window.initApprovals = function() {
    const btnRefreshApprovals = document.getElementById("btnRefreshApprovals");
    if (btnRefreshApprovals) {
        btnRefreshApprovals.addEventListener("click", window.loadQuotasAndApprovals);
    }
};
