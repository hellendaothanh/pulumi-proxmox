// ==========================================
// VM STACKS & DEPLOYMENT TABLE (public/js/vms.js)
// ==========================================

window.loadVms = async function() {
    const vmTableBody = document.getElementById("vmTableBody");
    if (!vmTableBody) return;

    try {
        const res = await fetch("/api/vms");
        const data = await res.json();
        
        if (data.success && data.data.length > 0) {
            data.data.sort((a, b) => (a.vmName || a.stackName).localeCompare(b.vmName || b.stackName, undefined, { numeric: true, sensitivity: 'base' }));

            vmTableBody.innerHTML = data.data.map(vm => {
                const vmIpBadges = vm.ips && vm.ips.length > 0 
                    ? vm.ips.map(ip => `
                        <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="Click để sao chép IP">
                            <span>${ip}</span>
                            <i data-lucide="copy" class="copy-icon-sm"></i>
                        </button>
                    `).join(" ") 
                const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
                const vmIpBadges = vm.ips && vm.ips.length > 0 
                    ? vm.ips.map(ip => `
                        <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="${isEn ? 'Click to copy IP' : 'Click để sao chép IP'}">
                            <span>${ip}</span>
                            <i data-lucide="copy" class="copy-icon-sm"></i>
                        </button>
                    `).join(" ") 
                    : (vm.status === "Deployed" ? `<span class="text-muted" style="font-size:11.5px;">${window.t ? window.t('stacks.waiting_agent') : (isEn ? 'Waiting for Agent...' : 'Chờ Agent...')}</span>` : '-');

                const envBadge = window.renderEnvBadge ? window.renderEnvBadge(vm.environment) : (window.getEnvironmentTag ? window.getEnvironmentTag(vm.tags) : '');
                const customTagsHtml = window.getCustomTags ? window.getCustomTags(vm.tags) : '';

                const role = window.currentUser ? window.currentUser.role : "viewer";
                const isProdOrStag = ["pro","prod","stag","staging"].includes((vm.environment || "dev").toLowerCase());
                const canDelete = role === "admin" || (role === "developer" && !isProdOrStag);

                let actionCellHtml = "";
                const fwQuickBtn = (vm.vmId && vm.nodeName && role !== "viewer") ? `
                    <button class="btn-action-sm btn-action-hotplug" style="margin-right:4px;" onclick="openVmHotplug('${vm.nodeName}', ${vm.vmId}, '${vm.vmName}')" title="${window.t ? window.t('action.config_tooltip') : 'Cấu hình nóng'}">
                        <i data-lucide="cpu" class="btn-icon-sm"></i>
                        <span>${window.t ? window.t('action.config') : 'Cấu hình'}</span>
                    </button>
                    <button class="btn-action-sm" style="border-color:rgba(56,189,248,0.3); color:#38bdf8; margin-right:4px;" onclick="openVmFirewall('${vm.nodeName}', ${vm.vmId}, '${vm.vmName}')" title="${window.t ? window.t('action.firewall') : 'Tường lửa'}">
                        <i data-lucide="shield" class="btn-icon-sm"></i>
                        <span>${isEn ? 'Firewall' : 'Port'}</span>
                    </button>
                ` : '';

                if (role === "viewer") {
                    actionCellHtml = `<span class="badge-optional" style="font-size:11px; opacity:0.6;"><i data-lucide="lock" style="width:11px;height:11px;"></i> ${isEn ? 'Read-only' : 'Chỉ xem'}</span>`;
                } else if (role === "developer" && isProdOrStag) {
                    actionCellHtml = `
                        <div style="display:flex; justify-content:flex-end; align-items:center;">
                            ${fwQuickBtn}
                            <span class="badge-optional" title="${isEn ? `Environment ${vm.environment.toUpperCase()} - Admin only deletion` : `Môi trường ${vm.environment.toUpperCase()} - Chỉ Admin mới có quyền xóa`}" style="font-size:11px; color:#ef4444; border-color:rgba(239,68,68,0.3);"><i data-lucide="shield-alert" style="width:11px;height:11px;"></i> Protected</span>
                        </div>
                    `;
                } else {
                    actionCellHtml = `
                        <div style="display:flex; justify-content:flex-end; align-items:center;">
                            ${fwQuickBtn}
                            <button class="btn-danger-sm" onclick="destroyVm('${vm.stackName}', ${vm.protection})">
                                <i data-lucide="trash" class="btn-icon-sm"></i>
                                <span>${window.t ? window.t('action.delete') : 'Xóa'}</span>
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
            const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
            vmTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">${window.t ? window.t('stacks.empty') : (isEn ? 'No virtual machines deployed via Portal yet' : 'Chưa có VM nào được tạo qua Portal')}</td></tr>`;
        }
    } catch (err) {
        const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
        vmTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-error">${isEn ? 'Error loading list: ' : 'Lỗi khi tải danh sách: '}${err.message}</td></tr>`;
    }
};

window.destroyVm = async function(stackName, isProtected) {
    let force = false;
    if (isProtected) {
        const proceed = window.confirmDialog(
            `⚠️ LƯU Ý BẢO VỆ: Máy ảo '${stackName}' từng có cờ Protection.\n\nNếu bạn ĐÃ tắt Protection thành 'No' trên Proxmox VE Web UI (hoặc muốn buộc xóa), hãy nhấn OK để tiến hành xóa.`,
            `⚠️ PROTECTION WARNING: Virtual machine '${stackName}' previously had Protection flag enabled.\n\nIf you have disabled Protection on Proxmox VE Web UI (or wish to force delete), press OK to proceed.`
        );
        if (!proceed) return;
        force = true;
    } else {
        if (!window.confirmDialog(`Bạn có chắc chắn muốn xóa và hủy tài nguyên cho '${stackName}' không?`, `Are you sure you want to delete and destroy resources for '${stackName}'?`)) return;
    }

    try {
        const res = await fetch(`/api/vms/${stackName}${force ? '?force=true' : ''}`, { 
            method: "DELETE",
            headers: window.getAuthHeaders()
        });
        const result = await res.json();
        
        const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
        if (result.success) {
            window.showToast(isEn ? `🗑️ Destroying virtual machines for stack '${stackName}'...` : `🗑️ Đang tiến hành hủy máy ảo thuộc stack '${stackName}'...`, "info");
            if (typeof window.appendLog === "function") window.appendLog(`[Portal] ${result.message}`);
            document.querySelector('.nav-tab[data-tab="tab-logs"]')?.click();
        } else {
            window.showRbacAlert(isEn ? `⛔ Cannot delete: ${result.error}` : `⛔ Không thể xóa: ${result.error}`);
            if (typeof window.appendLog === "function") window.appendLog(`[Portal Error] ${result.error}`);
        }
        setTimeout(() => { if (typeof window.loadVms === "function") window.loadVms(); }, 3000);
    } catch (err) {
        const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
        window.showRbacAlert(isEn ? `⛔ Connection error: ${err.message}` : `⛔ Lỗi kết nối: ${err.message}`);
        if (typeof window.appendLog === "function") window.appendLog(`[Portal Error] ${err.message}`);
    }
};

window.renderEnvBadge = function(env) {
    const e = (env || "dev").toLowerCase();
    if (e === "pro" || e === "prod" || e === "production") {
        return `<span class="tag-env tag-env-pro"><span class="env-indicator-dot pro"></span>PROD</span>`;
    }
    if (e === "stag" || e === "staging") {
        return `<span class="tag-env tag-env-stag"><span class="env-indicator-dot stag"></span>STAGING</span>`;
    }
    return `<span class="tag-env tag-env-dev"><span class="env-indicator-dot dev"></span>DEV</span>`;
};

window.renderCustomTags = function(tags) {
    return window.getCustomTags(tags);
};

window.initVms = function() {
    const btnRefresh = document.getElementById("btnRefresh");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", window.loadVms);
    }
};
