// ==========================================
// PROXMOX VE SELF-SERVICE PORTAL - I18N SYSTEM
// ==========================================

(function() {
    const translations = {
        vi: {
            // Header & Navigation
            "app.title": "Proxmox Cluster Explorer",
            "app.subtitle": "IaC & Operations",
            "nav.cluster": "Tài Nguyên Cụm",
            "nav.create": "Khởi Tạo VM",
            "nav.logs": "Live Console",
            "nav.approvals": "Phê Duyệt & Quota",
            "nav.audit": "Audit Logs",
            "header.online": "Trực tuyến",
            "header.role.admin": "Admin",
            "header.role.dev": "Developer",
            "header.role.viewer": "Viewer",
            "header.change_password": "Đổi mật khẩu tài khoản",
            "header.logout": "Đăng xuất khỏi hệ thống",
            "header.alerts": "Trung tâm Cảnh Báo Ngưỡng Tài Nguyên (Cluster Alerting)",
            "header.back_to_top": "Lên đầu trang",

            // Cluster Alert Notification Banner
            "alert.banner_title": "⚠️ Phát hiện cảnh báo vượt ngưỡng tài nguyên cụm!",
            "alert.banner_details": "Storage Pool hoặc Node đang hoạt động ở mức tải cao (≥ 85%).",
            "alert.banner_btn": "Chi Tiết & Cấu Hình",
            "alert.banner_dismiss": "Tạm đóng banner",

            // Login Modal
            "login.title": "Xác Thực & Đăng Nhập",
            "login.subtitle": "Đăng nhập tập trung để quản trị hạ tầng Proxmox VE",
            "login.sso_title": "ĐĂNG NHẬP TẬP TRUNG (SSO / OIDC):",
            "login.sso_google": "Google Workspace",
            "login.sso_github": "GitHub SSO",
            "login.sso_oidc": "Keycloak / Authelia OIDC",
            "login.sso_setup_needed": "Chưa kích hoạt",
            "login.sso_active": "Hoạt động",
            "login.or_local": "HOẶC TÀI KHOẢN NỘI BỘ (BREAK-GLASS)",
            "login.quick_accounts": "Tài khoản truy cập nhanh (Demo RBAC):",
            "login.admin_role": "Administrator",
            "login.dev_role": "Dev (Chỉ DEV)",
            "login.viewer_role": "Viewer (Chỉ xem)",
            "login.username": "Tên đăng nhập",
            "login.username_placeholder": "Nhập username...",
            "login.password": "Mật khẩu",
            "login.password_placeholder": "Nhập mật khẩu...",
            "login.submit": "Đăng Nhập",
            "login.error_default": "Tên đăng nhập hoặc mật khẩu không chính xác!",

            // Change Password Modal
            "password.title": "Đổi Mật Khẩu Tài Khoản",
            "password.current": "Mật Khẩu Hiện Tại",
            "password.current_placeholder": "Nhập mật khẩu hiện tại...",
            "password.new": "Mật Khẩu Mới",
            "password.new_placeholder": "Nhập mật khẩu mới (>= 4 ký tự)...",
            "password.confirm": "Xác Nhận Mật Khẩu Mới",
            "password.confirm_placeholder": "Nhập lại mật khẩu mới...",
            "password.cancel": "Hủy",
            "password.submit": "Cập Nhật Mật Khẩu",

            // Cluster Overview (Tab 1)
            "cluster.title": "Tổng Quan Tài Nguyên Hạ Tầng",
            "cluster.subtitle": "Theo dõi thời gian thực về Node IP, Local & LVM & ZFS Storage, ISO Images và danh sách toàn bộ VM",
            "cluster.search_placeholder": "Tìm kiếm VM (Tên, ID, IP, Tag, Node)...",
            "cluster.refresh_btn": "Cập Nhật Dữ Liệu",
            "cluster.loading": "Đang kết nối và quét tài nguyên cụm Proxmox...",
            "cluster.scanning": "Đang quét thông tin Nodes, Storages, Images và VM từ Proxmox API...",
            "cluster.node_index": "Mục Lục Node",
            "cluster.expand_all": "Mở tất cả",
            "cluster.collapse_all": "Thu gọn",
            "cluster.running": "Đang chạy",
            "cluster.total": "Tổng số",
            "cluster.node_cpu": "CPU Sử Dụng",
            "cluster.node_ram": "RAM Đã Dùng",
            "cluster.node_uptime": "Thời Gian Chạy",
            "cluster.node_storage": "Ổ Lưu Trữ",
            "cluster.storages_section": "Storages & Disks (Local / LVM / ZFS)",
            "cluster.vms_list": "Danh Sách Máy Ảo",
            "cluster.table.vmid": "Máy Ảo & ID",
            "cluster.table.type": "Loại",
            "cluster.table.specs": "Cấu Hình",
            "cluster.table.ip": "Địa Chỉ IP",
            "cluster.table.status": "Trạng Thái",
            "cluster.table.actions": "Thao Tác Nhanh",
            "cluster.no_vms": "Không có máy ảo nào trên node này",
            "cluster.no_files": "(Không có file hoặc không hỗ trợ đọc content)",
            "cluster.node_not_found": "Không tìm thấy máy ảo hoặc Node phù hợp",
            "cluster.no_search_results": "Không có kết quả nào khớp với từ khóa \"{0}\". Thử tìm theo Tên VM, VM ID, IP hoặc Tags.",
            "cluster.storage_avail": "Khả dụng:",
            "cluster.storage_view_files": "Xem Files",
            "cluster.storage_danger_badge": "🚨 Vượt ngưỡng ({0}% ≥ {1}%)",

            // VM Details Modal
            "vm_detail.title": "Chi Tiết Cấu Hình Máy Ảo",
            "vm_detail.status": "Trạng Thái Hoạt Động",
            "vm_detail.ram": "RAM Đã Gán",
            "vm_detail.disk": "Dung Lượng Ổ Đĩa (Disk Size)",
            "vm_detail.ip": "Địa Chỉ IP (Agent)",
            "vm_detail.no_ip": "Chưa có IP (Cần QEMU Guest Agent)",
            "vm_detail.boot_disk": "Ổ Đĩa Khởi Động (Boot)",
            "vm_detail.raw_config": "Toàn Bộ Cấu Hình Gốc (Proxmox Config Raw)",

            // Action Buttons
            "action.start": "Bật nguồn",
            "action.shutdown": "Tắt nguồn an toàn (ACPI Shutdown)",
            "action.stop": "Tắt nóng (Force Stop)",
            "action.reboot": "Khởi động lại an toàn (Reboot)",
            "action.config": "Cấu hình",
            "action.config_tooltip": "Cấu hình nóng vCPU, RAM & Quản lý đĩa",
            "action.firewall": "Firewall",
            "action.snapshot": "Snapshot",
            "action.console": "Console",
            "action.details": "Chi tiết",
            "action.delete": "Xóa Máy Ảo",
            "action.copy_ip": "Sao chép IP",
            "action.read_only": "Chỉ xem",

            // Provisioning Wizard (Tab 2)
            "wizard.title": "Khởi Tạo Máy Ảo Mới",
            "wizard.subtitle": "Cấu hình tài nguyên và tự động provision qua Pulumi Engine",
            "wizard.step1.title": "Thông Tin Cơ Bản & Môi Trường",
            "wizard.step1.workload_type": "Loại Tài Nguyên Triển Khai (Workload Type)",
            "wizard.step1.qemu_desc": "Hệ điều hành đầy đủ, Kernel riêng, Cloud-Init",
            "wizard.step1.lxc_desc": "Siêu nhẹ, khởi động tức thì, tiết kiệm RAM/CPU",
            "wizard.step1.vm_name": "Tên Máy Ảo / Tiền Tố (Instance Base Name)",
            "wizard.step1.vm_name_placeholder": "vd: ubuntu-server, db-master, redis-node...",
            "wizard.step1.count": "Số Lượng",
            "wizard.step1.next": "Tiếp theo: Chọn Node & Image",

            "wizard.step2.title": "Node, Lưu Trữ & Hệ Điều Hành",
            "wizard.step2.node": "Proxmox Node",
            "wizard.step2.loading_nodes": "Đang tải danh sách Node từ API...",
            "wizard.step2.choose_node_first": "Chọn Node trước...",
            "wizard.step2.datastore": "Ổ Lưu Trữ VM Disk",
            "wizard.step2.multi_node": "Phân Bổ Cụm Node (Round-Robin)",
            "wizard.step2.filter_all": "Tất Cả",
            "wizard.step2.preview_title": "Xem trước danh sách phân bổ máy ảo:",
            "wizard.step2.os_image": "Image Hệ Điều Hành (Cloud-Init / ISO)",
            "wizard.step2.image": "Image Hệ Điều Hành (Cloud-Init / ISO)",
            "wizard.os.advanced_toggle": "Chọn file từ Storage (Nâng cao)",
            "wizard.os.simple_toggle": "Thu gọn (Chọn nhanh OS)",
            "wizard.os.tab_all": "⭐ Tất Cả OS Phổ Biến",
            "wizard.os.tab_linux": "🐧 Linux (Cloud-Init)",
            "wizard.os.tab_windows": "🪟 Windows Server / Desktop",
            "wizard.os.tab_custom": "📁 Chọn File ISO / Img Thủ Công",
            "wizard.os.custom_title": "File ISO / Img Tùy Chỉnh",
            "wizard.os.custom_tag": "Chọn file bất kỳ từ Storage",
            "wizard.os.custom_sub": "Tất cả định dạng ISO/QCOW2",
            "wizard.os.raw_desc": "Hoặc chọn trực tiếp tên file từ Storage Pool:",
            "wizard.os.search_placeholder": "🔍 Lọc nhanh tên file...",
            "wizard.os.auto_detected": "Tự động phát hiện image Cloud-Init chuẩn trên Proxmox Storage.",
            "wizard.os.no_match": "Chưa có file image sẵn trên Node. Sử dụng template chuẩn:",
            "wizard.os.images_found": "bản có sẵn",
            "wizard.step2.catalog_title": "Hoặc chọn Ứng Dụng Dựng Sẵn (1-Click App Catalog):",
            "wizard.step2.next": "Tiếp theo: Phần Cứng & Mạng",

            "wizard.step3.title": "Tài Nguyên Phần Cứng & Mạng",
            "wizard.step3.templates_title": "Mẫu cấu hình nhanh (Hardware Templates):",
            "wizard.step3.presets_title": "Mẫu cấu hình nhanh (Hardware Templates):",
            "wizard.step3.cpu_cores": "vCPU Cores",
            "wizard.step3.cores": "vCPU Cores",
            "wizard.step3.ram_gb": "RAM (GB)",
            "wizard.step3.ram": "RAM (GB)",
            "wizard.step3.os_disk": "Ổ Đĩa OS",
            "wizard.step3.disk": "Ổ Đĩa OS",
            "wizard.step3.sec_disks_title": "Ổ Đĩa Phụ Mở Rộng (Secondary Disks):",
            "wizard.step3.secondary_disks": "Ổ Đĩa Phụ Mở Rộng (Secondary Disks):",
            "wizard.step3.add_disk_btn": "+ Thêm Đĩa Phụ",
            "wizard.step3.add_disk": "+ Thêm Đĩa Phụ",
            "wizard.step3.secondary_hint": "💡 Bạn có thể gắn thêm các ổ đĩa dữ liệu phụ trên các Storage Pool khác nhau (ví dụ: OS trên NVMe/local-lvm, Data trên ZFS/HDD).",
            "wizard.step3.bridge": "Network Bridge",
            "wizard.step3.bridge_default": "vmbr0 (Mặc định)",
            "wizard.step3.vlan": "VLAN Tag",
            "wizard.step3.vlan_placeholder": "vd: 10, 20... (Untagged)",
            "wizard.step3.next": "Tiếp theo: Tùy Chọn & Scripts",

            "wizard.step4.title": "Tự Động Hóa & Tùy Chọn Nâng Cao",
            "wizard.step4.tags": "Tags Phân Loại",
            "wizard.step4.tags_placeholder": "vd: database, backend, k8s",
            "wizard.step4.cpu_type": "Kiến Trúc CPU",
            "wizard.step4.cpu_host_opt": "Host Passthrough (Tối ưu)",
            "wizard.step4.ssh_key": "SSH Public Key (Root Passwordless)",
            "wizard.step4.app_catalog_title": "Thư Viện Ứng Dụng Hoàn Chỉnh (1-Click App Catalog)",
            "wizard.step4.app_catalog_badge": "Tự động cài đặt & cấu hình",
            "wizard.step4.cloud_init_title": "Script Cấu Hình Khởi Động (Cloud-Init / Post-Boot)",
            "wizard.step4.presets_label": "Mẫu nhanh:",
            "wizard.step4.clear_script": "Xóa script",
            "wizard.step4.script_placeholder": "#cloud-config hoặc script #!/bin/bash...",
            "wizard.step4.package_upgrade": "Tự động cập nhật gói hệ thống (Package Upgrade)",
            "wizard.step4.protection_mode": "Bật chế độ bảo vệ chống xóa (VM Protection Mode)",
            "wizard.nav.back": "Quay lại",
            "wizard.submit_btn": "Triển Khai VM",

            // Catalog Descs
            "catalog.postgres_desc": "Cơ sở dữ liệu SQL, tự tạo user & db",
            "catalog.redis_desc": "Cache & Sentinel, tối ưu bộ nhớ",
            "catalog.minio_desc": "Lưu trữ S3 tương thích & Web Console",
            "catalog.k3s_desc": "Cụm Kubernetes K3s siêu nhẹ",

            "wizard.summary.title": "Tóm Tắt Cấu Hình Triển Khai",
            "wizard.summary.env": "Môi trường:",
            "wizard.summary.node": "Node đích:",
            "wizard.summary.os": "Hệ điều hành:",
            "wizard.summary.specs": "Cấu hình:",
            "wizard.summary.network": "Mạng:",
            "wizard.summary.secondary": "Đĩa phụ:",
            "wizard.summary.cloudinit": "Cloud-Init:",

            // Stacks Management (Tab 2 Right Panel)
            "stacks.title": "Máy Ảo Quản Lý Bởi Pulumi",
            "stacks.subtitle": "Các Stack độc lập được đồng bộ với Proxmox",
            "stacks.refresh_btn": "Làm Mới",
            "stacks.refresh": "Làm Mới",
            "stacks.table.name": "Tên VM & Stack",
            "stacks.table.env": "Môi Trường & Tags",
            "stacks.table.node": "Node",
            "stacks.table.vmid": "VM ID",
            "stacks.table.ip": "Địa Chỉ IP",
            "stacks.table.status": "Trạng Thái",
            "stacks.table.actions": "Thao Tác",
            "stacks.loading": "Đang tải danh sách máy ảo...",
            "stacks.empty": "Chưa có VM nào được triển khai qua Portal",
            "stacks.waiting_agent": "Chờ Agent...",

            // Terminal Console (Tab 3)
            "logs.title": "Nhật Ký Triển Khai Pulumi Automation",
            "logs.subtitle": "Luồng output trực tiếp từ tiến trình Engine theo thời gian thực (SSE)",
            "logs.waiting": "Đang chờ kích hoạt lệnh từ Portal...",
            "logs.copy": "Sao chép log",
            "logs.copy_btn": "Sao chép log",
            "logs.clear": "Xóa log",
            "logs.clear_btn": "Xóa log",
            "logs.copy": "Sao chép log",
            "logs.clear": "Xóa log",

            // Live Console Web noVNC Modal
            "console.title": "Proxmox Live Web Console (noVNC)",
            "console.subtitle": "Truy cập trực tiếp shell máy ảo qua trình duyệt",
            "console.open_new_tab": "Mở tab mới",
            "console.close": "Đóng",

            // Hotplug Hardware & Multi-Disk Modal
            "hotplug.title": "Cấu Hình Nóng (Hotplug Hardware) & Đa Ổ Đĩa",
            "hotplug.subtitle": "Điều chỉnh trực tiếp vCPU, RAM & Gắn thêm ổ đĩa không cần reboot",
            "hotplug.tab_cpuram": "Thay Đổi Nóng CPU & RAM",
            "hotplug.tab_disks": "Quản Lý Đĩa & Mở Rộng Dung Lượng",
            "hotplug.cur_specs": "Thông Số Hiện Tại Của Máy Ảo:",
            "hotplug.cur_cpu": "vCPU hiện tại:",
            "hotplug.cur_ram": "RAM hiện tại:",
            "hotplug.cur_flags": "Cờ Hotplug:",
            "hotplug.cur_type": "Loại CPU:",
            "hotplug.new_cpu": "vCPU Mới (Cores)",
            "hotplug.new_ram": "RAM Mới (MB)",
            "hotplug.live_hint": "⚡ Thay đổi có hiệu lực ngay lập tức không cần tắt máy ảo.",
            "hotplug.apply_btn": "Áp Dụng Nóng (Hot Apply)",
            "hotplug.attached_disks": "Danh Sách Ổ Đĩa Đang Gắn (Attached Disks)",
            "hotplug.table_slot": "Slot",
            "hotplug.table_storage": "Storage Pool",
            "hotplug.table_size": "Dung Lượng",
            "hotplug.table_type": "Loại Đĩa",
            "hotplug.table_ops": "Thao Tác Mở Rộng / Gỡ",
            "hotplug.attach_title": "Gắn Thêm Đĩa Phụ Mới (Hot-attach Secondary Virtual Disk)",
            "hotplug.target_storage": "Storage Pool Đích",
            "hotplug.disk_size": "Dung Lượng (GB)",
            "hotplug.bus_slot": "Slot Bus",
            "hotplug.discard_label": "Bật TRIM/Discard (SSD Emulation)",
            "hotplug.attach_btn": "Gắn Đĩa Ngay (Hot Attach)",
            "hotplug.resize_btn": "Mở Rộng Đĩa",
            "hotplug.detach_btn": "Gỡ Đĩa",

            // Firewall Modal
            "firewall.title": "Quản Lý Firewall & Security Groups",
            "firewall.subtitle": "Mở/đóng Port và Kiểm soát truy cập mạng Proxmox VE",
            "firewall.presets_title": "1-Click Security Presets (Mẫu Mở Port Nhanh):",
            "firewall.presets_hint": "Click để thêm ngay Rule mở cổng tương ứng",
            "firewall.create_title": "Thêm Quy Tắc Firewall (Security Rule)",
            "firewall.action_label": "Hành Động (Action)",
            "firewall.direction_label": "Hướng (Direction)",
            "firewall.proto_label": "Giao Thức (Protocol)",
            "firewall.port_label": "Cổng Đích (Port / dport)",
            "firewall.source_label": "Nguồn Cho Phép (Source IP / CIDR)",
            "firewall.comment_label": "Ghi Chú / Mục Đích",
            "firewall.submit_btn": "Thêm Quy Tắc Mạng",
            "firewall.list_title": "Danh Sách Quy Tắc Firewall Hiện Hành",
            "firewall.table_enable": "Bật/Tắt",
            "firewall.table_action": "Hành Động",
            "firewall.table_direction": "Hướng",
            "firewall.table_proto": "Giao Thức",
            "firewall.table_port": "Cổng (Port)",
            "firewall.table_source": "Nguồn (Source)",
            "firewall.table_comment": "Ghi Chú",
            "firewall.table_ops": "Thao Tác",

            // Alert Manager Modal
            "alert.modal_title": "Trung Tâm Quản Trị Cảnh Báo Ngưỡng Tài Nguyên",
            "alert.modal_subtitle": "Tự động phát hiện Storage/Node quá tải và gửi cảnh báo tới Telegram & Webhook",
            "alert.tab_status": "Cảnh Báo Hoạt Động",
            "alert.tab_config": "Cấu Hình Ngưỡng & Thông Báo",
            "alert.tab_history": "Lịch Sử Cảnh Báo",
            "alert.manual_scan": "Quét Tức Thời",
            "alert.section_thresholds": "1. Thiết Lập Ngưỡng Kích Hoạt Cảnh Báo (%)",
            "alert.lbl_storage": "Ngưỡng Storage Pool (%)",
            "alert.hint_storage": "Mặc định 85%. Kích hoạt khi ổ đĩa ≥ 85%.",
            "alert.lbl_cpu": "Ngưỡng Node CPU (%)",
            "alert.hint_cpu": "Mặc định 85%. Kích hoạt khi CPU ≥ 85%.",
            "alert.lbl_ram": "Ngưỡng Node RAM (%)",
            "alert.hint_ram": "Mặc định 85%. Kích hoạt khi RAM ≥ 85%.",
            "alert.lbl_interval": "Chu Kỳ Quét Nền Tự Động (Giây)",
            "alert.unit_seconds": "Giây",
            "alert.section_channels": "2. Kênh Gửi Thông Báo Tự Động (Telegram & Webhook)",
            "alert.tg_title": "Telegram Bot Notification",
            "alert.lbl_tg_token": "Telegram Bot Token",
            "alert.tg_token_placeholder": "vd: 123456789:ABCdefGhIJKlmNoPQ...",
            "alert.lbl_tg_chat": "Telegram Chat ID / Group ID",
            "alert.tg_chat_placeholder": "vd: -100123456789 hoặc 987654321",
            "alert.webhook_title": "Generic Webhook (Discord / Slack / Teams)",
            "alert.lbl_webhook": "Webhook URL (Hỗ trợ Discord / Slack / API Gateway)",
            "alert.webhook_placeholder": "https://discord.com/api/webhooks/... hoặc https://hooks.slack.com/services/...",
            "alert.test_btn": "Gửi Thử Nghiệm (Test Alert)",
            "alert.save_btn": "Lưu Cấu Hình Cảnh Báo",
            "alert.hist_time": "Thời Gian",
            "alert.hist_resource": "Tài Nguyên Vượt Ngưỡng",
            "alert.hist_node": "Node",
            "alert.hist_val": "Mức Tải / Ngưỡng",
            "alert.hist_level": "Mức Độ",
            "alert.hist_status": "Trạng Thái",

            // Snapshots Modal
            "snapshot.title": "Quản Lý Snapshots Máy Ảo",
            "snapshot.subtitle": "Lưu và khôi phục trạng thái máy ảo tức thời",
            "snapshot.create_title": "Tạo Bản Snapshot Mới",
            "snapshot.name": "Tên Snapshot (không dấu, không khoảng trắng)",
            "snapshot.desc": "Mô tả mục đích snapshot...",
            "snapshot.ram_state": "Lưu cả trạng thái RAM (cho phép phục hồi tức thì trạng thái đang chạy)",
            "snapshot.create_btn": "Tạo Snapshot Ngay",
            "snapshot.list_title": "Các Bản Snapshot Đã Lưu",
            "snapshot.rollback_btn": "Khôi Phục (Rollback)",
            "snapshot.delete_btn": "Xóa Snapshot",

            // Quotas & Approvals (Tab 5)
            "quota.title": "Quản Trị Hạn Mức Quota & Cổng Phê Duyệt",
            "quota.vm_title": "Hạn Mức Máy Ảo (VMs Quota)",
            "quota.cpu_title": "Hạn Mức CPU (vCPU Quota)",
            "quota.ram_title": "Hạn Mức Bộ Nhớ (RAM Quota)",
            "quota.usage_title": "Mức Độ Sử Dụng Hạn Mức Của Bạn (Resource Usage):",
            "quota.queue_title": "Hàng Đợi Phê Duyệt Khởi Tạo VM (Approval Gateway)",
            "quota.queue_subtitle": "Yêu cầu khởi tạo máy ảo trên môi trường STAGING/PROD hoặc vượt Quota cần Admin phê duyệt trước khi Pulumi kích hoạt",
            "quota.refresh_btn": "Làm mới yêu cầu",
            "quota.table_req_id": "Mã Yêu Cầu",
            "quota.table_user": "Người Yêu Cầu",
            "quota.table_vms": "Danh Sách Máy Ảo",
            "quota.table_env": "Môi Trường",
            "quota.table_reason": "Lý Do Cần Phê Duyệt",
            "quota.table_status": "Trạng Thái",
            "quota.table_actions": "Thao Tác Admin",
            "quota.approve_btn": "Phê Duyệt (Approve)",
            "quota.reject_btn": "Từ Chối (Reject)",

            // Audit Logs (Tab 4)
            "audit.title": "Nhật Ký Kiểm Toán (Audit Logs & Governance)",
            "audit.subtitle": "Ghi vết chi tiết danh tính người dùng, vai trò (RBAC), hành động tạo/hủy stack và trạng thái phê duyệt",
            "audit.refresh_btn": "Làm mới Audit Logs",
            "audit.export": "Xuất CSV",
            "audit.table_time": "Thời Gian",
            "audit.table_user": "Người Dùng",
            "audit.table_user_role": "Người Dùng & Vai Trò",
            "audit.table_role": "Vai Trò",
            "audit.table_action": "Hành Động (Action)",
            "audit.table_target": "Mục Tiêu (Target)",
            "audit.table_env": "Môi Trường",
            "audit.table_status": "Trạng Thái",
            "audit.table_details": "Chi Tiết",

            // Toast Messages & Confirmations
            "toast.lang_changed": "Đã chuyển sang Tiếng Việt 🇻🇳",
            "toast.welcome_login": "Chào mừng {0} ({1}) đăng nhập thành công!",
            "toast.logged_out": "Đã đăng xuất an toàn khỏi hệ thống.",
            "toast.password_changed": "🎉 Đổi mật khẩu thành công! Mật khẩu mới có hiệu lực ngay.",
            "toast.password_mismatch": "Mật khẩu xác nhận không khớp!",
            "toast.sso_failed": "⛔ Đăng nhập thất bại: {0}",
            "toast.copied_ip": "Đã sao chép IP: {0}",
            "toast.copied_log": "Đã sao chép toàn bộ log!",
            "toast.deploy_success": "Khởi tạo máy ảo thành công!",
            "toast.hotplug_success": "Đã thay đổi nóng cấu hình phần cứng thành công!",
            "toast.resize_success": "Đã mở rộng đĩa {0} thành công!",
            "toast.attach_success": "Đã gắn đĩa {0} thành công!",
            "toast.detach_success": "Đã gỡ bỏ đĩa {0} thành công!",
            "toast.confirm_logout": "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?",
            "toast.confirm_delete_vm": "Bạn có chắc chắn muốn XÓA máy ảo '{0}' không?",
            "toast.confirm_detach_disk": "Bạn có chắc chắn muốn GỠ BỎ ổ đĩa phụ '{0}' khỏi máy ảo #{1} không?",
            "toast.confirm_delete_snap": "Bạn có chắc muốn XÓA bản snapshot '{0}' không? Thao tác này không thể hoàn tác!"
        },

        en: {
            // Header & Navigation
            "app.title": "Proxmox Cluster Explorer",
            "app.subtitle": "IaC & Operations",
            "nav.cluster": "Cluster Resources",
            "nav.create": "Create VM",
            "nav.logs": "Live Console",
            "nav.approvals": "Approvals & Quotas",
            "nav.audit": "Audit Logs",
            "header.online": "Online",
            "header.role.admin": "Admin",
            "header.role.dev": "Developer",
            "header.role.viewer": "Viewer",
            "header.change_password": "Change Account Password",
            "header.logout": "Sign Out of System",
            "header.alerts": "Resource Threshold Alert Center",
            "header.back_to_top": "Back to Top",

            // Cluster Alert Notification Banner
            "alert.banner_title": "⚠️ Resource threshold alert detected!",
            "alert.banner_details": "Storage Pool or Node is running at critical utilization (≥ 85%).",
            "alert.banner_btn": "Details & Configure",
            "alert.banner_dismiss": "Dismiss banner",

            // Login Modal
            "login.title": "Authentication & Sign In",
            "login.subtitle": "Centralized authentication to manage Proxmox VE infrastructure",
            "login.sso_title": "CENTRALIZED SIGN-ON (SSO / OIDC):",
            "login.sso_google": "Google Workspace",
            "login.sso_github": "GitHub SSO",
            "login.sso_oidc": "Keycloak / Authelia OIDC",
            "login.sso_setup_needed": "Setup Needed",
            "login.sso_active": "Active",
            "login.or_local": "OR LOCAL BREAK-GLASS ACCOUNT",
            "login.quick_accounts": "Quick access demo accounts (Demo RBAC):",
            "login.admin_role": "Administrator",
            "login.dev_role": "Dev (DEV only)",
            "login.viewer_role": "Viewer (Read-only)",
            "login.username": "Username",
            "login.username_placeholder": "Enter username...",
            "login.password": "Password",
            "login.password_placeholder": "Enter password...",
            "login.submit": "Sign In",
            "login.error_default": "Invalid username or password!",

            // Change Password Modal
            "password.title": "Change Account Password",
            "password.current": "Current Password",
            "password.current_placeholder": "Enter current password...",
            "password.new": "New Password",
            "password.new_placeholder": "Enter new password (>= 4 chars)...",
            "password.confirm": "Confirm New Password",
            "password.confirm_placeholder": "Re-enter new password...",
            "password.cancel": "Cancel",
            "password.submit": "Update Password",

            // Cluster Overview (Tab 1)
            "cluster.title": "Infrastructure Resource Overview",
            "cluster.subtitle": "Real-time telemetry for Node IPs, Local & LVM & ZFS Storage Pools, ISO Images and all VMs",
            "cluster.search_placeholder": "Search VMs (Name, ID, IP, Tag, Node)...",
            "cluster.refresh_btn": "Refresh Data",
            "cluster.loading": "Connecting and scanning Proxmox cluster resources...",
            "cluster.scanning": "Scanning Nodes, Storages, Images and VMs from Proxmox API...",
            "cluster.node_index": "Node Quick Nav Index",
            "cluster.expand_all": "Expand All",
            "cluster.collapse_all": "Collapse",
            "cluster.running": "Running",
            "cluster.total": "Total",
            "cluster.node_cpu": "CPU Usage",
            "cluster.node_ram": "RAM Used",
            "cluster.node_uptime": "Uptime",
            "cluster.node_storage": "Storage",
            "cluster.storages_section": "Storages & Disks (Local / LVM / ZFS)",
            "cluster.vms_list": "Virtual Machines List",
            "cluster.table.vmid": "VM & ID",
            "cluster.table.type": "Type",
            "cluster.table.specs": "Hardware Specs",
            "cluster.table.ip": "IP Address",
            "cluster.table.status": "Status",
            "cluster.table.actions": "Actions",
            "cluster.no_vms": "No virtual machines on this node",
            "cluster.no_files": "(No files or content reading unsupported)",
            "cluster.node_not_found": "No matching virtual machines or nodes found",
            "cluster.no_search_results": "No results match keyword \"{0}\". Try searching by VM Name, VM ID, IP or Tags.",
            "cluster.storage_avail": "Available:",
            "cluster.storage_view_files": "View Files",
            "cluster.storage_danger_badge": "🚨 Over threshold ({0}% ≥ {1}%)",

            // VM Details Modal
            "vm_detail.title": "Virtual Machine Configuration Details",
            "vm_detail.status": "Runtime Status",
            "vm_detail.ram": "Allocated RAM",
            "vm_detail.disk": "Disk Capacity",
            "vm_detail.ip": "IP Address (Agent)",
            "vm_detail.no_ip": "No IP detected (Requires QEMU Guest Agent)",
            "vm_detail.boot_disk": "Boot Disk",
            "vm_detail.raw_config": "Full Raw Proxmox Config",

            // Action Buttons
            "action.start": "Power On",
            "action.shutdown": "Safe Shutdown (ACPI)",
            "action.stop": "Force Stop",
            "action.reboot": "Graceful Reboot",
            "action.config": "Configure",
            "action.config_tooltip": "Live vCPU, RAM Hotplug & Multi-Disk Management",
            "action.firewall": "Firewall",
            "action.snapshot": "Snapshot",
            "action.console": "Console",
            "action.details": "Details",
            "action.delete": "Delete VM",
            "action.copy_ip": "Copy IP",
            "action.read_only": "Read-only",

            // Provisioning Wizard (Tab 2)
            "wizard.title": "Create New Virtual Machine",
            "wizard.subtitle": "Configure resources and automate provisioning via Pulumi Engine",
            "wizard.step1.title": "Basic Info & Environment",
            "wizard.step1.workload_type": "Workload Type",
            "wizard.step1.qemu_desc": "Full OS isolation, dedicated kernel, Cloud-Init",
            "wizard.step1.lxc_desc": "Ultra-lightweight, 1-second instant boot, optimized RAM/CPU",
            "wizard.step1.vm_name": "VM / Instance Base Name",
            "wizard.step1.vm_name_placeholder": "e.g. ubuntu-server, db-master, redis-node...",
            "wizard.step1.count": "Quantity",
            "wizard.step1.next": "Next: Select Node & Image",

            "wizard.step2.title": "Node, Storage & OS Image",
            "wizard.step2.node": "Proxmox Node",
            "wizard.step2.loading_nodes": "Loading Node list from API...",
            "wizard.step2.choose_node_first": "Select Node first...",
            "wizard.step2.datastore": "Target VM Datastore",
            "wizard.step2.multi_node": "Multi-Node Distribution (Round-Robin)",
            "wizard.step2.filter_all": "All",
            "wizard.step2.preview_title": "Cluster Distribution Preview:",
            "wizard.step2.os_image": "Operating System Image (Cloud-Init / ISO)",
            "wizard.step2.image": "Operating System Image (Cloud-Init / ISO)",
            "wizard.os.advanced_toggle": "Select raw file from Storage (Advanced)",
            "wizard.os.simple_toggle": "Collapse (Quick OS selection)",
            "wizard.os.tab_all": "⭐ All Popular OS",
            "wizard.os.tab_linux": "🐧 Linux (Cloud-Init)",
            "wizard.os.tab_windows": "🪟 Windows Server / Desktop",
            "wizard.os.tab_custom": "📁 Manual ISO / Img File",
            "wizard.os.custom_title": "Custom ISO / Img File",
            "wizard.os.custom_tag": "Select any file from Storage",
            "wizard.os.custom_sub": "All ISO/QCOW2 formats",
            "wizard.os.raw_desc": "Or select raw filename from Storage Pool:",
            "wizard.os.search_placeholder": "🔍 Filter filename...",
            "wizard.os.auto_detected": "Auto-detected standard Cloud-Init image on Proxmox Storage.",
            "wizard.os.no_match": "No pre-existing image for this OS on Node. Using standard path:",
            "wizard.os.images_found": "files available",
            "wizard.step2.catalog_title": "Or select a Pre-built Stack (1-Click App Catalog):",
            "wizard.step2.next": "Next: Hardware Specs & Networking",

            "wizard.step3.title": "Hardware Specs & Networking",
            "wizard.step3.templates_title": "Hardware Templates:",
            "wizard.step3.presets_title": "Hardware Templates:",
            "wizard.step3.cpu_cores": "vCPU Cores",
            "wizard.step3.cores": "vCPU Cores",
            "wizard.step3.ram_gb": "RAM (GB)",
            "wizard.step3.ram": "RAM (GB)",
            "wizard.step3.os_disk": "OS Boot Disk",
            "wizard.step3.disk": "OS Boot Disk",
            "wizard.step3.sec_disks_title": "Secondary Disks (Multi-Disk Attachment):",
            "wizard.step3.secondary_disks": "Secondary Disks (Multi-Disk Attachment):",
            "wizard.step3.add_disk_btn": "+ Add Secondary Disk",
            "wizard.step3.add_disk": "+ Add Secondary Disk",
            "wizard.step3.secondary_hint": "💡 You can attach secondary data disks on different storage pools (e.g. OS on NVMe/local-lvm, Data on ZFS/HDD).",
            "wizard.step3.bridge": "Network Bridge",
            "wizard.step3.bridge_default": "vmbr0 (Default)",
            "wizard.step3.vlan": "VLAN Tag",
            "wizard.step3.vlan_placeholder": "e.g. 10, 20... (Untagged)",
            "wizard.step3.next": "Next: Options & Scripts",

            "wizard.step4.title": "Post-Provisioning Automation & Options",
            "wizard.step4.tags": "Classification Tags",
            "wizard.step4.tags_placeholder": "e.g. database, backend, k8s",
            "wizard.step4.cpu_type": "CPU Architecture",
            "wizard.step4.cpu_host_opt": "Host Passthrough (Optimized)",
            "wizard.step4.ssh_key": "SSH Public Key (Root Passwordless)",
            "wizard.step4.app_catalog_title": "1-Click Application Catalog",
            "wizard.step4.app_catalog_badge": "Automated install & configuration",
            "wizard.step4.cloud_init_title": "Bootstrap Script (Cloud-Init / Post-Boot)",
            "wizard.step4.presets_label": "Quick Presets:",
            "wizard.step4.clear_script": "Clear script",
            "wizard.step4.script_placeholder": "#cloud-config or #!/bin/bash script...",
            "wizard.step4.package_upgrade": "Auto package upgrade (apt/dnf update)",
            "wizard.step4.protection_mode": "Enable deletion protection (VM Protection Mode)",
            "wizard.nav.back": "Back",
            "wizard.submit_btn": "Deploy Virtual Machines",

            // Catalog Descs
            "catalog.postgres_desc": "SQL database, auto-creates user & db",
            "catalog.redis_desc": "In-memory cache & key-value store",
            "catalog.minio_desc": "S3 Compatible Storage & Web Console",
            "catalog.k3s_desc": "K3s lightweight cluster node",

            "wizard.summary.title": "Deployment Summary",
            "wizard.summary.env": "Environment:",
            "wizard.summary.node": "Target Node:",
            "wizard.summary.os": "Operating System:",
            "wizard.summary.specs": "Hardware Specs:",
            "wizard.summary.network": "Network:",
            "wizard.summary.secondary": "Secondary Disks:",
            "wizard.summary.cloudinit": "Cloud-Init:",

            // Stacks Management (Tab 2 Right Panel)
            "stacks.title": "Pulumi Managed Virtual Machines",
            "stacks.subtitle": "Independent stacks synchronized with Proxmox",
            "stacks.refresh_btn": "Refresh",
            "stacks.refresh": "Refresh",
            "stacks.table.name": "VM & Stack Name",
            "stacks.table.env": "Environment & Tags",
            "stacks.table.node": "Node",
            "stacks.table.vmid": "VM ID",
            "stacks.table.ip": "IP Address",
            "stacks.table.status": "Status",
            "stacks.table.actions": "Actions",
            "stacks.loading": "Loading virtual machines list...",
            "stacks.empty": "No virtual machines deployed via Portal yet",
            "stacks.waiting_agent": "Waiting for Agent...",

            // Terminal Console (Tab 3)
            "logs.title": "Pulumi Automation Deployment Logs",
            "logs.subtitle": "Realtime SSE stream directly from engine subprocess",
            "logs.waiting": "Waiting for commands triggered from Portal...",
            "logs.copy": "Copy logs",
            "logs.copy_btn": "Copy logs",
            "logs.clear": "Clear logs",
            "logs.clear_btn": "Clear logs",

            // Live Console Web noVNC Modal
            "console.title": "Proxmox Live Web Console (noVNC)",
            "console.subtitle": "Direct terminal and shell access inside your browser",
            "console.open_new_tab": "Open in new tab",
            "console.close": "Close",

            // Hotplug Hardware & Multi-Disk Modal
            "hotplug.title": "Live Hardware Hotplug & Multi-Disk Manager",
            "hotplug.subtitle": "Adjust vCPU, RAM & attach virtual disks on the fly without rebooting",
            "hotplug.tab_cpuram": "Hotplug CPU & RAM",
            "hotplug.tab_disks": "Disk Management & Expansion",
            "hotplug.cur_specs": "Current Virtual Machine Telemetry:",
            "hotplug.cur_cpu": "Current vCPU:",
            "hotplug.cur_ram": "Current RAM:",
            "hotplug.cur_flags": "Hotplug Flags:",
            "hotplug.cur_type": "CPU Type:",
            "hotplug.new_cpu": "New vCPU (Cores)",
            "hotplug.new_ram": "New RAM (MB)",
            "hotplug.live_hint": "⚡ Changes take effect immediately without rebooting the VM.",
            "hotplug.apply_btn": "Hot Apply",
            "hotplug.attached_disks": "Attached Virtual Disks",
            "hotplug.table_slot": "Slot",
            "hotplug.table_storage": "Storage Pool",
            "hotplug.table_size": "Size",
            "hotplug.table_type": "Disk Type",
            "hotplug.table_actions": "Resize / Detach",
            "hotplug.os_boot": "OS / Boot",
            "hotplug.data_disk": "Data Disk",
            "hotplug.btn_resize": "Resize",
            "hotplug.btn_detach": "Detach",
            "hotplug.attach_new": "Hot-attach New Secondary Virtual Disk",
            "hotplug.target_pool": "Target Storage Pool",
            "hotplug.capacity": "Size (GB)",
            "hotplug.bus_slot": "Bus Slot",
            "hotplug.trim_discard": "Enable TRIM/Discard (SSD Emulation)",
            "hotplug.attach_btn": "Hot Attach",

            // Alert Manager Modal & Banner
            "alert.banner_btn": "Details & Config",
            "alert.banner_dismiss": "Dismiss banner",
            "alert.title": "Cluster Resource Alerting Center",
            "alert.subtitle": "Auto-monitors Storage ≥ 85%, CPU/RAM loads & dispatches Telegram / Webhook alerts",
            "alert.modal_title": "Cluster Resource Alerting Center",
            "alert.modal_subtitle": "Auto-monitors Storage ≥ 85%, CPU/RAM loads & dispatches Telegram / Webhook alerts",
            "alert.tab_active": "Active Alerts",
            "alert.tab_status": "Active Alerts",
            "alert.tab_config": "Thresholds & Notification Config",
            "alert.tab_history": "Alert History",
            "alert.manual_scan": "Instant Scan",
            "alert.section_thresholds": "1. Alert Trigger Threshold Settings (%)",
            "alert.lbl_storage": "Storage Pool Threshold (%)",
            "alert.hint_storage": "Default 85%. Triggers when storage ≥ 85%.",
            "alert.lbl_cpu": "Node CPU Threshold (%)",
            "alert.hint_cpu": "Default 85%. Triggers when CPU load ≥ 85%.",
            "alert.lbl_ram": "Node RAM Threshold (%)",
            "alert.hint_ram": "Default 85%. Triggers when RAM used ≥ 85%.",
            "alert.lbl_interval": "Background Scan Interval (Seconds)",
            "alert.unit_seconds": "Seconds",
            "alert.section_channels": "2. Automated Notification Channels (Telegram & Webhook)",
            "alert.telegram_enable": "Enable Telegram Bot notifications",
            "alert.tg_title": "Telegram Bot Notification",
            "alert.lbl_tg_token": "Telegram Bot Token",
            "alert.tg_token_placeholder": "e.g. 123456789:ABCdefGhIJKlmNoPQ...",
            "alert.lbl_tg_chat": "Telegram Chat ID / Group ID",
            "alert.tg_chat_placeholder": "e.g. -100123456789 or 987654321",
            "alert.webhook_enable": "Enable Webhooks (Discord / Slack / Teams)",
            "alert.webhook_title": "Generic Webhook (Discord / Slack / Teams)",
            "alert.lbl_webhook": "Webhook URL (Supports Discord / Slack / API Gateway)",
            "alert.webhook_placeholder": "https://discord.com/api/webhooks/... or https://hooks.slack.com/services/...",
            "alert.test_btn": "Send Test Alert",
            "alert.save_btn": "Save Alert Configuration",
            "alert.hist_time": "Timestamp",
            "alert.hist_resource": "Triggered Resource",
            "alert.hist_type": "Type & Resource",
            "alert.hist_node": "Node",
            "alert.hist_val": "Value",
            "alert.hist_level": "Severity",
            "alert.hist_status": "Status",

            // Hotplug Modal & Multi-Disk
            "hotplug.title": "Live Hotplug Hardware & Multi-Disk Management",
            "hotplug.subtitle": "Dynamically adjust vCPU, RAM & attach secondary virtual disks without reboot",
            "hotplug.tab_cpuram": "Live Hotplug CPU & RAM",
            "hotplug.tab_disks": "Multi-Disk & Live Resize",
            "hotplug.current_title": "Current Virtual Machine Specifications:",
            "hotplug.current_cpu": "Current vCPU:",
            "hotplug.current_ram": "Current RAM:",
            "hotplug.hotplug_flags": "Hotplug Flags:",
            "hotplug.cpu_type": "CPU Type:",
            "hotplug.new_cpu": "New vCPU (Cores)",
            "hotplug.new_ram": "New RAM (MB)",
            "hotplug.note": "⚡ Changes apply immediately without rebooting the VM.",
            "hotplug.apply_btn": "Live Hot Apply",
            "hotplug.attached_title": "Attached Virtual Disks List",
            "hotplug.table_slot": "Slot",
            "hotplug.table_storage": "Storage Pool",
            "hotplug.table_size": "Size",
            "hotplug.table_type": "Disk Type",
            "hotplug.table_ops": "Resize / Detach Actions",
            "hotplug.attach_title": "Hot-attach Secondary Virtual Disk",
            "hotplug.target_storage": "Target Storage Pool",
            "hotplug.disk_size": "Disk Capacity (GB)",
            "hotplug.bus_slot": "Bus Slot",
            "hotplug.discard_label": "Enable TRIM/Discard (SSD Emulation)",
            "hotplug.attach_btn": "Hot Attach Disk",
            "hotplug.resize_btn": "Resize Disk",
            "hotplug.detach_btn": "Detach Disk",

            // Firewall Modal
            "firewall.title": "Manage Firewall & Security Groups",
            "firewall.subtitle": "Port forwarding, rules and network access control for Proxmox VE",
            "firewall.presets_title": "1-Click Security Presets:",
            "firewall.presets_hint": "Click to instantly apply security rule preset",
            "firewall.create_title": "Add Firewall Rule",
            "firewall.action_label": "Action",
            "firewall.direction_label": "Direction",
            "firewall.proto_label": "Protocol",
            "firewall.port_label": "Target Port (dport)",
            "firewall.source_label": "Allowed Source (IP / CIDR)",
            "firewall.comment_label": "Comment / Note",
            "firewall.submit_btn": "Add Network Rule",
            "firewall.list_title": "Active Firewall Rules List",
            "firewall.table_enable": "Enable",
            "firewall.table_action": "Action",
            "firewall.table_direction": "Direction",
            "firewall.table_proto": "Protocol",
            "firewall.table_port": "Port",
            "firewall.table_source": "Source",
            "firewall.table_comment": "Comment",
            "firewall.table_ops": "Actions",
            "firewall.empty": "No firewall rules configured. Use 1-Click Presets above or the form to add rules.",

            // Snapshots Modal
            "snapshot.title": "Manage VM Snapshots",
            "snapshot.subtitle": "Save and instantly restore virtual machine point-in-time states",
            "snapshot.create_title": "Create New Snapshot",
            "snapshot.name_label": "Snapshot Name",
            "snapshot.name_placeholder": "e.g. pre-upgrade, backup-v1",
            "snapshot.desc_label": "Description / Note",
            "snapshot.desc_placeholder": "Pre-change configuration notes...",
            "snapshot.ram_label": "Include RAM State (live memory capture while running)",
            "snapshot.submit_btn": "Create Snapshot",
            "snapshot.list_title": "Saved Snapshots List",
            "snapshot.table_name": "Snapshot Name",
            "snapshot.table_time": "Timestamp",
            "snapshot.table_desc": "Description",
            "snapshot.table_ram": "RAM State",
            "snapshot.table_ops": "Actions",
            "snapshot.empty": "No snapshots recorded yet.",
            "snapshot.rollback_btn": "Rollback",
            "snapshot.delete_btn": "Delete Snapshot",

            // Tooltips
            "tooltip.copy_ip": "Click to copy IP",
            "tooltip.copy_node_ip": "Click to copy Node IP",
            "tooltip.toggle_node": "Click to expand/collapse Node {0}",
            "tooltip.toggle_node_chip": "Jump to {0}",

            // Quotas & Approvals (Tab 5)
            "quota.title": "Resource Quotas & Approval Gateway",
            "quota.vm_title": "Virtual Machines Quota",
            "quota.cpu_title": "vCPU Quota",
            "quota.ram_title": "RAM Quota",
            "quota.usage_title": "Your Current Resource Consumption:",
            "quota.queue_title": "VM Provisioning Approval Gateway",
            "quota.queue_subtitle": "Provisioning requests targeting STAGING/PROD or exceeding quota require Administrator approval before Pulumi triggers",
            "quota.refresh_btn": "Refresh Requests",
            "quota.table_req_id": "Request ID",
            "quota.table_user": "Requester",
            "quota.table_vms": "Virtual Machines",
            "quota.table_env": "Environment",
            "quota.table_reason": "Approval Reason",
            "quota.table_status": "Status",
            "quota.table_actions": "Admin Actions",
            "quota.approve_btn": "Approve",
            "quota.reject_btn": "Reject",

            // Audit Logs (Tab 4)
            "audit.title": "Security & Operational Audit Logs (RBAC & Governance)",
            "audit.subtitle": "Audit trail logging user identities, RBAC roles, stack provisioning/destruction, and approval decisions",
            "audit.refresh_btn": "Refresh Audit Logs",
            "audit.export": "Export CSV",
            "audit.table_time": "Timestamp",
            "audit.table_user": "User",
            "audit.table_user_role": "User & Role",
            "audit.table_role": "Role",
            "audit.table_action": "Action",
            "audit.table_target": "Target",
            "audit.table_env": "Environment",
            "audit.table_status": "Status",
            "audit.table_details": "Details",

            // Toast Messages & Confirmations
            "toast.lang_changed": "Switched to English 🇬🇧",
            "toast.welcome_login": "Welcome {0} ({1}), sign in successful!",
            "toast.logged_out": "Signed out safely from the system.",
            "toast.password_changed": "🎉 Password changed successfully! Your new password is now active.",
            "toast.password_mismatch": "Password confirmation does not match!",
            "toast.sso_failed": "⛔ Sign in failed: {0}",
            "toast.copied_ip": "Copied IP: {0}",
            "toast.copied_log": "Copied full log output!",
            "toast.deploy_success": "VM deployed successfully!",
            "toast.hotplug_success": "Hardware hotplug updated successfully!",
            "toast.resize_success": "Disk {0} resized successfully!",
            "toast.attach_success": "Disk {0} attached successfully!",
            "toast.detach_success": "Disk {0} detached successfully!",
            "toast.confirm_logout": "Are you sure you want to sign out?",
            "toast.confirm_delete_vm": "Are you sure you want to DELETE virtual machine '{0}'?",
            "toast.confirm_detach_disk": "Are you sure you want to DETACH secondary disk '{0}' from VM #{1}?",
            "toast.confirm_delete_snap": "Are you sure you want to DELETE snapshot '{0}'? This action cannot be undone!"
        }
    };

    // State
    let currentLang = localStorage.getItem("portal_lang") || "vi";
    if (currentLang !== "vi" && currentLang !== "en") currentLang = "vi";

    // Translation lookup function
    window.t = function(key, ...args) {
        const langDict = translations[currentLang] || translations.vi;
        let text = langDict[key] || translations.vi[key] || key;

        if (args.length > 0) {
            args.forEach((arg, index) => {
                text = text.replace(new RegExp(`\\{${index}\\}`, "g"), arg);
            });
        }
        return text;
    };

    window.getCurrentLang = function() {
        return currentLang;
    };

    // Apply language to all static elements in DOM
    window.applyLanguage = function(lang) {
        if (lang) {
            currentLang = (lang === "en" || lang === "vi") ? lang : "vi";
            localStorage.setItem("portal_lang", currentLang);
        }

        document.documentElement.lang = currentLang;

        // Translate data-i18n elements
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (key) {
                const translated = window.t(key);
                if (el.children.length === 0) {
                    el.textContent = translated;
                } else {
                    const textSpan = el.querySelector("span:not(.badge-count):not(.user-role-badge)");
                    if (textSpan && textSpan.children.length === 0) {
                        textSpan.textContent = translated;
                    } else {
                        const icon = el.querySelector("i, svg");
                        if (icon) {
                            el.innerHTML = icon.outerHTML + ` <span>${translated}</span>`;
                        } else {
                            el.textContent = translated;
                        }
                    }
                }
            }
        });

        // Translate data-i18n-placeholder
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.getAttribute("data-i18n-placeholder");
            if (key) {
                el.placeholder = window.t(key);
            }
        });

        // Translate data-i18n-title
        document.querySelectorAll("[data-i18n-title]").forEach(el => {
            const key = el.getAttribute("data-i18n-title");
            if (key) {
                el.title = window.t(key);
            }
        });

        // Update Language Switcher UI
        const btnLangCurrent = document.getElementById("btnLangCurrent");
        if (btnLangCurrent) {
            btnLangCurrent.innerHTML = currentLang === "vi" 
                ? `<span class="flag-icon">🇻🇳</span> <span class="lang-text">VI</span> <i data-lucide="chevron-down" class="lang-chevron"></i>`
                : `<span class="flag-icon">🇬🇧</span> <span class="lang-text">EN</span> <i data-lucide="chevron-down" class="lang-chevron"></i>`;
            if (window.lucide) window.lucide.createIcons();
        }

        // Highlight active lang item
        document.querySelectorAll(".lang-item, .btn-login-lang").forEach(item => {
            if (item.getAttribute("data-lang") === currentLang) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Dispatch custom event for dynamic components to re-render
        window.dispatchEvent(new CustomEvent("portal_language_changed", { detail: { lang: currentLang } }));
    };

    // Toggle language function
    window.setLanguage = function(lang) {
        window.applyLanguage(lang);
        const menu = document.getElementById("langDropdownMenu");
        if (menu) menu.classList.remove("show");
        if (typeof window.showToast === "function") {
            window.showToast(window.t("toast.lang_changed"));
        }
    };

    // Initialize upon DOM ready
    document.addEventListener("DOMContentLoaded", () => {
        window.applyLanguage(currentLang);
    });
})();
