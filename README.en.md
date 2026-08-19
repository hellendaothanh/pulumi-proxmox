# 🚀 Proxmox VE Self-Service Portal & IaC Automation with Pulumi

Tài liệu tiếng Việt: [README.md](./README.md) | **English**

---

An enterprise-ready, self-service infrastructure portal and automation platform for **Proxmox VE** virtualization clusters using **Infrastructure as Code (IaC)**, built with **Pulumi Automation API**, **Node.js (TypeScript)**, and a sleek Dark Glassmorphic Web Dashboard.

---

## 🌟 Key Features

### 1. 🛡️ User Authentication & RBAC Governance
* **Independent Account Authentication & Session Tokens**:
  * Secure sign-in via dedicated Login screen with token sessions.
  * **Runtime Password Change**: Change passwords directly from the UI (persisted to `.env`), with flexible environment-based user management.
* **3-Tier Role-Based Access Control (RBAC)**:
  * **👑 Administrator (`admin`)**: Full authority; create, reconfigure, control power, snapshot, and delete VMs across all environments (`DEV`, `STAGING`, `PROD`).
  * **👨‍💻 Developer (`developer`)**: Strictly bound by environment isolation — **can only deploy, manage power, and take snapshots in the `DEV` environment**; actions on `STAGING` and `PROD` are dynamically hidden or disabled.
  * **👁️ Viewer (`viewer`)**: **Read-only** mode; view cluster health, VM lists, Live Web Console, and Audit Logs with VM creation, power toggling, snapshot, and deletion controls fully restricted.
* **Audit Logging & Compliance Traceability**:
  * Records detailed transaction trails: **Timestamp**, **Username & Role**, **Action**, **Target VM/Stack**, **Environment**, **Status (SUCCESS / DENIED)**, and **Failure/Denial reasons**.
  * Dedicated **Audit Logs** tab providing full visibility into operational history and compliance auditing.

### 2. 🧙‍♂️ Multi-Step VM Creation Wizard
* **Guided 4-Step Provisioning Flow**:
  * **Step 1 (Target & Naming)**: VM Name, Environment badge (`DEV`, `STAGING`, `PROD`), VM Batch Count (1-10 VMs), and Target Node selection / Round-Robin mode.
  * **Step 2 (Hardware Specs)**: Customize vCPU Cores, RAM (MB/GB), Target Storage Pool (`zfs-storage`, `local-lvm`, etc.), and Disk capacity (GB).
  * **Step 3 (OS Template & Networking)**: Select Cloud Image/OS Template, configure Static IP/CIDR or DHCP, Gateway, and assign Custom Tags.
  * **Step 4 (Cloud-Init & Bootstrap)**: Inject custom user-data/bootstrap scripts, apply 1-click Presets (Docker, Nginx, Hardening), and paste SSH Public Keys.
* **Real-time Form Validation & Live Summary**:
  * Disables forward progression until required inputs are valid.
  * Live specification review card before triggering the deployment.

### 3. 📊 Cluster Resource Overview & Smart Navigation
* **Sticky Node Quick Navigation Bar**:
  * Pinned navigation bar that remains visible when scrolling, showing real-time cluster health, VM tally (`running/total`), and storage engines per node.
  * **1-Click Jump**: Smoothly scrolls directly to the targeted node and triggers a temporary Purple Glow Highlight effect.
  * **Collapsible Node Cards**: Click any node header to collapse/expand its VM & storage panels; includes *Expand All* / *Collapse All* bulk triggers.
* **Instant Search**:
  * Real-time fuzzy filtering across VM Names, VM IDs, IP addresses, Node Names, Environments, and custom Tags.
* **Real-time Node Telemetry**: Node Online/Offline status, % CPU load, RAM usage/available, Uptime, and Node IP addresses (with **1-Click Copy IP**).
* **Storage Pools & Resource Management Tabs**:
  * Dedicated Resource Tabs: Deep inspection of Storage Pools (`ZFS`, `zfs-storage`, `local-lvm`, `Directory`), listing available ISOs, Cloud-Init Images, and VM Disks.
* **Redesigned Clean VM Table**:
  * Intelligently combines VM Name, ID, and Tags in a single structured column.
  * Displays complete hardware specs via Spec Pills: `<cpu> vCPU`, `<layers> RAM`, and `<hard-drive> Disk Size`.
  * **2-Column IP Grid Matrix**: Automatically restricts multi-IP displays to a clean 2-column layout to prevent table overflow and maintain visual balance.
  * **Back to Top Floating Button**: Smart floating button that triggers smooth scrolling back to the top of the dashboard.

### 4. ⚡ VM Lifecycle Management & Fast Operations
* **Direct Power Controls (1-Click Actions)**:
  * Control VM power states directly from the overview table: **Start**, **ACPI Shutdown** (Safe shutdown), **Force Stop** (Hard power off), **Reboot** (Graceful restart), and **Force Reset**.
  * Auto-detects runtime status to present dynamic context buttons with safety confirmation prompts before abrupt power cuts.
* **Integrated Web Console (noVNC / Proxmox Web Console)**:
  * Fullscreen/Modal embedded console window directly inside the web portal.
  * Access VM shells/desktop environments without logging into the primary Proxmox VE web GUI.
  * One-click action to launch console in an independent browser tab.
* **Instant Snapshot Management**:
  * **Create Snapshots**: Custom snapshot naming, rich descriptions, and optional `RAM State` preservation for live VMs.
  * **Rollback Snapshots**: Instant revert to any point-in-time snapshot with a single click (ideal before patching OS or performing risky config updates).
  * **Delete Snapshots**: Easily clean up and prune outdated snapshots.

### 5. 🤖 Post-provisioning Automation & IaC Hooks (Cloud-Init Bootstrap)
* **Automated Post-boot Bootstrap (Custom User-Data)**:
  * Injects Cloud-Init `user-data` YAML or Shell bootstrap scripts (`#!/bin/bash`) directly into VM creation.
  * Automatically creates managed Snippet files on Proxmox VE and mounts them to the VM initialization layer.
* **1-Click Script Presets Library**:
  * 🐳 **Docker & Compose**: Installs Docker Engine, Docker Compose, sets user permissions, and activates daemon.
  * 🌐 **Nginx Web Server**: Installs Nginx, generates an active welcome landing page showing the VM IP, and configures firewall rules.
  * 🛡️ **Hardening & Security**: Enforces UFW firewall (SSH only), configures Fail2ban, and enables automated security updates.
* **SSH Public Key Injection**:
  * Seamlessly passes root SSH public keys for passwordless authentication immediately after first boot.

### 6. 🏗️ Single & Multi-Node Batch VM Provisioning
* **Deploy 1 to 10 VMs in Batches**:
  * Auto-sequential VM naming (e.g., `postgresql` ➔ `postgresql01`, `postgresql02`, `postgresql03`...).
  * Smart **Round-Robin** workload distribution across all selected target nodes.
* **Storage Pool Classification & Filter Tabs**:
  * Dynamic filter tabs: `[All]`, `[zfs-storage]`, `[zfs]`, `[local-lvm]`.
  * Auto-selects and isolates nodes matching the selected storage pool.
* **Live Capacity & Resource Guard**:
  * Visualizes free RAM, available vCPUs, and live storage capacity before allocation.
  * Automatically filters out `local` storage (reserved for templates/backups) from VM disk target destinations.
* **Environment Classification & Tagging**:
  * Environment LED status badges: **DEV** (Green), **STAGING** (Amber), **PROD** (Red).
  * Custom categorization tags (`#database`, `#backend`, `#k8s`...).

### 7. 🛠️ Self-Service Pulumi Stack Management & Live Terminal Logs
* Inventory of all active Pulumi Stacks provisioned through the portal.
* **1-Click Copy IP**: Instant VM IP copy for fast SSH and service connectivity.
* **Live Streaming Console (SSE)**:
  * Real-time `pulumi up` / `pulumi destroy` streaming output directly in the web browser with elapsed timer `[RUNNING] @ Updating... [15s]`.
  * **Destroyed Status Highlighting (`[DESTROYED]`)**: Prominent amber badge banner upon successful stack teardown, with toast notifications and automatic table refresh.
  * **Copy Logs Button (`[📋 Copy log]`)**: 1-click clipboard copy for the entire console output.
  * Safe guards and confirmation prompts when destroying protected VM instances.

---

## 📁 Repository Structure

```text
pulumi-proxmox/
├── public/                       # Frontend Web Portal (Dark Glassmorphic UI)
│   ├── index.html                # UI Structure, RBAC Switcher, Navigation, Modals & Forms
│   ├── style.css                 # CSS Design System, Responsive & Micro-animations
│   └── app.js                    # Frontend logic, RBAC Rules, Audit Logs, Presets, Console, Snapshots, SSE
├── src/                          # Backend & Pulumi IaC Sources
│   ├── server.ts                 # Express Server, RBAC Policy Guard, Audit Engine & Pulumi Runner
│   ├── proxmox-api.ts            # Proxmox REST API Client (Power, Snapshots, Console, Resources)
│   └── pulumi-program.ts         # Pulumi Resource Definitions, Cloud-Init Snippets & VM Proxmox VE
├── .env.example                  # Environment Variables Template
├── package.json                  # Dependencies & Scripts
├── Pulumi.yaml                   # Pulumi Project Definition
├── tsconfig.json                 # TypeScript Configuration
├── README.md                     # Vietnamese Documentation
└── README.en.md                  # English Documentation
```

---

## ⚙️ System Requirements

1. **Node.js**: v18 or later (Node.js 20+ LTS recommended).
2. **Pulumi CLI**: Installed on host machine (`pulumi version` >= 3.100.0).
3. **Proxmox VE**: Proxmox VE 7.x / 8.x cluster with API Token and administrator privileges.
4. **QEMU Guest Agent & Cloud-Init**: Pre-installed in Cloud Images/Templates for automatic IP resolution and bootstrap execution.

---

## 🚀 Setup & Deployment

### Step 1: Install Dependencies

```bash
npm install
# Or with pnpm:
pnpm install
```

### Step 2: Configure Environment Variables (`.env`)

Copy the example configuration:

```bash
cp .env.example .env
```

Edit `.env` with your Proxmox cluster parameters:

```env
# Proxmox VE API Endpoint
PROXMOX_VE_ENDPOINT="https://192.168.1.100:8006"
PROXMOX_VE_INSECURE="true"

# API Token Authentication (PVEAPIToken=USER@REALM!TOKENID=UUID)
PROXMOX_VE_API_TOKEN="root@pam!pulumi=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Server Port
PORT=3000

# Pulumi Backend (Defaults to Local File Backend)
PULUMI_BACKEND_URL="file://~"
```

### Step 3: Start the Application

* **Development Mode (with Hot Reload)**:
  ```bash
  npm run dev
  ```
* **Production Mode**:
  ```bash
  npm start
  ```

Open your browser at: `http://localhost:3000`

---

## 🔒 Creating a Proxmox API Token

1. Log in to Proxmox VE Web UI ➔ **Datacenter** ➔ **Permissions** ➔ **API Tokens**.
2. Click **Add**:
   - **User**: `root@pam` (or your dedicated automation user).
   - **Token ID**: `pulumi`.
   - Uncheck *Privilege Separation* to inherit user roles/permissions.
3. Copy the **Secret Token** value into the `PROXMOX_VE_API_TOKEN` key in your `.env` file.
