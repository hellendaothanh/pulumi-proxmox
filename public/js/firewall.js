// ==========================================
// VISUAL FIREWALL & SECURITY GROUPS (public/js/firewall.js)
// ==========================================

let currentFirewallVm = null;

window.openVmFirewall = async function(node, vmid, vmname) {
    currentFirewallVm = { node, vmid, vmname };
    const firewallModal = document.getElementById("firewallModal");
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    
    const titleEl = document.getElementById("firewallModalTitle");
    const subtitleEl = document.getElementById("firewallModalSubtitle");
    if (titleEl) titleEl.textContent = `Firewall & Security Groups: ${vmname || `VM #${vmid}`}`;
    if (subtitleEl) {
        subtitleEl.textContent = isEn 
            ? `Node: ${node} | VMID: ${vmid} — Inbound/Outbound Port & Network Access Rules` 
            : `Node: ${node} | VMID: ${vmid} — Quản lý Inbound/Outbound Port Rules`;
    }

    if (firewallModal) firewallModal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
    await window.loadVmFirewall();
};

window.loadVmFirewall = async function() {
    const firewallRulesTableBody = document.getElementById("firewallRulesTableBody");
    const toggleVmFirewall = document.getElementById("toggleVmFirewall");
    const firewallEnableStatusText = document.getElementById("firewallEnableStatusText");

    if (!currentFirewallVm || !firewallRulesTableBody) return;
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';

    firewallRulesTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;"><span class="spinner" style="display:inline-block; vertical-align:middle; margin-right:8px;"></span> ${isEn ? 'Loading Firewall Rules...' : 'Đang tải quy tắc Firewall...'}</td></tr>`;

    try {
        const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall`, {
            headers: window.getAuthHeaders(),
        });
        const result = await res.json();

        if (result.success && result.data) {
            const { rules, options } = result.data;
            const isEnabled = options && (options.enable === 1 || options.enable === true || options.enable === "1");

            if (toggleVmFirewall) {
                toggleVmFirewall.checked = isEnabled;
            }
            if (firewallEnableStatusText) {
                firewallEnableStatusText.textContent = isEnabled 
                    ? (isEn ? "Firewall: ON (Active Protection)" : "Firewall: ON (Đang bảo vệ)") 
                    : (isEn ? "Firewall: OFF (Disabled)" : "Firewall: OFF (Tắt)");
                firewallEnableStatusText.style.color = isEnabled ? "#38bdf8" : "#94a3b8";
            }

            if (!rules || rules.length === 0) {
                firewallRulesTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 28px;">${window.t ? window.t('firewall.empty') : 'Chưa có quy tắc Firewall nào'}</td></tr>`;
                return;
            }

            const role = window.currentUser ? window.currentUser.role : "viewer";
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
                                    <span>${isEn ? 'Delete' : 'Xóa'}</span>
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
};

window.applyFirewallPreset = async function(presetType) {
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

    window.showToast(`🛡️ Đang áp dụng preset mở port ${ruleData.dport || ruleData.proto}...`, "info");

    try {
        const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules`, {
            method: "POST",
            headers: window.getAuthHeaders(),
            body: JSON.stringify(ruleData)
        });
        const result = await res.json();
        if (result.success) {
            window.showToast(`✅ Đã thêm quy tắc ${ruleData.comment} thành công!`, "success");
            await window.loadVmFirewall();
        } else {
            window.showRbacAlert(`⛔ Lỗi thêm preset: ${result.error}`);
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
    }
};

window.toggleVmFirewallRule = async function(pos, enable) {
    if (!currentFirewallVm) return;
    window.showToast(`⚙️ Đang ${enable ? 'bật' : 'tắt'} Rule #${pos}...`, "info");
    try {
        const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules/${pos}`, {
            method: "PUT",
            headers: window.getAuthHeaders(),
            body: JSON.stringify({ enable: enable ? 1 : 0 })
        });
        const result = await res.json();
        if (result.success) {
            window.showToast(`✅ Đã cập nhật trạng thái Rule #${pos}!`, "success");
            await window.loadVmFirewall();
        } else {
            window.showRbacAlert(`⛔ Lỗi: ${result.error}`);
            await window.loadVmFirewall();
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
        await window.loadVmFirewall();
    }
};

window.deleteVmFirewallRule = async function(pos) {
    if (!window.confirmDialog(`🗑️ Bạn có chắc muốn XÓA quy tắc Firewall #${pos} này không?`, `🗑️ Are you sure you want to DELETE Firewall Rule #${pos}?`)) return;
    if (!currentFirewallVm) return;

    window.showToast(`🗑️ Đang xóa Rule #${pos}...`, "info");
    try {
        const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules/${pos}`, {
            method: "DELETE",
            headers: window.getAuthHeaders()
        });
        const result = await res.json();
        if (result.success) {
            window.showToast(`✅ Đã xóa quy tắc Firewall thành công!`, "success");
            await window.loadVmFirewall();
        } else {
            window.showRbacAlert(`⛔ Lỗi xóa: ${result.error}`);
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
    }
};

window.initFirewall = function() {
    const firewallModal = document.getElementById("firewallModal");
    const btnCloseFirewallModal = document.getElementById("btnCloseFirewallModal");
    const formCreateFirewallRule = document.getElementById("formCreateFirewallRule");
    const toggleVmFirewall = document.getElementById("toggleVmFirewall");

    if (btnCloseFirewallModal && firewallModal) {
        btnCloseFirewallModal.addEventListener("click", () => {
            firewallModal.classList.add("hidden");
            currentFirewallVm = null;
        });
    }

    if (toggleVmFirewall) {
        toggleVmFirewall.addEventListener("change", async (e) => {
            if (!currentFirewallVm) return;
            const enable = e.target.checked ? 1 : 0;
            window.showToast(`⚙️ Đang ${enable ? 'Bật' : 'Tắt'} Firewall VM #${currentFirewallVm.vmid}...`, "info");

            try {
                const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/options`, {
                    method: "PUT",
                    headers: window.getAuthHeaders(),
                    body: JSON.stringify({ enable })
                });
                const result = await res.json();
                if (result.success) {
                    window.showToast(`✅ Đã ${enable ? 'Bật' : 'Tắt'} Firewall thành công!`, "success");
                    await window.loadVmFirewall();
                } else {
                    window.showRbacAlert(`⛔ ${result.error}`);
                    e.target.checked = !enable;
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
                e.target.checked = !enable;
            }
        });
    }

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
            window.showToast(`🛡️ Đang thêm quy tắc Firewall mới...`, "info");

            try {
                const res = await fetch(`/api/nodes/${currentFirewallVm.node}/vms/${currentFirewallVm.vmid}/firewall/rules`, {
                    method: "POST",
                    headers: window.getAuthHeaders(),
                    body: JSON.stringify({ action, type, proto, dport, source, comment })
                });
                const result = await res.json();
                if (result.success) {
                    window.showToast(`✅ Đã thêm quy tắc Firewall thành công!`, "success");
                    formCreateFirewallRule.reset();
                    await window.loadVmFirewall();
                } else {
                    window.showRbacAlert(`⛔ Lỗi: ${result.error}`);
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }
};
