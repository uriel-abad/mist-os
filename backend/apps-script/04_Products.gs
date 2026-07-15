/** Product catalog, website showcase, and settings. */

function serializeProduct_(row) {
  return {
    productId: String(row["Product ID"] || "").trim(),
    sku: String(row.SKU || "").trim().toUpperCase(),
    name: String(row["Product Name"] || "").trim(),
    color: String(row.Color || "").trim(),
    size: String(row.Size || "").trim(),
    price: parseNonNegativeNumber_(row.Price, "Price"),
    active: isYes_(row.Active)
  };
}

function productMap_() {
  const map = {};
  rowsAsCanonicalObjects_(SHEETS.PRODUCTS, PRODUCT_HEADERS, false).forEach(row => {
    const product = serializeProduct_(row);
    if (!product.sku) return;
    if (map[product.sku]) throw new Error("Duplicate SKU in Products: " + product.sku);
    map[product.sku] = product;
  });
  return map;
}

function saveProduct_(input) {
  const product = input || {};
  const normalized = {
    "Product ID": String(product.productId || product["Product ID"] || "").trim().toUpperCase(),
    SKU: String(product.sku || product.SKU || "").trim().toUpperCase(),
    "Product Name": String(product.name || product["Product Name"] || "").trim(),
    Color: String(product.color || product.Color || "").trim(),
    Size: String(product.size || product.Size || "").trim().toUpperCase(),
    Price: parseNonNegativeNumber_(product.price ?? product.Price, "Price"),
    Active: yesNo_(product.active ?? product.Active)
  };
  if (!normalized["Product ID"] || !normalized.SKU || !normalized["Product Name"] || !normalized.Color || !normalized.Size) {
    throw new Error("Product ID, SKU, product name, color, and size are required.");
  }
  upsertCanonical_(SHEETS.PRODUCTS, PRODUCT_HEADERS, "SKU", normalized);
  syncInventoryFromProducts_();
  return { ok: true, product: serializeProduct_(normalized) };
}

function saveCatalogEntry_(input) {
  const entry = input || {};
  const normalized = {
    "Product ID": String(entry.productId || entry["Product ID"] || "").trim().toUpperCase(),
    Slug: String(entry.slug || entry.Slug || "").trim().toLowerCase(),
    "Product Name": String(entry.name || entry["Product Name"] || "").trim(),
    Description: String(entry.description || entry.Description || "").trim(),
    Badge: String(entry.badge || entry.Badge || "").trim(),
    "Default Color": String(entry.defaultColor || entry["Default Color"] || "").trim(),
    Color: String(entry.color || entry.Color || "").trim(),
    "Color Code": String(entry.colorCode || entry["Color Code"] || "").trim().toUpperCase(),
    "Front Image URL": String(entry.frontImage || entry["Front Image URL"] || "").trim(),
    "Back Image URL": String(entry.backImage || entry["Back Image URL"] || "").trim(),
    "Sort Order": Math.floor(parseNonNegativeNumber_(entry.sortOrder ?? entry["Sort Order"], "Sort order")),
    Featured: yesNo_(entry.featured ?? entry.Featured),
    Active: yesNo_(entry.active ?? entry.Active)
  };
  if (!normalized["Product ID"] || !normalized.Slug || !normalized["Product Name"] || !normalized.Color || !normalized["Color Code"] || !normalized["Front Image URL"] || !normalized["Back Image URL"]) {
    throw new Error("Complete the required website showcase fields.");
  }

  const rows = rowsAsCanonicalObjects_(SHEETS.CATALOG, CATALOG_HEADERS, false);
  const existingIndex = rows.findIndex(row =>
    String(row["Product ID"] || "").trim().toUpperCase() === normalized["Product ID"] &&
    String(row.Color || "").trim().toLowerCase() === normalized.Color.toLowerCase()
  );
  if (existingIndex >= 0) writeCanonicalObject_(SHEETS.CATALOG, CATALOG_HEADERS, existingIndex + 2, normalized);
  else appendCanonicalRow_(SHEETS.CATALOG, CATALOG_HEADERS, normalized);
  return { ok: true, productId: normalized["Product ID"], color: normalized.Color };
}

function saveSetting_(key, value) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) throw new Error("Setting key is required.");
  upsertCanonical_(SHEETS.SETTINGS, SETTINGS_HEADERS, "Key", { Key: normalizedKey, Value: String(value ?? "") });
  return { ok: true, key: normalizedKey, value: String(value ?? "") };
}

function buildPublicCatalog_() {
  const products = productMap_();
  const catalogRows = rowsAsCanonicalObjects_(SHEETS.CATALOG, CATALOG_HEADERS, false);
  const grouped = {};

  catalogRows.forEach(row => {
    if (!isYes_(row.Active)) return;
    const productId = String(row["Product ID"] || "").trim().toUpperCase();
    const color = String(row.Color || "").trim();
    const variants = Object.values(products).filter(product =>
      product.active && product.productId === productId && product.color.toLowerCase() === color.toLowerCase()
    );
    if (!variants.length) return;

    const prices = variants.map(variant => variant.price).filter(Number.isFinite);
    if (!prices.length) return;
    if (!grouped[productId]) {
      grouped[productId] = {
        id: String(row.Slug || "").trim(),
        productCode: productId,
        name: String(row["Product Name"] || variants[0].name).trim(),
        description: String(row.Description || "").trim(),
        badge: String(row.Badge || "").trim(),
        defaultColor: String(row["Default Color"] || "").trim(),
        price: Math.min.apply(null, prices),
        sizes: [],
        colors: {},
        sortOrder: Math.floor(parseNumber_(row["Sort Order"], 999)),
        featured: isYes_(row.Featured)
      };
    }

    const groupedProduct = grouped[productId];
    groupedProduct.price = Math.min(groupedProduct.price, Math.min.apply(null, prices));
    variants.forEach(variant => {
      if (!groupedProduct.sizes.includes(variant.size)) groupedProduct.sizes.push(variant.size);
    });
    groupedProduct.colors[color] = {
      code: String(row["Color Code"] || "").trim().toUpperCase(),
      front: String(row["Front Image URL"] || "").trim(),
      back: String(row["Back Image URL"] || "").trim()
    };
  });

  const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
  return Object.values(grouped)
    .filter(product => product.id && product.name && Number.isFinite(product.price) && product.price >= 0 && Object.keys(product.colors).length)
    .map(product => {
      product.sizes.sort((a, b) => {
        const first = sizeOrder.indexOf(a);
        const second = sizeOrder.indexOf(b);
        if (first < 0 && second < 0) return a.localeCompare(b);
        if (first < 0) return 1;
        if (second < 0) return -1;
        return first - second;
      });
      if (!product.colors[product.defaultColor]) product.defaultColor = Object.keys(product.colors)[0] || "";
      return product;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function publicCatalogResponse_() {
  return {
    ok: true,
    version: MIST_OS_VERSION,
    schema: SCHEMA_VERSION,
    settings: settingsObject_(),
    products: buildPublicCatalog_()
  };
}

function adminProductsResponse_() {
  return {
    ok: true,
    products: rowsAsCanonicalObjects_(SHEETS.PRODUCTS, PRODUCT_HEADERS, false).map(serializeProduct_),
    catalog: rowsAsCanonicalObjects_(SHEETS.CATALOG, CATALOG_HEADERS, false).map(row => ({
      productId: String(row["Product ID"] || "").trim(),
      slug: String(row.Slug || "").trim(),
      name: String(row["Product Name"] || "").trim(),
      description: String(row.Description || "").trim(),
      badge: String(row.Badge || "").trim(),
      defaultColor: String(row["Default Color"] || "").trim(),
      color: String(row.Color || "").trim(),
      colorCode: String(row["Color Code"] || "").trim(),
      frontImage: String(row["Front Image URL"] || "").trim(),
      backImage: String(row["Back Image URL"] || "").trim(),
      sortOrder: Math.floor(parseNumber_(row["Sort Order"], 999)),
      featured: isYes_(row.Featured),
      active: isYes_(row.Active)
    }))
  };
}

function validateAndPriceItems_(rawItems, catalog) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new Error("The order has no items.");
  return rawItems.map(raw => {
    const sku = String(raw && raw.sku || "").trim().toUpperCase();
    const quantity = parsePositiveInteger_(raw && raw.qty, "Quantity");
    const product = catalog[sku];
    if (!product) throw new Error("Unknown SKU: " + sku);
    if (!product.active) throw new Error("This product variation is unavailable: " + sku);
    return {
      productId: product.productId,
      sku: product.sku,
      name: product.name,
      color: product.color,
      size: product.size,
      price: product.price,
      qty: quantity,
      lineTotal: product.price * quantity
    };
  });
}
