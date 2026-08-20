// ==========================================
// CLUSTER RESOURCES & NODE CARDS (public/js/cluster.js)
// ==========================================

window.formatUptime = function(seconds) {
    if (!seconds) return "-";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
};

window.getNodePrimaryStorageType = function(node) {
    if (!node.storages || !node.storages.length) return "lvm";
    const hasZfs = node.storages.some(s => s.storage && s.storage.includes("zfs") && s.active !== 0);
    if (hasZfs) return "zfs";
    const hasLvm = node.storages.some(s => s.storage && s.storage.includes("lvm") && s.active !== 0);
    if (hasLvm) return "lvm";
    return "dir";
};

window.getEnvironmentTag = function(tags) {
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
};

window.getCustomTags = function(tags) {
    if (!tags || !tags.length) return "";
    const envs = ["dev", "stag", "staging", "pro", "prod", "production"];
    const list = Array.isArray(tags) ? tags : String(tags).split(/[,;\s]+/);
    const filtered = list.map(t => t.trim()).filter(t => t && !envs.includes(t.toLowerCase()));
    if (!filtered.length) return "";
    return filtered.map(t => `<span class="tag-custom">#${t}</span>`).join(" ");
};

window.getVmDiskSize = function(vm) {
    if (!vm) return "N/A";
    const cfg = vm.config || {};

    for (const prefix of ["scsi", "virtio", "sata", "ide"]) {
        for (let i = 0; i < 4; i++) {
            const val = cfg[`${prefix}${i}`];
            if (val && typeof val === "string") {
                const m = val.match(/size=([0-9.]+[GMKTP]?i?B?)/i);
                if (m && m[1]) return m[1].toUpperCase();
                const m2 = val.match(/,([0-9.]+[GMKTP]?)/i);
                if (m2 && m2[1] && isNaN(Number(m2[1]))) return m2[1].toUpperCase();
            }
        }
    }

    if (vm.maxdisk && vm.maxdisk > 0) {
        return window.formatBytes(vm.maxdisk);
    }

    return "Disk: N/A";
};

window.renderClusterView = function(nodes, searchTerm = "") {
    const clusterContainer = document.getElementById("clusterContainer");
    if (!clusterContainer) return;

    const term = (searchTerm || "").trim().toLowerCase();

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
            return node;
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
                <h3 style="color:#f8fafc; font-size:16px; margin-bottom:6px;">${window.t ? window.t('cluster.node_not_found') : 'Không tìm thấy Node'}</h3>
                <p style="font-size:13px;">${window.t ? window.t('cluster.no_search_results', searchTerm) : `Không có kết quả nào khớp với '${searchTerm}'`}</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Thanh Mục Lục Node (Quick Nav Index)
    const nodeIndexHtml = `
        <div class="node-quick-nav">
            <div class="quick-nav-header">
                <div class="quick-nav-title">
                    <i data-lucide="compass" class="nav-icon"></i>
                    <span>${window.t ? window.t('cluster.node_index') : 'Mục Lục Node'} (${filteredNodes.length} Nodes)</span>
                </div>
                <div class="quick-nav-actions">
                    <button class="btn-toggle-all" onclick="expandAllNodes(true)">
                        <i data-lucide="chevrons-down" class="btn-icon-xs"></i>
                        <span>${window.t ? window.t('cluster.expand_all') : 'Mở Tất Cả'}</span>
                    </button>
                    <button class="btn-toggle-all" onclick="expandAllNodes(false)">
                        <i data-lucide="chevrons-up" class="btn-icon-xs"></i>
                        <span>${window.t ? window.t('cluster.collapse_all') : 'Thu Gọn'}</span>
                    </button>
                </div>
            </div>
            <div class="quick-nav-chips">
                ${filteredNodes.map(node => {
                    const vmCount = node.vms ? node.vms.length : 0;
                    const runningCount = node.vms ? node.vms.filter(v => (typeof v.status === "object" ? v.status?.status : v.status) === "running").length : 0;
                    const storageType = window.getNodePrimaryStorageType(node);
                    return `
                        <button class="node-chip-link" onclick="focusAndScrollToNode('${node.node}')" title="${window.t ? window.t('tooltip.toggle_node_chip', node.node) : `Cuộn tới ${node.node}`}">
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

    const storageThresh = 85;
    const cpuThresh = 85;
    const ramThresh = 85;

    const nodesCardsHtml = filteredNodes.map(node => {
        const primaryNet = node.networks.find(n => n.address) || node.networks[0] || {};
        const nodeIp = primaryNet.address || "192.168.1.x";

        const cpuPercent = Number(node.cpu ? (node.cpu * 100).toFixed(1) : 0);
        const memUsed = window.formatBytes(node.mem);
        const memMax = window.formatBytes(node.maxmem);
        const memPercent = Number(node.maxmem ? ((node.mem / node.maxmem) * 100).toFixed(1) : 0);

        const storagesHtml = node.storages.map(st => {
            const used = window.formatBytes(st.used);
            const total = window.formatBytes(st.total);
            const free = window.formatBytes(st.avail);
            const percent = Number(st.total ? ((st.used / st.total) * 100).toFixed(1) : 0);
            const isStorageDanger = percent >= storageThresh;

            const contentsHtml = st.contents && st.contents.length > 0 ? `
                <div class="storage-files-list">
                    ${st.contents.map(c => `
                        <div class="storage-file-row">
                            <span style="display:flex;align-items:center;gap:5px;"><i data-lucide="file-text" style="width:12px;height:12px;opacity:0.7;"></i> ${c.volid.split('/').pop()}</span>
                            <span>${window.formatBytes(c.size)}</span>
                        </div>
                    `).join("")}
                </div>
            ` : `<div class="text-muted" style="font-size:11px; margin-top:6px;">${window.t ? window.t('cluster.no_files') : 'Không có tệp'}</div>`;

            return `
                <div class="storage-item ${isStorageDanger ? 'storage-danger' : ''}">
                    <div class="storage-item-header">
                        <div class="storage-name">
                            <i data-lucide="database" class="field-icon"></i>
                            <span>${st.storage}</span>
                            <span class="storage-type-tag">${st.type}</span>
                            ${isStorageDanger ? `<span class="badge-storage-danger">${window.t ? window.t('cluster.storage_danger_badge', percent, storageThresh) : `NGUY HIỂM: ${percent}% (≥ ${storageThresh}%)`}</span>` : ''}
                        </div>
                        <div class="storage-usage-text ${isStorageDanger ? 'text-danger' : ''}">${used} / ${total} (${percent}%)</div>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${isStorageDanger ? 'progress-bar-danger' : ''}" style="width: ${percent}%;"></div>
                    </div>
                    <div style="font-size:11.5px; color:var(--text-muted); display:flex; justify-content:space-between;">
                        <span>${window.t ? window.t('cluster.storage_avail') : 'Khả dụng:'} <strong>${free}</strong></span>
                        <button class="storage-files-toggle" onclick="toggleStorageFiles('${node.node}-${st.storage}')">
                            <span>${window.t ? window.t('cluster.storage_view_files') : 'Xem tệp tin'} (${st.contents ? st.contents.length : 0})</span>
                            <i data-lucide="chevron-down" style="width:12px;height:12px;"></i>
                        </button>
                    </div>
                    <div id="files-${node.node}-${st.storage}" style="display: none;">
                        ${contentsHtml}
                    </div>
                </div>
            `;
        }).join("");

        const vmsHtml = node.vms && node.vms.length > 0 ? node.vms.map(vm => {
            const statusStr = typeof vm.status === "object" ? (vm.status?.status || "unknown") : (vm.status || "unknown");
            const isRunning = statusStr === "running";
            const envTagHtml = window.getEnvironmentTag(vm.tags);
            const customTagsHtml = window.getCustomTags(vm.tags);

            const ipBadges = vm.agentIps && vm.agentIps.length > 0 
                ? `<div class="ip-chips-grid">${vm.agentIps.map(ip => `
                    <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="${window.t ? window.t('tooltip.copy_ip') : 'Sao chép IP'}">
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
                        <span class="spec-pill"><i data-lucide="layers" class="spec-icon"></i> ${window.formatBytes(vm.maxmem)}</span>
                        <span class="spec-pill"><i data-lucide="hard-drive" class="spec-icon"></i> ${window.getVmDiskSize(vm)}</span>
                    </td>
                    <td class="text-right vm-actions-cell">
                        <div class="vm-action-btn-group">
                            ${(() => {
                                const role = window.currentUser ? window.currentUser.role : "viewer";
                                const vmEnv = (vm.tags && Array.isArray(vm.tags) ? vm.tags.find(t => ["pro","prod","stag","staging","dev"].includes(t.toLowerCase())) : "dev") || "dev";
                                const isProdOrStag = ["pro","prod","stag","staging"].includes(vmEnv.toLowerCase());
                                const isDevForbidden = (role === "developer" && isProdOrStag);

                                if (role === "viewer") {
                                    return `<span class="badge-optional" style="font-size:10.5px; opacity:0.6;"><i data-lucide="eye" style="width:11px;height:11px;"></i> ${window.t ? window.t('action.read_only') : 'Chỉ xem'}</span>`;
                                }

                                let powerBtns = "";
                                if (isDevForbidden) {
                                    powerBtns = `<span class="badge-optional" title="Môi trường ${vmEnv.toUpperCase()} - Chỉ Admin mới có quyền điều khiển" style="font-size:10.5px; color:#f59e0b; border-color:rgba(245,158,11,0.3);"><i data-lucide="lock" style="width:11px;height:11px;"></i> ${vmEnv.toUpperCase()} Lock</span>`;
                                } else {
                                    powerBtns = isRunning ? `
                                        <button class="btn-power-op btn-power-reboot" onclick="triggerVmPower('${node.node}', ${vm.vmid}, 'reboot')" title="${window.t ? window.t('action.reboot') : 'Khởi động lại'}">
                                            <i data-lucide="rotate-cw" class="action-icon-xs"></i>
                                        </button>
                                        <button class="btn-power-op btn-power-stop" onclick="triggerVmPower('${node.node}', ${vm.vmid}, 'shutdown')" title="${window.t ? window.t('action.shutdown') : 'Tắt an toàn'}">
                                            <i data-lucide="power" class="action-icon-xs"></i>
                                        </button>
                                    ` : `
                                        <button class="btn-power-op btn-power-start" onclick="triggerVmPower('${node.node}', ${vm.vmid}, 'start')" title="${window.t ? window.t('action.start') : 'Khởi động'}">
                                            <i data-lucide="play" class="action-icon-xs"></i>
                                        </button>
                                    `;
                                }

                                const snapBtn = isDevForbidden ? '' : `
                                    <button class="btn-action-sm btn-action-snap" onclick="openVmSnapshots('${node.node}', ${vm.vmid}, '${vm.name}')" title="${window.t ? window.t('action.snapshot') : 'Snapshot'}">
                                        <i data-lucide="camera" class="btn-icon-sm"></i>
                                        <span>${window.t ? window.t('action.snapshot') : 'Snapshot'}</span>
                                    </button>
                                `;

                                const fwBtn = isDevForbidden ? '' : `
                                    <button class="btn-action-sm" style="border-color:rgba(56,189,248,0.3); color:#38bdf8;" onclick="openVmFirewall('${node.node}', ${vm.vmid}, '${vm.name}')" title="${window.t ? window.t('action.firewall') : 'Firewall'}">
                                        <i data-lucide="shield" class="btn-icon-sm"></i>
                                        <span>${window.t ? window.t('action.firewall') : 'Tường Lửa'}</span>
                                    </button>
                                `;

                                const hotplugBtn = isDevForbidden ? '' : `
                                    <button class="btn-action-sm btn-action-hotplug" onclick="openVmHotplug('${node.node}', ${vm.vmid}, '${vm.name}')" title="${window.t ? window.t('action.config_tooltip') : 'Cấu hình nóng'}">
                                        <i data-lucide="cpu" class="btn-icon-sm"></i>
                                        <span>${window.t ? window.t('action.config') : 'Cấu hình'}</span>
                                    </button>
                                `;

                                return `
                                    ${powerBtns}
                                    ${hotplugBtn}
                                    ${fwBtn}
                                    ${snapBtn}
                                    <button class="btn-action-sm" onclick="showVmDetail('${node.node}', ${vm.vmid})" title="${window.t ? window.t('action.details') : 'Chi tiết'}">
                                        <i data-lucide="eye" class="btn-icon-sm"></i>
                                        <span>${window.t ? window.t('action.details') : 'Chi tiết'}</span>
                                    </button>
                                `;
                            })()}
                        </div>
                    </td>
                </tr>
            `;
        }).join("") : `<tr><td colspan="5" class="text-center text-muted" style="padding: 24px;">${window.t ? window.t('cluster.no_vms') : 'Chưa có máy ảo nào'}</td></tr>`;

        return `
            <div class="node-block" id="node-block-${node.node}">
                <div class="node-header" onclick="toggleNodeCollapse('${node.node}')" title="${window.t ? window.t('tooltip.toggle_node', node.node) : `Thu gọn ${node.node}`}">
                    <div class="node-title-group">
                        <button class="btn-node-toggle" id="btn-toggle-${node.node}">
                            <i data-lucide="chevron-down" class="toggle-icon"></i>
                        </button>
                        <i data-lucide="server" class="icon-accent" style="width:24px;height:24px;"></i>
                        <div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <h3>Node: ${node.node}</h3>
                                ${window.getNodePrimaryStorageType(node) === 'zfs' 
                                    ? '<span class="storage-pill storage-pill-zfs"><i data-lucide="database" class="pill-icon"></i> ZFS Pool</span>' 
                                    : (window.getNodePrimaryStorageType(node) === 'lvm' ? '<span class="storage-pill storage-pill-lvm"><i data-lucide="hard-drive" class="pill-icon"></i> LVM-Thin</span>' : '<span class="storage-pill storage-pill-dir"><i data-lucide="folder" class="pill-icon"></i> Directory</span>')}
                                <span class="node-vm-badge">${node.vms ? node.vms.length : 0} VMs</span>
                            </div>
                            <button class="copy-chip" onclick="event.stopPropagation(); copyToClipboard('${nodeIp}', this)" title="${window.t ? window.t('tooltip.copy_node_ip') : 'Sao chép IP Node'}">
                                <i data-lucide="network" class="chip-icon"></i>
                                <span>IP: ${nodeIp}</span>
                                <i data-lucide="copy" class="copy-icon"></i>
                            </button>
                        </div>
                    </div>
                    <div class="node-stats-summary" onclick="event.stopPropagation();">
                        <div class="stat-box">
                            <span class="stat-label">${window.t ? window.t('cluster.node_cpu') : 'CPU'}</span>
                            <span class="stat-value">${cpuPercent}%</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">${window.t ? window.t('cluster.node_ram') : 'RAM'}</span>
                            <span class="stat-value">${memUsed} / ${memMax} (${memPercent}%)</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">${window.t ? window.t('cluster.node_uptime') : 'Uptime'}</span>
                            <span class="stat-value">${window.formatUptime(node.uptime)}</span>
                        </div>
                    </div>
                </div>

                <div class="node-collapsible-body" id="node-body-${node.node}">
                    <div class="node-content-grid">
                        <div>
                            <div class="sub-section-title">
                                <i data-lucide="hard-drive" class="field-icon"></i>
                                <span>${window.t ? window.t('cluster.storages_section') : 'Ổ Lưu Trữ & Phân Vùng'}</span>
                            </div>
                            <div class="storage-list">
                                ${storagesHtml}
                            </div>
                        </div>

                        <div>
                            <div class="sub-section-title">
                                <i data-lucide="monitor" class="field-icon"></i>
                                <span>${window.t ? window.t('cluster.vms_list') : 'Danh Sách Máy Ảo'} (${node.vms.length} VMs)</span>
                            </div>
                            <div class="table-responsive">
                                <table class="vms-overview-table">
                                    <thead>
                                        <tr>
                                            <th style="min-width: 140px;">${window.t ? window.t('cluster.table.vmid') : 'Tên / ID'}</th>
                                            <th style="min-width: 95px;">${window.t ? window.t('cluster.table.status') : 'Trạng Thái'}</th>
                                            <th style="min-width: 120px;">${window.t ? window.t('cluster.table.ip') : 'Địa Chỉ IP'}</th>
                                            <th style="min-width: 130px;">${window.t ? window.t('cluster.table.specs') : 'Phần Cứng'}</th>
                                            <th class="text-right" style="min-width: 220px;">${window.t ? window.t('cluster.table.actions') : 'Thao Tác'}</th>
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
};

window.loadClusterResources = async function() {
    const clusterContainer = document.getElementById("clusterContainer");
    if (!clusterContainer) return;

    clusterContainer.innerHTML = `
        <div class="card text-center text-muted">
            <span class="spinner" style="margin: 20px auto; display:block;"></span>
            ${window.t ? window.t('cluster.scanning') : 'Đang quét toàn bộ cụm Proxmox...'}
        </div>
    `;

    try {
        const res = await fetch("/api/resources");
        const data = await res.json();

        if (!data.success || !data.data || data.data.length === 0) {
            clusterContainer.innerHTML = `<div class="card text-center text-error">Không lấy được dữ liệu cụm Proxmox: ${data.error || 'Dữ liệu trống'}</div>`;
            return;
        }

        data.data.sort((a, b) => a.node.localeCompare(b.node, undefined, { numeric: true, sensitivity: 'base' }));
        data.data.forEach(node => {
            if (node.vms && Array.isArray(node.vms)) {
                node.vms.sort((a, b) => (a.vmid || 0) - (b.vmid || 0));
            }
        });

        window.cachedClusterData = data.data;
        const searchInput = document.getElementById("vmSearchInput");
        const term = searchInput ? searchInput.value : "";
        window.renderClusterView(data.data, term);
        if (typeof window.populateDeployForm === "function") {
            window.populateDeployForm(data.data);
        }
    } catch (err) {
        clusterContainer.innerHTML = `<div class="card text-center text-error">Lỗi kết nối API: ${err.message}</div>`;
    }
};

window.toggleNodeCollapse = function(nodeName) {
    const body = document.getElementById(`node-body-${nodeName}`);
    const btn = document.getElementById(`btn-toggle-${nodeName}`);
    if (!body) return;

    const isCollapsed = body.classList.toggle("collapsed");
    if (btn) btn.classList.toggle("collapsed", isCollapsed);
};

window.expandAllNodes = function(expand = true) {
    const bodies = document.querySelectorAll(".node-collapsible-body");
    const btns = document.querySelectorAll(".btn-node-toggle");

    bodies.forEach(body => {
        if (expand) body.classList.remove("collapsed");
        else body.classList.add("collapsed");
    });

    btns.forEach(btn => {
        if (expand) btn.classList.remove("collapsed");
        else btn.classList.add("collapsed");
    });
};

window.focusAndScrollToNode = function(nodeName) {
    const targetNode = document.getElementById(`node-block-${nodeName}`);
    const body = document.getElementById(`node-body-${nodeName}`);
    const btn = document.getElementById(`btn-toggle-${nodeName}`);

    if (targetNode) {
        if (body && body.classList.contains("collapsed")) {
            body.classList.remove("collapsed");
            if (btn) btn.classList.remove("collapsed");
        }

        const quickNav = document.querySelector(".node-quick-nav");
        const navHeight = quickNav ? quickNav.offsetHeight + 24 : 120;
        const elementPosition = targetNode.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navHeight;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });

        targetNode.classList.add("node-highlight");
        setTimeout(() => {
            targetNode.classList.remove("node-highlight");
        }, 1800);
    }
};

window.toggleStorageFiles = function(id) {
    const el = document.getElementById(`files-${id}`);
    if (el) {
        el.style.display = el.style.display === "none" ? "block" : "none";
    }
};

window.showVmDetail = function(nodeName, vmid) {
    const vmModal = document.getElementById("vmModal");
    const modalVmTitle = document.getElementById("modalVmTitle");
    const modalVmBody = document.getElementById("modalVmBody");
    if (!vmModal || !modalVmTitle || !modalVmBody) return;

    const node = window.cachedClusterData.find(n => n.node === nodeName);
    if (!node) return;
    const vm = node.vms.find(v => v.vmid === vmid);
    if (!vm) return;

    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    const statusStr = typeof vm.status === "object" ? (vm.status?.status || "unknown") : (vm.status || "unknown");
    const isRunning = statusStr === "running";
    const diskDisplay = window.getVmDiskSize(vm);

    modalVmTitle.textContent = isEn 
        ? `Virtual Machine Details: ${vm.name} (ID: ${vmid})` 
        : `Chi Tiết Máy Ảo: ${vm.name} (ID: ${vmid})`;

    const statusLabel = isEn 
        ? (isRunning ? 'Running' : (statusStr === 'stopped' ? 'Stopped' : statusStr)) 
        : (isRunning ? 'Đang chạy' : (statusStr === 'stopped' ? 'Đã tắt' : statusStr));

    modalVmBody.innerHTML = `
        <div class="modal-grid">
            <div class="modal-field">
                <div class="modal-label">${window.t ? window.t('wizard.summary.node') : 'Node'}</div>
                <div class="modal-value">${nodeName}</div>
            </div>
            <div class="modal-field">
                <div class="modal-label">${window.t ? window.t('vm_detail.status') : 'Trạng thái'}</div>
                <div class="modal-value">
                    <span class="status-indicator ${isRunning ? 'status-running' : 'status-stopped'}">
                        <span class="status-dot ${isRunning ? 'online' : ''}"></span>
                        ${statusLabel}
                    </span>
                </div>
            </div>
            <div class="modal-field">
                <div class="modal-label">${isEn ? 'CPU Cores & Architecture' : 'vCPU & Kiến Trúc'}</div>
                <div class="modal-value">${vm.config?.cores || vm.cpus} Cores (${vm.config?.cpu || "default"})</div>
            </div>
            <div class="modal-field">
                <div class="modal-label">${window.t ? window.t('vm_detail.ram') : 'RAM'}</div>
                <div class="modal-value">${window.formatBytes(vm.maxmem)}</div>
            </div>
            <div class="modal-field">
                <div class="modal-label">${window.t ? window.t('vm_detail.disk') : 'Dung lượng đĩa'}</div>
                <div class="modal-value">${diskDisplay}</div>
            </div>
            <div class="modal-field">
                <div class="modal-label">${isEn ? 'Machine Type' : 'Loại Máy Ảo (Machine)'}</div>
                <div class="modal-value">${vm.config?.machine || "i440fx"}</div>
            </div>
            <div class="modal-field">
                <div class="modal-label">${isEn ? 'Protection Mode' : 'Chế Độ Bảo Vệ'}</div>
                <div class="modal-value">${vm.config?.protection ? `<span class="badge-protected"><i data-lucide="shield-check" class="badge-svg"></i> ${isEn ? 'Protected' : 'Đang bảo vệ'}</span>` : `<span class="text-muted">${isEn ? 'Disabled' : 'Tắt'}</span>`}</div>
            </div>
            <div class="modal-field">
                <div class="modal-label">${window.t ? window.t('vm_detail.ip') : 'Địa chỉ IP'}</div>
                <div class="modal-value">
                    ${vm.agentIps && vm.agentIps.length ? vm.agentIps.map(ip => `
                        <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="${window.t ? window.t('tooltip.copy_ip') : 'Sao chép IP'}">
                            <span>${ip}</span>
                            <i data-lucide="copy" class="copy-icon-sm"></i>
                        </button>
                    `).join(" ") : (window.t ? window.t('vm_detail.no_ip') : 'Chưa có IP')}
                </div>
            </div>
        </div>

        <div class="modal-label" style="margin-bottom:6px;">${window.t ? window.t('vm_detail.raw_config') : 'Cấu hình Raw'}</div>
        <div class="raw-config-box">${JSON.stringify(vm.config, null, 2)}</div>
    `;

    vmModal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
};

window.triggerVmPower = async function(nodeName, vmid, action) {
    let actionLabel = "thao tác nguồn";
    if (action === "start") actionLabel = "Bật nguồn (Start)";
    if (action === "shutdown") actionLabel = "Tắt nguồn an toàn (ACPI Shutdown)";
    if (action === "stop") actionLabel = "Tắt nóng (Force Stop)";
    if (action === "reboot") actionLabel = "Khởi động lại (Reboot)";
    if (action === "reset") actionLabel = "Reset cưỡng bức (Force Reset)";

    if (action === "stop" || action === "reset") {
        if (!window.confirmDialog(`⚠️ Bạn có chắc muốn thực hiện ${actionLabel} cho VM #${vmid} không? Thao tác tắt đột ngột có thể làm mất dữ liệu chưa lưu!`, `⚠️ Are you sure you want to perform ${action} on VM #${vmid}? Forced action may cause unsaved data loss!`)) {
            return;
        }
    }

    window.showToast(`⚡ Đang gửi lệnh ${actionLabel} tới VM #${vmid}...`, "info");

    try {
        const res = await fetch(`/api/nodes/${nodeName}/vms/${vmid}/power`, {
            method: "POST",
            headers: window.getAuthHeaders(),
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.success) {
            window.showToast(`✅ Đã gửi lệnh ${actionLabel} thành công!`, "success");
            setTimeout(() => {
                if (typeof window.loadClusterResources === "function") window.loadClusterResources();
            }, 2500);
        } else {
            window.showRbacAlert(`⛔ Lỗi thao tác nguồn: ${data.error || "Không rõ nguyên nhân"}`);
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
    }
};

window.initCluster = function() {
    const btnRefreshResources = document.getElementById("btnRefreshResources");
    const vmSearchInput = document.getElementById("vmSearchInput");
    const btnClearSearch = document.getElementById("btnClearSearch");
    const btnBackToTop = document.getElementById("btnBackToTop");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const vmModal = document.getElementById("vmModal");

    if (btnRefreshResources) {
        btnRefreshResources.addEventListener("click", window.loadClusterResources);
    }

    if (vmSearchInput) {
        vmSearchInput.addEventListener("input", (e) => {
            const val = e.target.value;
            if (btnClearSearch) {
                if (val.length > 0) btnClearSearch.classList.remove("hidden");
                else btnClearSearch.classList.add("hidden");
            }
            if (window.cachedClusterData.length > 0) {
                window.renderClusterView(window.cachedClusterData, val);
            }
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener("click", () => {
            if (vmSearchInput) {
                vmSearchInput.value = "";
                btnClearSearch.classList.add("hidden");
                vmSearchInput.focus();
                if (window.cachedClusterData.length > 0) {
                    window.renderClusterView(window.cachedClusterData, "");
                }
            }
        });
    }

    if (btnBackToTop) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 280) btnBackToTop.classList.remove("hidden");
            else btnBackToTop.classList.add("hidden");
        });

        btnBackToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (btnCloseModal && vmModal) {
        btnCloseModal.addEventListener("click", () => vmModal.classList.add("hidden"));
        vmModal.addEventListener("click", (e) => {
            if (e.target === vmModal) vmModal.classList.add("hidden");
        });
    }
};
