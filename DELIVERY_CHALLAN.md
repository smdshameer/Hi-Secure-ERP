# Delivery Challan Module - User Guide

## Overview

The **Delivery Challan (DC)** module tracks the movement of goods from your warehouse/shop to customers, between branches, or for job work. It's essential for:

- **E-Way Bill compliance** (mandatory for inter-state movement > ₹50,000)
- **Stock tracking** - automatically updates inventory when items are dispatched
- **Returns management** - track returned items and restock them
- **Legal documentation** - necessary for GST audits and transport records
- **Branch transfers** - track inventory movement between your own locations

---

## Types of Delivery Challans

### 1. Sales Delivery
For goods delivered to customers as part of a sale. Can be linked to a future invoice.

### 2. Job Work
Items sent to external parties for processing/repair. Track what's out for job work.

### 3. Branch Transfer
Transfer inventory between your own warehouse/branch locations.

### 4. Consignment
Goods sent on consignment basis (customer sells on your behalf).

### 5. Return
For returning goods to suppliers or sending back defective items.

---

## How to Create a Delivery Challan

### Step 1: Set Up Required Data

Before creating DC, ensure you have:

1. **Locations** (Branches/Warehouses) - Manage via Admin Panel (coming soon)
   - At least one MAIN location (your primary warehouse)
   - Secondary locations for branches/stores

2. **Customers** (for sales/job work/consignment) or **Suppliers** (for returns)

3. **Parts Inventory** with sufficient stock

4. **Users** with appropriate permissions (for approval workflow)

---

### Step 2: Create New Delivery Challan

1. Navigate to **"Delivery Challan"** in the sidebar
2. Click **"Create New Delivery Challan"**
3. Or use quick buttons:
   - **Sales** - for customer delivery
   - **Job Work** - send items for external work
   - **Transfer** - move between branches
   - **Consignment** - send on consignment

### Step 3: Fill Header Details

| Field | Description |
|-------|-------------|
| **Purpose** | Select the type of delivery (Sales, Job Work, etc.) |
| **Customer** | Required for sales/job work/consignment. Not needed for returns/branch transfer |
| **From Location** | Your warehouse/shop dispatching the goods |
| **To Location** | Destination (customer location, other branch, or job worker) |
| **Challan Date** | Date of dispatch |
| **Expected Delivery** | Optional - for scheduling |
| **Vehicle Number** | Transport vehicle details (for E-Way Bill) |
| **Driver Name** | Driver carrying the goods |
| **Transporter** | Logistics company name |
| **E-Way Bill No.** | Required if taxable value > ₹50,000 (inter-state) |
| **Notes** | Special instructions, handling notes |

---

### Step 4: Add Items

1. Click **"Add Item"** button
2. **Select Part** from dropdown (shows stock availability)
3. **Enter Quantity** (cannot exceed available stock)
4. **Batch Number** (optional) - For batch tracking
5. **Expiry Date** (optional) - For tracking component shelf life
6. **Serial Numbers** (optional) - One per line for tracked items (warranty purposes)
7. Click **"Add Item"**

**Barcode Scanning:**
- Place cursor in the "Barcode Scan" field
- Scan the barcode using USB scanner
- System auto-fills the part
- Click "Add Item" to add to challan

**Keyboard Shortcut:**
- After scanning, press **Enter** to open Add Item dialog

---

### Step 5: Submit

1. Review items and quantities
2. Click **"Create Delivery Challan"**
3. System generates challan number (format: DC-YYYYMM-xxxxxx)
4. Stock automatically reduces from inventory (for sales/job work/consignment)

---

## Managing Delivery Challans

### View Details

- Click the **eye icon** on any challan in the list
- Shows: header info, items table, attachments, returns

### Mark Status

1. **Draft → Dispatched** - When goods leave your premises
   - Click shipping icon
   - May trigger SMS notification (when enabled)

2. **Dispatched → Delivered** - When customer receives goods
   - Click checkmark icon
   - Optionally capture signature (future)

3. **Mark as Cancelled** - If challan was created by mistake
   - Stock will be restored automatically

---

### Handling Returns

If customer returns items:

1. On the challan detail page, scroll to **Returns** section
2. Click **"Add Return"**
3. Select which item(s) are being returned
4. Enter **Quantity** and **Reason**:
   - Wrong item
   - Damaged
   - Defective
   - Other
5. Add **condition notes**
6. Submit

If return is accepted (not damaged/rejected), stock is restored automatically.

---

### Printing Delivery Challan

1. Click **"Print"** button on challan detail
2. Opens printer-friendly version with:
   - Company header with GSTIN
   - Challan details
   - Items table with HSN codes
   - Signatures boxes (Receiver, Driver, Authorized Signatory)
   - Declaration
3. Press **Ctrl+P** or browser will auto-print
4. Print 2 copies (for driver and receiver)

---

## Best Practices

### For Sales Deliveries
- Create DC before sending goods
- Get customer GSTIN for B2B sales
- Mention vehicle and driver for transport records
- Keep copy of DC for your records
- Later create sales invoice referencing this DC

### For Job Work
- Track what's out for job work separately
- Mention job work order number in notes
- Set expected return date
- Track returns to replenish stock

### For Branch Transfers
- Use proper location codes (from/to)
- Track inter-branch movements for inventory reconciliation
- Use for stock balancing between branches

### For Consignment
- Set credit period in notes
- Track consignment stock separately in reports
- Don't invoice until consignee sells

---

## E-Way Bill (E-Way Bill) Compliance

### When is E-Way Bill Required?

- **Inter-state movement** of goods value > ₹50,000
- Some states require it for intra-state above certain limits
- Even without DC, e-way bill is mandatory for transport

### Information Needed:
- Supplier GSTIN (your GSTIN)
- Recipient GSTIN (customer's GSTIN)
- Vehicle number
- Transporter details
- Invoice/Challan number
- HSN codes of items
- Taxable value

**Our System:**
- Enter E-Way Bill number in the DC form
- It will appear on the printed challan
- Also store in database for reporting

---

## Reports

### Active Delivery Challans
- Shows all non-cancelled challans
- Filter by date, status, purpose

### Pending Returns
- Shows items where returns quantity < original quantity
- Useful for tracking incomplete returns

---

## Barcode Integration

### Printing Barcode Labels

1. Go to **Parts > Part List**
2. Click print icon next to part
3. Generate label with:
   - Part number
   - Name
   - HSN code
   - Selling price
   - Barcode (scannable)

### Scanning at Dispatch

1. Connect USB barcode scanner
2. Open Delivery Challan form
3. Place cursor in barcode field
4. Scan item barcode
5. System auto-selects part in dropdown
6. Click "Add Item"

**Tips:**
- USB scanners work as "keyboard wedge" - no drivers needed
- Simply scan - cursor must be in the barcode input field
- If scanner beeps but nothing happens, check browser console

---

## Audit Trail

Every DC action is tracked:
- Who created
- When approved
- Status changes
- Items dispatched/returned

This helps with:
- GST audit (verify movement)
- Dispute resolution
- Loss prevention

---

## GST Compliance

### What's Captured:
- Seller GSTIN (from location record)
- Buyer GSTIN (from customer record)
- HSN codes for each part
- Taxable value (from unit price × quantity)
- E-Way Bill number
- Date and place of supply

### Invoice Linking (Future)
- DC number can be referenced in sales invoice
- Helps track goods movement vs billing
- Required for GST reconciliation

---

## Troubleshooting

### Stock Not Reducing?
- Only sales, job work, and consignment reduce stock
- Branch transfers update stock at destination location (coming soon)
- Cancelled DC restores stock

### Can't See Customer?
- Ensure customer has GSTIN for B2B transactions
- Check that customer is marked "active"
- Filter not hiding them

### E-Way Bill Warnings?
- Value > ₹50,000? E-Way Bill may be mandatory
- Check state-specific rules
- Keep transporter details handy

### Barcode Not Scanning?
- Ensure scanner configured for USB HID mode
- Try simple test: open notepad and scan - should see barcode value
- Some scanners need configuration ( suffix)
- Contact IT for scanner setup

### Want to Edit DC?
- Only "Draft" DCs can be edited
- Once dispatched/delivered, contact admin to cancel and recreate

---

## Keyboard Shortcuts

- **Ctrl+P** - Print current DC (on detail page)
- **Enter** - In barcode field, triggers scan detection
- **Alt+D** - Focus on DC navigation (coming soon)

---

## Mobile Access

- Use **mobile view** for on-the-go approvals
- Scan barcodes with camera (camera-based scanner app recommended)
- Signature capture on delivery (tablet friendly)

---

## Next Steps

- Set up **locations** properly (HQ, branches, warehouses)
- Configure **barcode printers** for inventory labeling
- Train staff on DC creation and returns process
- Integrate **SMS notifications** for customer updates
- Add **E-Way Bill API** integration (auto-generation)

---

## Support

For issues or feature requests:
- Email: support@hisecuresolutions.com
- Phone: Your Support Number

---

**Tip:** Always keep a physical copy of DC with the driver. Digital copy in system is for records.
