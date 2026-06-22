import os

css_path = r"c:\Users\Admin\Desktop\Calude Test\erp-app\client\src\index.css"

if not os.path.exists(css_path):
    print("Error: CSS file not found at " + css_path)
    exit(1)

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# We will search for the responsively-added media query header
target_comment = "/* ── Mobile & Tablet Collapsible Drawer Sidebar Responsiveness ── */"
idx = content.find(target_comment)

# If it is not found, let's check for a slightly different comment, or just append
if idx == -1:
    idx = content.find("Mobile & Tablet Collapsible Drawer Sidebar Responsiveness")

if idx != -1:
    # Keep the original content before the custom media queries
    original_base = content[:idx].rstrip()
else:
    # If not found, just use the entire content
    original_base = content.rstrip()

new_media_queries = """
/* ── Mobile & Tablet Collapsible Drawer Sidebar Responsiveness ── */
@media (max-width: 1023px) {
  /* ─ Let layout wrappers remain fixed height but scroll contents internally ─ */
  .layout-wrapper {
    height: 100vh !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .main-container {
    height: calc(100vh - 52px) !important;
    overflow: hidden !important;
    position: relative !important;
    flex-direction: row !important; /* Keep sidebar next to content naturally */
  }
  .content-area {
    overflow-y: auto !important;
    padding: 12px 10px 80px 10px !important;
    height: auto !important;
    min-height: unset !important;
    flex: 1 !important;
  }

  /* ─ Header Logo Hide ─ */
  .header-logo-wrap {
    display: none !important;
  }

  /* ─ Header Profile adjustments ─ */
  .header-username, 
  .header-role, 
  .header-chevron {
    display: none !important;
  }
  .header-user {
    gap: 0 !important;
  }

  /* Reduce container padding on tablet for maximal screen width usage */
  .max-w-\[1600px\] {
    padding-left: 6px !important;
    padding-right: 6px !important;
  }

  /* ─ Page header compact ─ */
  .page-header {
    margin-bottom: 8px !important;
    gap: 8px;
    flex-direction: row !important;
  }
  .page-title {
    font-size: 18px !important;
  }
  .page-sub {
    font-size: 12px !important;
  }

  /* ─ Touch friendly target sizes ─ */
  button, 
  .btn,
  .action-btn,
  .btn-primary,
  .btn-outline,
  a.border {
    min-height: 36px !important;
    padding: 6px 12px !important;
  }

  /* ─ Horizontal swipe tabs ─ */
  .flex.border-b.border-gray-200, 
  .flex.gap-2.border-b,
  [role="tablist"],
  .tabs-container {
    display: flex !important;
    overflow-x: auto !important;
    white-space: nowrap !important;
    flex-wrap: nowrap !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
  }
  [role="tablist"]::-webkit-scrollbar,
  .tabs-container::-webkit-scrollbar {
    display: none !important;
  }
  [role="tablist"] > *,
  .tabs-container > * {
    flex-shrink: 0 !important;
  }

  /* ─ Tablet Collapsible Sidebar Layout ─ */
  .sidebar-nav {
    width: 60px !important;
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    z-index: 40 !important;
    overflow: hidden !important;
  }
  .sidebar-nav .sidebar-label,
  .sidebar-nav .sidebar-badge {
    display: none !important;
  }
  /* When open, expands as absolute overlay */
  .sidebar-nav.open {
    width: 240px !important;
    position: absolute !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    box-shadow: 4px 0 10px rgba(0, 0, 0, 0.15) !important;
  }
  .sidebar-nav.open .sidebar-label {
    display: inline !important;
  }
  .sidebar-nav.open .sidebar-badge {
    display: inline-block !important;
  }

  /* ─ Tablet Dashboard Grid (3 columns for KPI cards) ─ */
  .page-dashboard .grid-cols-2.md\:grid-cols-5 {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }
  .page-dashboard .grid-cols-2.md\:grid-cols-5 > * {
    flex: none !important;
    width: auto !important;
  }

  /* ─ Tablet Forms Layout: 2 Columns ─ */
  .content-area form .grid,
  .content-area form [class*="grid-cols-"] {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 16px !important;
  }
  .content-area form [class*="col-span-"] {
    grid-column: span 1 / span 1 !important;
  }
  .content-area form .col-span-12.description,
  .content-area form .col-span-12.full-width,
  .content-area form .col-span-12:has(textarea),
  .content-area form .col-span-2 {
    grid-column: span 2 / span 2 !important;
  }

  /* ─ Tablet POS Module Split Layout ─ */
  .page-pos .flex.gap-4 {
    flex-direction: row !important;
    height: calc(100vh - 160px) !important;
  }
  .page-pos .flex.gap-4 > div:first-child {
    flex: 1 !important;
  }
  .page-pos .flex.gap-4 > div:last-child {
    width: 320px !important;
    flex-shrink: 0 !important;
  }
}

/* ── Mobile-only portrait corrections (< 640px) ── */
@media (max-width: 639px) {
  /* ─ Off-canvas Sidebar Drawer ─ */
  .sidebar-nav {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    bottom: 0 !important;
    z-index: 50 !important;
    width: 240px !important;
    transform: translateX(-100%) !important;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-shadow: 4px 0 10px rgba(0, 0, 0, 0.2) !important;
  }
  .sidebar-nav.open {
    transform: translateX(0) !important;
  }
  .sidebar-nav .sidebar-label {
    display: inline !important;
  }
  .sidebar-nav::-webkit-scrollbar {
    display: none !important;
  }
  .sidebar-nav {
    scrollbar-width: none !important;
  }

  /* ─ Full-width Search Bar in Header ─ */
  .header-search-wrap {
    position: absolute !important;
    left: 48px !important;
    right: 80px !important;
    width: auto !important;
    margin: 0 !important;
    flex: 1 !important;
  }
  /* Clean search input style override to prevent white-on-white */
  .header-search-wrap input {
    background-color: transparent !important;
    border: none !important;
    color: #ffffff !important;
    height: auto !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  /* ─ KPI cards grid: 2 columns layout on mobile ─ */
  .page-dashboard .grid-cols-2.md\:grid-cols-5 {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    overflow-x: visible !important;
    scrollbar-width: auto !important;
  }
  .page-dashboard .grid-cols-2.md\:grid-cols-5 > * {
    flex: none !important;
    width: auto !important;
  }
  .page-dashboard .grid-cols-2.md\:grid-cols-5 > :last-child {
    grid-column: span 2 / span 2 !important;
  }

  /* ─ Form container & fields styling: single-column forms ─ */
  form {
    padding: 10px 12px !important;
    border-radius: 8px !important;
  }
  form .p-6, form .p-5 {
    padding: 0 !important;
  }
  form .grid, 
  form .grid-cols-2, 
  form .md\:grid-cols-2, 
  form .grid-cols-12, 
  form [class*="grid-cols-"],
  .grid.grid-cols-2,
  .grid.md\:grid-cols-2 {
    grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }
  form .col-span-2, 
  form .md\:col-span-2,
  form [class*="col-span-"],
  [class*="col-span-"] {
    grid-column: span 1 / span 1 !important;
  }
  form label {
    font-size: 10px !important;
    font-weight: 700 !important;
    margin-bottom: 3px !important;
  }
  form input, 
  form select, 
  form textarea, 
  .content-area input[type="text"], 
  .content-area input[type="number"], 
  .content-area input[type="email"], 
  .content-area input[type="tel"], 
  .content-area select, 
  .content-area textarea {
    height: 38px !important;
    font-size: 15px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
    border-radius: 6px !important;
    background-color: #f8fafc !important;
    border: 1px solid #cbd5e1 !important;
  }
  form textarea, .content-area textarea {
    height: auto !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }
  input:focus, select:focus, textarea:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
    outline: none !important;
  }

  /* ─ Workspaces and Detail Views ─ */
  .grid-container {
    padding-right: 0 !important;
  }
  .grid-container .gap-5 {
    gap: 10px !important;
  }
  
  /* Table wrappers scrolling on phone views ─ Keep original table design but scrollable */
  .card-wrapper, .table-container, .overflow-x-auto {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  
  /* Detail View customer info lists */
  .card-wrapper table th {
    font-size: 11px !important;
    width: 90px !important;
  }
  .card-wrapper table td {
    font-size: 11.5px !important;
  }
  .card-wrapper table svg {
    width: 12px !important;
    height: 12px !important;
  }

  /* ─ POS Module on Mobile ─ */
  .page-pos .flex.gap-4 {
    flex-direction: column !important;
    height: auto !important;
    gap: 16px !important;
  }
  .page-pos .flex.gap-4 > div:first-child {
    flex: none !important;
    height: auto !important;
  }
  .page-pos .flex.gap-4 > div:last-child {
    width: 100% !important;
    flex: none !important;
    height: auto !important;
  }
  /* POS products grid: 2 columns */
  .page-pos .grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }
}
"""

with open(css_path, "w", encoding="utf-8") as f:
    f.write(original_base + "\n" + new_media_queries)

print("index.css updated successfully with cleaned desktop-referenced adaptive styles!")
