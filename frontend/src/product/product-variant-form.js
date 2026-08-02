export function attributesKey(attributes) {
  return JSON.stringify(attributes || {});
}

function hasVariantFieldError(row) {
  return Object.values(row || {}).some(Boolean);
}

export function clearVariantFieldError(variantRows = {}, key, field) {
  const nextRows = { ...variantRows };
  const nextRow = { ...(nextRows[key] || {}) };
  delete nextRow[field];
  if (hasVariantFieldError(nextRow)) nextRows[key] = nextRow;
  else delete nextRows[key];
  return nextRows;
}

export function firstVariantErrorKey(variantRows = {}) {
  return Object.entries(variantRows).find(([, row]) => hasVariantFieldError(row))?.[0] || "";
}

let draftIdentity = 0;

function nextDraftIdentity(prefix) {
  draftIdentity += 1;
  return `${prefix}-${draftIdentity}`;
}

export function variantRowKey(variant) {
  return String(variant?.id || variant?.clientKey || attributesKey(variant?.attributes));
}

export function withVariantDraftIdentity(config = [], variants = []) {
  const nextConfig = config.map((attribute) => ({
    ...attribute,
    clientId: attribute.clientId || nextDraftIdentity("attribute"),
  }));
  const nextVariants = variants.map((variant) => ({
    ...variant,
    clientKey: variant.clientKey || nextDraftIdentity("variant"),
  }));
  return { config: nextConfig, variants: nextVariants };
}

export function commitVariantOption(options, rawValue, editIndex = -1) {
  const value = String(rawValue || "").trim();
  if (!value) return { options, committed: false, error: "Pilihan tidak boleh kosong." };
  const normalized = value.toLocaleLowerCase("id-ID");
  const duplicate = options.some((option, index) => (
    index !== editIndex && String(option).trim().toLocaleLowerCase("id-ID") === normalized
  ));
  if (duplicate) return { options, committed: false, error: `Pilihan “${value}” sudah ada.` };
  const next = editIndex >= 0
    ? options.map((option, index) => (index === editIndex ? value : option))
    : [...options, value];
  return { options: next, committed: true, error: "" };
}

function cartesianCombinations(config) {
  if (config.length === 0) return [[]];
  const [head, ...rest] = config;
  const combos = cartesianCombinations(rest);
  return head.options.flatMap((option) => combos.map((combo) => [{ name: head.name, value: option }, ...combo]));
}

export function countVariantCombinations(config) {
  if (!config?.length || config.some((attribute) => !attribute.options?.length)) return 0;
  return config.reduce((total, attribute) => total * attribute.options.length, 1);
}

function attributesAreCompatible(left, right) {
  const leftEntries = Object.entries(left || {});
  const rightEntries = Object.entries(right || {});
  const leftFitsRight = leftEntries.every(([name, value]) => right?.[name] === value);
  const rightFitsLeft = rightEntries.every(([name, value]) => left?.[name] === value);
  return leftFitsRight || rightFitsLeft;
}

export function buildVariantMatrix(config, existingVariants, defaults) {
  const variants = existingVariants || [];
  const existing = new Map(variants.map((variant) => [attributesKey(variant.attributes), variant]));
  const reusedIDs = new Set();
  const reusedRows = new Set();
  return cartesianCombinations(config).map((combo) => {
    const attributes = Object.fromEntries(combo.map((entry) => [entry.name, entry.value]));
    const exact = existing.get(attributesKey(attributes));
    const collapsedMatches = exact ? [] : variants.filter((variant) => {
      const previousAttributes = variant.attributes || {};
      return Object.keys(previousAttributes).length > Object.keys(attributes).length
        && Object.entries(attributes).every(([name, value]) => previousAttributes[name] === value);
    });
    const compatible = variants
      .map((variant, index) => ({ variant, index }))
      .filter(({ variant }) => attributesAreCompatible(variant.attributes, attributes))
      .sort((left, right) => {
        const attributeDifference = Object.keys(right.variant.attributes || {}).length
          - Object.keys(left.variant.attributes || {}).length;
        return attributeDifference || left.index - right.index;
      })[0]?.variant;
    const previous = exact || compatible;
    const previousKey = previous ? variantRowKey(previous) : "";
    const canReuseRow = Boolean(previous) && !reusedRows.has(previousKey);
    const canReuseID = canReuseRow && previous?.id && !reusedIDs.has(previous.id);
    if (canReuseRow) reusedRows.add(previousKey);
    if (canReuseID) reusedIDs.add(previous.id);
    return {
      id: canReuseID ? previous.id : "",
      clientKey: previous?.clientKey || nextDraftIdentity("variant"),
      attributes,
      price: previous ? previous.price : defaults.price,
      stock: canReuseRow
        ? collapsedMatches.length > 1
          ? collapsedMatches.reduce((total, variant) => total + (Number(variant.stock) || 0), 0)
          : previous.stock
        : 0,
      barcode: canReuseRow ? previous.barcode : "",
      active: canReuseRow ? previous.active : true,
    };
  });
}

export function applyVariantBulkValues(variants, values) {
  const suppliedValues = Object.fromEntries(
    Object.entries(values || {}).filter(([, value]) => String(value ?? "").trim() !== ""),
  );
  return (variants || []).map((variant) => ({ ...variant, ...suppliedValues }));
}

export function renameVariantAttribute(config, variants, index, name) {
  const oldName = config[index]?.name;
  const nextConfig = config.map((attribute, itemIndex) => (itemIndex === index ? { ...attribute, name } : attribute));
  const nextVariants = (variants || []).map((variant) => {
    if (!oldName || oldName === name || variant.attributes?.[oldName] === undefined) return variant;
    const attributes = {};
    nextConfig.forEach((attribute, itemIndex) => {
      const previousName = itemIndex === index ? oldName : attribute.name;
      if (variant.attributes?.[previousName] !== undefined) attributes[attribute.name] = variant.attributes[previousName];
    });
    Object.entries(variant.attributes || {}).forEach(([attributeName, value]) => {
      if (attributeName !== oldName && attributes[attributeName] === undefined) attributes[attributeName] = value;
    });
    return { ...variant, attributes };
  });
  return { config: nextConfig, variants: nextVariants };
}

function reorderAttributes(attributes, config) {
  return Object.fromEntries(config
    .filter((attribute) => attributes?.[attribute.name] !== undefined)
    .map((attribute) => [attribute.name, attributes[attribute.name]]));
}

export function moveVariantAttribute(config, variants, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= config.length || toIndex >= config.length) {
    return { config, variants };
  }
  const nextConfig = [...config];
  const [moved] = nextConfig.splice(fromIndex, 1);
  nextConfig.splice(toIndex, 0, moved);
  return {
    config: nextConfig,
    variants: (variants || []).map((variant) => ({
      ...variant,
      attributes: reorderAttributes(variant.attributes, nextConfig),
    })),
  };
}

function copyName(config, sourceName) {
  const occupied = new Set(config.map((attribute) => String(attribute.name).trim().toLocaleLowerCase("id-ID")));
  let candidate = `${sourceName} salinan`;
  let suffix = 2;
  while (occupied.has(candidate.toLocaleLowerCase("id-ID"))) {
    candidate = `${sourceName} salinan ${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function duplicateVariantAttribute(config, variants, index, defaults) {
  const source = config[index];
  if (!source) return { config, variants };
  const duplicate = {
    ...source,
    clientId: nextDraftIdentity("attribute"),
    name: copyName(config, source.name || `Atribut ${index + 1}`),
    options: [...source.options],
  };
  const nextConfig = [...config.slice(0, index + 1), duplicate, ...config.slice(index + 1)];
  return {
    config: nextConfig,
    variants: buildVariantMatrix(nextConfig, variants, defaults),
  };
}

function parseCurrencyValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  const raw = String(value ?? "").trim();
  if (!raw || !/^-?[\d.\s]+$/.test(raw)) return Number.NaN;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return Number.NaN;
  return (raw.startsWith("-") ? -1 : 1) * Number(digits);
}

function parseStockValue(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : Number.NaN;
  const raw = String(value ?? "").trim();
  if (!/^-?\d+$/.test(raw)) return Number.NaN;
  return Number(raw);
}

function labelVariant(attributes) {
  return Object.entries(attributes || {}).map(([name, value]) => `${name}: ${value}`).join(" · ");
}

export function validateVariantDraft({ attributes = [], variants = [], parentBarcode = "", occupiedBarcodes = [] } = {}) {
  const attributeRows = {};
  const variantRows = {};
  const summary = [];
  const normalizedNames = new Map();

  attributes.forEach((attribute, index) => {
    const row = {};
    const name = String(attribute.name || "").trim();
    const normalizedName = name.toLocaleLowerCase("id-ID");
    if (!name) row.name = "Nama atribut wajib diisi.";
    if (!attribute.options?.length) row.options = "Tambahkan minimal satu pilihan.";
    const normalizedOptions = (attribute.options || []).map((option) => String(option).trim().toLocaleLowerCase("id-ID"));
    if (new Set(normalizedOptions).size !== normalizedOptions.length) row.options = "Pilihan tidak boleh duplikat.";
    if (normalizedName) {
      if (normalizedNames.has(normalizedName)) {
        row.name = "Nama atribut tidak boleh duplikat.";
        const previousIndex = normalizedNames.get(normalizedName);
        attributeRows[previousIndex] = { ...attributeRows[previousIndex], name: "Nama atribut tidak boleh duplikat." };
      } else {
        normalizedNames.set(normalizedName, index);
      }
    }
    if (Object.keys(row).length) attributeRows[index] = { ...attributeRows[index], ...row };
  });

  const barcodeRows = new Map();
  variants.forEach((variant) => {
    const barcode = String(variant.barcode || "").trim();
    if (!barcode) return;
    const normalized = barcode.toLocaleLowerCase("id-ID");
    const entries = barcodeRows.get(normalized) || [];
    entries.push(variant);
    barcodeRows.set(normalized, entries);
  });
  const occupied = new Set(Array.from(occupiedBarcodes, (barcode) => String(barcode || "").trim().toLocaleLowerCase("id-ID")));
  const normalizedParentBarcode = String(parentBarcode || "").trim().toLocaleLowerCase("id-ID");

  variants.forEach((variant) => {
    const key = attributesKey(variant.attributes);
    const row = {};
    const price = parseCurrencyValue(variant.price);
    const stock = parseStockValue(variant.stock);
    if (variant.active !== false && Number.isNaN(price)) row.price = "Harga wajib diisi untuk variasi yang dijual.";
    else if (!Number.isNaN(price) && price < 0) row.price = "Harga tidak boleh negatif.";
    else if (variant.active !== false && price < 1) row.price = "Harga minimal Rp1 untuk variasi yang dijual.";
    if (Number.isNaN(stock)) row.stock = "Stok harus berupa bilangan bulat nol atau lebih.";
    else if (stock < 0) row.stock = "Stok tidak boleh negatif.";

    const barcode = String(variant.barcode || "").trim();
    const normalizedBarcode = barcode.toLocaleLowerCase("id-ID");
    const duplicates = barcode ? barcodeRows.get(normalizedBarcode) || [] : [];
    if (duplicates.length > 1) {
      const conflict = duplicates.find((candidate) => candidate !== variant);
      row.barcode = `Barcode sudah digunakan oleh variasi ${labelVariant(conflict?.attributes)}.`;
    } else if (barcode && normalizedBarcode === normalizedParentBarcode) {
      row.barcode = "Barcode harus berbeda dari barcode produk.";
    } else if (barcode && occupied.has(normalizedBarcode)) {
      row.barcode = "Barcode sudah dipakai produk atau variasi lain.";
    }
    if (Object.keys(row).length) variantRows[key] = row;
  });

  const expected = countVariantCombinations(attributes);
  if (!expected || expected !== variants.length) summary.push("Kombinasi variasi belum lengkap.");
  Object.values(attributeRows).forEach((row) => summary.push(...Object.values(row)));
  Object.values(variantRows).forEach((row) => summary.push(...Object.values(row)));
  const uniqueSummary = [...new Set(summary)];
  return {
    ok: uniqueSummary.length === 0,
    attributeRows,
    variantRows,
    summary: uniqueSummary,
  };
}
