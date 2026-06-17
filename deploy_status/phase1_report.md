# HiSecure ERP — Phase 1 Deployment Report (System Provisioning)

**Date**: June 17, 2026  
**Host Environment**: Oracle Cloud VM (VM.Standard.A1.Flex)  
**OS Platform**: Oracle Linux 9 (RHEL9 compatible)  
**Phase Status**: **PENDING EXECUTION**

---

## 1. Execution Commands

Log in to the Oracle Cloud VM via SSH and execute the following commands to provision the system environment:

```bash
# 1. Update system package repositories
sudo dnf clean all
sudo dnf update -y

# 2. Enable EPEL and DNF plugins
sudo dnf install -y epel-release dnf-plugins-core

# 3. Enable NodeSource Node.js v20 repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# 4. Install Node.js v20.11.0 LTS
sudo dnf install -y nodejs-20.11.0

# 5. Install PM2 Process Manager globally
sudo npm install -g pm2
```

---

## 2. Verification Commands

To verify that the provisioning has completed successfully, execute the following commands:

```bash
# Verify Node.js Installation
node -v

# Verify npm Installation
npm -v

# Verify PM2 Installation
pm2 -v
```

---

## 3. Expected Version & Health Report

Compare the output of the verification commands with the expected values below:

| Component | Expected Version | Status (Pass/Fail) | Output Details |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.11.0` or higher | `[ ]` | |
| **npm** | `10.x.x` or higher | `[ ]` | |
| **PM2** | `5.x.x` or higher | `[ ]` | |

---

## 4. Troubleshooting Guideline

If any step fails, stop immediately:
*   **NodeSource install fails**: Verify that the VM has outbound internet access by running `curl -I https://rpm.nodesource.com`.
*   **PM2 install permission error**: Ensure you run the global install command with `sudo npm install -g pm2`.
