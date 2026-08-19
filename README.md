# 🚀 Proxmox VE Self-Service Portal & IaC Automation with Pulumi

English documentation: [README.en.md](./README.en.md) | **Tiếng Việt**

---

Hệ thống quản lý, giám sát và tự động hóa khởi tạo hạ tầng máy ảo (VM & LXC) trên cụm **Proxmox VE** theo mô hình **Infrastructure as Code (IaC)**, xây dựng trên nền tảng **Pulumi Automation API**, **Node.js (TypeScript)** và giao diện Web Dashboard hiện đại chuẩn Enterprise Dark Glassmorphism.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🔑 Đăng Nhập Tập Trung & Phân Quyền 3 Cấp Độ (Enterprise SSO & RBAC Governance)
* **Xác Thực Đa Nền Tảng (Centralized SSO / OAuth2 / OIDC)**:
  * 🌐 **Google Workspace OAuth2**: Xác thực tài khoản Google công ty, kiểm soát miền email (`GOOGLE_ALLOWED_DOMAINS`) và phân quyền qua email.
  * 🐙 **GitHub OAuth**: Xác thực qua tài khoản GitHub, tự động kiểm tra quyền thành viên Organization/Team (`read:org`).
  * 🟣 **Keycloak / Authelia / Okta / Authentik (Generic OIDC)**: Tự động Discovery qua `/.well-known/openid-configuration`, phân tích claims `groups`/`roles` để tự động gán quyền RBAC.
  * 🛡️ **Local Break-glass Fallback**: Duy trì tài khoản nội bộ khẩn cấp phòng khi Identity Provider bên ngoài gặp sự cố mạng.
* **Ma Trận Phân Quyền 3 Vai Trò (Role-Based Access Control - RBAC)**:
  * **👑 Administrator (`admin`)**: Toàn quyền quản trị hạ tầng; được phép tạo, cấu hình, thay đổi, xóa máy ảo, snapshots và firewall trên mọi môi trường (`DEV`, `STAGING`, `PROD`).
  * **👨‍💻 Developer (`developer`)**: Bị giới hạn nghiêm ngặt theo chính sách Multi-tenancy — **chỉ được phép khởi tạo, quản lý nguồn và tạo snapshot máy ảo trên môi trường `DEV`**; hệ thống tự động ẩn hoặc vô hiệu hóa các nút thao tác trên môi trường `STAGING` và `PROD`.
  * **👁️ Viewer (`viewer`)**: Chế độ **Chỉ xem (Read-only)**; theo dõi tài nguyên cụm, danh sách VM, Live Console và Audit Logs nhưng **bị ẩn/vô hiệu hóa toàn bộ quyền tạo máy ảo, xóa máy ảo, bật/tắt nguồn và thao tác snapshot**.
* **Nhật Ký Kiểm Toán Toàn Diện (Audit Logs & Compliance)**:
  * Ghi vết đầy đủ mọi hoạt động: **Thời gian thực hiện**, **Danh tính (Username) & Vai trò (Role)**, **Hành động (Action)**, **Mục tiêu (Target VM/Stack)**, **Môi trường (Environment)**, **Trạng thái (SUCCESS / DENIED)** và **Chi tiết nguyên nhân**.

---

### 2. ⚡ Thay Đổi Cấu Hình Nóng (Hotplug Hardware) & Quản Lý Đa Ổ Đĩa (Multi-Disk)
* **Cấu Hình Nóng CPU & RAM (Live Hardware Hotplug)**:
  * Cho phép điều chỉnh trực tiếp số lượng vCPU Cores và dung lượng RAM (MB/GB) trên máy ảo đang chạy mà **không cần tắt máy, không cần reboot và không làm gián đoạn stack Pulumi**.
  * Tự động kiểm tra hạn mức Quota của Developer trước khi áp dụng.
* **Mở Rộng Dung Lượng Đĩa Trực Tuyến (Online Disk Resize)**:
  * Mở rộng dung lượng đĩa ảo trực tuyến (+10GB, +50GB...) ngay khi hệ điều hành đang hoạt động thông qua Proxmox QEMU Resize API.
* **Gắn Thêm Đĩa Phụ Đa Vùng Lưu Trữ (Multi-Disk Attachment)**:
  * **Khởi tạo VM với nhiều ổ đĩa**: OS nằm trên NVMe/`local-lvm`, Data nằm trên HDD/`zfs-storage`.
  * **Hot-attach đĩa phụ**: Gắn thêm đĩa mới (`scsi1`, `scsi2`...) vào VM đang chạy chỉ với 1 cú click.
  * **Tháo đĩa an toàn (Safe Detach)**: Cơ chế bảo vệ chống gỡ nhầm đĩa hệ điều hành chính (`scsi0`).

---

### 3. 🚨 Cảnh Báo Ngưỡng Tài Nguyên Toàn Cụm (Cluster Alerting & Notifications)
* **Bộ Quét Giám Sát Tài Nguyên Tự Động (Background Alert Engine)**:
  * Tự động quét toàn bộ Node và Storage Pool theo chu kỳ 30 giây.
  * Phát hiện Storage Pool vượt ngưỡng ($\ge 85\%$) hoặc Node bị quá tải CPU/RAM ($\ge 85\%$).
  * Tự động giải tỏa trạng thái cảnh báo khi chỉ số hạ xuống mức an toàn.
* **Thông Báo Đa Kênh Tức Thời (Multi-Channel Dispatcher)**:
  * 📱 **Telegram Bot API**: Gửi thông báo HTML đẹp mắt kèm thông số chi tiết của Node/Storage.
  * 🔔 **Webhook (Discord / Slack / MS Teams)**: Gửi Webhook dạng Card Embed với mã màu phân cấp (Warning / Critical / Resolved).
  * 🔴 **Live In-App Alert Banner & Bell**: Thanh cảnh báo ghim đầu trang và chuông thông báo hiệu ứng nhấp nháy đỏ trên Header.
  * 🛑 **Highlight Đỏ Trực Quan**: Đổi màu đỏ cảnh báo trên thanh tiến trình Storage Pool và thẻ Node quá tải.

---

### 4. 🛡️ Tường Lửa & Quản Trị Bảo Mật Máy Ảo (Proxmox VE Firewall Management)
* **Mở/Đóng Port & Quản Lý Security Rules Trực Tiếp**:
  * Thêm, sửa, bật/tắt hoặc xóa Firewall Rules cho từng máy ảo (TCP/UDP, Port Inbound/Outbound, Whitelist IP Source/Dest).
  * Điều chỉnh chính sách Firewall tổng thể (Policy `DROP` / `ACCEPT`, Enable/Disable Firewall).
* **Presets Quy Tắc An Ninh 1-Click**:
  * 🌐 **Web Server**: Mở nhanh Port 80 (HTTP), 443 (HTTPS).
  * 🔑 **SSH Remote**: Mở Port 22 (SSH) có giới hạn IP hoặc công khai.
  * 🐘 **Database**: Mở Port 5432 (PostgreSQL), 3306 (MySQL), 6379 (Redis).
  * ⛵ **Kubernetes**: Mở Port 6443 (K8s API Server).

---

### 5. ⚖️ Quản Trị Hạn Mức Tài Nguyên & Cổng Phê Duyệt (Resource Quotas & Approval Gateway)
* **Hạn Mức Quota Theo Vai Trò (Developer Resource Quotas)**:
  * Đặt hạn mức cứng cho Developer: **Tối đa 2 VMs hoạt động đồng thời**, **Tối đa 4 vCPUs**, **Tối đa 8GB RAM (8192 MB)**.
  * Tab **Phê Duyệt & Quota** hiển thị thanh tiến trình trực quan (% RAM, % vCPU, % VMs) theo thời gian thực.
* **Cổng Phê Duyệt Tự Động (Approval Workflow Gate)**:
  * Khi Developer yêu cầu tạo VM trên môi trường **`STAGING` / `PROD`** hoặc yêu cầu tài nguyên **vượt định mức Quota**, hệ thống tự động chuyển yêu cầu vào Hàng Đợi Chờ Duyệt (Approval Queue).
  * **Admin 1-Click Approval**: Quản trị viên có thể **Phê duyệt (Approve)** hoặc **Từ chối (Reject)** trực tiếp trên Web UI. Pulumi Engine sẽ tự động kích hoạt ngầm ngay sau khi duyệt.

---

### 6. 📦 Hỗ Trợ LXC Container & Thư Viện App Catalog Dựng Sẵn
* **Chuyển Đổi Linh Hoạt QEMU VMs & LXC Containers**:
  * Hỗ trợ tạo cả máy ảo đầy đủ (QEMU) và Container siêu nhẹ (LXC khởi động trong 1 giây).
* **Thư Viện Ứng Dụng Dựng Sẵn 1-Click (1-Click App Catalog)**:
  * 🐘 **PostgreSQL 16 Enterprise**: Tự động cài đặt PostgreSQL 16, tạo Database `appdb`, tạo User `appuser` và mở remote access.
  * ⚡ **Redis 7 In-Memory**: Cài đặt Redis Server, đặt mật khẩu bảo vệ, giới hạn Maxmemory LRU và mở port 6379.
  * 🪣 **MinIO Enterprise S3 Storage**: Khởi tạo MinIO Object Storage, phân vùng data và cấu hình Web Console (port 9001) / S3 API (port 9000).
  * ⛵ **Kubernetes (k3s Node)**: Tự động bootstrap k3s Kubernetes node với kubeconfig phân quyền chuẩn.

---

### 7. 🧙‍♂️ Trình Tạo Máy Ảo 4 Bước (Multi-Step Creation Wizard)
* **Quy Trình Khởi Tạo Trực Quan**:
  * **Bước 1**: Đặt tên VM, chọn môi trường (`DEV`, `STAGING`, `PROD`), cấu hình số lượng (Batch 1-10 VMs) và chọn Node đích/Round-Robin.
  * **Bước 2**: Chọn Proxmox Node, OS Image/Template và Storage Pool chính.
  * **Bước 3**: Tùy chỉnh Hardware (vCPU, RAM, OS Disk), gắn thêm **Đĩa Phụ (Secondary Disks)** trên các pool khác nhau, cấu hình Network Bridge & VLAN Tag.
  * **Bước 4**: Nhúng Cloud-Init User-Data script, Preset mẫu (Docker, Nginx, Hardening) và SSH Public Key.

---

### 8. 📊 Giám Sát Tài Nguyên Toàn Cụm & Điều Hướng Thông Minh
* **Thanh Điều Hướng Node Ghim Cố Định (Sticky Node Nav)**: Tự động cuộn mượt (Smooth scroll) tới Node và tạo hiệu ứng phát sáng viền.
* **Tìm Kiếm Tức Thì (Instant Search)**: Lọc thời gian thực theo Tên VM, ID, IP, Node, Môi trường và Tags.
* **Quản Lý Vòng Đời Máy Ảo (VM Lifecycle)**:
  * Bật (Start), Tắt an toàn (ACPI Shutdown), Tắt nóng (Force Stop), Khởi động lại (Reboot).
  * **Web Console Trực Tiếp**: Mở noVNC Console ngay trong Web Portal.
  * **Snapshot Manager**: Tạo snapshot (kèm RAM state), khôi phục (Rollback) và xóa snapshot.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
pulumi-proxmox/
├── public/                       # Giao diện Web Portal (Dark Glassmorphism UI)
│   ├── index.html                # Cấu trúc HTML, Modals, Wizard & Sub-tabs
│   ├── style.css                 # Hệ thống CSS Design System & Responsive Layout
│   └── app.js                    # Frontend Controller, SSO Handler, Hotplug, Alerts, SSE Stream
├── src/                          # Mã nguồn Backend & Pulumi IaC
│   ├── server.ts                 # Express Server, REST APIs, RBAC Guard & Pulumi Runner
│   ├── auth-service.ts           # Centralized SSO Service (Google, GitHub, Keycloak OIDC, Local)
│   ├── alert-service.ts          # Cluster Resource Alert Engine (Telegram, Webhook, Thresholds)
│   ├── proxmox-api.ts            # Proxmox VE REST Client (QEMU, LXC, Hotplug, Resize, Disks, Firewall)
│   └── pulumi-program.ts         # Khai báo tài nguyên Pulumi IaC & Cloud-Init Snippets
├── .env.example                  # Mẫu cấu hình biến môi trường
├── package.json                  # Dependencies & NPM Scripts
├── Pulumi.yaml                   # Khai báo dự án Pulumi
├── tsconfig.json                 # Cấu hình TypeScript
├── README.md                     # Tài liệu tiếng Việt
└── README.en.md                  # English Documentation
```

---

## ⚙️ Yêu Cầu Hệ Thống

1. **Node.js**: Phiên bản 18 trở lên (Khuyên dùng Node.js 20+ LTS).
2. **Pulumi CLI**: Đã cài đặt trên máy chủ/máy trạm (`pulumi version` $\ge 3.100.0$).
3. **Proxmox VE**: Cụm Proxmox VE 7.x hoặc 8.x có bật API Token và quyền quản trị.
4. **QEMU Guest Agent & Cloud-Init**: Cài đặt sẵn trong các Cloud Images/Templates để nhận diện IP và hỗ trợ hotplug.

---

## 🚀 Hướng Dẫn Cài Đặt & Triển Khai

### Bước 1: Cài đặt Dependencies

```bash
npm install
# Hoặc nếu dùng pnpm:
pnpm install
```

### Bước 2: Cấu hình Biến Môi Trường (`.env`)

Tạo file `.env` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông số cụm Proxmox và cấu hình SSO (nếu dùng):

```env
# Proxmox VE API Endpoint & Token
PROXMOX_VE_ENDPOINT="https://192.168.1.60:8006"
PROXMOX_VE_INSECURE="true"
PROXMOX_VE_API_TOKEN="root@pam!pulumi=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
PROXMOX_VE_SSH_USERNAME="root"
PROXMOX_VE_SSH_PASSWORD="your-proxmox-ssh-password"

# Cấu hình Cổng & Khóa Phiên
PORT=3000
PORTAL_BASE_URL="http://localhost:3000"
SESSION_SECRET="your-secure-session-secret"

# Tài khoản Quản trị Nội bộ (Local Break-glass)
AUTH_LOCAL_ENABLED="true"
AUTH_ADMIN_USERNAME="admin"
AUTH_ADMIN_PASSWORD="Admin@123"
AUTH_DEV_USERNAME="developer"
AUTH_DEV_PASSWORD="dev123"
AUTH_VIEWER_USERNAME="viewer"
AUTH_VIEWER_PASSWORD="view123"

# (Tùy chọn) Kích hoạt SSO Google Workspace / GitHub / Keycloak OIDC
# Xem chi tiết trong file .env.example
```

### Bước 3: Khởi chạy Ứng dụng

* **Chế độ Phát triển (Dev Mode với Hot Reload)**:
  ```bash
  npm run dev
  ```
* **Chế độ Production**:
  ```bash
  npm start
  ```

Truy cập giao diện Web Dashboard tại: `http://localhost:3000`

---

## 🔒 Hướng Dẫn Tạo Proxmox API Token

1. Truy cập Web UI Proxmox VE ➔ **Datacenter** ➔ **Permissions** ➔ **API Tokens**.
2. Nhấn **Add**:
   - **User**: `root@pam` (hoặc user quản trị chuyên dụng).
   - **Token ID**: `pulumi`.
   - Bỏ chọn ô *Privilege Separation* nếu muốn token kế thừa toàn quyền của User.
3. Sao chép chuỗi **Secret Token** và điền vào biến `PROXMOX_VE_API_TOKEN` trong `.env`.
