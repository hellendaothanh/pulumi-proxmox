# 🚀 Proxmox VE Self-Service Portal & IaC Automation with Pulumi

English documentation: [README.en.md](./README.en.md) | **Tiếng Việt**

---

Hệ thống quản lý, giám sát và tự động hóa khởi tạo hạ tầng máy ảo (VM) trên cụm **Proxmox VE** theo mô hình **Infrastructure as Code (IaC)**, xây dựng trên nền tảng **Pulumi Automation API**, **Node.js (TypeScript)** và giao diện Web Dashboard hiện đại chuẩn Enterprise.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🛡️ Xác Thực & Phân Quyền Người Dùng 3 Cấp Độ (User Authentication & RBAC Governance)
* **Xác Thực Tài Khoản Độc Lập (Authentication & Session Tokens)**:
  * Đăng nhập an toàn qua Màn hình Login với Token Session.
  * Hỗ trợ **Đổi Mật Khẩu** trực tiếp từ giao diện Web (lưu vĩnh viễn vào file `.env`), cấu hình linh hoạt biến môi trường không hardcode.
* **Ma Trận Phân Quyền 3 Vai Trò (Role-Based Access Control - RBAC)**:
  * **👑 Administrator (`admin`)**: Toàn quyền quản trị hạ tầng; được phép tạo, cấu hình, thay đổi, xóa máy ảo và snapshots trên mọi môi trường (`DEV`, `STAGING`, `PROD`).
  * **👨‍💻 Developer (`developer`)**: Bị giới hạn nghiêm ngặt theo chính sách Multi-tenancy — **chỉ được phép khởi tạo, quản lý nguồn và tạo snapshot máy ảo trên môi trường `DEV`**; hệ thống tự động ẩn hoặc vô hiệu hóa các nút thao tác trên môi trường `STAGING` và `PROD`.
  * **👁️ Viewer (`viewer`)**: Chế độ **Chỉ xem (Read-only)**; theo dõi tài nguyên cụm, danh sách VM, Live Console và Audit Logs nhưng **bị ẩn/vô hiệu hóa toàn bộ quyền tạo máy ảo, xóa máy ảo, bật/tắt nguồn và thao tác snapshot**.
* **Nhật Ký Kiểm Toán Toàn Diện (Audit Logs & Compliance)**:
  * Ghi vết đầy đủ mọi hoạt động: **Thời gian thực hiện**, **Danh tính (Username) & Vai trò (Role)**, **Hành động (Action)**, **Mục tiêu (Target VM/Stack)**, **Môi trường (Environment)**, **Trạng thái (SUCCESS / DENIED)** và **Chi tiết nguyên nhân**.
  * Chuyên mục **Audit Logs** trực quan giúp truy vết lịch sử triển khai, tuân thủ tiêu chuẩn an toàn thông tin DevSecOps.

### 2. 🧙‍♂️ Trình Tạo Máy Ảo Theo Từng Bước Thông Minh (Multi-Step Creation Wizard)
* **Quy Trình Khởi Tạo 4 Bước Trực Quan (Step-by-Step Wizard)**:
  * **Bước 1 (Mục Tiêu & Tên Gọi)**: Đặt tên VM, chọn môi trường (`DEV`, `STAGING`, `PROD`), cấu hình số lượng máy ảo (Batch 1-10 VMs) và chọn Node đích/Round-Robin.
  * **Bước 2 (Cấu Hình Phần Cứng)**: Tùy chỉnh vCPU Cores, RAM (MB/GB), Storage Pool đích (`zfs-storage`, `local-lvm`, v.v.) và dung lượng Disk (GB).
  * **Bước 3 (OS Template & Mạng)**: Chọn Cloud Image/OS Template, cấu hình IP/CIDR hoặc DHCP, Gateway và gắn Tag phân loại.
  * **Bước 4 (Cloud-Init & Tự Động Hóa)**: Nhúng script bootstrap, chọn Preset mẫu (Docker, Nginx, Hardening) và nạp SSH Public Key.
* **Tự Động Kiểm Tra Tính Hợp Lệ (Step Validation & Live Summary)**:
  * Khóa nút tiếp tục nếu thiếu thông tin bắt buộc.
  * Bảng tổng hợp cấu hình tóm tắt trực tiếp trước khi nhấn **Khởi tạo (Deploy)**.

### 3. 📊 Giám Sát Tài Nguyên Toàn Cụm & Điều Hướng Thông Minh
* **Thanh Mục Lục Node Neo Cố Định (Sticky Node Quick Nav)**:
  * Thanh điều hướng ghim ở mép trên màn hình khi cuộn trang, hiển thị tổng quan trạng thái, số lượng VM (`running/total`) và loại Storage của từng Node.
  * **1-Click Chuyển Nhanh**: Tự động cuộn mượt (Smooth scroll) đến đúng Node và kích hoạt hiệu ứng viền phát sáng (Purple Glow Highlight).
  * **Đóng/Mở Chi Tiết Từng Node (Collapsible Node Cards)**: Nhấp vào tiêu đề để thu gọn hoặc mở rộng nội dung; hỗ trợ nút *Mở tất cả* / *Thu gọn tất cả*.
* **Tìm Kiếm Tức Thì (Instant Search)**:
  * Lọc thời gian thực theo Tên VM, VM ID, Địa chỉ IP, Node Name, Môi trường và Tags tùy chỉnh.
* **Thông tin Node thời gian thực**: Trạng thái Online/Offline, % CPU tải, RAM sử dụng/còn trống, Uptime và địa chỉ IP của từng Node (kèm nút **1-Click Copy IP**).
* **Quản lý Kho Lưu Trữ & Tài Nguyên (Storage Pools & Resource Tabs)**:
  * Tab quản lý tài nguyên riêng biệt: xem dung lượng chi tiết của các Storage Pools (`ZFS`, `zfs-storage`, `local-lvm`, `Directory`), xem danh sách các file ISO, Cloud-Init Images và VM Disks bên trong.
* **Bảng Danh Sách Máy Ảo Tinh Gọn**:
  * Gộp thông minh Tên VM, ID và Tags vào một cột rõ ràng, chống rối mắt.
  * Hiển thị đầy đủ thông số phần cứng dạng Spec Pills: `<cpu> vCPU`, `<layers> RAM`, và `<hard-drive> Disk Size`.
  * **Bố cục IP ma trận**: Tự động giới hạn tối đa 2 dải IP trên mỗi hàng, giúp bảng cân đối và không bị kéo dãn khi VM có nhiều card mạng.
  * **Nút Cuộn Lên Đầu Trang (Back to Top)**: Nút nổi thông minh xuất hiện khi cuộn trang, hỗ trợ quay lại đầu trang tức thì.

### 4. ⚡ Quản Lý Vòng Đời VM & Thao Tác Nhanh (VM Lifecycle Management)
* **Thao Tác Nguồn Trực Tiếp (1-Click Power Operations)**:
  * Điều khiển tức thì ngay tại bảng máy ảo: **Start** (Bật nguồn), **ACPI Shutdown** (Tắt nguồn an toàn), **Force Stop** (Tắt nóng), **Reboot** (Khởi động lại) và **Force Reset**.
  * Tự động nhận diện trạng thái Running/Stopped để hiển thị bộ nút nguồn tương ứng kèm xác nhận an toàn trước khi tắt đột ngột.
* **Web Console Trực Tiếp (noVNC / Proxmox Web Console)**:
  * Tích hợp màn hình Console trực tiếp ngay trong giao diện Web Portal dưới dạng Modal lớn.
  * Cho phép quản trị viên truy cập terminal máy ảo mà không cần mở giao diện Proxmox VE gốc.
  * Hỗ trợ nút mở Console trong tab mới độc lập.
* **Quản Lý Snapshot Máy Ảo (Instant Snapshot Manager)**:
  * **Tạo Snapshot mới**: Đặt tên, mô tả và tùy chọn lưu trạng thái RAM (`RAM State` khi VM đang chạy).
  * **Khôi Phục (Rollback)**: Đưa máy ảo về trạng thái snapshot đã lưu chỉ với 1 cú nhấp chuột (hữu ích trước khi cập nhật OS hoặc deploy app).
  * **Xóa Snapshot**: Dọn dẹp các bản snapshot cũ an toàn và nhanh chóng.

### 5. 🤖 Tự Động Hóa Sau Khởi Tạo & IaC (Post-provisioning Hooks & Cloud-Init)
* **Tự Động Cấu Hình Ngay Khi Boot (Post-provisioning Bootstrap)**:
  * Nhúng trực tiếp Cloud-Init `user-data` (YAML) hoặc Shell Script (`#!/bin/bash`) vào quá trình khởi tạo VM.
  * Tự động tạo Snippet lưu trữ an toàn trên Proxmox VE và mount vào VM qua Cloud-Init.
* **Thư Viện Mẫu Cấu Hình Sẵn Có (1-Click Script Presets)**:
  * 🐳 **Docker & Compose**: Tự động cài đặt Docker Engine, Docker Compose, cấu hình quyền root và bật service.
  * 🌐 **Nginx Web Server**: Tự động cài Nginx, tạo trang Web chào mừng kèm hiển thị IP và mở firewall.
  * 🛡️ **Hardening & Security**: Cấu hình tường lửa UFW (chỉ mở SSH), cài đặt Fail2ban và cấu hình cập nhật tự động.
* **Tự Động Bơm SSH Key (SSH Key Injection)**:
  * Cho phép dán Public Key để đăng nhập SSH không cần mật khẩu ngay sau khi VM hoàn tất boot.

### 6. 🏗️ Khởi Tạo Máy Ảo Đơn & Cụm Máy Ảo (Single & Multi-Node Batch Deploy)
* **Khởi tạo 1 VM hoặc Cụm nhiều VM (1 - 10 VMs)**:
  * Tự động sinh tên máy ảo tăng dần (ví dụ: `postgresql` ➔ `postgresql01`, `postgresql02`, `postgresql03`...).
  * Tự động rải đều máy ảo qua các Node được chọn theo thuật toán **Round-Robin**.
* **Phân Loại & Lọc Node theo Storage Pool**:
  * Các Tab lọc động: `[Tất Cả]`, `[zfs-storage]`, `[zfs]`, `[local-lvm]`.
  * Tự động cô lập và chỉ chọn các Node sở hữu đúng Storage Pool được chọn.
* **Hiển thị Tài Nguyên Khả Dụng Sống**:
  * Xem trực quan lượng RAM trống, số vCPU và dung lượng đĩa khả dụng của từng Node trước khi phân bổ.
  * Tự động loại bỏ kho lưu trữ `local` (chỉ dùng cho ISO/Template/Backup) khỏi danh sách Datastore chứa VM Disk.
* **Tùy biến Môi trường & Gán Thẻ (Tags)**:
  * Hỗ trợ gán môi trường với đèn LED trực quan: **DEV** (Xanh lá), **STAGING** (Vàng cam), **PROD** (Đỏ).
  * Hỗ trợ Tags phân loại tùy chỉnh (`#database`, `#backend`, `#k8s`...).

### 7. 🛠️ Bảng Điều Khiển Quản Lý Stack & Terminal Logs (Self-Service Dashboard)
* Danh sách toàn bộ các Pulumi Stacks đã triển khai qua Portal.
* **1-Click Copy IP**: Sao chép nhanh địa chỉ IP của VM để SSH hoặc cấu hình ứng dụng.
* **Terminal Console Thời Gian Thực (SSE Stream)**:
  * Theo dõi tiến trình `pulumi up` / `pulumi destroy` trực tiếp từ Web UI với bộ đếm giây `[RUNNING] @ Updating... [15s]`.
  * **Nổi bật trạng thái Xóa Thành Công (`[DESTROYED]`)**: Banner cam viền nổi bật giúp nhận biết ngay khi hạ tầng đã dọn dẹp sạch sẽ, kèm thông báo Toast và tự động làm mới bảng.
  * **Nút Sao Chép Nhật Ký (`[📋 Sao chép log]`)**: Copy toàn bộ output log trong Terminal chỉ với 1 cú nhấp chuột.
  * Cảnh báo an toàn khi xóa máy ảo đang bật chế độ Protection trên Proxmox VE.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
pulumi-proxmox/
├── public/                       # Giao diện Web Portal (Dark Glassmorphic UI)
│   ├── index.html                # Cấu trúc giao diện, RBAC switcher, thanh điều hướng, modals và forms
│   ├── style.css                 # Hệ thống CSS Design System, Responsive & Micro-animations
│   └── app.js                    # Xử lý Frontend, RBAC Rules, Audit Logs, Presets, Console, Snapshots, SSE
├── src/                          # Mã nguồn Backend & Pulumi IaC
│   ├── server.ts                 # Express Server, RBAC Policy Guard, Audit Engine & Pulumi Runner
│   ├── proxmox-api.ts            # Proxmox REST API Client (Power, Snapshots, Console, Resources)
│   └── pulumi-program.ts         # Khai báo tài nguyên Pulumi, Cloud-Init Snippets & VM Proxmox VE
├── .env.example                  # File mẫu cấu hình biến môi trường
├── package.json                  # Dependencies & Scripts
├── Pulumi.yaml                   # Pulumi Project Definition
├── tsconfig.json                 # Cấu hình TypeScript
├── README.md                     # Tài liệu tiếng Việt
└── README.en.md                  # English Documentation
```

---

## ⚙️ Yêu Cầu Hệ Thống

1. **Node.js**: Phiên bản 18 trở lên (khuyên dùng Node.js 20+ LTS).
2. **Pulumi CLI**: Đã cài đặt trên máy chủ/máy trạm (`pulumi version` >= 3.100.0).
3. **Proxmox VE**: Cụm Proxmox VE 7.x hoặc 8.x có bật API Token và quyền quản trị.
4. **QEMU Guest Agent & Cloud-Init**: Cài đặt sẵn trong các Cloud Images/Templates để tự động cấu hình mạng và thực thi script bootstrap.

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

Chỉnh sửa nội dung file `.env` với thông tin cụm Proxmox của bạn:

```env
# Proxmox VE API Endpoint
PROXMOX_VE_ENDPOINT="https://192.168.1.100:8006"
PROXMOX_VE_INSECURE="true"

# API Token Authentication (PVEAPIToken=USER@REALM!TOKENID=UUID)
PROXMOX_VE_API_TOKEN="root@pam!pulumi=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Server Port
PORT=3000

# Pulumi Backend Login (Mặc định dùng Local Backend)
PULUMI_BACKEND_URL="file://~"
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
