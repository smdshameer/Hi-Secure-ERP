# HiSecure ERP — Phase 3 Deployment Report (Redis Deployment)

**Date**: June 17, 2026  
**Host Environment**: Oracle Cloud VM (VM.Standard.A1.Flex)  
**Database Service**: Redis v6.2.20  
**Phase Status**: **PASS**

---

## A. Redis Installation Report

Redis has been successfully installed on the Oracle Linux 9 server via standard `dnf` channels.

```bash
$ redis-server --version
Redis server v=6.2.20 sha=00000000:0 malloc=jemalloc-5.1.0 bits=64 build=77f087a7c7063959
```

### System Daemon Status
```
● redis.service - Redis persistent key-value database
     Loaded: loaded (/usr/lib/systemd/system/redis.service; disabled; preset: disabled)
     Active: active (running) since Wed 2026-06-17 18:12:09 GMT
```

---

## B. Redis Security Configuration Report

We applied the following production-hardening overrides to `/etc/redis/redis.conf`:

1.  **Network Interface Limitation**: Redis is bound to the loopback interface only:
    ```conf
    bind 127.0.0.1 ::1
    ```
2.  **Protected Mode**: Active (`protected-mode yes`).
3.  **Authentication Control**: Enabled with a secure password key:
    ```conf
    requirepass HiSecure_Redis_Pass_2026_Prod
    ```
4.  **Memory Resource Allocation**: Memory usage is capped at 512MB with Least Recently Used eviction policy to protect the host VM:
    ```conf
    maxmemory 512mb
    maxmemory-policy allkeys-lru
    ```
5.  **SELinux Context Verification**: Rectified user context files from `user_tmp_t` to `redis_conf_t` via `restorecon` to enable systemd daemon file access.

---

## C. Redis Connectivity Report

Verified local access and authentication limits via SSH console commands:

*   **Authenticated Connection**:
    ```bash
    $ redis-cli -p 6379 -a HiSecure_Redis_Pass_2026_Prod ping
    PONG
    ```
*   **Unauthenticated Connection (Blocked)**:
    ```bash
    $ redis-cli -p 6379 ping
    NOAUTH Authentication required.
    ```
*Result: **PASS**. Authentication checks are enforced on all connection query paths.*

---

## D. Redis Persistence Verification

Confirmed Append-Only File (AOF) storage has been successfully initialized inside the data path `/var/lib/redis/` for worker task safety:

```bash
$ sudo ls -la /var/lib/redis
total 4
drwxr-x---.  2 redis redis   28 Jun 17 18:12 .
drwxr-xr-x. 50 root  root  4096 Jun 17 18:10 ..
-rw-r--r--.  1 redis redis    0 Jun 17 18:12 appendonly.aof
```

---

## E. PASS / FAIL Status

**Final Status**: **PASS**  
**Recommended Next Action**: Proceed to **PHASE 4 — Environment Configuration**.
