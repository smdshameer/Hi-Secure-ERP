# HiSecure ERP v2.0.0 — Post-Deployment Validation Checklist

This checklist is to be executed by the deployment auditor or administrator immediately following the run of the `deploy.sh` script to certify that the production environment is fully operational and secure.

---

## 1. Network & Port Isolation

| Verification Item | Command / Action | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Edge Web Traffic** | Run `curl -I http://localhost` and `curl -I https://localhost` | Nginx terminates traffic and redirects HTTP to HTTPS. | `[ ]` |
| **API Port Blockage** | Run `curl -I http://<public-ip>:3004/api/health` from an external network | Connection timeout (port 3004 must not be exposed to the public internet). | `[ ]` |
| **DB Port Blockage** | Try connecting to Port 5432 using an external client | Connection refused (port 5432 must only be accessible locally or via SSH tunnel). | `[ ]` |
| **Redis Port Blockage**| Try connecting to Port 6379 using an external client | Connection refused (port 6379 must only be accessible locally or via SSH tunnel). | `[ ]` |

---

## 2. API Gateway & Daemon Health

- `[ ]` Run the diagnostics script: `./health_check.sh`. Check that all tests report `[PASS]`.
- `[ ]` Check the PM2 log file tail: `pm2 logs hisecure-erp-server --lines 100`. Verify that no database connection timeouts or unhandled exceptions are logged.
- `[ ]` Verify that the cron job for daily backups is configured: `crontab -l | grep "backup.sh"`.

---

## 3. Security Hardening Verification

- `[ ]` **Registration Blockage**: Run the following command from an external shell to attempt anonymous registration:
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"username":"attacker","password":"password"}' https://erp.yourdomain.com/api/auth/register
  ```
  *Verify that the response code is `401 Unauthorized` or `403 Forbidden`, confirming anonymous registrations are blocked.*
- `[ ]` **JWT Secret Check**: Connect to the DB shell and run:
  ```sql
  SELECT key, value FROM settings WHERE key = 'company_settings';
  ```
  *Verify that default values for keys and credentials have been replaced with production secrets.*

---

## 4. Business Logic & Integrations Verification

- `[ ]` **Audit Trial Balance**: Log in to the administrative console, navigate to **Accounting -> Trial Balance**, and verify that the trial balance differences report exactly `0.00`, confirming double-entry balance consistency.
- `[ ]` **Test Document Generation**: Navigate to **Sales -> New Invoice**, create a draft invoice, and click **Print PDF**. Verify that `pdfkit` compiles and renders the PDF output successfully.
- `[ ]` **Test Telegram Outbound Alerts**: Stop and start a non-essential backend service to trigger a state warning, and verify that a notification arrives in your configured Telegram admin chat room.
- `[ ]` **Test Attachment Scans**: Upload a test document file to a CRM lead opportunity or AMC contract record. Verify that the file uploads successfully, indicating the ClamAV daemon is scanning files without blocking the upload.
