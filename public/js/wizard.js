// ==========================================
// 4-STEP VM CREATION WIZARD & APP CATALOG (public/js/wizard.js)
// ==========================================

window.goToStep = function(stepNumber) {
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

window.handleResourceTypeChange = function(type) {
    const cardQemu = document.getElementById("cardTypeQemu");
    const cardLxc = document.getElementById("cardTypeLxc");
    const instanceLabel = document.getElementById("instanceNameLabel");
    const vmNameInput = document.getElementById("vmName");

    if (type === "lxc") {
        cardLxc?.classList.add("active");
        cardQemu?.classList.remove("active");
        if (instanceLabel) instanceLabel.textContent = "Tên Container / Tiền Tố (LXC Base Name)";
        if (vmNameInput && !vmNameInput.value) vmNameInput.placeholder = "vd: lxc-redis, lxc-nginx, lxc-node...";
        window.applyHardwarePreset(1, 1, 8);
        window.showToast("📦 Đã chọn chế độ 'LXC Container' (Siêu nhẹ, tối ưu RAM/CPU)!", "info");
    } else {
        cardQemu?.classList.add("active");
        cardLxc?.classList.remove("active");
        if (instanceLabel) instanceLabel.textContent = "Tên Máy Ảo / Tiền Tố (VM Base Name)";
        if (vmNameInput && !vmNameInput.value) vmNameInput.placeholder = "vd: ubuntu-server, db-master, k8s-node...";
        window.applyHardwarePreset(2, 2, 20);
        window.showToast("🖥️ Đã chọn chế độ 'QEMU Virtual Machine' (Hệ điều hành độc lập)!", "info");
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

window.applyAppCatalog = function(stackKey) {
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

    window.applyHardwarePreset(stack.cores, stack.ramGb, stack.diskGb);

    document.querySelectorAll(".app-catalog-card").forEach(c => c.classList.remove("active"));
    event?.currentTarget?.classList.add("active");

    window.showToast(`🚀 Đã nạp trọn bộ Stack ứng dụng '${stackKey.toUpperCase()}' kèm phần cứng & bootstrap script!`, "success");
};

window.applyHardwarePreset = function(cores, ramGb, diskGb) {
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

    document.querySelectorAll(".btn-hw-preset").forEach(btn => {
        const specText = btn.querySelector(".hw-preset-spec")?.textContent || "";
        if (specText.includes(`${cores} vCPU`) && specText.includes(`${ramGb}GB`) && specText.includes(`${diskGb}GB`)) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    window.showToast(`⚡ Đã áp dụng Template Phần Cứng: ${cores} vCPU · ${ramGb} GB RAM · ${diskGb} GB Disk!`, "info");
};

window.updateClusterPreview = function() {
    const vmCountInput = document.getElementById("vmCount");
    const vmNameInput = document.getElementById("vmName");
    const vmCountVal = document.getElementById("vmCountVal");
    const singleNodeSection = document.getElementById("singleNodeSection");
    const multiNodeSection = document.getElementById("multiNodeSection");
    const vmClusterPreview = document.getElementById("vmClusterPreview");
    const previewList = document.getElementById("previewList");
    const previewHeaderTitle = document.getElementById("previewHeaderTitle");
    const nodesCheckboxContainer = document.getElementById("nodesCheckboxContainer");
    const btnSubmit = document.getElementById("btnSubmit");
    const btnText = btnSubmit?.querySelector(".btn-text");

    if (!vmCountInput || !vmNameInput) return;
    const count = parseInt(vmCountInput.value) || 1;
    const rawBaseName = vmNameInput.value.trim() || "vm";
    
    if (vmCountVal) vmCountVal.textContent = `${count} VM${count > 1 ? 's' : ''}`;

    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    if (count === 1) {
        if (singleNodeSection) singleNodeSection.classList.remove("hidden");
        if (multiNodeSection) multiNodeSection.classList.add("hidden");
        if (vmClusterPreview) vmClusterPreview.classList.add("hidden");
        if (btnText) btnText.textContent = isEn ? "Deploy Virtual Machine" : "Triển Khai VM";
        return;
    }

    if (singleNodeSection) singleNodeSection.classList.add("hidden");
    if (multiNodeSection) multiNodeSection.classList.remove("hidden");
    if (vmClusterPreview) vmClusterPreview.classList.remove("hidden");
    if (btnText) btnText.textContent = isEn ? `Deploy Cluster of ${count} VMs` : `Triển Khai Cụm ${count} Máy Ảo`;

    let selectedNodes = [];
    if (nodesCheckboxContainer) {
        const visibleCheckedBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']:checked");
        selectedNodes = Array.from(visibleCheckedBoxes).map(cb => cb.value);

        if (selectedNodes.length === 0) {
            const visibleBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']");
            selectedNodes = Array.from(visibleBoxes).map(cb => cb.value);
        }
    }
    
    if (selectedNodes.length === 0 && window.cachedClusterData.length > 0) {
        selectedNodes = [window.cachedClusterData[0].node];
    }
    if (selectedNodes.length === 0) selectedNodes = ["node01"];

    if (previewHeaderTitle) {
        previewHeaderTitle.textContent = `Xem trước phân bổ cụm (${count} Máy Ảo trên ${selectedNodes.length} Nodes):`;
    }

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
};

window.populateDeployForm = function(clusterData) {
    const nodeSelect = document.getElementById("nodeName");
    const datastoreSelect = document.getElementById("datastoreId");
    const imageSelect = document.getElementById("diskImageId");
    const bridgeSelect = document.getElementById("bridge");
    const nodesCheckboxContainer = document.getElementById("nodesCheckboxContainer");

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

    if (nodesCheckboxContainer) {
        const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
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
                return `<span class="storage-pill ${isZfs ? 'storage-pill-zfs' : 'storage-pill-lvm'}"><i data-lucide="${iconName}" class="pill-icon"></i> <strong>${s.storage}</strong>: ${window.formatBytes(s.avail)} ${isEn ? 'free' : 'trống'}</span>`;
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
                            <span><i data-lucide="memory-stick" class="pill-icon"></i> ${isEn ? 'Free RAM' : 'RAM Trống'}: <strong>${window.formatBytes(freeMem)}</strong> / ${window.formatBytes(node.maxmem)} (${memPct}%)</span>
                        </div>
                        <div class="node-metric-line">
                            <span><i data-lucide="cpu" class="pill-icon"></i> CPU: <strong>${node.maxcpu || 0} vCPU</strong> (${cpuPct}% ${isEn ? 'in use' : 'đang dùng'})</span>
                        </div>
                        <div class="node-storages-pills-row">
                            ${storagePills || `<span class="text-muted" style="font-size:10px;">${isEn ? 'No VM Datastores' : 'Không có VM Datastore'}</span>`}
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
                window.updateClusterPreview();
            });
        });
    }

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

                if (filter !== "all" && datastoreSelect) {
                    if (Array.from(datastoreSelect.options).some(o => o.value === filter)) {
                        datastoreSelect.value = filter;
                    }
                }

                window.updateClusterPreview();
            });
        });
    }

    document.querySelectorAll(".env-radio-card").forEach(card => {
        card.addEventListener("click", () => {
            document.querySelectorAll(".env-radio-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            const radio = card.querySelector("input[type='radio']");
            if (radio) radio.checked = true;
        });
    });

    window.updateNodeSpecificFields();
    window.updateClusterPreview();
};

window.updateNodeSpecificFields = function() {
    const nodeSelect = document.getElementById("nodeName");
    const datastoreSelect = document.getElementById("datastoreId");
    const imageSelect = document.getElementById("diskImageId");
    const bridgeSelect = document.getElementById("bridge");

    if (!nodeSelect || !window.cachedClusterData.length) return;
    const selectedNodeName = nodeSelect.value;
    const selectedNode = window.cachedClusterData.find(n => n.node === selectedNodeName);
    if (!selectedNode) return;

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

    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    const validStorages = (selectedNode.storages || []).filter(st => st.active !== 0 && st.storage !== "local");
    if (validStorages.length > 0 && datastoreSelect) {
        datastoreSelect.innerHTML = validStorages.map(st => {
            const free = window.formatBytes(st.avail);
            const total = window.formatBytes(st.total);
            return `<option value="${st.storage}">${st.storage} (${st.type || 'storage'} - ${isEn ? 'Free' : 'Trống'}: ${free} / ${total})</option>`;
        }).join("");

        const preferred = validStorages.find(st => st.storage === "zfs-storage") ||
                          validStorages.find(st => st.storage.includes("zfs")) ||
                          validStorages.find(st => st.storage.includes("lvm")) || 
                          validStorages[0];
        if (preferred) {
            datastoreSelect.value = preferred.storage;
        }
    } else if (datastoreSelect) {
        datastoreSelect.innerHTML = `<option value="local-lvm">local-lvm (${isEn ? 'Default' : 'Mặc định'})</option>`;
    }

    const nodeResourceCard = document.getElementById("nodeResourceCard");
    if (nodeResourceCard) {
        const freeMem = Math.max(0, (selectedNode.maxmem || 0) - (selectedNode.mem || 0));
        const memPct = selectedNode.maxmem ? Math.round(((selectedNode.mem || 0) / selectedNode.maxmem) * 100) : 0;
        const cpuPct = Math.round((selectedNode.cpu || 0) * 100);

        const storageBadgesHtml = validStorages.map(st => {
            const isZfs = st.storage.includes("zfs");
            const iconName = isZfs ? "database" : "hard-drive";
            return `<span class="storage-pill ${isZfs ? 'storage-pill-zfs' : 'storage-pill-lvm'}"><i data-lucide="${iconName}" class="pill-icon"></i> <strong>${st.storage}</strong>: ${window.formatBytes(st.avail)} ${isEn ? 'free' : 'trống'}</span>`;
        }).join(" ");

        nodeResourceCard.innerHTML = `
            <div class="node-resource-header">
                <span style="display:flex;align-items:center;gap:6px;"><i data-lucide="activity" class="pill-icon"></i> ${isEn ? 'Available Resources:' : 'Tài nguyên khả dụng:'} <strong>${selectedNode.node}</strong></span>
                <span class="status-indicator status-running"><span class="status-dot online"></span> ${isEn ? 'Ready' : 'Sẵn sàng'}</span>
            </div>
            <div class="node-resource-metrics">
                <div class="resource-metric-box">
                    <span class="resource-metric-title"><i data-lucide="memory-stick" style="width:12px;height:12px;"></i> ${isEn ? 'Free Memory (RAM)' : 'RAM Còn Trống'}</span>
                    <span class="resource-metric-val">${window.formatBytes(freeMem)} / ${window.formatBytes(selectedNode.maxmem)}</span>
                    <small class="text-muted" style="font-size:10px;">${isEn ? 'Used' : 'Đã dùng'} ${memPct}%</small>
                </div>
                <div class="resource-metric-box">
                    <span class="resource-metric-title"><i data-lucide="cpu" style="width:12px;height:12px;"></i> ${isEn ? 'CPU Cores & Load' : 'CPU Cores & Tải'}</span>
                    <span class="resource-metric-val">${selectedNode.maxcpu || 0} vCPU Cores</span>
                    <small class="text-muted" style="font-size:10px;">${isEn ? 'Current Load:' : 'Mức tải hiện tại:'} ${cpuPct}%</small>
                </div>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                <span>${isEn ? 'VM Datastores:' : 'Ổ Đĩa Chứa VM (Datastores):'}</span>
                <div class="resource-storage-list">${storageBadgesHtml || `<span class="text-muted">${isEn ? 'None' : 'Không có'}</span>`}</div>
            </div>
        `;
        nodeResourceCard.style.display = "flex";
        if (window.lucide) window.lucide.createIcons();
    }

    if (selectedNode.networks && selectedNode.networks.length > 0 && bridgeSelect) {
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
    }

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

    if (typeof window.renderOsSelector === "function") {
        window.renderOsSelector(allImages, selectedNode);
    } else if (allImages.length > 0 && imageSelect) {
        imageSelect.innerHTML = allImages.map(img => {
            const sizeStr = img.size ? ` - ${window.formatBytes(img.size)}` : "";
            return `<option value="${img.volid}">💿 ${img.name} (${img.storage}${sizeStr})</option>`;
        }).join("");
    } else if (imageSelect) {
        imageSelect.innerHTML = `
            <option value="local:iso/rocky-9-cloud.img">local:iso/rocky-9-cloud.img (Rocky Linux 9 Cloud)</option>
            <option value="local:iso/ubuntu-22.04-cloud.img">local:iso/ubuntu-22.04-cloud.img (Ubuntu 22.04)</option>
            <option value="local:iso/debian-12-cloud.img">local:iso/debian-12-cloud.img (Debian 12)</option>
        `;
    }
};

window.osFamilyPresets = {
    ubuntu: {
        id: "ubuntu",
        name: "Ubuntu Linux",
        keywords: ["ubuntu"],
        defaultPath: "local:iso/ubuntu-22.04-cloud.img",
        badgeId: "ubuntuVersionBadge",
        desc: "Ubuntu Server LTS Cloud-Init",
    },
    debian: {
        id: "debian",
        name: "Debian GNU/Linux",
        keywords: ["debian"],
        defaultPath: "local:iso/debian-12-cloud.img",
        badgeId: "debianVersionBadge",
        desc: "Debian 12 Bookworm / 11 Bullseye Cloud-Init",
    },
    rocky: {
        id: "rocky",
        name: "Rocky / Enterprise Linux",
        keywords: ["rocky", "almalinux", "centos", "rhel", "fedora"],
        defaultPath: "local:iso/rocky-9-cloud.img",
        badgeId: "rockyVersionBadge",
        desc: "Rocky Linux 9 / AlmaLinux 9 RHEL Compatible",
    },
    alpine: {
        id: "alpine",
        name: "Alpine Linux",
        keywords: ["alpine"],
        defaultPath: "local:iso/alpine-3.20-cloud.img",
        badgeId: "alpineVersionBadge",
        desc: "Alpine Linux 3.20 / 3.19 Lightweight",
    },
    windows: {
        id: "windows",
        name: "Windows Server / Desktop",
        keywords: ["win", "windows", "virtio"],
        defaultPath: "local:iso/Windows_Server_2022.iso",
        badgeId: "windowsVersionBadge",
        desc: "Windows Server 2022 / 2019 / Win 11 ISO",
    },
    custom: {
        id: "custom",
        name: "Custom ISO / File",
        keywords: [],
        defaultPath: "",
        badgeId: null,
        desc: "File ISO / Img Tùy Chỉnh từ Storage",
    }
};

window.cachedAvailableImages = [];
window.activeOsFamily = "ubuntu";
window.activeOsCategory = "all";

window.renderOsSelector = function(allImages, selectedNode) {
    window.cachedAvailableImages = allImages || [];
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';

    // 1. Populate raw select
    const imageSelect = document.getElementById("diskImageId");
    if (imageSelect) {
        if (allImages.length > 0) {
            imageSelect.innerHTML = allImages.map(img => {
                const sizeStr = img.size ? ` - ${window.formatBytes(img.size)}` : "";
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

    // 2. Scan available versions for each family badge
    Object.keys(window.osFamilyPresets).forEach(famKey => {
        const fam = window.osFamilyPresets[famKey];
        if (!fam.badgeId) return;
        const badgeEl = document.getElementById(fam.badgeId);
        if (!badgeEl) return;

        const matches = allImages.filter(img => {
            const low = (img.volid || "").toLowerCase();
            return fam.keywords.some(kw => low.includes(kw));
        });

        if (matches.length > 0) {
            const names = matches.map(m => m.name.replace(/\.(img|iso|qcow2|raw)$/i, '')).join(", ");
            badgeEl.textContent = `✓ ${matches.length} ${isEn ? 'found' : 'bản'}: ${names.length > 25 ? names.substring(0, 25) + '...' : names}`;
            badgeEl.style.color = "#38bdf8";
        } else {
            if (famKey === "ubuntu") badgeEl.textContent = "24.04 / 22.04 LTS";
            else if (famKey === "debian") badgeEl.textContent = "Debian 12 Bookworm";
            else if (famKey === "rocky") badgeEl.textContent = "Rocky 9 / Alma 9";
            else if (famKey === "alpine") badgeEl.textContent = "Alpine 3.20 / 3.19";
            else if (famKey === "windows") badgeEl.textContent = "Server 2022 / 2019";
            badgeEl.style.color = "#64748b";
        }
    });

    // 3. Update current active family
    window.selectOsFamily(window.activeOsFamily || "ubuntu");
};

window.selectOsFamily = function(familyKey) {
    window.activeOsFamily = familyKey;
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    const fam = window.osFamilyPresets[familyKey] || window.osFamilyPresets.ubuntu;
    const allImages = window.cachedAvailableImages || [];

    // Highlight card
    document.querySelectorAll(".os-card").forEach(card => {
        if (card.getAttribute("data-os-family") === familyKey) {
            card.classList.add("active");
        } else {
            card.classList.remove("active");
        }
    });

    const matchedTitle = document.getElementById("osMatchedTitle");
    const matchedBadge = document.getElementById("osMatchedBadge");
    const matchedDesc = document.getElementById("osMatchedDesc");
    const versionWrapper = document.getElementById("osVersionSelectorWrapper");
    const subSelect = document.getElementById("osFamilySubSelect");
    const imageSelect = document.getElementById("diskImageId");
    const rawDropdownSection = document.getElementById("rawImageDropdownSection");

    if (familyKey === "custom") {
        if (rawDropdownSection) rawDropdownSection.style.display = "block";
        if (matchedTitle) matchedTitle.textContent = isEn ? "Manual / Storage File Selection" : "Chọn File ISO / Img Tùy Chỉnh";
        if (matchedBadge && imageSelect) matchedBadge.textContent = imageSelect.value || "Custom";
        if (matchedDesc) matchedDesc.textContent = isEn ? "Choose any raw image file directly from the storage dropdown below." : "Chọn trực tiếp file bất kỳ từ danh sách Storage bên dưới.";
        if (versionWrapper) versionWrapper.style.display = "none";
        return;
    }

    // Find matches in cluster
    const matches = allImages.filter(img => {
        const low = (img.volid || "").toLowerCase();
        return fam.keywords.some(kw => low.includes(kw));
    });

    if (matches.length > 0) {
        // We have matching image(s) on the node!
        let chosen = matches[0];
        if (imageSelect && matches.some(m => m.volid === imageSelect.value)) {
            chosen = matches.find(m => m.volid === imageSelect.value);
        }

        if (imageSelect) imageSelect.value = chosen.volid;
        if (matchedTitle) matchedTitle.textContent = fam.name;
        if (matchedBadge) matchedBadge.textContent = chosen.volid;
        if (matchedDesc) matchedDesc.textContent = isEn 
            ? `✓ Auto-detected image on storage (${chosen.storage} - ${window.formatBytes(chosen.size)})` 
            : `✓ Tự động phát hiện image trên storage (${chosen.storage} - ${window.formatBytes(chosen.size)})`;

        if (matches.length > 1 && subSelect && versionWrapper) {
            subSelect.innerHTML = matches.map(m => `
                <option value="${m.volid}" ${m.volid === chosen.volid ? 'selected' : ''}>${m.name} (${m.storage})</option>
            `).join("");
            versionWrapper.style.display = "block";
            subSelect.onchange = function() {
                if (imageSelect) imageSelect.value = subSelect.value;
                if (matchedBadge) matchedBadge.textContent = subSelect.value;
            };
        } else if (versionWrapper) {
            versionWrapper.style.display = "none";
        }
    } else {
        // No match found on storage
        const defaultPath = fam.defaultPath;
        if (imageSelect) {
            if (!Array.from(imageSelect.options).some(o => o.value === defaultPath)) {
                const opt = document.createElement("option");
                opt.value = defaultPath;
                opt.textContent = `${defaultPath} (${fam.name})`;
                imageSelect.appendChild(opt);
            }
            imageSelect.value = defaultPath;
        }
        if (matchedTitle) matchedTitle.textContent = fam.name;
        if (matchedBadge) matchedBadge.textContent = defaultPath;
        if (matchedDesc) matchedDesc.textContent = isEn 
            ? `Standard template path. If image is not present on Proxmox, please upload ${fam.name} to storage.` 
            : `Đường dẫn chuẩn template. Nếu chưa có trên Proxmox, hãy tải file cài đặt ${fam.name} vào storage.`;
        if (versionWrapper) versionWrapper.style.display = "none";
    }
};

window.initOsSelector = function() {
    // 1. Filter pill tabs
    document.querySelectorAll(".os-pill-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".os-pill-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const cat = btn.getAttribute("data-os-cat");
            window.activeOsCategory = cat;

            const cards = document.querySelectorAll(".os-card");
            cards.forEach(c => {
                const cCat = c.getAttribute("data-os-cat");
                if (cat === "all" || cCat === cat || (cat === "custom" && c.getAttribute("data-os-family") === "custom")) {
                    c.style.display = "flex";
                } else {
                    c.style.display = "none";
                }
            });

            if (cat === "custom") {
                window.selectOsFamily("custom");
            }
        });
    });

    // 2. OS Cards click
    document.querySelectorAll(".os-card").forEach(card => {
        card.addEventListener("click", () => {
            const fam = card.getAttribute("data-os-family");
            if (fam) window.selectOsFamily(fam);
        });
    });

    // 3. Mode Toggle (Raw vs Simple)
    const toggleBtn = document.getElementById("osModeToggleBtn");
    const rawDropdownSection = document.getElementById("rawImageDropdownSection");
    const toggleText = document.getElementById("osModeToggleText");
    if (toggleBtn && rawDropdownSection) {
        toggleBtn.addEventListener("click", () => {
            const isHidden = rawDropdownSection.style.display === "none";
            rawDropdownSection.style.display = isHidden ? "block" : "none";
            const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
            if (toggleText) {
                toggleText.textContent = isHidden 
                    ? (isEn ? "Collapse (Quick OS selection)" : "Thu gọn (Chọn nhanh OS)")
                    : (isEn ? "Select raw file from Storage (Advanced)" : "Chọn file từ Storage (Nâng cao)");
            }
        });
    }

    // 4. Raw Image search filter
    const searchInput = document.getElementById("rawImageSearchInput");
    const imageSelect = document.getElementById("diskImageId");
    if (searchInput && imageSelect) {
        searchInput.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            Array.from(imageSelect.options).forEach(opt => {
                if (!q || opt.textContent.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)) {
                    opt.style.display = "";
                } else {
                    opt.style.display = "none";
                }
            });
        });
    }

    // 5. Image select change
    if (imageSelect) {
        imageSelect.addEventListener("change", () => {
            const val = imageSelect.value;
            const matchedBadge = document.getElementById("osMatchedBadge");
            if (matchedBadge) matchedBadge.textContent = val;
        });
    }
};

window.validateCreateVmForm = function() {
    document.querySelectorAll(".input-field-error").forEach(el => el.classList.remove("input-field-error"));
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    const count = parseInt(document.getElementById("vmCount")?.value || "1");

    const vmNameInput = document.getElementById("vmName");
    if (!vmNameInput || !vmNameInput.value.trim()) {
        window.goToStep(1);
        vmNameInput?.classList.add("input-field-error");
        setTimeout(() => {
            vmNameInput?.scrollIntoView({ behavior: "smooth", block: "center" });
            vmNameInput?.focus();
        }, 100);
        window.showToast(isEn ? "⚠️ Please enter 'VM / Instance Base Name'!" : "⚠️ Vui lòng nhập 'Tên Máy Ảo / Tiền Tố (VM Base Name)'!", "warning");
        return false;
    }

    if (count === 1) {
        const nodeSelect = document.getElementById("nodeName");
        if (!nodeSelect || !nodeSelect.value) {
            window.goToStep(2);
            nodeSelect?.classList.add("input-field-error");
            setTimeout(() => {
                nodeSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
                nodeSelect?.focus();
            }, 100);
            window.showToast(isEn ? "⚠️ Please select a 'Proxmox Node'!" : "⚠️ Vui lòng chọn 'Proxmox Node'!", "warning");
            return false;
        }

        const datastoreSelect = document.getElementById("datastoreId");
        if (!datastoreSelect || !datastoreSelect.value) {
            window.goToStep(2);
            datastoreSelect?.classList.add("input-field-error");
            setTimeout(() => {
                datastoreSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
                datastoreSelect?.focus();
            }, 100);
            window.showToast(isEn ? "⚠️ Please select a 'Target VM Datastore'!" : "⚠️ Vui lòng chọn 'Ổ Lưu Trữ VM Disk'!", "warning");
            return false;
        }
    } else {
        const checkedNodes = document.querySelectorAll("input[name='clusterNodes']:checked");
        if (checkedNodes.length === 0) {
            window.goToStep(2);
            window.showToast(isEn ? "⚠️ Please select at least one Node for cluster distribution!" : "⚠️ Vui lòng chọn ít nhất một Node để phân bổ Cluster!", "warning");
            return false;
        }
    }

    const diskImageSelect = document.getElementById("diskImageId");
    if (!diskImageSelect || !diskImageSelect.value) {
        window.goToStep(2);
        diskImageSelect?.classList.add("input-field-error");
        setTimeout(() => {
            diskImageSelect?.scrollIntoView({ behavior: "smooth", block: "center" });
            diskImageSelect?.focus();
        }, 100);
        window.showToast(isEn ? "⚠️ Please select an 'OS Image (Cloud-Init / ISO)'!" : "⚠️ Vui lòng chọn 'Image Hệ Điều Hành (Cloud-Init / ISO)'!", "warning");
        return false;
    }

    const coresInput = document.getElementById("cores");
    if (!coresInput || !coresInput.value || parseInt(coresInput.value) < 1) {
        window.goToStep(3);
        coresInput?.classList.add("input-field-error");
        setTimeout(() => {
            coresInput?.scrollIntoView({ behavior: "smooth", block: "center" });
            coresInput?.focus();
        }, 100);
        window.showToast(isEn ? "⚠️ Please specify valid 'vCPU Cores' (>= 1)!" : "⚠️ Vui lòng cung cấp số lượng 'vCPU Cores' hợp lệ (>= 1)!", "warning");
        return false;
    }

    const ramInput = document.getElementById("memoryGb");
    if (!ramInput || !ramInput.value || parseInt(ramInput.value) < 1) {
        window.goToStep(3);
        ramInput?.classList.add("input-field-error");
        setTimeout(() => {
            ramInput?.scrollIntoView({ behavior: "smooth", block: "center" });
            ramInput?.focus();
        }, 100);
        window.showToast(isEn ? "⚠️ Please specify valid 'RAM' (>= 1 GB)!" : "⚠️ Vui lòng cung cấp dung lượng 'RAM' hợp lệ (>= 1 GB)!", "warning");
        return false;
    }

    const diskInput = document.getElementById("diskSizeGb");
    if (!diskInput || !diskInput.value || parseInt(diskInput.value) < 5) {
        window.goToStep(3);
        diskInput?.classList.add("input-field-error");
        setTimeout(() => {
            diskInput?.scrollIntoView({ behavior: "smooth", block: "center" });
            diskInput?.focus();
        }, 100);
        window.showToast(isEn ? "⚠️ Please specify valid 'OS Disk' capacity (>= 5 GB)!" : "⚠️ Vui lòng cung cấp dung lượng 'Ổ Đĩa OS' hợp lệ (>= 5 GB)!", "warning");
        return false;
    }

    return true;
};

window.initWizard = function() {
    const nodeSelect = document.getElementById("nodeName");
    const vmCountInput = document.getElementById("vmCount");
    const vmNameInput = document.getElementById("vmName");
    const form = document.getElementById("createVmForm");
    const btnSubmit = document.getElementById("btnSubmit");

    if (nodeSelect) {
        nodeSelect.addEventListener("change", window.updateNodeSpecificFields);
    }
    if (vmCountInput) {
        vmCountInput.addEventListener("input", window.updateClusterPreview);
    }
    if (vmNameInput) {
        vmNameInput.addEventListener("input", window.updateClusterPreview);
    }

    function setupSyncedInput(numberId, rangeId) {
        const numInput = document.getElementById(numberId);
        const rangeInput = document.getElementById(rangeId);
        if (!numInput) return;

        if (rangeInput) {
            rangeInput.addEventListener("input", (e) => { numInput.value = e.target.value; });
            numInput.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) rangeInput.value = val;
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

    if (typeof window.initOsSelector === "function") {
        window.initOsSelector();
    }

    document.querySelectorAll("#createVmForm input, #createVmForm select").forEach(el => {
        el.addEventListener("input", () => el.classList.remove("input-field-error"));
        el.addEventListener("change", () => el.classList.remove("input-field-error"));
    });

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!window.validateCreateVmForm()) return;

            const btnText = btnSubmit?.querySelector(".btn-text");
            const spinner = btnSubmit?.querySelector(".spinner");

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
            const resourceType = formData.get("resourceType") || "qemu";

            let payload;

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
                const nodesCheckboxContainer = document.getElementById("nodesCheckboxContainer");
                let selectedNodes = [];
                if (nodesCheckboxContainer) {
                    const visibleCheckedBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']:checked");
                    selectedNodes = Array.from(visibleCheckedBoxes).map(cb => cb.value);
                    if (selectedNodes.length === 0) {
                        const visibleBoxes = nodesCheckboxContainer.querySelectorAll(".node-check-card:not([style*='display: none']) input[name='clusterNodes']");
                        selectedNodes = Array.from(visibleBoxes).map(cb => cb.value);
                    }
                }
                if (selectedNodes.length === 0 && window.cachedClusterData.length > 0) {
                    selectedNodes = [window.cachedClusterData[0].node];
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

            if (btnSubmit) btnSubmit.disabled = true;
            if (btnText) btnText.textContent = count > 1 ? `Đang khởi tạo ${count} VMs...` : "Đang khởi tạo...";
            if (spinner) spinner.classList.remove("hidden");

            try {
                const res = await fetch("/api/vms", {
                    method: "POST",
                    headers: window.getAuthHeaders(),
                    body: JSON.stringify(payload),
                });
                const result = await res.json();

                if (result.success) {
                    if (result.requiresApproval) {
                        window.showToast(result.message, "info");
                        if (typeof window.appendLog === "function") window.appendLog(`[APPROVAL QUEUE] ${result.message}`);
                        document.querySelector('.nav-tab[data-tab="tab-approvals"]')?.click();
                        if (typeof window.loadQuotasAndApprovals === "function") window.loadQuotasAndApprovals();
                    } else {
                        if (typeof window.appendLog === "function") window.appendLog(`[Portal] ${result.message}`);
                        document.querySelector('.nav-tab[data-tab="tab-logs"]')?.click();
                        setTimeout(() => { if (typeof window.loadVms === "function") window.loadVms(); }, 3000);
                    }
                } else {
                    window.showRbacAlert(`⛔ ${result.error}`);
                    if (typeof window.appendLog === "function") window.appendLog(`[Portal Error] ${result.error}`);
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi kết nối tới Server: ${err.message}`);
                if (typeof window.appendLog === "function") window.appendLog(`[Portal Error] ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
                const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
                if (btnText) btnText.textContent = isEn ? "Deploy Virtual Machine" : "Triển Khai VM";
                if (spinner) spinner.classList.add("hidden");
            }
        });
    }
};
