// ==========================================
// AUDIT LOGS & GOVERNANCE (public/js/audit.js)
// ==========================================

window.formatAuditDetails = function(rawDetails, isEn) {
    if (!rawDetails) return "-";
    if (!isEn) return rawDetails;

    let text = String(rawDetails);
    // System initialization
    text = text.replace(/Hệ thống Authentication, Governance & Audit Logs khởi động thành công/i, "Authentication, Governance & Audit Logs subsystems initialized successfully");
    text = text.replace(/Khởi tạo hệ thống kiểm toán/i, "Audit system initialized");

    // Login & Auth Patterns
    text = text.replace(/Đăng nhập thành công qua tài khoản nội bộ:\s*(\w+)/i, "Successfully authenticated via local account: $1");
    text = text.replace(/Đăng nhập thành công qua\s+([^(]+)\s*\(([^)]+)\)\s+với vai trò\s+(\w+)/i, "Successfully signed in via $1 ($2) as $3");
    text = text.replace(/Thất bại khi đăng nhập qua\s+([^:]+):\s*(.*)/i, "Failed sign in via $1: $2");
    text = text.replace(/Đăng nhập thất bại:\s*Sai mật khẩu hoặc tài khoản không tồn tại/i, "Login failed: Invalid credentials or account not found");
    text = text.replace(/Tài khoản '([^']+)' đã bị khóa do nhập sai mật khẩu quá (\d+) lần/i, "Account '$1' locked after $2 failed login attempts");
    text = text.replace(/Tài khoản '([^']+)' đã đổi mật khẩu thành công/i, "Account '$1' password changed successfully");

    // Approval Patterns
    text = text.replace(/Admin '([^']+)' đã PHÊ DUYỆT yêu cầu khởi tạo cho Developer '([^']+)'.\s*Bắt đầu kích hoạt Pulumi Engine./i, "Admin '$1' APPROVED provisioning request for Developer '$2'. Triggering Pulumi Engine.");
    text = text.replace(/Admin '([^']+)' đã TỪ CHỐI yêu cầu khởi tạo của '([^']+)'.\s*Lý do:\s*(.*)/i, "Admin '$1' REJECTED provisioning request from '$2'. Reason: $3");

    // RBAC Denials
    text = text.replace(/Tài khoản Viewer không có quyền khởi tạo tài nguyên/i, "Viewer account is not permitted to provision resources");
    text = text.replace(/Tài khoản Viewer không có quyền xóa tài nguyên/i, "Viewer account is not permitted to delete resources");
    text = text.replace(/Chỉ có quyền xóa tài nguyên trên môi trường DEV/i, "Deletion is restricted to DEV environment only");

    // VM Deletion & Lifecycle Patterns
    text = text.replace(/Tiến hành hủy hoàn toàn VM và stack '([^']+)'\s*\(VM ID:\s*([^)]+)\)/i, "Permanently destroying VM and stack '$1' (VM ID: $2)");
    text = text.replace(/Khởi tạo (\d+) máy ảo trên Node \[(.*)\]/i, "Provisioning $1 VM(s) on Node [$2]");
    text = text.replace(/Viewer '([^']+)' bị chặn quyền xóa stack '([^']+)'\./i, "Viewer account '$1' denied permission to delete stack '$2'.");
    text = text.replace(/Developer '([^']+)' bị từ chối xóa stack '([^']+)' trên môi trường '([^']+)'.\s*Chỉ Admin mới có quyền xóa tài nguyên STAGING\/PROD\./i, "Developer account '$1' denied permission to delete stack '$2' on '$3'. Only Admin can delete STAGING/PROD resources.");

    // Snapshots
    text = text.replace(/Tạo bản snapshot '([^']+)' cho VM #(\d+)/i, "Created snapshot '$1' for VM #$2");
    text = text.replace(/Khôi phục VM #(\d+) về snapshot '([^']+)'/i, "Rolled back VM #$1 to snapshot '$2'");
    text = text.replace(/Xóa bản snapshot '([^']+)' của VM #(\d+)/i, "Deleted snapshot '$1' from VM #$2");

    // Hotplug & Disks
    text = text.replace(/Thay đổi nóng CPU:\s*(\d+)\s*cores,\s*RAM:\s*(\d+)\s*MB/i, "Live hotplug CPU: $1 cores, RAM: $2 MB");
    text = text.replace(/Mở rộng đĩa\s+(\w+)\s+thêm\s+(\d+)\s*GB/i, "Expanded disk $1 by $2 GB");
    text = text.replace(/Gắn đĩa phụ\s+(\w+)\s*\(([^)]+)\)/i, "Attached secondary disk $1 ($2)");
    text = text.replace(/Gỡ bỏ đĩa phụ\s+(\w+)\s+khỏi VM #(\d+)/i, "Detached secondary disk $1 from VM #$2");

    // Firewall
    text = text.replace(/Thêm quy tắc firewall:\s*(.*)/i, "Added firewall rule: $1");
    text = text.replace(/Xóa quy tắc firewall #(\d+)/i, "Deleted firewall rule #$1");

    return text;
};

window.loadAuditLogs = async function() {
    const auditTableBody = document.getElementById("auditTableBody");
    if (!auditTableBody) return;

    try {
        const res = await fetch("/api/audit-logs", {
            headers: window.getAuthHeaders()
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
            auditTableBody.innerHTML = data.data.map(log => {
                const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : "-";
                const isSuccess = log.status === "SUCCESS";
                const isDenied = log.status === "DENIED";

                const statusBadge = isSuccess 
                    ? `<span class="tag-deployed"><i data-lucide="check-circle" class="badge-svg"></i> ${isEn ? 'Success' : 'Thành Công'}</span>` 
                    : (isDenied 
                        ? `<span class="tag-env tag-env-pro"><i data-lucide="shield-alert" class="badge-svg"></i> ${isEn ? 'Denied (RBAC)' : 'Từ Chối (RBAC)'}</span>` 
                        : `<span class="tag-env tag-env-stag"><i data-lucide="alert-triangle" class="badge-svg"></i> ${isEn ? 'Failed' : 'Thất Bại'}</span>`);

                let roleBadge = `<span class="tag-env tag-env-pro"><i data-lucide="shield-check" class="badge-svg"></i> Admin</span>`;
                if (log.role === "developer") {
                    roleBadge = `<span class="tag-env tag-env-dev"><i data-lucide="code-2" class="badge-svg"></i> Developer</span>`;
                } else if (log.role === "viewer") {
                    roleBadge = `<span class="tag-env tag-env-stag"><i data-lucide="eye" class="badge-svg"></i> Viewer</span>`;
                }

                const formattedDetails = window.formatAuditDetails(log.details, isEn);

                return `
                    <tr>
                        <td style="font-family:'JetBrains Mono',monospace; font-size:11.5px; color:#cbd5e1;">${timeStr}</td>
                        <td>
                            <strong>${log.username}</strong>
                            <div style="margin-top:3px;">${roleBadge}</div>
                        </td>
                        <td><code style="color:#38bdf8; font-weight:600;">${log.action}</code></td>
                        <td><strong style="color:#f8fafc;">${log.target || "-"}</strong></td>
                        <td>${log.environment ? (window.renderEnvBadge ? window.renderEnvBadge(log.environment) : log.environment) : '<span class="text-muted">—</span>'}</td>
                        <td>${statusBadge}</td>
                        <td style="font-size:12px; color:#94a3b8; line-height:1.4;">${formattedDetails}</td>
                    </tr>
                `;
            }).join("");

            if (window.lucide) window.lucide.createIcons();
        } else {
            const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
            auditTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">${isEn ? 'No audit records recorded yet' : 'Chưa có bản ghi nhật ký kiểm toán nào'}</td></tr>`;
        }
    } catch (err) {
        auditTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 24px;">Lỗi tải Audit Logs: ${err.message}</td></tr>`;
    }
};

window.initAudit = function() {
    const btnRefreshAudit = document.getElementById("btnRefreshAudit");
    if (btnRefreshAudit) {
        btnRefreshAudit.addEventListener("click", window.loadAuditLogs);
    }
};
