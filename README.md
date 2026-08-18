# 🚀 Proxmox VE Self-Service Portal & IaC Automation with Pulumi

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

### 4. 🛡️ Tiện Ích Tự Động Hóa WireGuard VPN (`deploy-wg`)
* Script Bash quản lý WireGuard VPN Hub & Peer Client thông minh.
* Tự động cấu hình tường lửa (`iptables`, `nftables`, `firewalld`, `ufw`, `pf`).
* Quản lý vòng đời Client, hỗ trợ phân chia dải IP, giới hạn thời gian hết hạn (Expiry), xuất mã QR Terminal và File `.conf`.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
pulumi-proxmox/
├── public/                       # Giao diện Web Portal (Dark Glassmorphic UI)
│   ├── index.html                # Cấu trúc giao diện và các form khởi tạo
│   ├── style.css                 # Hệ thống CSS Design System & Micro-animations
│   └── app.js                    # Xử lý tương tác Frontend, WebSocket/SSE log stream
├── src/                          # Mã nguồn Backend & Pulumi IaC
│   ├── server.ts                 # Express Server & Pulumi Automation API Runner
│   ├── proxmox-api.ts            # Proxmox REST API Client
│   └── pulumi-program.ts         # Khai báo tài nguyên Pulumi cho VM Proxmox VE
├── deploy-wg                     # Script quản lý WireGuard VPN Hub & Clients
├── .env.example                  # File mẫu cấu hình biến môi trường
├── package.json                  # Dependencies & Scripts
├── Pulumi.yaml                   # Pulumi Project Definition
└── tsconfig.json                 # Cấu hình TypeScript
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
PROXMOX_VE_ENDPOINT="https://192.168.1.100:8006/"
PROXMOX_VE_INSECURE="true"

# Proxmox API Token (Format: USER@REALM!TOKENID=SECRET)
PROXMOX_VE_API_TOKEN="root@pam!pulumi=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Thông tin SSH Proxmox Host (Dùng khi import Cloud Image / Disk)
PROXMOX_VE_SSH_USERNAME="root"
PROXMOX_VE_SSH_PASSWORD="your-root-password"
# Hoặc dùng SSH Private Key:
# PROXMOX_VE_SSH_PRIVATE_KEY="-----BEGIN OPENSSH PRIVATE KEY-----\n..."

# Cổng Web Portal
PORT=3000
```

> **Mẹo tạo API Token trên Proxmox VE**:
> 1. Vào **Proxmox VE Web UI** ➔ **Datacenter** ➔ **Permissions** ➔ **API Tokens** ➔ **Add**.
> 2. Chọn User `root@pam`, đặt Token ID là `pulumi`, bỏ chọn *Privilege Separation*.
> 3. Sao chép Secret Token và dán vào `PROXMOX_VE_API_TOKEN`.

---

### Bước 3: Khởi Chạy Ứng Dụng

#### Chế độ Phát triển (Development with Auto-reload):
```bash
npm run dev
```

#### Chế độ Chạy chính thức (Production):
```bash
npm start
```

Sau khi khởi chạy thành công, mở trình duyệt và truy cập:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Hướng Dẫn Sử Dụng Giao Diện Web

### 1. Giám sát & Quét tài nguyên cụm
* Chọn tab **📊 Tài Nguyên Cụm (Cluster)** để xem trạng thái các Node, CPU/RAM tải thực tế và danh sách VMs đang chạy.
* Bấm vào nút icon **Sao chép** cạnh IP của Node hoặc IP của máy ảo để lấy địa chỉ nhanh chóng.
* Bấm nút **Chi tiết** trên từng VM để xem thông số phần cứng, card mạng, chế độ Protection và cấu hình raw.

### 2. Khởi tạo 1 Máy Ảo Mới
1. Chuyển sang tab **Khởi Tạo VM**.
2. Giữ thanh trượt **Số Lượng (Cluster)** ở mức `1 VM`.
3. Nhập **Tên Máy Ảo**, chọn **Môi Trường** (`DEV`, `STAG`, `PROD`) và nhập Tags nếu cần.
4. Chọn **Proxmox Node** mục tiêu (xem thẻ *Thống Kê Tài Nguyên Sống* để kiểm tra dung lượng trống).
5. Chọn **Ổ Lưu Trữ (Datastore)**, **Image OS (Cloud-Init/ISO)**, **Network Bridge** và **VLAN Tag** (nếu có).
6. Kéo thanh trượt điều chỉnh **vCPU**, **RAM (GB)**, **Dung Lượng Đĩa (GB)**.
7. Dán **SSH Public Key** để đăng nhập không cần mật khẩu.
8. Bấm **Triển Khai VM** và theo dõi tiến trình hiển thị trực tiếp trên Terminal Log.

### 3. Khởi tạo Cụm Máy Ảo (Cluster Batch Deployment)
1. Kéo thanh trượt **Số Lượng (Cluster)** lên số lượng mong muốn (ví dụ: `3 VMs`).
2. Nhập tên gốc cho cụm (ví dụ: `k8s-worker` hoặc `postgresql`).
3. Dùng các Tab bộ lọc Storage (`zfs-storage`, `local-lvm`...) để lọc ra nhóm Node cùng loại phần cứng.
4. Tích chọn các Node muốn phân bổ ➔ Xem trước danh sách phân tầng tại khung **Xem trước phân bổ cụm**.
5. Bấm **Triển Khai Cụm 3 Máy Ảo** ➔ Hệ thống sẽ tự động khởi tạo tuần tự từng VM trên các Node đã chọn.

### 4. Quản lý & Xóa Máy Ảo
* Trong bảng **Danh Sách VM Đã Triển Khai (Pulumi Stacks)**, bấm nút **Xóa** cạnh VM tương ứng.
* Nếu VM đang bật **Protection Mode**, hệ thống sẽ cảnh báo an toàn. Bạn cần tắt Protection trên Proxmox Web UI hoặc xác nhận Force Destroy để tiến hành xóa sạch tài nguyên.

---

## 🔒 Quản Lý VPN WireGuard (`deploy-wg`)

Thư mục dự án đi kèm công cụ `deploy-wg` hỗ trợ thiết lập mạng riêng ảo an toàn:

```bash
# Xem hướng dẫn sử dụng
./deploy-wg --help

# Khởi chạy giao diện Menu quản lý tương tác (yêu cầu whiptail/dialog)
./deploy-wg --menu

# Tạo cấu hình cho 1 client mới với tên chỉ định
./deploy-wg client-dev-01

# Xóa cấu hình của 1 client
./deploy-wg --remove client-dev-01
```

---

## 📜 Giấy Phép & Tác Quyền

Dự án được phát hành dưới giấy phép mã nguồn mở **MIT License**. Tự do sử dụng, tùy biến và triển khai cho hạ tầng doanh nghiệp của bạn.
