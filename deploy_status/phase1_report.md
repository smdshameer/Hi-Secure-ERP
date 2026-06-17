# HiSecure ERP — Phase 1 Deployment Report (System Provisioning)

**Date**: June 17, 2026  
**Host Environment**: Oracle Cloud VM (VM.Standard.A1.Flex)  
**OS Platform**: Oracle Linux 9 (RHEL9 compatible)  
**Phase Status**: **PASS**

---

## 1. Execution Commands

The following commands were run via SSH on the Oracle VM:
```bash
sudo dnf clean all
sudo dnf update -y
sudo dnf install -y epel-release dnf-plugins-core
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
sudo npm install -g pm2
```

---

## 2. Verification Command Output

Captured verification logs from the VM terminal:

```bash
$ node -v
v20.20.2

$ npm -v
10.8.2

$ pm2 -v
[PM2] Spawning PM2 daemon with pm2_home=/home/opc/.pm2
[PM2] PM2 Successfully daemonized
7.0.1
```

---

## 3. Installed Versions Report

| Component | Expected Version | Status (Pass/Fail) | Installed Version |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.x` | **PASS** | `v20.20.2` |
| **npm** | `>= 10.x` | **PASS** | `10.8.2` |
| **PM2** | `>= 5.x` | **PASS** | `7.0.1` |

---

## 4. Health Verification Report

*   **Package Repositories**: Successfully updated. EPEL and dnf-plugins-core are enabled.
*   **Node.js Runtime**: Fully functional. Responsive binary verified.
*   **npm Client**: Verified.
*   **PM2 Daemon**: Spawned successfully, daemonized under user `opc`, and fully operational.

---

## 5. Recommended Next Action

The VM environment provisioning is complete. All checks passed.
**Recommendation**: Proceed to **PHASE 2 — PostgreSQL Deployment**.
