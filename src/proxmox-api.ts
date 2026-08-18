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

    private async request(path: string): Promise<any> {
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

        const res = await fetch(url, {
            headers: {
                Authorization: authHeader,
            },
            agent: httpsAgent as any,
        });

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Proxmox API Error [${res.status}]: ${errBody || res.statusText}`);
        }

        const data: any = await res.json();
        return data.data;
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

    // Lấy chi tiết config của 1 VM
    async getVmConfig(nodeName: string, vmid: number | string) {
        try {
            return await this.request(`/nodes/${nodeName}/qemu/${vmid}/config`);
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
            const [networks, storages, vms] = await Promise.all([
                this.getNodeNetworks(nodeName),
                this.getNodeStorages(nodeName),
                this.getNodeVms(nodeName),
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

            // Lấy VM details
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
                        config,
                        runtimeStatus: status,
                        status: statusStr,
                        agentIps: ips,
                    };
                })
            );

            nodesDetails.push({
                ...node,
                networks,
                storages: detailedStorages,
                vms: detailedVms,
            });
        }

        return nodesDetails;
    }
}

export const proxmoxClient = new ProxmoxApiClient();
