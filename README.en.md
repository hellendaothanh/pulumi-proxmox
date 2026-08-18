# 🚀 Proxmox VE Self-Service Portal & IaC Automation with Pulumi

Tài liệu tiếng Việt: [README.md](./README.md) | **English**

---

An enterprise-ready, self-service infrastructure portal and automation platform for **Proxmox VE** virtualization clusters using **Infrastructure as Code (IaC)**, built with **Pulumi Automation API**, **Node.js (TypeScript)**, and a sleek Dark Glassmorphic Web Dashboard.

---

## 🌟 Key Features

### 1. 📊 Cluster Resource Overview & Smart Navigation
* **Sticky Node Quick Navigation Bar**:
  * Pinned navigation bar that remains visible when scrolling, showing real-time cluster health, VM tally (`running/total`), and storage engines per node.
  * **1-Click Jump**: Smoothly scrolls directly to the targeted node and triggers a temporary Purple Glow Highlight effect.
  * **Collapsible Node Cards**: Click any node header to collapse/expand its VM & storage panels; includes *Expand All* / *Collapse All* bulk triggers.
* **Instant Search**:
  * Real-time fuzzy filtering across VM Names, VM IDs, IP addresses, Node Names, Environments, and custom Tags.
* **Real-time Node Telemetry**: Node Online/Offline status, % CPU load, RAM usage/available, Uptime, and Node IP addresses (with **1-Click Copy IP**).
* **Storage Pools Inspector**: Deep inspection of Storage Pools (`ZFS`, `zfs-storage`, `local-lvm`, `Directory`), listing available ISOs, Cloud-Init Images, and VM Disks.
* **Redesigned Clean VM Table**:
  * Intelligently combines VM Name, ID, and Tags in a single structured column.
  * Displays complete hardware specs via Spec Pills: `<cpu> vCPU`, `<layers> RAM`, and `<hard-drive> Disk Size`.
  * **2-Column IP Grid Matrix**: Automatically restricts multi-IP displays to a clean 2-column layout to prevent table overflow and maintain visual balance.
  * **Back to Top Floating Button**: Smart floating button that triggers smooth scrolling back to the top of the dashboard.

### 2. ⚡ Single & Multi-Node Batch VM Provisioning
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
* **CPU & Network Architecture**:
  * CPU Type selection (`host` Passthrough, `x86-64-v2-AES`, `x86-64-v3`, `kvm64`...).
  * Network Bridge selection (`vmbr0`, `vmbr1`...) with optional **VLAN Tag** (1 - 4094 or Untagged).
* **Hardware Compatibility & Safety**:
  * Emulates modern `q35` chipset, Cloud-Init on `ide0`/`scsi0`, and `virtio-scsi-single` storage controllers.
  * Integrates Proxmox **Protection Mode** flag to prevent accidental deletion of critical production VMs.

### 3. 🛠️ Self-Service Pulumi Stack Management & Live Terminal Logs
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
│   ├── index.html                # UI Structure, Navigation Bar & Provisioning Forms
│   ├── style.css                 # CSS Design System, Responsive & Micro-animations
│   └── app.js                    # Frontend logic, Instant Search, Sticky Nav, SSE log stream
├── src/                          # Backend & Pulumi IaC Sources
│   ├── server.ts                 # Express Server & Pulumi Automation API Runner
│   ├── proxmox-api.ts            # Proxmox REST API Client (Fetch Nodes, Storages, VMs, Disks)
│   └── pulumi-program.ts         # Pulumi Resource Definitions for Proxmox VE
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
4. **QEMU Guest Agent**: Installed in Cloud Images/Templates for automatic IP resolution.

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
