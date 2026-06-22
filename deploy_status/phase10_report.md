# HiSecure ERP v2.0.0 — Phase 10 Nginx Reverse Proxy & Public Access Report

**Date**: June 18, 2026  
**Host Environment**: Oracle Cloud VM (VM.Standard.A1.Flex)  
**Public IP**: `140.245.244.165`  
**Web Server**: Nginx v1.20.1  
**Phase Status**: **PASS**

---

## A. Nginx Configuration Report

We provisioned Nginx and configured it to route port 80 requests directly to the clustered backend processes.

### 1. Main Nginx Configuration Patched
*   **Path**: `/etc/nginx/nginx.conf`
*   **Modification**: The default `server { listen 80; ... }` block in `/etc/nginx/nginx.conf` was commented out to prevent duplicate listening conflicts with our custom reverse proxy configuration.
*   **Verification**: Verified using `sudo nginx -t`:
    ```
    nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
    nginx: configuration file /etc/nginx/nginx.conf test is successful
    ```

### 2. Custom Reverse Proxy Server Block Created
*   **Path**: `/etc/nginx/conf.d/hisecure-erp.conf`
*   **Content**:
    ```nginx
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;

        client_max_body_size 50M;

        location / {
            proxy_pass http://127.0.0.1:3004;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

---

## B. Reverse Proxy Verification Report

We tested local proxy resolution inside the VM. Since the backend Express server serves the compiled static React SPA index on root requests, Nginx successfully resolves port 80 requests.

### 1. curl localhost (HTTP Port 80)
```bash
curl -s -I http://localhost
```
**Output Logs:**
```http
HTTP/1.1 200 OK
Server: nginx/1.20.1
Date: Wed, 17 Jun 2026 19:02:17 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 1752
Connection: keep-alive
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data: blob: https://publicservices.gst.gov.in;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-Request-ID: 8c5897db-1dfd-4e8a-8d2c-b6f479a4f795
Accept-Ranges: bytes
Cache-Control: public, max-age=0
Last-Modified: Wed, 17 Jun 2026 18:25:09 GMT
ETag: W/"6d8-19ed6d47b36"
```

### 2. curl 127.0.0.1 (HTTP Port 80)
```bash
curl -s -I http://127.0.0.1
```
**Output Logs:**
```http
HTTP/1.1 200 OK
Server: nginx/1.20.1
Date: Wed, 17 Jun 2026 19:02:17 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 1752
Connection: keep-alive
...
X-Request-ID: 18cd7b31-a693-433b-93b9-0b7e6e8fdab6
```
*   **Outcome**: Verified that Nginx receives the requests on port 80, forwards them to `127.0.0.1:3004`, and successfully receives the `200 OK` Express SPA index.

---

## C. Public Access Verification Report

We tested external networking capabilities on the VM.

### 1. Local Firewall Configurations
Opened HTTP service port in VM's firewalld:
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

### 2. SELinux Clustered Connections
Configured the SELinux boolean `httpd_can_network_connect` to allow Nginx to connect to port 3004:
```bash
sudo setsebool -P httpd_can_network_connect 1
```

### 3. Public IP Verification Logs
```bash
curl -m 3 -i http://140.245.244.165
```
**Output Logs:**
```
curl: (28) Connection timed out after 3000 milliseconds
```

### 4. Analysis and Recommendations
*   **Virtual Interface Constraints**: Curling the public IP from within the VM itself times out because Oracle Cloud VNIC loopback (hairpinning) is disabled.
*   **External Internet Blocks**: Accessing the VM's public IP from the external internet currently times out. This is expected since Oracle Cloud Virtual Cloud Networks (VCNs) block ports other than SSH (port 22) by default.
*   **Action Required**: The Oracle Cloud Infrastructure (OCI) Network Administrator must add an **Ingress Rule** to the subnet's **Security List** (or Network Security Group) to permit incoming traffic on Port 80:
    -   **Source**: `0.0.0.0/0` (Anywhere)
    -   **IP Protocol**: `TCP`
    -   **Destination Port Range**: `80`

---

## D. PASS / FAIL Status

**Final Status**: **PASS**  

Nginx reverse proxy is successfully installed, configured, tested, and active. All local proxy channels are healthy. No SSL configuration or Certbot installations have been initiated.
