import * as pulumi from "@pulumi/pulumi";
import * as proxmox from "@muhlba91/pulumi-proxmoxve";

export interface VmConfig {
    name: string;
    nodeName: string;
    resourceType?: "qemu" | "lxc"; // "qemu" (VM) hoặc "lxc" (Container)
    description?: string;
    cores: number;
    memoryMb: number;
    diskSizeGb: number;
    datastoreId?: string; // e.g. "local-lvm", "zfs-storage"
    diskImageId: string; // e.g. "local:iso/rocky-9-cloud.img" hoặc "local:vztmpl/ubuntu-22.04-standard.tar.zst"
    sshUser?: string;
    sshPublicKey?: string;
    password?: string; // Root password cho LXC
    bridge?: string;
    vlanTag?: number; // Optional VLAN ID (1-4094)
    cpuType?: string; // e.g. "host", "x86-64-v2-AES", "x86-64-v3", "kvm64"
    environment?: "dev" | "stag" | "pro" | string;
    tags?: string[];
    upgrade?: boolean;
    protection?: boolean;
    userData?: string; // Custom Cloud-init User-Data Script / Post-provisioning Bootstrap
    unprivileged?: boolean; // LXC Unprivileged Container
    secondaryDisks?: Array<{
        name?: string;
        datastoreId: string;
        sizeGb: number;
        interface?: string;
        discard?: string;
    }>;
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
        const typeTag = [config.resourceType === "lxc" ? "lxc" : "qemu"];
        const customTags = (config.tags || []).map(t => t.toLowerCase().trim()).filter(Boolean);
        const combinedTags = Array.from(new Set([...envTag, ...typeTag, ...customTags]));

        // =========================================================
        // CASE 1: LXC CONTAINER CREATION
        // =========================================================
        if (config.resourceType === "lxc") {
            // Xác định loại OS cho LXC (ubuntu, debian, alpine, centos, rocky, etc.)
            let osType = "unmanaged";
            const imgLower = config.diskImageId.toLowerCase();
            if (imgLower.includes("ubuntu")) osType = "ubuntu";
            else if (imgLower.includes("debian")) osType = "debian";
            else if (imgLower.includes("alpine")) osType = "alpine";
            else if (imgLower.includes("centos")) osType = "centos";
            else if (imgLower.includes("rocky") || imgLower.includes("almalinux") || imgLower.includes("fedora")) osType = "centos";

            const container = new proxmox.ContainerLegacy(config.name, {
                nodeName: config.nodeName,
                description: config.description || `LXC Container created via Pulumi [Env: ${config.environment || 'dev'}]`,
                protection: isProtected,
                tags: combinedTags.length > 0 ? combinedTags : undefined,
                unprivileged: config.unprivileged ?? true,
                features: {
                    nesting: true,
                },
                cpu: {
                    cores: config.cores,
                },
                memory: {
                    dedicated: config.memoryMb,
                    swap: 512,
                },
                disk: {
                    datastoreId: targetDatastore,
                    size: config.diskSizeGb,
                },
                operatingSystem: {
                    templateFileId: config.diskImageId,
                    type: osType,
                },
                initialization: {
                    hostname: config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    ipConfigs: [
                        {
                            ipv4: {
                                address: "dhcp",
                            },
                        },
                    ],
                    userAccount: {
                        keys: config.sshPublicKey ? [config.sshPublicKey.trim()] : undefined,
                        password: config.password || "ProxmoxLxc@123",
                    },
                },
                networkInterfaces: [
                    {
                        name: "veth0",
                        bridge: config.bridge || "vmbr0",
                        vlanId: config.vlanTag ? Number(config.vlanTag) : undefined,
                    },
                ],
                started: true,
            }, { provider });

            return {
                vmId: container.vmId,
                vmName: container.initialization.apply(init => init?.hostname || config.name),
                nodeName: container.nodeName,
                resourceType: "lxc",
                environment: config.environment || "dev",
                tags: combinedTags,
                vlanTag: config.vlanTag || undefined,
                protection: isProtected,
                status: "running",
            };
        }

        // =========================================================
        // CASE 2: QEMU FULL VIRTUAL MACHINE CREATION
        // =========================================================
        let customUserDataFile: proxmox.FileLegacy | undefined = undefined;
        let userDataFileId: pulumi.Input<string> | undefined = undefined;

        if (config.userData && config.userData.trim().length > 0) {
            let userDataContent = config.userData.trim();
            // Đảm bảo có header #cloud-config hoặc #!/bin/bash
            if (!userDataContent.startsWith("#cloud-config") && !userDataContent.startsWith("#!/")) {
                userDataContent = `#cloud-config\n${userDataContent}`;
            }

            // Đảm bảo hostname của OS được đổi theo đúng tên VM (giống như Rocky Linux / CentOS)
            if (!userDataContent.includes("hostname:")) {
                const cleanHostname = config.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
                userDataContent = `${userDataContent}\n\nhostname: ${cleanHostname}\nfqdn: ${cleanHostname}.local\npreserve_hostname: false\n`;
            }

            // Nếu người dùng có cung cấp SSH Public Key và chưa có trong user-data, tự động gắn vào root/users
            if (config.sshPublicKey && config.sshPublicKey.trim().length > 0) {
                const cleanKey = config.sshPublicKey.trim();
                if (!userDataContent.includes(cleanKey)) {
                    userDataContent = `${userDataContent}\n\n# Auto-injected SSH Authorized Key\nssh_authorized_keys:\n  - ${cleanKey}\nusers:\n  - name: root\n    ssh_authorized_keys:\n      - ${cleanKey}\n`;
                }
            }

            customUserDataFile = new proxmox.FileLegacy(`userdata-${config.name.toLowerCase()}`, {
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
            hotplug: "network,disk,usb,memory,cpu",
            cpu: {
                cores: config.cores,
                type: config.cpuType || "host",
                numa: true,
            },
            memory: {
                dedicated: config.memoryMb,
            },
            disks: (() => {
                const diskList: any[] = [
                    {
                        datastoreId: targetDatastore,
                        interface: "scsi0",
                        fileId: config.diskImageId,
                        size: config.diskSizeGb,
                        discard: "on",
                    },
                ];

                if (Array.isArray(config.secondaryDisks) && config.secondaryDisks.length > 0) {
                    config.secondaryDisks.forEach((sec, idx) => {
                        diskList.push({
                            datastoreId: sec.datastoreId || targetDatastore,
                            interface: sec.interface || `scsi${idx + 1}`,
                            size: sec.sizeGb,
                            discard: sec.discard || "on",
                        });
                    });
                }

                return diskList;
            })(),
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
                    password: config.password || undefined,
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
                    firewall: true,
                },
            ],
            operatingSystem: {
                type: (() => {
                    const img = (config.diskImageId || "").toLowerCase();
                    if (img.includes("win11") || img.includes("2k22") || img.includes("windows-2022") || img.includes("win2022")) return "win11";
                    if (img.includes("win10") || img.includes("2k19") || img.includes("windows-2019") || img.includes("win2019")) return "win10";
                    if (img.includes("win8") || img.includes("2k12")) return "win8";
                    if (img.includes("win7") || img.includes("2k8")) return "win7";
                    if (img.includes("solaris")) return "solaris";
                    if (img.includes("freebsd") || img.includes("openbsd") || img.includes("netbsd")) return "other";
                    return "l26"; // Mặc định cho mọi bản phân phối Linux hiện đại (Kernel 2.6/3.x/4.x/5.x/6.x: Ubuntu, Debian, Rocky, RHEL, CentOS, AlmaLinux, Alpine, Arch...)
                })(),
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
            resourceType: "qemu",
            environment: config.environment || "dev",
            tags: combinedTags,
            vlanTag: config.vlanTag || undefined,
            protection: isProtected,
            hasUserData: !!config.userData,
            status: "running",
        };
    };
}
