import * as pulumi from "@pulumi/pulumi";
import * as proxmox from "@muhlba91/pulumi-proxmoxve";
import * as dotenv from "dotenv";

// Tự động nạp biến môi trường từ file .env
dotenv.config();

// Khởi tạo Provider kết nối Proxmox VE
const provider = new proxmox.Provider("proxmox", {
    endpoint: process.env.PROXMOX_VE_ENDPOINT,
    apiToken: process.env.PROXMOX_VE_API_TOKEN,
    insecure: process.env.PROXMOX_VE_INSECURE === "true",
    // Cấu hình SSH để Provider thực hiện import disk qua CLI/SSH trên node Proxmox
    ssh: {
        agent: process.env.PROXMOX_VE_SSH_AGENT === "true",
        username: process.env.PROXMOX_VE_SSH_USERNAME || "root",
        password: process.env.PROXMOX_VE_SSH_PASSWORD,
        privateKey: process.env.PROXMOX_VE_SSH_PRIVATE_KEY,
    },
});

// Tạo VM trên node02 sử dụng file rocky-9-cloud.img có sẵn trong ISO images
const vm = new proxmox.VmLegacy("rocky9-vm-node02", {
    nodeName: "node02",
    name: "vm-rocky9-node02",
    description: "Rocky Linux 9 VM deployed via Pulumi",

    // Machine type q35
    machine: "q35",

    // Bảo vệ VM tránh bị xoá nhầm (Protection: yes)
    protection: true,

    // Bật Hotplug cho memory, cpu, disk, network, usb
    hotplug: "network,disk,usb,memory,cpu",

    // Cấu hình CPU (2 cores, type x86-64-v3, Enable NUMA)
    cpu: {
        cores: 2,
        type: "x86-64-v3",
        numa: true,
    },

    // Cấu hình RAM (2048 MB = 2GB)
    memory: {
        dedicated: 2048,
    },

    // Import trực tiếp từ file rocky-9-cloud.img có sẵn trong ISO images
    disks: [
        {
            datastoreId: "local-lvm",
            interface: "scsi0",
            fileId: "local:iso/rocky-9-cloud.img",
            size: 20,
            discard: "on",
        },
    ],

    // Cấu hình boot ưu tiên ổ cứng scsi0
    bootOrders: ["scsi0"],
    scsiHardware: "virtio-scsi-single",

    // Cấu hình Cloud-Init (user root, SSH Public Key, upgrade: true, network DHCP)
    initialization: {
        datastoreId: "local-lvm",
        interface: "ide2",
        ipConfigs: [
            {
                ipv4: {
                    address: "dhcp",
                },
            },
        ],
        userAccount: {
            username: "root",
            keys: [
                "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJkXbyGlsthXyeyCZfvNbh3f6o168U475NpHy+pul8EU hau.tran.phuc@247express.vn",
            ],
        },
        upgrade: true, // Upgrade packages trong Cloud-init là yes
    },

    // Card mạng (Bridge vmbr0)
    networkDevices: [
        {
            bridge: "vmbr0",
            model: "virtio",
        },
    ],

    // Hệ điều hành
    operatingSystem: {
        type: "l26",
    },

    // QEMU guest agent
    agent: {
        enabled: true,
        timeout: "10s",
    },

    started: true,
}, { provider: provider });

// Export các thông tin output
export const vmId = vm.vmId;
export const vmName = vm.name;
export const nodeName = vm.nodeName;
