// Hi Secure Solutions - ERP App JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // Confirm delete actions
    const deleteButtons = document.querySelectorAll('[data-confirm]');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (!confirm(this.getAttribute('data-confirm'))) {
                e.preventDefault();
            }
        });
    });

    // Format currency inputs
    const currencyInputs = document.querySelectorAll('input[type="number"][step="0.01"]');
    currencyInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !isNaN(this.value)) {
                this.value = parseFloat(this.value).toFixed(2);
            }
        });
    });

    // Phone number formatting
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 10) {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });
    });

    // Barcode scanner support
    // Barcode scanners act as keyboard inputs and typically send an Enter key at the end
    let barcodeBuffer = '';
    let barcodeTimeout;

    const barcodeInputs = document.querySelectorAll('input[data-barcode="true"]');
    if (barcodeInputs.length > 0) {
        // Focus on barcode input if present
        barcodeInputs[0].focus();
    }

    document.addEventListener('keydown', function(e) {
        // Check if any barcode input has focus or if we're on a barcode-enabled page
        const activeElement = document.activeElement;
        const isBarcodeField = activeElement && activeElement.hasAttribute('data-barcode');
        const isDeliveryChallan = window.location.pathname.includes('/delivery-challans');

        // If we're on delivery challan new page, handle barcode globally
        if (isDeliveryChallan && e.key === 'Enter') {
            // If there's a focused input that's not the part select, let it handle
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                if (!activeElement.hasAttribute('data-barcode-scanned')) {
                    return;
                }
            }
        }
    });

    // QR Code generation function
    window.generateQRCode = function(text, elementId) {
        // Simple QR code placeholder - integrate with a QR library if needed
        // For now, can use Google Charts API or a local library
        const container = document.getElementById(elementId);
        if (container) {
            // Use textContent to prevent XSS
            container.textContent = '';
            const div = document.createElement('div');
            div.className = 'alert alert-info';
            div.textContent = 'QR Code: ' + text;
            container.appendChild(div);
        }
    };

    // Barcode label printing with XSS protection
    window.printBarcodeLabel = function(data) {
        const printWindow = window.open('', '_blank');
        // Escape HTML to prevent XSS
        function escapeHTML(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        const partNumber = escapeHTML(data.part_number);
        const name = escapeHTML(data.name);
        const hsn = escapeHTML(data.hsn_code) || 'N/A';
        const price = parseFloat(data.selling_price || 0).toFixed(2);
        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>Barcode Label</title>
    <style>
        body { font-family: Arial; font-size: 12px; margin: 0; padding: 10px; }
        .label { border: 1px dashed #000; padding: 10px; width: 80mm; height: 40mm; margin: 0 auto; }
        .part-number { font-size: 16px; font-weight: bold; }
        .name { font-size: 12px; }
        .hsn { font-size: 10px; color: #666; }
        .price { font-size: 14px; font-weight: bold; margin-top: 10px; }
        .barcode-img { margin: 10px 0; }
    </style>
</head>
<body onload="window.print()">
    <div class="label">
        <div class="part-number">${partNumber}</div>
        <div class="name">${name}</div>
        <div class="hsn">HSN: ${hsn}</div>
        <div class="price">₹${price}</div>
        <div class="barcode-img">[Barcode Image]</div>
    </div>
</body>
</html>`);
        printWindow.focus();
    };

    // Sidebar toggle for mobile
    const sidebarToggle = document.querySelector('.navbar-toggler');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth < 768) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }

    // Search functionality (can be extended)
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const table = this.closest('table');
            if (table) {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            }
        });
    });

    // Print functionality with better formatting
    window.printRepair = function(repairId) {
        const printWindow = window.open(`/repairs/${repairId}/print`, '_blank');
        printWindow.focus();
    };

    // Date formatting helper
    window.formatDate = function(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    };

    // Number formatting helper
    window.formatCurrency = function(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    console.log('🔧 Hi Secure ERP System loaded successfully');
});
