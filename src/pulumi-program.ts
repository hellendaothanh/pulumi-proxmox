import * as pulumi from "@pulumi/pulumi";
import * as proxmox from "@muhlba91/pulumi-proxmoxve";

export interface VmConfig {
    name: string;
    nodeName: string;
    description?: string;
    cores: number;
    memoryMb: number;
    diskSizeGb: number;
    datastoreId?: string; // e.g. "local-lvm", "zfs-storage"
    diskImageId: string; // e.g. "local:iso/rocky-9-cloud.img"
    sshUser?: string;
    sshPublicKey?: string;
    bridge?: string;
    vlanTag?: number; // Optional VLAN ID (1-4094)
    cpuType?: string; // e.g. "host", "x86-64-v2-AES", "x86-64-v3", "kvm64"
    environment?: "dev" | "stag" | "pro" | string;
    tags?: string[];
    upgrade?: boolean;
    protection?: boolean;
    userData?: string; // Custom Cloud-init User-Data Script / Post-provisioning Bootstrap
}

export function createVmProgram(config: VmConfig) {
    return async () => {
        const provider = new proxmox.Provider("proxmox", {
            endpoint: process.env.PROXMOX_VE_ENDPOINT,
            apiToken: process.env.PROXMOX_VE_API_TOKEN,
            insecure: process.env.PROXMOX_VE_INSECURE === "true",
            ssh: {
                agent: process.env.PROXMOX_VE_SSH_AGENT === "true",
                username: process.env.PROXMOX_VE_SSH_USERNAME || "root",
                password: process.env.PROXMOX_VE_SSH_PASSWORD,
                privateKey: process.env.PROXMOX_VE_SSH_PRIVATE_KEY,
            },
        });

        const isProtected = config.protection ?? false;
        const targetDatastore = config.datastoreId || "local-lvm";
        const envTag = config.environment ? [config.environment.toLowerCase()] : [];
        const customTags = (config.tags || []).map(t => t.toLowerCase().trim()).filter(Boolean);
        const combinedTags = Array.from(new Set([...envTag, ...customTags]));

        // Chuẩn bị Custom User Data / Post-provisioning bootstrap script
        let customUserDataFile: proxmox.storage.File | undefined = undefined;
        let userDataFileId: pulumi.Input<string> | undefined = undefined;

        if (config.userData && config.userData.trim().length > 0) {
            let userDataContent = config.userData.trim();
            // Đảm bảo có header #cloud-config hoặc #!/bin/bash
            if (!userDataContent.startsWith("#cloud-config") && !userDataContent.startsWith("#!/")) {
                userDataContent = `#cloud-config\n${userDataContent}`;
            }

            customUserDataFile = new proxmox.storage.File(`userdata-${config.name.toLowerCase()}`, {
                nodeName: config.nodeName,
                datastoreId: "local", // snippets thường lưu tại datastore 'local'
                contentType: "snippets",
                sourceRaw: {
                    data: userDataContent,
                    fileName: `user-data-${config.name.toLowerCase()}.yaml`,
                },
            }, { provider });

            userDataFileId = customUserDataFile.id;
        }

        const vm = new proxmox.VmLegacy(config.name, {
            nodeName: config.nodeName,
            name: config.name,
            description: config.description || `Created via Pulumi Self-Service Portal [Env: ${config.environment || 'dev'}]`,
            machine: "q35",
            protection: isProtected,
            tags: combinedTags.length > 0 ? combinedTags : undefined,
            hotplug: "network,disk,usb",
            cpu: {
                cores: config.cores,
                type: config.cpuType || "host",
                numa: true,
            },
            memory: {
                dedicated: config.memoryMb,
            },
            disks: [
                {
                    datastoreId: targetDatastore,
                    interface: "scsi0",
                    fileId: config.diskImageId,
                    size: config.diskSizeGb,
                    discard: "on",
                },
            ],
            bootOrders: ["scsi0"],
            scsiHardware: "virtio-scsi-single",
            initialization: {
                datastoreId: targetDatastore,
                interface: "ide0",
                ipConfigs: [
                    {
                        ipv4: {
                            address: "dhcp",
                        },
                    },
                ],
                userAccount: {
                    username: config.sshUser || "root",
                    keys: config.sshPublicKey ? [config.sshPublicKey] : undefined,
                },
                userDataFileId: userDataFileId,
                upgrade: config.upgrade ?? true,
            },
            networkDevices: [
                {
                    bridge: config.bridge || "vmbr0",
                    model: "virtio",
                    vlanId: config.vlanTag ? Number(config.vlanTag) : undefined,
                },
            ],
            operatingSystem: {
                type: "l26",
            },
            agent: {
                enabled: true,
                timeout: "15s",
            },
            started: true,
        }, { provider, dependsOn: customUserDataFile ? [customUserDataFile] : undefined });

        return {
            vmId: vm.vmId,
            vmName: vm.name,
            nodeName: vm.nodeName,
            environment: config.environment || "dev",
            tags: combinedTags,
            vlanTag: config.vlanTag || undefined,
            protection: isProtected,
            hasUserData: !!config.userData,
            status: "running",
        };
    };
}
