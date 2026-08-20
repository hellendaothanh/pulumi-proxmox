// ==========================================
// CONSOLE LOG STREAMER (public/js/console.js)
// ==========================================

window.formatConsoleLog = function(text, isEn) {
    if (!isEn || !text) return text;
    let str = String(text);

    // 1. Cluster Alert
    str = str.replace(/\[Cluster Alert\]\s*💾\s*Storage Pool '([^']+)'\s*\(([^)]+)\)\s*vượt ngưỡng\s*\(([^)]+)\)\s*\|\s*Giá trị:\s*([^(|]+)\s*(?:\|\s*)?\(Ngưỡng:\s*([^)]+)\)/i, 
        "[Cluster Alert] 💾 Storage Pool '$1' ($2) exceeds threshold ($3) | Value: $4 (Threshold: $5)");

    // 2. Destroy logs
    str = str.replace(/\[DESTROY\]\s*\[User:\s*([^\]]+)\]\s*Bắt đầu (?:xử lý )?xóa stack '([^']+)'\.\.\./i, 
        "[DESTROY] [User: $1] Initiating deletion for stack '$2'...");
    str = str.replace(/\[DESTROYED\]\s*Đã xóa hoàn toàn VM và stack '([^']+)'!/i, 
        "[DESTROYED] Successfully deleted VM and stack '$1'!");
    str = str.replace(/\[Portal\]\s*Đang tiến hành hủy máy ảo thuộc stack '([^']+)'\.\.\./i, 
        "[Portal] Destroying virtual machines for stack '$1'...");

    // 3. Create & Provision logs
    str = str.replace(/\[CLUSTER\]\s*\[User:\s*([^\]]+)\]\s*Bắt đầu khởi tạo cụm\s*(\d+)\s*máy ảo:\s*(.*)\.\.\./i, 
        "[CLUSTER] [User: $1] Starting provisioning of cluster with $2 VMs: $3...");
    str = str.replace(/\[CREATE\]\s*\[User:\s*([^\]]+)\]\s*Bắt đầu khởi tạo stack '([^']+)' cho máy ảo\s*(.*)\.\.\./i, 
        "[CREATE] [User: $1] Initiating provisioning for stack '$2' ($3)...");
    str = str.replace(/\[Portal\]\s*Đã nhận yêu cầu khởi tạo stack '([^']+)'.\s*Tiến trình đang chạy ngầm\.\.\./i, 
        "[Portal] Received provisioning request for stack '$1'. Background task running...");
    str = str.replace(/\[Portal\]\s*Đã nhận yêu cầu khởi tạo cụm\s*(\d+)\s*máy ảo\.\s*Tiến trình đang chạy ngầm\.\.\./i, 
        "[Portal] Received provisioning request for cluster of $1 VMs. Background task running...");
    str = str.replace(/\[PULUMI\]\s*(.*)\s*Đang khởi tạo stack '([^']+)' trên Node '([^']+)'\s*\(Storage:\s*([^)]+)\)\.\.\./i, 
        "[PULUMI] $1 Provisioning stack '$2' on Node '$3' (Storage: $4)...");
    str = str.replace(/\[PULUMI\]\s*(.*)\s*Bắt đầu (?:xử lý |hủy )?stack '([^']+)'\.\.\./i, 
        "[PULUMI] $1 Destroying stack '$2'...");
    str = str.replace(/✅\s*(.*)\s*Triển khai thành công!\s*VM ID:\s*(.*)/i, 
        "✅ $1 Deployed successfully! VM ID: $2");
    str = str.replace(/\[SUCCESS\]\s*\[([^\]]+)\]\s*Khởi tạo thành công!/i, 
        "[SUCCESS] [$1] Provisioned successfully!");
    str = str.replace(/\[DESTROY\]\s*\[([^\]]+)\]\s*Hủy máy ảo thành công!/i, 
        "[DESTROY] [$1] Virtual machine destroyed successfully!");
    str = str.replace(/❌\s*\[ERROR\]\s*(.*)\s*Thất bại:\s*(.*)/i, 
        "❌ [ERROR] $1 Failed: $2");
    str = str.replace(/\[ERROR\]\s*Lỗi khi hủy VM\s*([^:]+):\s*(.*)/i, 
        "[ERROR] Error destroying VM $1: $2");
    str = str.replace(/❌\s*\[ERROR\]\s*Không tìm thấy stack\s*([^:]+):\s*(.*)/i, 
        "❌ [ERROR] Stack not found $1: $2");

    // 4. Logins
    str = str.replace(/🔑\s*\[SSO LOGIN\]\s*Người dùng '([^']+)'\s*\(([^)]+)\)\s*đã đăng nhập qua\s*(.*)\s*\[([^\]]+)\]/i, 
        "🔑 [SSO LOGIN] User '$1' ($2) signed in via $3 [$4]");
    str = str.replace(/🔑\s*\[LOCAL LOGIN\]\s*Tài khoản '([^']+)'\s*\(([^)]+)\)\s*đăng nhập thành công\./i, 
        "🔑 [LOCAL LOGIN] Local account '$1' ($2) successfully signed in.");

    // 5. Approvals & Quota
    str = str.replace(/\[APPROVAL\]\s*✅\s*Yêu cầu '([^']+)' của '([^']+)' đã được Admin '([^']+)' phê duyệt!\s*Kích hoạt tiến trình khởi tạo\.\.\./i, 
        "[APPROVAL] ✅ Request '$1' from '$2' has been approved by Admin '$3'! Triggering provisioning...");
    str = str.replace(/\[APPROVAL\]\s*❌\s*Yêu cầu '([^']+)' của '([^']+)' đã bị Admin '([^']+)' từ chối\.\s*Lý do:\s*(.*)/i, 
        "[APPROVAL] ❌ Request '$1' from '$2' was rejected by Admin '$3'. Reason: $4");
    str = str.replace(/\[APPROVAL QUEUE\]\s*⏳\s*Người dùng '([^']+)' đã gửi yêu cầu khởi tạo\s*(\d+)\s*VM\s*\[([^\]]+)\]\.\s*Trạng thái:\s*Chờ Admin phê duyệt\./i, 
        "[APPROVAL QUEUE] ⏳ User '$1' submitted a request for $2 VM(s) [$3]. Status: Pending Admin approval.");

    // 6. Power & Snapshots
    str = str.replace(/⚡\s*\[POWER\]\s*\[User:\s*([^\]]+)\]\s*Đã gửi lệnh\s*(.*)\s*tới VM #(\d+)\s*trên Node '([^']+)'\s*\(Task ID:\s*([^)]+)\)/i, 
        "⚡ [POWER] [User: $1] Sent $2 command to VM #$3 on Node '$4' (Task ID: $5)");
    str = str.replace(/❌\s*\[POWER ERROR\]\s*Lỗi khi thực hiện lệnh nguồn '([^']+)' cho VM #(\d+):\s*(.*)/i, 
        "❌ [POWER ERROR] Failed power action '$1' on VM #$2: $3");
    str = str.replace(/📸\s*\[SNAPSHOT\]\s*\[User:\s*([^\]]+)\]\s*Đang tạo snapshot '([^']+)' cho VM #(\d+)\s*trên Node '([^']+)'\.\.\./i, 
        "📸 [SNAPSHOT] [User: $1] Creating snapshot '$2' for VM #$3 on Node '$4'...");
    str = str.replace(/✅\s*\[SNAPSHOT\]\s*Tạo snapshot '([^']+)' cho VM #(\d+)\s*hoàn tất!/i, 
        "✅ [SNAPSHOT] Created snapshot '$1' for VM #$2 successfully!");
    str = str.replace(/❌\s*\[SNAPSHOT ERROR\]\s*Lỗi khi tạo snapshot '([^']+)':\s*(.*)/i, 
        "❌ [SNAPSHOT ERROR] Error creating snapshot '$1': $2");
    str = str.replace(/🔄\s*\[SNAPSHOT\]\s*Đang khôi phục VM #(\d+)\s*về snapshot '([^']+)'\.\.\./i, 
        "🔄 [SNAPSHOT] Restoring VM #$1 to snapshot '$2'...");
    str = str.replace(/✅\s*\[SNAPSHOT\]\s*Đã khôi phục VM #(\d+)\s*về snapshot '([^']+)' thành công!/i, 
        "✅ [SNAPSHOT] Restored VM #$1 to snapshot '$2' successfully!");
    str = str.replace(/❌\s*\[SNAPSHOT ERROR\]\s*Lỗi khi rollback snapshot '([^']+)':\s*(.*)/i, 
        "❌ [SNAPSHOT ERROR] Error rolling back snapshot '$1': $2");
    str = str.replace(/🗑️\s*\[SNAPSHOT\]\s*Đang xóa snapshot '([^']+)' của VM #(\d+)\.\.\./i, 
        "🗑️ [SNAPSHOT] Deleting snapshot '$1' of VM #$2...");
    str = str.replace(/✅\s*\[SNAPSHOT\]\s*Đã xóa snapshot '([^']+)' của VM #(\d+)\s*hoàn tất!/i, 
        "✅ [SNAPSHOT] Deleted snapshot '$1' of VM #$2 successfully!");
    str = str.replace(/❌\s*\[SNAPSHOT ERROR\]\s*Lỗi khi xóa snapshot '([^']+)':\s*(.*)/i, 
        "❌ [SNAPSHOT ERROR] Error deleting snapshot '$1': $2");

    // 7. Firewall & Hotplug
    str = str.replace(/🛡️\s*\[FIREWALL\]\s*\[User:\s*([^\]]+)\]\s*Đã thêm Rule Firewall cho VM #(\d+):\s*(.*)/i, 
        "🛡️ [FIREWALL] [User: $1] Added Firewall Rule for VM #$2: $3");
    str = str.replace(/🛡️\s*\[FIREWALL\]\s*\[User:\s*([^\]]+)\]\s*Đã xóa Firewall Rule #(\d+)\s*của VM #(\d+)/i, 
        "🛡️ [FIREWALL] [User: $1] Deleted Firewall Rule #$2 of VM #$3");
    str = str.replace(/⚡\s*\[HOTPLUG\]\s*\[User:\s*([^\]]+)\]\s*Đã điều chỉnh nóng phần cứng VM #(\d+):\s*(.*)/i, 
        "⚡ [HOTPLUG] [User: $1] Live hotplugged hardware on VM #$2: $3");
    str = str.replace(/💾\s*\[DISK RESIZE\]\s*\[User:\s*([^\]]+)\]\s*Đã mở rộng đĩa\s*(\w+)\s*của VM #(\d+)\s*\(Size:\s*([^)]+)\)/i, 
        "💾 [DISK RESIZE] [User: $1] Resized disk $2 of VM #$3 (Size: $4)");
    str = str.replace(/💾\s*\[MULTI-DISK\]\s*\[User:\s*([^\]]+)\]\s*Đã gắn thêm đĩa phụ\s*(\w+)\s*\(([^)]+)\)\s*cho VM #(\d+)/i, 
        "💾 [MULTI-DISK] [User: $1] Attached secondary disk $2 ($3) to VM #$4");
    str = str.replace(/💾\s*\[MULTI-DISK\]\s*\[User:\s*([^\]]+)\]\s*Đã gỡ bỏ đĩa phụ\s*(\w+)\s*của VM #(\d+)/i, 
        "💾 [MULTI-DISK] [User: $1] Detached secondary disk $2 of VM #$3");

    // 8. Progress and System
    str = str.replace(/\[System\]\s*Đang kết nối tới máy chủ\.\.\./i, 
        "[System] Connecting to server...");
    str = str.replace(/\[System\]\s*Mất kết nối tới log stream,\s*đang thử lại sau 3s\.\.\./i, 
        "[System] Connection lost to log stream, reconnecting in 3s...");
    str = str.replace(/hoàn tất/gi, "completed");

    return str;
};

window.initConsoleStreamer = function() {
    const terminal = document.getElementById("terminal");
    const btnClearLogs = document.getElementById("btnClearLogs");
    const btnCopyLogs = document.getElementById("btnCopyLogs");
    let activeProgressLine = null;
    let progressStartTime = null;
    let progressInterval = null;
    let currentProgressAction = "Updating";

    if (btnCopyLogs) {
        btnCopyLogs.addEventListener("click", () => {
            if (!terminal) return;
            const logLines = Array.from(terminal.querySelectorAll(".terminal-line"))
                .map(el => el.textContent)
                .filter(t => t && t.trim().length > 0)
                .join("\n");

            if (!logLines || logLines.trim().length === 0) {
                window.showToast("Nhật ký đang trống!", "info");
                return;
            }

            window.copyToClipboard(logLines, btnCopyLogs);
            window.showToast("📋 Đã sao chép toàn bộ nhật ký!", "success");
        });
    }

    if (btnClearLogs) {
        btnClearLogs.addEventListener("click", () => {
            if (progressInterval) clearInterval(progressInterval);
            activeProgressLine = null;
            progressStartTime = null;
            progressInterval = null;
            currentProgressAction = "Updating";
            if (terminal) terminal.innerHTML = '<div class="terminal-line text-info">[System] Logs cleared.</div>';
        });
    }

    function cleanAnsi(str) {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    }

    window.appendLog = function(rawText) {
        if (!terminal) return;
        const isEn = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'vi') === 'en';

        // 1. Nhận diện các sự kiện tiến trình đặc biệt
        if (rawText.startsWith("PROGRESS_START:")) {
            const parts = rawText.split(":");
            const action = parts[1] || "Updating";
            currentProgressAction = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
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
            return;
        }

        if (rawText.startsWith("PROGRESS_TICK:")) {
            const parts = rawText.split(":");
            const action = parts[1] || currentProgressAction;
            const sec = parts[2] || (progressStartTime ? Math.floor((Date.now() - progressStartTime) / 1000) : "0");
            if (activeProgressLine) {
                activeProgressLine.textContent = `⏳ @ ${action}... [${sec}s]`;
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
                activeProgressLine.textContent = isEn ? `[DONE] @ ${action} completed [${finalSec}s]` : `[DONE] @ ${action} hoàn tất [${finalSec}s]`;
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

            if (trimmed.replace(/\./g, '').trim() === '') {
                if (activeProgressLine && progressStartTime) {
                    const sec = Math.floor((Date.now() - progressStartTime) / 1000);
                    activeProgressLine.textContent = `⏳ @ ${currentProgressAction}... [${sec}s]`;
                    terminal.scrollTop = terminal.scrollHeight;
                }
                continue;
            }

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

            const isCompletion = trimmed.includes("SUCCESS") || trimmed.includes("ERROR") || 
                                 trimmed.includes("DESTROYED") || trimmed.includes("FATAL") || 
                                 trimmed.includes("Outputs:") || trimmed.includes("Resources:");

            if (isCompletion && activeProgressLine) {
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                if (progressStartTime) {
                    const finalSec = Math.floor((Date.now() - progressStartTime) / 1000);
                    activeProgressLine.textContent = isEn ? `⏳ @ ${currentProgressAction} completed [${finalSec}s]` : `⏳ @ ${currentProgressAction} hoàn tất [${finalSec}s]`;
                    activeProgressLine.classList.remove("progress-updating");
                    activeProgressLine.classList.add("text-info");
                }
                activeProgressLine = null;
                progressStartTime = null;
            }

            const line = document.createElement("div");
            line.className = "terminal-line";
            if (trimmed.includes("DESTROYED") || trimmed.includes("[DESTROYED]")) {
                line.classList.add("log-destroyed-highlight");
                window.showToast("🗑️ " + trimmed.replace(/^\[DESTROYED\]\s*/, ''), "info");
                if (typeof window.loadClusterResources === "function") window.loadClusterResources();
                if (typeof window.loadVms === "function") window.loadVms();
            } else if (trimmed.includes("ERROR") || trimmed.includes("error") || trimmed.includes("failed") || trimmed.includes("❌")) {
                line.classList.add("text-error");
            } else if (trimmed.includes("SUCCESS") || trimmed.includes("created") || trimmed.includes("updated") || trimmed.includes("✅")) {
                line.classList.add("text-success");
            } else if (trimmed.includes("[System]") || trimmed.includes("[PULUMI]") || trimmed.includes("⚙️") || trimmed.includes("🚀") || trimmed.includes("🗑️")) {
                line.classList.add("text-info");
            }
            line.textContent = window.formatConsoleLog(text, isEn);
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;
        }
    };

    // Kết nối SSE
    try {
        const eventSource = new EventSource("/api/logs/stream");
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                window.appendLog(data.message);
            } catch (e) {
                window.appendLog(event.data);
            }
        };
        eventSource.onerror = () => {
            // reconnect is managed automatically by EventSource
        };
    } catch {}
};
