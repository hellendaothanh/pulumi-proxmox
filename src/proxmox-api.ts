import fetch from "node-fetch";
import https from "https";
import * as dotenv from "dotenv";

dotenv.config();

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

export class ProxmoxApiClient {
    private get endpoint(): string {
        return (process.env.PROXMOX_VE_ENDPOINT || "").replace(/\/$/, "");
    }

    private get apiToken(): string {
        return process.env.PROXMOX_VE_API_TOKEN || "";
    }

    private async request(path: string, options: { method?: string; body?: any } = {}): Promise<any> {
        if (!this.endpoint) {
            throw new Error("PROXMOX_VE_ENDPOINT chưa được cấu hình trong file .env (ví dụ: https://192.168.1.100:8006)");
        }
        if (!this.apiToken) {
            throw new Error("PROXMOX_VE_API_TOKEN chưa được cấu hình trong file .env");
        }

        const url = `${this.endpoint}/api2/json${path}`;
        const authHeader = this.apiToken.startsWith("PVEAPIToken=") 
            ? this.apiToken 
            : `PVEAPIToken=${this.apiToken}`;

        const headers: Record<string, string> = {
            Authorization: authHeader,
        };

        let bodyData: any = undefined;
        if (options.body) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            const params = new URLSearchParams();
            for (const key of Object.keys(options.body)) {
                if (options.body[key] !== undefined && options.body[key] !== null) {
                    params.append(key, String(options.body[key]));
                }
            }
            bodyData = params.toString();
        }

        const res = await fetch(url, {
            method: options.method || "GET",
            headers,
            body: bodyData,
            agent: httpsAgent as any,
        });

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Proxmox API Error [${res.status}]: ${errBody || res.statusText}`);
        }

        const data: any = await res.json();
        return data.data;
    }

    // Power Operations (Start, Stop, Shutdown, Reset, Reboot)
    async vmStart(nodeName: string, vmid: number | string) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/status/start`, { method: "POST" });
    }

    async vmStop(nodeName: string, vmid: number | string) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/status/stop`, { method: "POST" });
    }

    async vmShutdown(nodeName: string, vmid: number | string) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/status/shutdown`, { method: "POST" });
    }

    async vmReset(nodeName: string, vmid: number | string) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/status/reset`, { method: "POST" });
    }

    async vmReboot(nodeName: string, vmid: number | string) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/status/reboot`, { method: "POST" });
    }

    // Snapshot Operations
    async getVmSnapshots(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/snapshot`);
        } catch (e) {
            return [];
        }
    }

    async createVmSnapshot(nodeName: string, vmid: number | string, snapname: string, description?: string, vmstate: boolean = false) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/snapshot`, {
            method: "POST",
            body: {
                snapname,
                description: description || "",
                vmstate: vmstate ? 1 : 0,
            },
        });
    }

    async rollbackVmSnapshot(nodeName: string, vmid: number | string, snapname: string) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/snapshot/${snapname}/rollback`, {
            method: "POST",
        });
    }

    async deleteVmSnapshot(nodeName: string, vmid: number | string, snapname: string) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/snapshot/${snapname}`, {
            method: "DELETE",
        });
    }

    // ==========================================
    // PROXMOX FIREWALL & SECURITY GROUPS API
    // ==========================================
    async getVmFirewallRules(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/firewall/rules`);
        } catch (e) {
            return [];
        }
    }

    async getVmFirewallOptions(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/firewall/options`);
        } catch (e) {
            return { enable: 1, policy_in: "DROP", policy_out: "ACCEPT" };
        }
    }

    async setVmFirewallOptions(nodeName: string, vmid: number | string, options: { enable?: number | boolean; policy_in?: string; policy_out?: string }) {
        const body: Record<string, any> = {};
        if (options.enable !== undefined) body.enable = options.enable ? 1 : 0;
        if (options.policy_in) body.policy_in = options.policy_in;
        if (options.policy_out) body.policy_out = options.policy_out;
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/firewall/options`, {
            method: "PUT",
            body,
        });
    }

    async addVmFirewallRule(nodeName: string, vmid: number | string, rule: {
        action: "ACCEPT" | "DROP" | "REJECT";
        type: "in" | "out";
        proto?: "tcp" | "udp" | "icmp" | "any";
        dport?: string;
        sport?: string;
        source?: string;
        dest?: string;
        comment?: string;
        enable?: number | boolean;
    }) {
        const body: Record<string, any> = {
            action: rule.action || "ACCEPT",
            type: rule.type || "in",
            enable: rule.enable !== undefined ? (rule.enable ? 1 : 0) : 1,
        };
        if (rule.proto && rule.proto !== "any") body.proto = rule.proto;
        if (rule.dport) body.dport = String(rule.dport).trim();
        if (rule.sport) body.sport = String(rule.sport).trim();
        if (rule.source) body.source = String(rule.source).trim();
        if (rule.dest) body.dest = String(rule.dest).trim();
        if (rule.comment) body.comment = String(rule.comment).trim();

        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/firewall/rules`, {
            method: "POST",
            body,
        });
    }

    async updateVmFirewallRule(nodeName: string, vmid: number | string, pos: number, rule: {
        action?: "ACCEPT" | "DROP" | "REJECT";
        type?: "in" | "out";
        proto?: "tcp" | "udp" | "icmp" | "any";
        dport?: string;
        sport?: string;
        source?: string;
        dest?: string;
        comment?: string;
        enable?: number | boolean;
    }) {
        const body: Record<string, any> = {};
        if (rule.action) body.action = rule.action;
        if (rule.type) body.type = rule.type;
        if (rule.enable !== undefined) body.enable = rule.enable ? 1 : 0;
        if (rule.proto) body.proto = rule.proto === "any" ? "" : rule.proto;
        if (rule.dport !== undefined) body.dport = String(rule.dport).trim();
        if (rule.sport !== undefined) body.sport = String(rule.sport).trim();
        if (rule.source !== undefined) body.source = String(rule.source).trim();
        if (rule.dest !== undefined) body.dest = String(rule.dest).trim();
        if (rule.comment !== undefined) body.comment = String(rule.comment).trim();

        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/firewall/rules/${pos}`, {
            method: "PUT",
            body,
        });
    }

    async deleteVmFirewallRule(nodeName: string, vmid: number | string, pos: number) {
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/firewall/rules/${pos}`, {
            method: "DELETE",
        });
    }

    // Tạo PVEAuthCookie Ticket khi cần (Console/noVNC xác thực session)
    async createAuthTicket() {
        try {
            const username = process.env.PROXMOX_VE_USERNAME || "root@pam";
            const password = process.env.PROXMOX_VE_PASSWORD || "";
            if (!password) return null;

            const res = await this.request("/access/ticket", {
                method: "POST",
                body: { username, password }
            });
            return res; // { ticket, CSRFPreventionToken, username }
        } catch {
            return null;
        }
    }

    // Console noVNC Ticket / Web Console Info
    async getVncTicket(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/vncproxy`, {
                method: "POST",
                body: {
                    websocket: 1
                }
            });
        } catch (e: any) {
            return null;
        }
    }

    // Lấy link web console trực tiếp tới Proxmox VE
    getDirectConsoleUrl(nodeName: string, vmid: number | string) {
        return `${this.endpoint}/?console=kvm&novnc=1&vmid=${vmid}&node=${nodeName}&resize=scale`;
    }

    // Lấy danh sách nodes trong Cluster và thông tin CPU, RAM, Uptime
    async getNodes() {
        return await this.request("/nodes");
    }

    // Lấy thông tin mạng & IP của Node
    async getNodeNetworks(nodeName: string) {
        try {
            return await this.request(`/nodes/${nodeName}/network`);
        } catch (e) {
            return [];
        }
    }

    // Lấy danh sách storages trên node (local, local-lvm, zfs, etc.)
    async getNodeStorages(nodeName: string) {
        try {
            return await this.request(`/nodes/${nodeName}/storage`);
        } catch (e) {
            return [];
        }
    }

    // Lấy danh sách content trong storage (ISO, Cloud images, VM Disks, Templates)
    async getStorageContent(nodeName: string, storageName: string) {
        try {
            return await this.request(`/nodes/${nodeName}/storage/${storageName}/content`);
        } catch (e) {
            return [];
        }
    }

    // Lấy danh sách VMs trên node
    async getNodeVms(nodeName: string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu`);
        } catch (e) {
            return [];
        }
    }

    // Lấy danh sách LXC Containers trên node
    async getNodeLxcContainers(nodeName: string) {
        try {
            return await this.request(`/nodes/${nodeName}/lxc`);
        } catch (e) {
            return [];
        }
    }

    // Lấy chi tiết config của 1 VM
    async getVmConfig(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/config`);
        } catch (e) {
            return null;
        }
    }

    // Lấy chi tiết config của 1 LXC Container
    async getLxcConfig(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/lxc/${vmid}/config`);
        } catch (e) {
            return null;
        }
    }

    // Lấy trạng thái runtime hiện tại của VM (IPs từ guest agent, RAM/CPU thực tế)
    async getVmStatus(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/status/current`);
        } catch (e) {
            return null;
        }
    }

    // Lấy trạng thái runtime hiện tại của LXC
    async getLxcStatus(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/lxc/${vmid}/status/current`);
        } catch (e) {
            return null;
        }
    }

    // Lấy IP từ QEMU Guest Agent nếu có
    async getVmAgentNetwork(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/agent/network-get-interfaces`);
        } catch (e) {
            return null;
        }
    }

    // Tổng hợp toàn bộ tài nguyên của cụm Proxmox
    async getClusterOverview() {
        const nodes = await this.getNodes();
        const nodesDetails = [];

        for (const node of nodes) {
            const nodeName = node.node;
            const [networks, storages, vms, lxcs] = await Promise.all([
                this.getNodeNetworks(nodeName),
                this.getNodeStorages(nodeName),
                this.getNodeVms(nodeName),
                this.getNodeLxcContainers(nodeName),
            ]);

            // Lấy storage contents
            const detailedStorages = await Promise.all(
                storages.map(async (st: any) => {
                    const content = await this.getStorageContent(nodeName, st.storage);
                    return {
                        ...st,
                        contents: content,
                    };
                })
            );

            // Lấy VM details (QEMU)
            const detailedVms = await Promise.all(
                vms.map(async (vm: any) => {
                    const [config, status, agentNet] = await Promise.all([
                        this.getVmConfig(nodeName, vm.vmid),
                        this.getVmStatus(nodeName, vm.vmid),
                        this.getVmAgentNetwork(nodeName, vm.vmid),
                    ]);

                    let ips: string[] = [];
                    if (agentNet && agentNet.result) {
                        for (const iface of agentNet.result) {
                            if (iface["ip-addresses"]) {
                                for (const ip of iface["ip-addresses"]) {
                                    if (ip["ip-address-type"] === "ipv4" && ip["ip-address"] !== "127.0.0.1") {
                                        ips.push(ip["ip-address"]);
                                    }
                                }
                            }
                        }
                    }

                    const statusStr = (status && typeof status.status === "string") 
                        ? status.status 
                        : (typeof vm.status === "string" ? vm.status : "unknown");

                    return {
                        ...vm,
                        resourceType: "qemu",
                        config,
                        runtimeStatus: status,
                        status: statusStr,
                        agentIps: ips,
                    };
                })
            );

            // Lấy LXC details
            const detailedLxcs = await Promise.all(
                lxcs.map(async (lxc: any) => {
                    const [config, status] = await Promise.all([
                        this.getLxcConfig(nodeName, lxc.vmid),
                        this.getLxcStatus(nodeName, lxc.vmid),
                    ]);

                    let ips: string[] = [];
                    // Phân tích IP từ net0, net1 trong config của LXC nếu có
                    if (config) {
                        for (const k of Object.keys(config)) {
                            if (k.startsWith("net") && typeof config[k] === "string") {
                                const ipMatch = config[k].match(/ip=([0-9.]+)/);
                                if (ipMatch && ipMatch[1] && ipMatch[1] !== "dhcp") {
                                    ips.push(ipMatch[1]);
                                }
                            }
                        }
                    }

                    const statusStr = (status && typeof status.status === "string")
                        ? status.status
                        : (typeof lxc.status === "string" ? lxc.status : "unknown");

                    return {
                        ...lxc,
                        resourceType: "lxc",
                        config,
                        runtimeStatus: status,
                        status: statusStr,
                        agentIps: ips,
                    };
                })
            );

            const allInstances = [...detailedVms, ...detailedLxcs];

            nodesDetails.push({
                ...node,
                networks,
                storages: detailedStorages,
                vms: allInstances,
                qemuCount: detailedVms.length,
                lxcCount: detailedLxcs.length,
            });
        }

        return nodesDetails;
    }

    // ==========================================
    // HARDWARE HOTPLUG & MULTI-DISK MANAGEMENT
    // ==========================================
    async updateVmHardware(nodeName: string, vmid: number | string, config: { cores?: number; memoryMb?: number; hotplug?: string }) {
        const body: Record<string, any> = {};
        if (config.cores !== undefined) body.cores = Number(config.cores);
        if (config.memoryMb !== undefined) body.memory = Number(config.memoryMb);
        if (config.hotplug) body.hotplug = config.hotplug;
        else body.hotplug = "network,disk,usb,memory,cpu";

        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/config`, {
            method: "PUT",
            body,
        });
    }

    async resizeVmDisk(nodeName: string, vmid: number | string, diskSlot: string, sizeStr: string) {
        // sizeStr can be e.g. "+10G", "+20G", "50G", "100G"
        let formattedSize = String(sizeStr).trim();
        if (!formattedSize.startsWith("+") && !formattedSize.toLowerCase().endsWith("g") && !formattedSize.toLowerCase().endsWith("m")) {
            formattedSize = `+${formattedSize}G`;
        }
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/resize`, {
            method: "PUT",
            body: {
                disk: diskSlot,
                size: formattedSize,
            },
        });
    }

    async attachSecondaryDisk(nodeName: string, vmid: number | string, options: {
        storage: string;
        sizeGb: number;
        slot?: string;
        discard?: boolean;
        cache?: string;
    }) {
        const slot = options.slot || "scsi1";
        const storage = options.storage || "local-lvm";
        const sizeGb = options.sizeGb || 20;
        const discard = options.discard !== false ? "discard=on," : "";
        const cache = options.cache ? `cache=${options.cache},` : "";

        // In Proxmox VE: `scsi1: local-lvm:20,discard=on,iothread=1` allocates and hotplugs immediately
        const diskValue = `${storage}:${sizeGb},${discard}${cache}iothread=1`.replace(/,+$/, "");

        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/config`, {
            method: "PUT",
            body: {
                [slot]: diskValue,
            },
        });
    }

    async detachVmDisk(nodeName: string, vmid: number | string, diskSlot: string) {
        if (diskSlot === "scsi0" || diskSlot === "bootdisk") {
            throw new Error("Không thể gỡ đĩa chính (OS / Boot Disk). Chỉ có thể gỡ đĩa phụ!");
        }
        return await this.request(`/nodes/${nodeName}/qemu/${vmid}/config`, {
            method: "PUT",
            body: {
                delete: diskSlot,
            },
        });
    }

    async getVmHardwareDetails(nodeName: string, vmid: number | string) {
        const config = await this.getVmConfig(nodeName, vmid);
        const status = await this.getVmStatus(nodeName, vmid);
        if (!config) throw new Error(`Không tìm thấy cấu hình VM #${vmid} trên node ${nodeName}`);

        const disks: Array<{
            slot: string;
            isBoot: boolean;
            storage: string;
            volume: string;
            size: string;
            sizeGb: number;
            rawConfig: string;
        }> = [];

        // Scan all disk slots: scsi0-15, virtio0-15, sata0-5, ide0-3
        const diskPrefixes = ["scsi", "virtio", "sata", "ide"];
        for (const key of Object.keys(config)) {
            const prefix = diskPrefixes.find(p => key.startsWith(p) && /^[a-z]+[0-9]+$/.test(key));
            if (prefix) {
                const val = String(config[key]);
                if (val && !val.includes("media=cdrom")) {
                    const parts = val.split(",");
                    const volPart = parts[0] || "";
                    const storagePool = volPart.includes(":") ? volPart.split(":")[0] : "unknown";
                    const sizeMatch = val.match(/size=([0-9.]+[GMKT]?)/i);
                    let sizeStr = sizeMatch ? sizeMatch[1] : "N/A";
                    let sizeGb = 0;
                    if (sizeStr.endsWith("G") || sizeStr.endsWith("g")) {
                        sizeGb = parseFloat(sizeStr);
                    } else if (sizeStr.endsWith("M") || sizeStr.endsWith("m")) {
                        sizeGb = parseFloat(sizeStr) / 1024;
                    }

                    disks.push({
                        slot: key,
                        isBoot: key === "scsi0" || key === (config.bootdisk || "scsi0"),
                        storage: storagePool,
                        volume: volPart,
                        size: sizeStr,
                        sizeGb: Math.round(sizeGb * 10) / 10,
                        rawConfig: val,
                    });
                }
            }
        }

        // Sắp xếp đĩa: scsi0 trước, sau đó scsi1, scsi2...
        disks.sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));

        // Tìm các slot còn trống để gắn thêm đĩa phụ (scsi1 -> scsi6)
        const usedSlots = new Set(disks.map(d => d.slot));
        const availableSlots: string[] = [];
        for (let i = 1; i <= 6; i++) {
            const s = `scsi${i}`;
            if (!usedSlots.has(s)) availableSlots.push(s);
        }

        return {
            vmid,
            nodeName,
            name: config.name || `VM #${vmid}`,
            cores: Number(config.cores || 2),
            sockets: Number(config.sockets || 1),
            cpuType: config.cpu || "host",
            memoryMb: Number(config.memory || 2048),
            balloon: config.balloon ? Number(config.balloon) : undefined,
            hotplug: config.hotplug || "network,disk,usb",
            status: status?.status || "unknown",
            disks,
            availableSlots,
            qemuAgent: !!config.agent,
        };
    }
}

export const proxmoxClient = new ProxmoxApiClient();
