# HiSecure ERP — Nightly Integrity Audit Report

* **Audit Run Date:** 18/6/2026, 1:58:20 am
* **Audit Scope:** `INCREMENTAL`
* **Status:** 🔴 FAILED (MISMATCHES DETECTED)
* **Execution Duration:** 1007 ms

---

## 1. Mismatch Statistics
| Audit Category | Records Tested | Mismatches Found | Status |
|---|---|---|---|
| Inventory (Stocks vs movements) | 24 parts | 18 | ❌ Failed |
| Ledger (Debits vs Credits) | 43 entries | 0 | ✅ Passed |
| Business Document Logs | Verified recent | 16 | ❌ Failed |

---

## 2. Inventory Discrepancy details
| Part ID | SKU | Name | Location ID | Stock Quantity | Stock Movement Sum | Difference |
|---|---|---|---|---|---|---|
| 4033 | P3A-1-1781674453336 | P3A Test Part 1 | 323 | 3 | -7 | 10 |
| 4034 | P3A-2-1781674453342 | P3A Test Part 2 | 323 | 18 | 3 | 15 |
| 4035 | P3A-1-1781674509768 | P3A Test Part 1 | 325 | 3 | -7 | 10 |
| 4036 | P3A-2-1781674509772 | P3A Test Part 2 | 325 | 18 | 3 | 15 |
| 4037 | P3B-1-1781675160474 | P3B Test Part 1 | 327 | 12 | -3 | 15 |
| 4039 | P3B-1-1781675279468 | P3B Test Part 1 | 328 | 12 | -3 | 15 |
| 4041 | P3A-1-1781675341925 | P3A Test Part 1 | 329 | 3 | -7 | 10 |
| 4042 | P3A-2-1781675341929 | P3A Test Part 2 | 329 | 18 | 3 | 15 |
| 4044 | P3C-2-1781678192575 | P3C Test Part 2 | 331 | 5 | -3 | 8 |
| 4045 | P3A-1-1781678239779 | P3A Test Part 1 | 332 | 3 | -7 | 10 |
| 4046 | P3A-2-1781678239783 | P3A Test Part 2 | 332 | 18 | 3 | 15 |
| 4047 | P3B-1-1781678268678 | P3B Test Part 1 | 334 | 12 | -3 | 15 |
| 4056 | PART-P4-INV-1781680340792 | P4 Part INV | 1 | 48 | -2 | 50 |
| 4058 | PART-P4-INV-1781680855444 | P4 Part INV | 1 | 48 | -2 | 50 |
| 4059 | P3B-1-1781680915638 | P3B Test Part 1 | 335 | 12 | -3 | 15 |
| 4061 | P3A-1-1781680969998 | P3A Test Part 1 | 336 | 3 | -7 | 10 |
| 4062 | P3A-2-1781680970004 | P3A Test Part 2 | 336 | 18 | 3 | 15 |
| 4064 | P3C-2-1781681023312 | P3C Test Part 2 | 338 | 5 | -3 | 8 |

---

## 3. Accounting Discrepancy details
*No discrepancies found. All journal entries are perfectly balanced.*

---

## 4. Warnings & Business Logic Issues
* ⚠️ Invoice #INV3C-1781678192868 (ID: 269) has no security audit log.
* ⚠️ Invoice #INV-P4-1781680340799 (ID: 272) has no security audit log.
* ⚠️ Invoice #INV-P4-1781680855453 (ID: 273) has no security audit log.
* ⚠️ Invoice #INV3C-1781681023689 (ID: 274) has no security audit log.
* ⚠️ Invoice #INV-OVERDUE-1781682800045 (ID: 275) has no security audit log.
* ⚠️ Invoice #INV-OVERDUE-1781682865911 (ID: 276) has no security audit log.
* ⚠️ Invoice #INV-OVERDUE-1781682914614 (ID: 277) has no security audit log.
* ⚠️ Invoice #INV-OVERDUE-1781683259925 (ID: 278) has no security audit log.
* ⚠️ Invoice #INV3C-1781678192868 (ID: 269) has no stock movements logged.
* ⚠️ Invoice #INV3C-1781678192868 (ID: 269) has no accounting journal entry logged.
* ⚠️ Invoice #INV-P4-1781680340799 (ID: 272) has no stock movements logged.
* ⚠️ Invoice #INV-P4-1781680340799 (ID: 272) has no accounting journal entry logged.
* ⚠️ Invoice #INV-P4-1781680855453 (ID: 273) has no stock movements logged.
* ⚠️ Invoice #INV-P4-1781680855453 (ID: 273) has no accounting journal entry logged.
* ⚠️ Invoice #INV3C-1781681023689 (ID: 274) has no stock movements logged.
* ⚠️ Invoice #INV3C-1781681023689 (ID: 274) has no accounting journal entry logged.
* ⚠️ Invoice #INV-OVERDUE-1781682800045 (ID: 275) has no stock movements logged.
* ⚠️ Invoice #INV-OVERDUE-1781682800045 (ID: 275) has no accounting journal entry logged.
* ⚠️ Invoice #INV-OVERDUE-1781682865911 (ID: 276) has no stock movements logged.
* ⚠️ Invoice #INV-OVERDUE-1781682865911 (ID: 276) has no accounting journal entry logged.
* ⚠️ Invoice #INV-OVERDUE-1781682914614 (ID: 277) has no stock movements logged.
* ⚠️ Invoice #INV-OVERDUE-1781682914614 (ID: 277) has no accounting journal entry logged.
* ⚠️ Invoice #INV-OVERDUE-1781683259925 (ID: 278) has no stock movements logged.
* ⚠️ Invoice #INV-OVERDUE-1781683259925 (ID: 278) has no accounting journal entry logged.

---
*Generated automatically by HiSecure ERP Integrity Audit Service.*
