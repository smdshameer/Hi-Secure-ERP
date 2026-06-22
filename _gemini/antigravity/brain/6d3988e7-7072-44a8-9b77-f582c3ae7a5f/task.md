# HiSecure ERP — Task List

## Phase 10 — Nginx Reverse Proxy & Public Access

- [x] 1. Verify Nginx installation and service status.
- [x] 2. Comment out default server listener block in `nginx.conf`.
- [x] 3. Configure reverse proxy to bind Port 80 to Port 3004 with 50M upload limits (`hisecure-erp.conf`).
- [x] 4. Fix SELinux file contexts (`restorecon` on conf file).
- [x] 5. Fix SELinux loopback connections (`httpd_can_network_connect = 1`).
- [x] 6. Configure local firewall to permit HTTP services.
- [x] 7. Validate Nginx configuration syntax and reload Nginx service.
- [x] 8. Verify port 80 accessibility via curl on `localhost` and `127.0.0.1`.
- [x] 9. Verify external access on public IP and document OCI Security List rules.
- [x] 10. Generate Phase 10 reports:
  - [x] Nginx Configuration Report
  - [x] Reverse Proxy Verification Report
  - [x] Public Access Verification Report
  - [x] PASS / FAIL Status
- [x] 11. Update walkthrough report (`walkthrough.md` in brain directory).
- [x] 12. STOP and wait for approval.
