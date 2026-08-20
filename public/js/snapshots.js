// ==========================================
// VM SNAPSHOTS MANAGER (public/js/snapshots.js)
// ==========================================

let currentSnapshotVm = { node: "", vmid: 0, name: "" };

window.openVmSnapshots = async function(node, vmid, vmname) {
    currentSnapshotVm = { node, vmid, name: vmname };
    const snapshotModal = document.getElementById("snapshotModal");
    const snapshotModalTitle = document.getElementById("snapshotModalTitle");
    const snapNameInput = document.getElementById("snapNameInput");
    const snapDescInput = document.getElementById("snapDescInput");
    const snapVmStateInput = document.getElementById("snapVmStateInput");

    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
    if (snapshotModalTitle) {
        snapshotModalTitle.textContent = isEn 
            ? `Manage Snapshots: ${vmname || `VM #${vmid}`}` 
            : `Quản Lý Snapshots: ${vmname || `VM #${vmid}`}`;
    }
    if (snapNameInput) snapNameInput.value = `snap-${Date.now().toString().slice(-6)}`;
    if (snapDescInput) snapDescInput.value = "";
    if (snapVmStateInput) snapVmStateInput.checked = true;

    if (snapshotModal) snapshotModal.classList.remove("hidden");
    await window.loadVmSnapshots();
};

window.loadVmSnapshots = async function() {
    const snapshotListBody = document.getElementById("snapshotListBody");
    if (!snapshotListBody || !currentSnapshotVm.vmid) return;
    const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';

    snapshotListBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;"><span class="spinner" style="margin:0 auto 6px;display:block;"></span> ${isEn ? 'Loading snapshots...' : 'Đang tải danh sách snapshots...'}</td></tr>`;

    try {
        const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots`, {
            headers: window.getAuthHeaders()
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            const list = data.data.filter(s => s.name !== "current");
            if (list.length === 0) {
                snapshotListBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">${isEn ? 'No snapshots recorded yet.' : 'Chưa có bản snapshot nào.'}</td></tr>`;
                return;
            }

            snapshotListBody.innerHTML = list.map(s => {
                const timeStr = s.snaptime ? new Date(s.snaptime * 1000).toLocaleString() : "-";
                const hasRam = s.vmstate === 1 || s.vmstate === true;
                return `
                    <tr>
                        <td><strong style="font-family:'JetBrains Mono',monospace; color:#38bdf8;">${s.name}</strong></td>
                        <td style="font-size:12px; color:#cbd5e1;">${timeStr}</td>
                        <td style="font-size:12px; color:#94a3b8; max-width:200px;">${s.description || "-"}</td>
                        <td>${hasRam ? '<span class="tag-deployed"><i data-lucide="check" class="badge-svg"></i> RAM State</span>' : '<span class="text-muted" style="font-size:11px;">Disk Only</span>'}</td>
                        <td class="text-right">
                            <button class="btn-action-sm" style="border-color:rgba(56,189,248,0.3); color:#38bdf8; margin-right:4px;" onclick="rollbackVmSnapshot('${s.name}')" title="Khôi phục máy ảo về snapshot này">
                                <i data-lucide="rotate-ccw" class="btn-icon-sm"></i>
                                <span>${window.t ? window.t('snapshot.rollback_btn') : 'Khôi phục'}</span>
                            </button>
                            <button class="btn-action-sm" style="border-color:rgba(239,68,68,0.3); color:#ef4444;" onclick="deleteVmSnapshot('${s.name}')" title="Xóa vĩnh viễn snapshot này">
                                <i data-lucide="trash-2" class="btn-icon-sm"></i>
                                <span>${window.t ? window.t('snapshot.delete_btn') : 'Xóa'}</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
            if (window.lucide) window.lucide.createIcons();
        }
    } catch (err) {
        snapshotListBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger" style="padding: 20px;">Lỗi tải snapshots: ${err.message}</td></tr>`;
    }
};

window.rollbackVmSnapshot = async function(snapname) {
    if (!window.confirmDialog(`🔄 Bạn có chắc muốn KHÔI PHỤC máy ảo về bản snapshot '${snapname}' không? Các thay đổi sau thời điểm snapshot sẽ bị đảo ngược!`, `🔄 Are you sure you want to RESTORE VM to snapshot '${snapname}'? Changes made after this snapshot will be reverted!`)) {
        return;
    }

    window.showToast(`🔄 Đang khôi phục về snapshot '${snapname}'...`, "info");
    try {
        const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots/${snapname}/rollback`, {
            method: "POST",
            headers: window.getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            window.showToast(`✅ Đã khôi phục về snapshot '${snapname}' thành công!`, "success");
            await window.loadVmSnapshots();
            if (typeof window.loadClusterResources === "function") window.loadClusterResources();
        } else {
            window.showRbacAlert(`⛔ Lỗi khôi phục snapshot: ${data.error || "Không rõ nguyên nhân"}`);
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
    }
};

window.deleteVmSnapshot = async function(snapname) {
    if (!window.confirmDialog(`🗑️ Bạn có chắc muốn XÓA bản snapshot '${snapname}' không? Thao tác này không thể hoàn tác!`, `🗑️ Are you sure you want to DELETE snapshot '${snapname}'? This cannot be undone!`)) {
        return;
    }

    window.showToast(`🗑️ Đang xóa snapshot '${snapname}'...`, "info");
    try {
        const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots/${snapname}`, {
            method: "DELETE",
            headers: window.getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            window.showToast(`✅ Đã xóa snapshot '${snapname}' thành công!`, "success");
            await window.loadVmSnapshots();
        } else {
            window.showRbacAlert(`⛔ Lỗi xóa snapshot: ${data.error || "Không rõ nguyên nhân"}`);
        }
    } catch (err) {
        window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
    }
};

window.initSnapshots = function() {
    const snapshotModal = document.getElementById("snapshotModal");
    const btnCloseSnapshotModal = document.getElementById("btnCloseSnapshotModal");
    const formCreateSnapshot = document.getElementById("formCreateSnapshot");
    const snapNameInput = document.getElementById("snapNameInput");
    const snapDescInput = document.getElementById("snapDescInput");
    const snapVmStateInput = document.getElementById("snapVmStateInput");

    if (btnCloseSnapshotModal && snapshotModal) {
        btnCloseSnapshotModal.addEventListener("click", () => {
            snapshotModal.classList.add("hidden");
        });
    }

    if (formCreateSnapshot) {
        formCreateSnapshot.addEventListener("submit", async (e) => {
            e.preventDefault();
            const snapname = snapNameInput.value.trim();
            const description = snapDescInput.value.trim();
            const vmstate = snapVmStateInput.checked;
            const btnSubmit = formCreateSnapshot.querySelector("button[type='submit']");

            if (!snapname) {
                window.showToast("⚠️ Vui lòng nhập tên Snapshot!", "warning");
                return;
            }

            if (btnSubmit) btnSubmit.disabled = true;
            window.showToast(`📸 Đang tạo snapshot '${snapname}'...`, "info");

            try {
                const res = await fetch(`/api/nodes/${currentSnapshotVm.node}/vms/${currentSnapshotVm.vmid}/snapshots`, {
                    method: "POST",
                    headers: { ...window.getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ snapname, description, vmstate })
                });
                const data = await res.json();
                if (data.success) {
                    window.showToast(`✅ Tạo snapshot '${snapname}' thành công!`, "success");
                    if (snapNameInput) snapNameInput.value = `snap-${Date.now().toString().slice(-6)}`;
                    if (snapDescInput) snapDescInput.value = "";
                    await window.loadVmSnapshots();
                } else {
                    window.showRbacAlert(`⛔ Lỗi tạo snapshot: ${data.error || "Không rõ nguyên nhân"}`);
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }
};
