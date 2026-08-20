// ==========================================
// HARDWARE HOTPLUG & MULTI-DISK (public/js/hardware.js)
// ==========================================

let currentHotplugVm = null;

window.openVmHotplug = async function(node, vmid, vmname) {
    currentHotplugVm = { node, vmid, vmname };
    const hotplugModal = document.getElementById("hotplugModal");
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';

    const titleEl = document.getElementById("hotplugModalTitle");
    const subtitleEl = document.getElementById("hotplugModalSubtitle");
    if (titleEl) {
        titleEl.textContent = isEn 
            ? `Live Hotplug & Multi-Disk: ${vmname || `VM #${vmid}`}` 
            : `Cấu Hình Nóng & Đa Ổ Đĩa: ${vmname || `VM #${vmid}`}`;
    }
    if (subtitleEl) {
        subtitleEl.textContent = isEn 
            ? `Node: ${node} | VMID: ${vmid} — Live vCPU, RAM adjustments & Multi-Disk management` 
            : `Node: ${node} | VMID: ${vmid} — Thay đổi vCPU, RAM và Gắn/Mở rộng đĩa tức thời`;
    }

    if (hotplugModal) hotplugModal.classList.remove("hidden");
    await window.loadVmHardwareDetails();
};

window.loadVmHardwareDetails = async function() {
    if (!currentHotplugVm) return;
    const { node, vmid } = currentHotplugVm;
    const hotplugDisksTableBody = document.getElementById("hotplugDisksTableBody");

    if (hotplugDisksTableBody) {
        hotplugDisksTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;"><span class="spinner" style="margin:0 auto 6px;display:block;"></span> Đang đọc cấu hình phần cứng Proxmox...</td></tr>`;
    }

    try {
        const res = await fetch(`/api/nodes/${node}/vms/${vmid}/hardware`, {
            headers: window.getAuthHeaders()
        });
        const data = await res.json();
        if (!data.success) {
            window.showRbacAlert(`⛔ Lỗi tải phần cứng: ${data.error}`);
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
        const hotplugCores = document.getElementById("hotplugCores");
        const hotplugCoresRange = document.getElementById("hotplugCoresRange");
        const hotplugMemoryMb = document.getElementById("hotplugMemoryMb");
        const hotplugMemoryRange = document.getElementById("hotplugMemoryRange");
        const hotplugMemoryGbHint = document.getElementById("hotplugMemoryGbHint");

        if (hotplugCores) hotplugCores.value = hw.cores;
        if (hotplugCoresRange) hotplugCoresRange.value = hw.cores;
        if (hotplugMemoryMb) hotplugMemoryMb.value = hw.memoryMb;
        if (hotplugMemoryRange) hotplugMemoryRange.value = hw.memoryMb;
        if (hotplugMemoryGbHint) hotplugMemoryGbHint.textContent = `~ ${(hw.memoryMb / 1024).toFixed(1)} GB`;

        // 3. Render Attached Disks Table
        if (hotplugDisksTableBody) {
            const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
            if (!hw.disks || hw.disks.length === 0) {
                hotplugDisksTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">${isEn ? 'No virtual disks attached' : 'Không tìm thấy đĩa nào'}</td></tr>`;
            } else {
                hotplugDisksTableBody.innerHTML = hw.disks.map(disk => {
                    const isBoot = disk.isBoot;
                    const badgeType = isBoot
                        ? `<span class="disk-badge-boot"><i data-lucide="shield" style="width:10px;height:10px;display:inline;"></i> OS / Boot</span>`
                        : `<span class="disk-badge-data"><i data-lucide="database" style="width:10px;height:10px;display:inline;"></i> Data Disk</span>`;

                    let actions = `
                        <div style="display:flex; justify-content:flex-end; gap:6px; align-items:center;">
                            <button type="button" class="btn-action-sm" style="border-color:rgba(56,189,248,0.3); color:#38bdf8;" onclick="promptResizeDisk('${node}', ${vmid}, '${disk.slot}', '${disk.size}')" title="${window.t ? window.t('hotplug.resize_btn') : 'Mở rộng'}">
                                <i data-lucide="maximize-2" class="btn-icon-xs"></i>
                                <span>${window.t ? window.t('hotplug.resize_btn') : 'Mở rộng'}</span>
                            </button>
                    `;

                    if (!isBoot) {
                        actions += `
                            <button type="button" class="btn-danger-sm" onclick="detachSecondaryDisk('${node}', ${vmid}, '${disk.slot}')" title="${window.t ? window.t('hotplug.detach_btn') : 'Gỡ bỏ'}">
                                <i data-lucide="trash-2" class="btn-icon-xs"></i>
                                <span>${window.t ? window.t('hotplug.detach_btn') : 'Gỡ bỏ'}</span>
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

        // 4. Fill Storage Select and Slot Select
        const attachStorageSelect = document.getElementById("attachStorageSelect");
        const nodeData = (window.cachedClusterData || []).find(n => n.node === node);
        if (attachStorageSelect && nodeData && nodeData.storages) {
            attachStorageSelect.innerHTML = nodeData.storages.map(s => `<option value="${s.storage}">${s.storage} (${s.type}) - ${window.formatBytes(s.avail)} khả dụng</option>`).join("");
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
};

window.promptResizeDisk = async function(node, vmid, slot, curSize) {
    const sizeToAdd = prompt(`💾 MỞ RỘNG DUNG LƯỢNG ĐĨA [${slot}]\nDung lượng hiện tại: ${curSize}\n\nNhập dung lượng muốn TĂNG THÊM (ví dụ: +10G hoặc +50G):`, "+10G");
    if (!sizeToAdd) return;

    window.showToast(`💾 Đang mở rộng đĩa ${slot} thêm ${sizeToAdd}...`, "info");
    try {
        const res = await fetch(`/api/nodes/${node}/vms/${vmid}/disks/resize`, {
            method: "POST",
            headers: { ...window.getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ diskSlot: slot, size: sizeToAdd })
        });
        const result = await res.json();
        if (result.success) {
            window.showToast(`✅ Đã mở rộng đĩa ${slot} thành công!`, "success");
            await window.loadVmHardwareDetails();
            setTimeout(window.loadClusterResources, 1500);
        } else {
            window.showRbacAlert(`⛔ Lỗi mở rộng đĩa: ${result.error}`);
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
    }
};

window.detachSecondaryDisk = async function(node, vmid, slot) {
    if (!window.confirmDialog(`🗑️ Bạn có chắc chắn muốn GỠ BỎ ổ đĩa phụ '${slot}' khỏi máy ảo #${vmid} không?`, `🗑️ Are you sure you want to DETACH secondary disk '${slot}' from VM #${vmid}?`)) return;

    window.showToast(`💾 Đang gỡ bỏ đĩa ${slot}...`, "info");
    try {
        const res = await fetch(`/api/nodes/${node}/vms/${vmid}/disks/${slot}`, {
            method: "DELETE",
            headers: window.getAuthHeaders()
        });
        const result = await res.json();
        if (result.success) {
            window.showToast(`✅ Đã gỡ bỏ đĩa ${slot} thành công!`, "success");
            await window.loadVmHardwareDetails();
            setTimeout(window.loadClusterResources, 1500);
        } else {
            window.showRbacAlert(`⛔ Lỗi gỡ đĩa: ${result.error}`);
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
    }
};

window.initHardware = function() {
    const hotplugModal = document.getElementById("hotplugModal");
    const btnCloseHotplugModal = document.getElementById("btnCloseHotplugModal");
    const formHotplugCpuRam = document.getElementById("formHotplugCpuRam");
    const formAttachDisk = document.getElementById("formAttachDisk");
    const btnAddSecondaryDisk = document.getElementById("btnAddSecondaryDisk");
    const secondaryDisksContainer = document.getElementById("secondaryDisksContainer");

    const hotplugCores = document.getElementById("hotplugCores");
    const hotplugCoresRange = document.getElementById("hotplugCoresRange");
    const hotplugMemoryMb = document.getElementById("hotplugMemoryMb");
    const hotplugMemoryRange = document.getElementById("hotplugMemoryRange");
    const hotplugMemoryGbHint = document.getElementById("hotplugMemoryGbHint");

    // Sync sliders
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

    // Modal Sub-tabs
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

    if (btnAddSecondaryDisk && secondaryDisksContainer) {
        btnAddSecondaryDisk.addEventListener("click", () => {
            const row = document.createElement("div");
            row.className = "secondary-disk-row";

            const currentNode = document.getElementById("nodeName")?.value || "";
            const nodeData = (window.cachedClusterData || []).find(n => n.node === currentNode);
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
        });
    }

    if (formHotplugCpuRam) {
        formHotplugCpuRam.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentHotplugVm) return;

            const cores = Number(hotplugCores.value);
            const memoryMb = Number(hotplugMemoryMb.value);
            const btnSubmit = document.getElementById("btnSubmitHotplug");
            if (btnSubmit) btnSubmit.disabled = true;

            window.showToast(`⚡ Đang điều chỉnh cấu hình nóng (${cores} vCPU, ${memoryMb} MB RAM)...`, "info");

            try {
                const res = await fetch(`/api/nodes/${currentHotplugVm.node}/vms/${currentHotplugVm.vmid}/hardware/hotplug`, {
                    method: "PUT",
                    headers: { ...window.getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ cores, memoryMb })
                });
                const result = await res.json();
                if (result.success) {
                    window.showToast("✅ Đã thay đổi nóng cấu hình phần cứng thành công!", "success");
                    await window.loadVmHardwareDetails();
                    setTimeout(window.loadClusterResources, 1500);
                } else {
                    window.showRbacAlert(`⛔ Lỗi Hotplug: ${result.error}`);
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

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

            window.showToast(`💾 Đang gắn thêm đĩa ${slot} (${sizeGb} GB trên ${storage})...`, "info");

            try {
                const res = await fetch(`/api/nodes/${currentHotplugVm.node}/vms/${currentHotplugVm.vmid}/disks/attach`, {
                    method: "POST",
                    headers: { ...window.getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ storage, sizeGb, slot, discard })
                });
                const result = await res.json();
                if (result.success) {
                    window.showToast(`✅ Đã gắn đĩa ${slot} (${sizeGb} GB) thành công!`, "success");
                    await window.loadVmHardwareDetails();
                    setTimeout(window.loadClusterResources, 1500);
                } else {
                    window.showRbacAlert(`⛔ Lỗi gắn đĩa: ${result.error}`);
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }
};
