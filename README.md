# 🚀 Proxmox VE Self-Service Portal & IaC Automation with Pulumi

English documentation: [README.en.md](./README.en.md) | **Tiếng Việt**

---

Hệ thống quản lý, giám sát và tự động hóa khởi tạo hạ tầng máy ảo (VM) trên cụm **Proxmox VE** theo mô hình **Infrastructure as Code (IaC)**, xây dựng trên nền tảng **Pulumi Automation API**, **Node.js (TypeScript)** và giao diện Web Dashboard hiện đại chuẩn Enterprise.

---

## 🌟 Tính Năng Nổi Bật

### 1. 📊 Giám Sát Tài Nguyên Toàn Cụm (Cluster Overview)
* **Thông tin Node thời gian thực**: Trạng thái Online/Offline, % CPU tải, RAM sử dụng/còn trống, Uptime và địa chỉ IP của từng Node (kèm nút **1-Click Copy IP**).
* **Quản lý Kho Lưu Trữ (Storage Pools)**: Hiển thị dung lượng chi tiết của các Storage Pools (`ZFS`, `zfs-storage`, `local-lvm`, `Directory`), xem danh sách các file ISO, Cloud-Init Images và VM Disks bên trong.
* **Danh sách Máy Ảo theo Node**: Hiển thị bảng VMs của từng Node, tự động trích xuất IP qua **QEMU Guest Agent** và Modal xem toàn bộ cấu hình gốc (Proxmox Raw Config).

### 2. ⚡ Khởi Tạo Máy Ảo Đơn & Cụm Máy Ảo (Single & Multi-Node Batch Deploy)
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
* **Kiến trúc CPU & Mạng**:
  * Tùy chọn CPU Model (`host` Passthrough, `x86-64-v2-AES`, `x86-64-v3`, `kvm64`...).
  * Cấu hình Network Bridge (`vmbr0`, `vmbr1`...) kèm **VLAN Tag** (1 - 4094 hoặc Untagged).
* **Tương thích Phần cứng & Ổn định**:
  * Sử dụng Chipset `q35`, Cloud-Init trên bus `ide0`/`scsi0` và chuẩn SCSI Controller `virtio-scsi-single`.
  * Tích hợp cơ chế **Protection Mode** chống xóa nhầm máy ảo quan trọng trên Proxmox VE.

### 3. 🛠️ Bảng Điều Khiển Quản Lý Stack (Self-Service Pulumi Dashboard)
* Danh sách toàn bộ các Pulumi Stacks đã triển khai qua Portal.
* **1-Click Copy IP**: Sao chép nhanh địa chỉ IP của VM để SSH hoặc cấu hình ứng dụng.
* **Terminal Console Thời Gian Thực (SSE Stream)**:
  * Theo dõi tiến trình `pulumi up` / `pulumi destroy` trực tiếp từ Web UI.
  * Tích hợp bộ đếm giây thông minh `[RUNNING] @ Updating... [15s]` và log chuẩn DevOps CLI.
  * Cảnh báo an toàn khi xóa máy ảo đang bật chế độ Protection trên Proxmox VE.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
pulumi-proxmox/
├── public/                       # Giao diện Web Portal (Dark Glassmorphic UI)
│   ├── index.html                # Cấu trúc giao diện và các form khởi tạo
│   ├── style.css                 # Hệ thống CSS Design System & Micro-animations
│   └── app.js                    # Xử lý tương tác Frontend, WebSocket/SSE log stream
├── src/                          # Mã nguồn Backend & Pulumi IaC
│   ├── server.ts                 # Express Server & Pulumi Automation API Runner
│   ├── proxmox-api.ts            # Proxmox REST API Client
│   └── pulumi-program.ts         # Khai báo tài nguyên Pulumi cho VM Proxmox VE
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
4. **QEMU Guest Agent**: Cài đặt sẵn trong các Cloud Images/Templates để tự động nhận diện IP.

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
