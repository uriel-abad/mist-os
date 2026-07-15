/**
 * MIST OS Production — shared constants and schemas.
 * Apps Script loads every .gs file in this directory as one project.
 */

const MIST_OS_VERSION = "3.0.0";
const SCHEMA_VERSION = "MIST-OS-3";
const ORDER_PREFIX = "MIST";
const DUPLICATE_WINDOW_MINUTES = 30;
const LOW_STOCK_THRESHOLD = 5;
const ADMIN_KEY_PROPERTY = "MIST_OS_ADMIN_KEY";
const SPREADSHEET_ID_PROPERTY = "MIST_OS_SPREADSHEET_ID";

const SHEETS = Object.freeze({
  PRODUCTS: "Products",
  CATALOG: "Website Catalog",
  ORDERS: "Orders",
  ITEMS: "Order Items",
  INVENTORY: "Inventory",
  CUSTOMERS: "Customers",
  SETTINGS: "Website Settings",
  DASHBOARD: "Dashboard",
  ERRORS: "Error Log"
});

const PRODUCT_HEADERS = ["Product ID", "SKU", "Product Name", "Color", "Size", "Price", "Active"];
const CATALOG_HEADERS = [
  "Product ID", "Slug", "Product Name", "Description", "Badge", "Default Color",
  "Color", "Color Code", "Front Image URL", "Back Image URL", "Sort Order", "Featured", "Active"
];
const ORDER_HEADERS = [
  "Submitted At", "Order Number", "Customer Name", "Email", "Mobile", "Delivery Address",
  "Total Quantity", "Subtotal", "Status", "Payment Status", "Duplicate Check",
  "Inventory State", "Notes", "Order Signature"
];
const ITEM_HEADERS = [
  "Submitted At", "Order Number", "Product ID", "SKU", "Product Name", "Color", "Size",
  "Quantity", "Unit Price", "Line Total"
];
const INVENTORY_HEADERS = ["SKU", "Product Name", "Color", "Size", "Stock", "Reserved", "Available"];
const CUSTOMER_HEADERS = ["Email", "Customer Name", "Mobile", "Orders", "Lifetime Spend", "Last Order"];
const SETTINGS_HEADERS = ["Key", "Value"];
const ERROR_HEADERS = ["Timestamp", "Function", "Order Number", "Error", "Details"];

const SCHEMAS = Object.freeze({
  [SHEETS.PRODUCTS]: PRODUCT_HEADERS,
  [SHEETS.CATALOG]: CATALOG_HEADERS,
  [SHEETS.ORDERS]: ORDER_HEADERS,
  [SHEETS.ITEMS]: ITEM_HEADERS,
  [SHEETS.INVENTORY]: INVENTORY_HEADERS,
  [SHEETS.CUSTOMERS]: CUSTOMER_HEADERS,
  [SHEETS.SETTINGS]: SETTINGS_HEADERS,
  [SHEETS.ERRORS]: ERROR_HEADERS
});

const HEADER_ALIASES = Object.freeze({
  "Product ID": ["ProductID", "Product Id", "product_id"],
  "Product Name": ["ProductName", "Product", "product_name"],
  "Order Number": ["OrderNumber", "Order No", "Order #"],
  "Customer Name": ["CustomerName", "Name"],
  "Delivery Address": ["DeliveryAddress", "Address"],
  "Total Quantity": ["TotalQuantity", "Total Qty"],
  "Payment Status": ["PaymentStatus"],
  "Duplicate Check": ["DuplicateCheck", "Duplicate Flag"],
  "Inventory State": ["InventoryState"],
  "Order Signature": ["OrderSignature"],
  "Unit Price": ["UnitPrice"],
  "Line Total": ["LineTotal"],
  "Lifetime Spend": ["LifetimeSpend"],
  "Last Order": ["LastOrder"],
  "Default Color": ["DefaultColor"],
  "Color Code": ["ColorCode"],
  "Front Image URL": ["FrontImageURL", "Front Image", "FrontImage"],
  "Back Image URL": ["BackImageURL", "Back Image", "BackImage"],
  "Sort Order": ["SortOrder"]
});

const ORDER_STATUSES = ["New", "Suspicious", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Duplicate"];
const PAYMENT_STATUSES = ["Pending", "Paid", "COD", "Refunded"];
const ALLOWED_TRANSITIONS = Object.freeze({
  New: ["Confirmed", "Cancelled", "Suspicious", "Duplicate"],
  Suspicious: ["Confirmed", "Cancelled", "Duplicate"],
  Confirmed: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
  Duplicate: []
});

const DEFAULT_PRODUCTS = (() => {
  const rows = [];
  const sizes = ["XS", "S", "M", "L", "XL"];
  const colors = [
    { name: "White", code: "WHT" },
    { name: "Black", code: "BLK" },
    { name: "Light Pink", code: "PNK" }
  ];
  colors.forEach(color => sizes.forEach(size => rows.push([
    "AFS", `AFS-${color.code}-${size}`, "AirForm Studio Set", color.name, size, 899, "Yes"
  ])));
  return rows;
})();

const DEFAULT_CATALOG = [
  ["AFS", "airform-studio-set", "AirForm Studio Set", "Sculpting support with a smooth, breathable feel for training, walking, and everyday movement.", "NEW", "White", "White", "WHT", "images/products/airform-studio-set/white/front.png", "images/products/airform-studio-set/white/back.png", 1, "Yes", "Yes"],
  ["AFS", "airform-studio-set", "AirForm Studio Set", "Sculpting support with a smooth, breathable feel for training, walking, and everyday movement.", "NEW", "White", "Black", "BLK", "images/products/airform-studio-set/black/front.png", "images/products/airform-studio-set/black/back.png", 1, "Yes", "Yes"],
  ["AFS", "airform-studio-set", "AirForm Studio Set", "Sculpting support with a smooth, breathable feel for training, walking, and everyday movement.", "NEW", "White", "Light Pink", "PNK", "images/products/airform-studio-set/light-pink/front.png", "images/products/airform-studio-set/light-pink/back.png", 1, "Yes", "Yes"]
];

const DEFAULT_SETTINGS = [
  ["store_name", "MIST"],
  ["hero_title", "Move Light. Move Free."],
  ["hero_subtitle", "Versatile activewear for studio sessions, city walks, and everything between."],
  ["hero_button", "Browse the collection"],
  ["hero_eyebrow", "The Airform Collection"],
  ["announcement_text", "MIST CATALOGUE · ORDERS ARE CONFIRMED MANUALLY BEFORE PAYMENT"],
  ["messenger_username", "marichris.milanes"],
  ["instagram_username", "Chrissygotosleep"],
  ["currency", "PHP"]
];
