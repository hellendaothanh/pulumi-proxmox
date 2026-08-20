// ==========================================
// CLUSTER RESOURCE ALERTING CONTROLLER (public/js/alerts.js)
// ==========================================

window.formatAlertTitle = function(rawTitle, isEn) {
    if (!rawTitle) return "";
    let text = String(rawTitle);
    if (isEn) {
        text = text.replace(/\[VƯỢT NGƯỠNG\]\s*/i, "[THRESHOLD EXCEEDED] ");
        text = text.replace(/💾\s*Storage Pool '([^']+)'\s*\(([^)]+)\)\s*vượt ngưỡng\s*\(([^)]+)\)/i, "💾 Storage Pool '$1' ($2) exceeds threshold ($3)");
        text = text.replace(/🚨\s*Node '([^']+)'\s*cạn kiệt RAM\s*\(([^)]+)\)/i, "🚨 Node '$1' RAM capacity critical ($2)");
        text = text.replace(/⚠️\s*Node '([^']+)'\s*quá tải CPU\s*\(([^)]+)\)/i, "⚠️ Node '$1' CPU overload ($2)");
    } else {
        text = text.replace(/\[THRESHOLD EXCEEDED\]\s*/i, "[VƯỢT NGƯỠNG] ");
        text = text.replace(/💾\s*Storage Pool '([^']+)'\s*\(([^)]+)\)\s*exceeds threshold\s*\(([^)]+)\)/i, "💾 Storage Pool '$1' ($2) vượt ngưỡng ($3)");
        text = text.replace(/🚨\s*Node '([^']+)'\s*RAM capacity critical\s*\(([^)]+)\)/i, "🚨 Node '$1' cạn kiệt RAM ($2)");
        text = text.replace(/⚠️\s*Node '([^']+)'\s*CPU overload\s*\(([^)]+)\)/i, "⚠️ Node '$1' quá tải CPU ($2)");
    }
    return text;
};

window.formatAlertMessage = function(rawMsg, isEn) {
    if (!rawMsg) return "";
    let text = String(rawMsg);
    if (isEn) {
        text = text.replace(/Ổ đĩa\/Pool lưu trữ '([^']+)' trên node '([^']+)' đã đầy ([^,]+), vượt ngưỡng cho phép ([^.]+)\. Khuyến nghị dọn dẹp Snapshot cũ hoặc mở rộng LUN\/ZFS!/i, "Storage pool '$1' on node '$2' is at $3, exceeding threshold of $4. Recommended to clean up old snapshots or expand LUN/ZFS storage!");
        text = text.replace(/Dung lượng RAM trên node '([^']+)' đã sử dụng ([^,]+), vượt ngưỡng ([^.]+)\. Nguy cơ Out-Of-Memory \(OOM Killer\)!/i, "RAM capacity on node '$1' is at $2, exceeding threshold $3. Risk of Out-Of-Memory (OOM Killer)!");
        text = text.replace(/CPU trên node '([^']+)' đã chạm mức ([^,]+), vượt ngưỡng an toàn ([^.]+)\. Cần kiểm tra lại các workload hoặc scale horizontal!/i, "CPU on node '$1' reached $2, exceeding threshold $3. Please check workloads or scale horizontally!");
    } else {
        text = text.replace(/Storage pool '([^']+)' on node '([^']+)' is at ([^,]+), exceeding threshold of ([^.]+)\. Recommended to clean up old snapshots or expand LUN\/ZFS storage!/i, "Ổ đĩa/Pool lưu trữ '$1' trên node '$2' đã đầy $3, vượt ngưỡng cho phép $4. Khuyến nghị dọn dẹp Snapshot cũ hoặc mở rộng LUN/ZFS!");
        text = text.replace(/RAM capacity on node '([^']+)' is at ([^,]+), exceeding threshold ([^.]+)\. Risk of Out-Of-Memory \(OOM Killer\)!/i, "Dung lượng RAM trên node '$1' đã sử dụng $2, vượt ngưỡng $3. Nguy cơ Out-Of-Memory (OOM Killer)!");
        text = text.replace(/CPU on node '([^']+)' reached ([^,]+), exceeding threshold ([^.]+)\. Please check workloads or scale horizontally!/i, "CPU trên node '$1' đã chạm mức $2, vượt ngưỡng an toàn $3. Cần kiểm tra lại các workload hoặc scale horizontal!");
    }
    return text;
};

window.loadClusterAlerts = async function() {
    try {
        const res = await fetch("/api/alerts", { credentials: "omit" });
        if (!res.ok) return;
        const resJson = await res.json();
        if (!resJson.success || !resJson.data) return;

        const { thresholds, activeAlerts, recentHistory, activeCount } = resJson.data;
        const headerAlertBadgeCount = document.getElementById("headerAlertBadgeCount");
        const modalActiveAlertBadge = document.getElementById("modalActiveAlertBadge");
        const clusterAlertBanner = document.getElementById("clusterAlertBanner");
        const alertBannerTitle = document.getElementById("alertBannerTitle");
        const alertBannerDetails = document.getElementById("alertBannerDetails");
        const activeAlertSummaryText = document.getElementById("activeAlertSummaryText");
        const activeAlertsContainer = document.getElementById("activeAlertsContainer");
        const alertHistoryTableBody = document.getElementById("alertHistoryTableBody");

        // 1. Cập nhật Badge chuông thông báo
        if (headerAlertBadgeCount) {
            if (activeCount > 0) {
                headerAlertBadgeCount.textContent = activeCount;
                headerAlertBadgeCount.classList.remove("hidden");
            } else {
                headerAlertBadgeCount.classList.add("hidden");
            }
        }

        if (modalActiveAlertBadge) {
            if (activeCount > 0) {
                modalActiveAlertBadge.textContent = activeCount;
                modalActiveAlertBadge.classList.remove("hidden");
            } else {
                modalActiveAlertBadge.classList.add("hidden");
            }
        }

        // 2. Cập nhật Sticky Alert Banner
        if (clusterAlertBanner) {
            if (activeCount > 0) {
                clusterAlertBanner.classList.remove("hidden");
                const hasCritical = activeAlerts.some(a => a.severity === "CRITICAL");
                if (hasCritical) {
                    clusterAlertBanner.classList.add("alert-critical");
                } else {
                    clusterAlertBanner.classList.remove("alert-critical");
                }

                const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
                if (alertBannerTitle) {
                    alertBannerTitle.textContent = isEn 
                        ? `🚨 ${activeCount} cluster resource threshold alert(s) detected!`
                        : `🚨 Phát hiện ${activeCount} cảnh báo ngưỡng tài nguyên cụm!`;
                }
                if (alertBannerDetails) {
                    const summaries = activeAlerts.map(a => `${a.resourceName} (${a.currentValue}${a.unit} ≥ ${a.thresholdValue}${a.unit})`).join(" • ");
                    alertBannerDetails.textContent = summaries;
                }
            } else {
                clusterAlertBanner.classList.add("hidden");
            }
        }

        // 3. Render danh sách Active Alerts trong Modal
        const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';
        if (activeAlertSummaryText) {
            activeAlertSummaryText.textContent = activeCount > 0
                ? (isEn ? `Currently ${activeCount} resource(s) exceed safe monitoring thresholds:` : `Hiện có ${activeCount} tài nguyên đang vượt ngưỡng giám sát an toàn:`)
                : (isEn ? `✅ All cluster resources are currently within safe limits (Storage < ${thresholds.storagePercent}%, CPU < ${thresholds.cpuPercent}%, RAM < ${thresholds.ramPercent}%).` : `✅ Toàn bộ tài nguyên trong cụm đang ở mức an toàn (Storage < ${thresholds.storagePercent}%, CPU < ${thresholds.cpuPercent}%, RAM < ${thresholds.ramPercent}%).`);
        }

        if (activeAlertsContainer) {
            if (activeCount === 0) {
                activeAlertsContainer.innerHTML = `
                    <div class="card text-center text-muted" style="padding: 28px 16px;">
                        <i data-lucide="shield-check" style="width: 36px; height: 36px; color: #22c55e; margin: 0 auto 10px; display: block;"></i>
                        <h4 style="color: #f8fafc; font-size: 14px; margin-bottom: 4px;">${isEn ? 'Infrastructure Operating Normally' : 'Hạ Tầng Hoạt Động Bình Thường'}</h4>
                        <p style="font-size: 12px; margin: 0;">${isEn ? `No storage pools exceed ${thresholds.storagePercent}% or overloaded nodes.` : `Không có Storage Pool nào vượt quá ${thresholds.storagePercent}% hoặc Node bị quá tải.`}</p>
                    </div>
                `;
            } else {
                activeAlertsContainer.innerHTML = activeAlerts.map(alert => {
                    const isCritical = alert.severity === "CRITICAL";
                    const timeStr = new Date(alert.timestamp).toLocaleTimeString();
                    const localizedTitle = window.formatAlertTitle(alert.title, isEn);
                    const localizedMsg = window.formatAlertMessage(alert.message, isEn);

                    return `
                        <div class="alert-card-item ${isCritical ? 'alert-critical' : 'alert-warning'}">
                            <div class="alert-card-info">
                                <div class="alert-card-title">
                                    <span>${isCritical ? '🚨' : '⚠️'}</span>
                                    <span>${localizedTitle}</span>
                                    <span class="badge-storage-danger">${alert.severity}</span>
                                </div>
                                <div class="alert-card-desc">${localizedMsg}</div>
                                <div class="alert-card-meta">
                                    <span><i data-lucide="server" style="width:12px;height:12px;display:inline;"></i> Node: <strong>${alert.node}</strong></span>
                                    <span><i data-lucide="clock" style="width:12px;height:12px;display:inline;"></i> ${isEn ? 'Detected:' : 'Phát hiện:'} ${timeStr}</span>
                                </div>
                            </div>
                            <div class="alert-card-actions">
                                <button class="btn-dismiss-alert" onclick="dismissClusterAlert('${alert.id}')" title="${isEn ? 'Dismiss this alert' : 'Ẩn cảnh báo này'}">
                                    <i data-lucide="check" class="btn-icon-xs"></i> ${isEn ? 'Dismiss' : 'Đã xem'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }

        // 4. Render Alert History
        if (alertHistoryTableBody) {
            if (!recentHistory || recentHistory.length === 0) {
                alertHistoryTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">${isEn ? 'No alert history recorded yet' : 'Chưa có lịch sử cảnh báo nào được ghi nhận'}</td></tr>`;
            } else {
                alertHistoryTableBody.innerHTML = recentHistory.map(hist => {
                    const timeStr = new Date(hist.timestamp).toLocaleString();
                    const isResolved = hist.status === "RESOLVED";
                    const isDismissed = hist.status === "DISMISSED";
                    let statusBadge = `<span class="badge-storage-danger">ACTIVE</span>`;
                    if (isResolved) {
                        statusBadge = `<span class="tag-deployed"><i data-lucide="check-circle" class="badge-svg"></i> RESOLVED</span>`;
                    } else if (isDismissed) {
                        statusBadge = `<span class="badge-optional">DISMISSED</span>`;
                    }

                    return `
                        <tr>
                            <td style="font-size:11.5px; color:#94a3b8;">${timeStr}</td>
                            <td><strong>${hist.resourceName}</strong></td>
                            <td><code>${hist.node}</code></td>
                            <td><strong style="color:${hist.currentValue >= hist.thresholdValue ? '#ef4444' : '#22c55e'}">${hist.currentValue}${hist.unit}</strong> (${isEn ? 'Threshold' : 'Ngưỡng'}: ${hist.thresholdValue}${hist.unit})</td>
                            <td><span class="tag-env tag-env-${hist.severity === 'CRITICAL' ? 'pro' : 'stag'}">${hist.severity}</span></td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                }).join("");
            }
        }

        // 5. Fill Config Inputs
        const cfgStorageThreshold = document.getElementById("cfgStorageThreshold");
        const cfgCpuThreshold = document.getElementById("cfgCpuThreshold");
        const cfgRamThreshold = document.getElementById("cfgRamThreshold");
        const cfgCheckInterval = document.getElementById("cfgCheckInterval");
        const cfgTelegramEnabled = document.getElementById("cfgTelegramEnabled");
        const cfgTelegramBotToken = document.getElementById("cfgTelegramBotToken");
        const cfgTelegramChatId = document.getElementById("cfgTelegramChatId");
        const cfgWebhookEnabled = document.getElementById("cfgWebhookEnabled");
        const cfgWebhookUrl = document.getElementById("cfgWebhookUrl");

        if (thresholds) {
            if (cfgStorageThreshold) cfgStorageThreshold.value = thresholds.storagePercent || 85;
            if (cfgCpuThreshold) cfgCpuThreshold.value = thresholds.cpuPercent || 85;
            if (cfgRamThreshold) cfgRamThreshold.value = thresholds.ramPercent || 85;
            if (cfgCheckInterval) cfgCheckInterval.value = thresholds.checkIntervalSec || 30;
            if (cfgTelegramEnabled) cfgTelegramEnabled.checked = !!thresholds.telegramEnabled;
            if (cfgTelegramBotToken && thresholds.telegramBotToken) cfgTelegramBotToken.value = thresholds.telegramBotToken;
            if (cfgTelegramChatId && thresholds.telegramChatId) cfgTelegramChatId.value = thresholds.telegramChatId;
            if (cfgWebhookEnabled) cfgWebhookEnabled.checked = !!thresholds.webhookEnabled;
            if (cfgWebhookUrl && thresholds.webhookUrl) cfgWebhookUrl.value = thresholds.webhookUrl;
        }

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error("[Cluster Alert] Error loading alerts:", err);
    }
};

window.dismissClusterAlert = async function(alertId) {
    try {
        await fetch("/api/alerts/dismiss", {
            method: "POST",
            headers: { ...window.getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ id: alertId })
        });
        window.showToast("✅ Đã tắt cảnh báo.", "info");
        await window.loadClusterAlerts();
    } catch (e) {
        window.showToast("⛔ Không thể tắt cảnh báo.", "error");
    }
};

window.initAlerts = function() {
    const clusterAlertBanner = document.getElementById("clusterAlertBanner");
    const btnBannerViewAlerts = document.getElementById("btnBannerViewAlerts");
    const btnDismissAlertBanner = document.getElementById("btnDismissAlertBanner");
    const btnOpenAlertsModal = document.getElementById("btnOpenAlertsModal");
    const alertManagerModal = document.getElementById("alertManagerModal");
    const btnCloseAlertModal = document.getElementById("btnCloseAlertModal");

    const formAlertConfig = document.getElementById("formAlertConfig");
    const cfgStorageThreshold = document.getElementById("cfgStorageThreshold");
    const cfgCpuThreshold = document.getElementById("cfgCpuThreshold");
    const cfgRamThreshold = document.getElementById("cfgRamThreshold");
    const cfgCheckInterval = document.getElementById("cfgCheckInterval");
    const cfgTelegramEnabled = document.getElementById("cfgTelegramEnabled");
    const cfgTelegramBotToken = document.getElementById("cfgTelegramBotToken");
    const cfgTelegramChatId = document.getElementById("cfgTelegramChatId");
    const cfgWebhookEnabled = document.getElementById("cfgWebhookEnabled");
    const cfgWebhookUrl = document.getElementById("cfgWebhookUrl");
    const btnTestAlertNotification = document.getElementById("btnTestAlertNotification");
    const btnManualCheckAlerts = document.getElementById("btnManualCheckAlerts");

    if (btnOpenAlertsModal && alertManagerModal) {
        btnOpenAlertsModal.addEventListener("click", () => {
            alertManagerModal.classList.remove("hidden");
            window.loadClusterAlerts();
        });
    }

    if (btnBannerViewAlerts && alertManagerModal) {
        btnBannerViewAlerts.addEventListener("click", () => {
            alertManagerModal.classList.remove("hidden");
            window.loadClusterAlerts();
        });
    }

    if (btnCloseAlertModal && alertManagerModal) {
        btnCloseAlertModal.addEventListener("click", () => {
            alertManagerModal.classList.add("hidden");
        });
    }

    if (btnDismissAlertBanner && clusterAlertBanner) {
        btnDismissAlertBanner.addEventListener("click", () => {
            clusterAlertBanner.classList.add("hidden");
        });
    }

    // Modal Sub-tabs Switching
    document.querySelectorAll(".modal-sub-tab").forEach(tabBtn => {
        tabBtn.addEventListener("click", () => {
            const targetPaneId = tabBtn.getAttribute("data-alert-tab");
            document.querySelectorAll(".modal-sub-tab").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".alert-tab-pane").forEach(p => p.classList.remove("active"));

            tabBtn.classList.add("active");
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) targetPane.classList.add("active");
            if (window.lucide) window.lucide.createIcons();
        });
    });

    if (btnManualCheckAlerts) {
        btnManualCheckAlerts.addEventListener("click", async () => {
            window.showToast("🔍 Đang quét tức thời tài nguyên cụm...", "info");
            try {
                const res = await fetch("/api/alerts/check", {
                    method: "POST",
                    headers: window.getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    window.showToast(`✅ Quét hoàn tất! ${data.data.activeCount} cảnh báo hoạt động.`, "success");
                    await window.loadClusterAlerts();
                    if (window.cachedClusterData && window.cachedClusterData.length > 0 && typeof window.renderClusterView === "function") {
                        window.renderClusterView(window.cachedClusterData);
                    }
                }
            } catch (err) {
                window.showToast(`⛔ Lỗi: ${err.message}`, "error");
            }
        });
    }

    if (btnTestAlertNotification) {
        btnTestAlertNotification.addEventListener("click", async () => {
            btnTestAlertNotification.disabled = true;
            window.showToast("🚀 Đang gửi thông báo thử nghiệm tới Telegram & Webhook...", "info");
            try {
                const res = await fetch("/api/alerts/test", {
                    method: "POST",
                    headers: window.getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    window.showToast(`🔔 Kết quả: ${data.data.details}`, "success");
                    await window.loadClusterAlerts();
                } else {
                    window.showRbacAlert(`⛔ Lỗi Test Alert: ${data.error}`);
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi: ${err.message}`);
            } finally {
                btnTestAlertNotification.disabled = false;
            }
        });
    }

    if (formAlertConfig) {
        formAlertConfig.addEventListener("submit", async (e) => {
            e.preventDefault();
            const storagePercent = Number(cfgStorageThreshold.value) || 85;
            const cpuPercent = Number(cfgCpuThreshold.value) || 85;
            const ramPercent = Number(cfgRamThreshold.value) || 85;
            const checkIntervalSec = Number(cfgCheckInterval.value) || 30;
            const telegramEnabled = !!cfgTelegramEnabled.checked;
            const telegramBotToken = cfgTelegramBotToken.value.trim();
            const telegramChatId = cfgTelegramChatId.value.trim();
            const webhookEnabled = !!cfgWebhookEnabled.checked;
            const webhookUrl = cfgWebhookUrl.value.trim();

            const btnSave = document.getElementById("btnSaveAlertConfig");
            if (btnSave) btnSave.disabled = true;
            window.showToast("⚙️ Đang lưu cấu hình cảnh báo ngưỡng...", "info");

            try {
                const res = await fetch("/api/alerts/config", {
                    method: "POST",
                    headers: { ...window.getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({
                        storagePercent,
                        cpuPercent,
                        ramPercent,
                        checkIntervalSec,
                        telegramEnabled,
                        telegramBotToken,
                        telegramChatId,
                        webhookEnabled,
                        webhookUrl
                    })
                });
                const result = await res.json();
                if (result.success) {
                    window.showToast("✅ Đã lưu cấu hình Cảnh Báo Ngưỡng thành công!", "success");
                    await window.loadClusterAlerts();
                    if (window.cachedClusterData && window.cachedClusterData.length > 0 && typeof window.renderClusterView === "function") {
                        window.renderClusterView(window.cachedClusterData);
                    }
                } else {
                    window.showRbacAlert(`⛔ Lỗi lưu cấu hình: ${result.error}`);
                }
            } catch (err) {
                window.showRbacAlert(`⛔ Lỗi kết nối: ${err.message}`);
            } finally {
                if (btnSave) btnSave.disabled = false;
            }
        });
    }
};
