document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo Lucide Icons ban đầu
    if (window.lucide) {
        window.lucide.createIcons();
    }

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
        if (!tags || !tags.length) return "";
        const envs = ["dev", "stag", "staging", "pro", "prod", "production"];
        const list = Array.isArray(tags) ? tags : String(tags).split(/[,;\s]+/);
        const filtered = list.map(t => t.trim()).filter(t => t && !envs.includes(t.toLowerCase()));
        if (!filtered.length) return "";
        return filtered.map(t => `<span class="tag-custom">#${t}</span>`).join(" ");
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
            renderClusterView(data.data);
            populateDeployForm(data.data);
        } catch (err) {
            clusterContainer.innerHTML = `<div class="card text-center text-error">Lỗi kết nối API: ${err.message}</div>`;
        }
    }

    function renderClusterView(nodes) {
        clusterContainer.innerHTML = nodes.map(node => {
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
                const ipBadges = vm.agentIps && vm.agentIps.length > 0 
                    ? vm.agentIps.map(ip => `
                        <button class="copy-chip-sm" onclick="copyToClipboard('${ip}', this)" title="Click để sao chép IP">
                            <span>${ip}</span>
                            <i data-lucide="copy" class="copy-icon-sm"></i>
                        </button>
                    `).join(" ") 
                    : `<span class="text-muted" style="font-size:11.5px;">${isRunning ? "Chờ Agent..." : "-"}</span>`;

                return `
                    <tr>
                        <td>
                            <strong>${vm.name}</strong>
                            ${vm.config?.protection ? '<span class="badge-protected"><i data-lucide="shield-alert" class="badge-svg"></i> Protected</span>' : ''}
                        </td>
                        <td><code>${vm.vmid}</code></td>
                        <td>
                            <span class="status-indicator ${isRunning ? 'status-running' : 'status-stopped'}">
                                <span class="status-dot ${isRunning ? 'online' : ''}"></span>
                                ${isRunning ? 'Running' : (statusStr === 'stopped' ? 'Stopped' : statusStr)}
                            </span>
                        </td>
                        <td>${ipBadges}</td>
                        <td><small>${vm.cpus} vCPU | ${formatBytes(vm.maxmem)} RAM</small></td>
                        <td class="text-right">
                            <button class="btn-action-sm" onclick="showVmDetail('${node.node}', ${vm.vmid})">
                                <i data-lucide="eye" class="btn-icon-sm"></i> Chi tiết
                            </button>
                        </td>
                    </tr>
                `;
            }).join("") : `<tr><td colspan="6" class="text-center text-muted">Không có VM nào trên node này</td></tr>`;

            return `
                <div class="node-block">
                    <div class="node-header">
                        <div class="node-title-group">
                            <i data-lucide="server" class="icon-accent" style="width:24px;height:24px;"></i>
                            <div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <h3>Node: ${node.node}</h3>
                                    ${getNodePrimaryStorageType(node) === 'zfs' 
                                        ? '<span class="storage-pill storage-pill-zfs"><i data-lucide="database" class="pill-icon"></i> ZFS Pool</span>' 
                                        : (getNodePrimaryStorageType(node) === 'lvm' ? '<span class="storage-pill storage-pill-lvm"><i data-lucide="hard-drive" class="pill-icon"></i> LVM-Thin</span>' : '<span class="storage-pill storage-pill-dir"><i data-lucide="folder" class="pill-icon"></i> Directory</span>')}
                                </div>
                                <button class="copy-chip" onclick="copyToClipboard('${nodeIp}', this)" title="Click để sao chép IP Node">
                                    <i data-lucide="network" class="chip-icon"></i>
                                    <span>IP: ${nodeIp}</span>
                                    <i data-lucide="copy" class="copy-icon"></i>
                                </button>
                            </div>
                        </div>
                        <div class="node-stats-summary">
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
                                            <th>Tên VM</th>
                                            <th>VM ID</th>
                                            <th>Trạng Thái</th>
                                            <th>IP Address</th>
                                            <th>Cấu Hình</th>
                                            <th class="text-right">Xem</th>
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
            `;
        }).join("");

        if (window.lucide) window.lucide.createIcons();
    }

    btnRefreshResources.addEventListener("click", loadClusterResources);
    loadClusterResources();

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
    }

    if (nodeSelect) {
        nodeSelect.addEventListener("change", updateNodeSpecificFields);
    }

    // ==========================================
    // 3. SLIDERS & DEPLOY FORM
    // ==========================================
    const coresInput = document.getElementById("cores");
    const coresVal = document.getElementById("coresVal");
    coresInput.addEventListener("input", (e) => coresVal.textContent = `${e.target.value} Cores`);

    const memoryInput = document.getElementById("memoryGb");
    const memoryVal = document.getElementById("memoryVal");
    memoryInput.addEventListener("input", (e) => memoryVal.textContent = `${e.target.value} GB`);

    const diskInput = document.getElementById("diskSizeGb");
    const diskSizeVal = document.getElementById("diskSizeVal");
    diskInput.addEventListener("input", (e) => diskSizeVal.textContent = `${e.target.value} GB`);

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
    let activeProgressLine = null;
    let progressStartTime = null;
    let progressInterval = null;
    let currentProgressAction = "Updating";

    btnClearLogs.addEventListener("click", () => {
        if (progressInterval) clearInterval(progressInterval);
        activeProgressLine = null;
        progressStartTime = null;
        progressInterval = null;
        currentProgressAction = "Updating";
        terminal.innerHTML = '<div class="terminal-line text-info">[System] Logs cleared.</div>';
    });

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
            if (trimmed.includes("ERROR") || trimmed.includes("error") || trimmed.includes("failed") || trimmed.includes("❌")) {
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

    // Xử lý tạo VM mới
    const form = document.getElementById("createVmForm");
    const btnSubmit = document.getElementById("btnSubmit");
    const btnText = btnSubmit.querySelector(".btn-text");
    const spinner = btnSubmit.querySelector(".spinner");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

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
                headers: { "Content-Type": "application/json" },
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
