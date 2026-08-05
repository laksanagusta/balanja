import React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Button, Icon } from "../components/primitives.jsx";
import { ProductsPageSkeleton } from "../components/page-loading.jsx";
import { useCursorTable } from "../hooks/useCursorTable.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { parseNumberInput, validateProduct } from "../pos/domain.js";
import { activeMasterOptions, resolveMasterName } from "../pos/master-data.js";
import { usePOSStore } from "../pos/store.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import BackgroundUpdateStatus from "../components/feedback/BackgroundUpdateStatus.jsx";
import { ProductList } from "../components/product/ProductList.jsx";
import { ProductFilterDrawer } from "../components/product/ProductFilterDrawer.jsx";
import ProductEditorWorkspace from "../components/product/ProductEditorWorkspace.jsx";
import { validateProductPhoto } from "../components/product/product-photo.js";
import { primeScanSuccessSound } from "../preferences/scan-feedback.js";
import {
  applyVariantBulkValues,
  attributesKey,
  buildVariantMatrix,
  clearVariantFieldError,
  countVariantCombinations,
  duplicateVariantAttribute,
  moveVariantAttribute,
  renameVariantAttribute,
  validateVariantDraft,
  withVariantDraftIdentity,
} from "../product/product-variant-form.js";
import { productDraftFingerprint } from "../product/product-editor-state.js";
import { productEditPath, routes } from "../shared.jsx";
import { isProductEditorPath } from "../routing.js";

const MAX_VARIANT_COMBINATIONS = 100;

const PRODUCT_ERROR_MESSAGES = {
  AUTH_REQUIRED: "Sesi masuk diperlukan. Masuk kembali untuk melanjutkan.",
  AUTH_INVALID: "Sesi masuk sudah berakhir. Masuk kembali untuk melanjutkan.",
  ORGANIZATION_REQUIRED: "Pilih toko terlebih dahulu untuk melihat produk.",
  NETWORK_ERROR: "Koneksi bermasalah. Periksa internet lalu coba lagi.",
  REQUEST_TIMEOUT: "Permintaan terlalu lama. Coba lagi.",
  INVALID_RESPONSE: "Server mengirim respons yang tidak dapat dibaca. Coba lagi.",
  INTERNAL_ERROR: "Terjadi masalah di server. Coba lagi.",
  INVALID_CURSOR: "Daftar produk berubah. Muat ulang untuk melanjutkan.",
  INVALID_PRODUCT: "Data produk belum valid. Coba lagi.",
  INVALID_PRODUCT_REFERENCE: "Kategori atau satuan produk tidak valid. Periksa kembali isian Anda.",
  BARCODE_CONFLICT: "Barcode sudah dipakai produk atau varian lain.",
  PRODUCT_NOT_FOUND: "Produk tidak ditemukan atau sudah tidak tersedia.",
  VARIANT_NOT_FOUND: "Varian tidak ditemukan atau sudah tidak tersedia.",
  INVALID_VARIANT_ATTRIBUTES: "Pilihan varian tidak sesuai. Periksa kembali atribut produk.",
  MIN_VARIANTS: "Produk harus memiliki setidaknya satu varian aktif.",
  IMAGE_TOO_LARGE: "Ukuran foto maksimal 5 MB.",
  INVALID_IMAGE: "Gunakan file JPG, PNG, atau WebP yang valid.",
  IMAGE_STORAGE_UNAVAILABLE: "Penyimpanan foto sedang tidak tersedia. Coba lagi.",
};

function localizedProductError(error, fallback = "Produk belum dapat dimuat. Coba lagi.") {
  return PRODUCT_ERROR_MESSAGES[error?.code] || fallback;
}

function emptyProduct() {
  return { id: "", name: "", barcode: "", categoryId: "", unitId: "", price: "", stock: 0, image: "", imageFile: null, removeImage: false, active: true, attributesConfig: [], variants: [] };
}

function formatNumberInput(value) {
  const parsed = parseNumberInput(value);
  if (!Number.isFinite(parsed)) return "";
  return new Intl.NumberFormat("id-ID").format(parsed);
}

function normalizeNumberField(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? formatNumberInput(digits) : "";
}

function editorProductId(pathname) {
  const match = pathname.match(/^\/products\/([^/]+)\/edit$/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function createEditorDraft(product) {
  const identified = withVariantDraftIdentity(product.attributesConfig || [], product.variants || []);
  const attributesConfig = identified.config;
  const variants = attributesConfig.length > 0
    ? buildVariantMatrix(attributesConfig, identified.variants, { price: product.price, stock: product.stock })
    : identified.variants;
  return { ...product, attributesConfig, variants, imageFile: null, removeImage: false };
}

function buildEditorSubmission(editing) {
  const config = editing.attributesConfig || [];
  const variantMode = config.length > 0;
  const rows = variantMode ? editing.variants || [] : [];
  const fallbackVariantPrice = rows
    .map((row) => parseNumberInput(row.price))
    .find((price) => Number.isFinite(price) && price > 0);

  return {
    config,
    rows,
    variantMode,
    formProduct: variantMode
      ? {
        ...editing,
        price: fallbackVariantPrice || parseNumberInput(editing.price) || 1,
        stock: 0,
        variants: rows.map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          attributes: row.attributes,
          price: Number.isFinite(parseNumberInput(row.price)) ? parseNumberInput(row.price) : 0,
          stock: parseNumberInput(row.stock),
          barcode: String(row.barcode || "").trim(),
          active: row.active !== false,
        })),
      }
      : { ...editing, variants: [] },
  };
}

function validateEditorDraft(editing, products) {
  const { config, rows, variantMode, formProduct } = buildEditorSubmission(editing);
  let validation = validateProduct(formProduct, products);
  const occupiedBarcodes = new Set((products || [])
    .filter((product) => product.id !== editing.id)
    .flatMap((product) => [product.barcode, ...(product.variants || []).map((variant) => variant.barcode)])
    .map((barcode) => String(barcode || "").trim().toLocaleLowerCase("id-ID"))
    .filter(Boolean));
  const parentBarcode = String(editing.barcode || "").trim().toLocaleLowerCase("id-ID");
  if (occupiedBarcodes.has(parentBarcode)) validation.errors.barcode = "Barcode sudah dipakai produk atau varian lain.";
  const variantValidation = variantMode ? validateVariantDraft({
    attributes: config,
    variants: rows,
    parentBarcode: editing.barcode,
    occupiedBarcodes,
  }) : { ok: true, attributeRows: {}, variantRows: {}, summary: [] };
  if (variantMode) {
    delete validation.errors.price;
    delete validation.errors.stock;
  }
  validation.ok = Object.keys(validation.errors).length === 0;

  return {
    formProduct,
    variantValidation,
    valid: validation.ok && variantValidation.ok,
    errors: {
      ...validation.errors,
      variants: variantValidation.summary[0] || "",
      variantSummary: variantValidation.summary,
      variantRows: variantValidation.variantRows,
      attributeRows: variantValidation.attributeRows,
    },
  };
}

function clearAttributeFieldError(attributeRows = {}, index, field) {
  const nextRows = { ...attributeRows };
  const nextRow = { ...(nextRows[index] || {}) };
  delete nextRow[field];
  if (Object.values(nextRow).some(Boolean)) nextRows[index] = nextRow;
  else delete nextRows[index];
  return nextRows;
}

function focusFirstProductError() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const invalidFields = [...document.querySelectorAll('#product-form [aria-invalid="true"]')];
      const firstInvalid = invalidFields.find((field) => field.offsetParent !== null) || invalidFields[0];
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      firstInvalid?.scrollIntoView?.({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      firstInvalid?.focus?.({ preventScroll: true });
    });
  });
}

export default function ProductsPage({ pathname = routes.products, onNavigate = () => {} }) {
  const store = usePOSStore();
  const { loadCategories, loadProducts, loadUnits } = store;
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [editorStep, setEditorStep] = React.useState("details");
  const [editorBaseline, setEditorBaseline] = React.useState("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);
  const [variantUndo, setVariantUndo] = React.useState(null);
  const [productErrors, setProductErrors] = React.useState({});
  const [scannerTarget, setScannerTarget] = React.useState(null);
  const [savingProduct, setSavingProduct] = React.useState(false);
  const [photoPreviewURL, setPhotoPreviewURL] = React.useState("");
  const [enteringProductIds, setEnteringProductIds] = React.useState([]);
  const [topBarActionsTarget, setTopBarActionsTarget] = React.useState(null);
  const [editorRouteError, setEditorRouteError] = React.useState("");
  const [touchedFields, setTouchedFields] = React.useState({});
  const editorStepHeadingRef = React.useRef(null);
  const editorPrimaryFieldRef = React.useRef(null);
  const focusPrimaryEditorFieldRef = React.useRef(false);
  const initializedEditorPathRef = React.useRef("");
  const debouncedQuery = useDebouncedValue(query, 220);
  const productFilters = React.useMemo(() => ({
    q: debouncedQuery.trim(),
    categoryId,
    active: status ? status === "active" : undefined,
  }), [categoryId, debouncedQuery, status]);
  const categoryOptions = React.useMemo(
    () => [{ value: "", label: "Semua kategori" }, ...activeMasterOptions(store.categories)],
    [store.categories],
  );
  const fetchProductPage = React.useCallback(
    (request) => store.api.listProducts(request),
    [store.api],
  );
  const table = useCursorTable({
    fetchPage: fetchProductPage,
    filters: productFilters,
    initialSortKey: "createdAt",
    initialSortDir: "desc",
    initialPageSize: 6,
  });
  const editorHasDraft = Boolean(editing);
  const editorDirty = editorHasDraft && productDraftFingerprint(editing) !== editorBaseline;
  const productIdFromRoute = editorProductId(pathname);
  const editorRouteActive = pathname === routes.productNew || Boolean(productIdFromRoute);
  const editorVisible = editorRouteActive || Boolean(editing && (editorDirty || discardConfirmOpen));

  React.useEffect(() => () => {
    if (photoPreviewURL) {
      window.setTimeout(() => URL.revokeObjectURL(photoPreviewURL), 200);
    }
  }, [photoPreviewURL]);

  React.useEffect(() => {
    if (enteringProductIds.length === 0) return undefined;
    const timeout = window.setTimeout(() => setEnteringProductIds([]), 220);
    return () => window.clearTimeout(timeout);
  }, [enteringProductIds]);

  React.useEffect(() => {
    loadCategories();
    loadUnits();
  }, [loadCategories, loadUnits]);

  React.useEffect(() => {
    if (!editorRouteActive) {
      initializedEditorPathRef.current = "";
      return undefined;
    }
    if (editing || initializedEditorPathRef.current === pathname) return undefined;
    if (pathname === routes.productNew && !(store.loaded.categories && store.loaded.units)) return undefined;

    initializedEditorPathRef.current = pathname;
    setEditorRouteError("");
    if (pathname === routes.productNew) {
      const draft = createEditorDraft(emptyProduct());
      focusPrimaryEditorFieldRef.current = true;
      setEditing(draft);
      setEditorBaseline(productDraftFingerprint(draft));
      setEditorStep("details");
      return undefined;
    }

    let cancelled = false;
    const loadEditorProduct = async () => {
      try {
        let products = store.products;
        if (!products.some((item) => item.id === productIdFromRoute)) products = await loadProducts();
        if (cancelled) return;
        const product = products.find((item) => item.id === productIdFromRoute);
        if (!product) {
          setEditorRouteError("Produk tidak ditemukan atau sudah tidak tersedia.");
          return;
        }
        const draft = createEditorDraft(product);
        focusPrimaryEditorFieldRef.current = true;
        setEditing(draft);
        setEditorBaseline(productDraftFingerprint(draft));
        setEditorStep("details");
      } catch (error) {
        if (!cancelled) setEditorRouteError(localizedProductError(error, "Produk belum dapat dibuka. Coba lagi."));
      }
    };
    void loadEditorProduct();
    return () => { cancelled = true; };
  }, [editing, editorRouteActive, loadProducts, pathname, productIdFromRoute, store.loaded.categories, store.loaded.units, store.products]);

  React.useEffect(() => {
    if (editorRouteActive || !editing || editorDirty || discardConfirmOpen) return;
    setPhotoPreviewURL("");
    setEditing(null);
    setEditorStep("details");
    setEditorBaseline("");
    setVariantUndo(null);
    setProductErrors({});
    setTouchedFields({});
    focusPrimaryEditorFieldRef.current = false;
  }, [discardConfirmOpen, editing, editorDirty, editorRouteActive]);

  React.useEffect(() => {
    if (!editing || !editorDirty) return undefined;
    const protectBrowserBack = () => {
      if (isProductEditorPath(window.location.pathname)) return;
      window.history.forward();
      setDiscardConfirmOpen(true);
    };
    window.addEventListener("popstate", protectBrowserBack);
    return () => window.removeEventListener("popstate", protectBrowserBack);
  }, [editing, editorDirty]);

  React.useEffect(() => {
    setTopBarActionsTarget(document.getElementById("app-top-bar-actions"));
  }, []);

  React.useEffect(() => {
    if (!editorHasDraft || discardConfirmOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = focusPrimaryEditorFieldRef.current && editorStep === "details"
        ? editorPrimaryFieldRef.current
        : editorStepHeadingRef.current;
      target?.focus?.();
      focusPrimaryEditorFieldRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [discardConfirmOpen, editorHasDraft, editorStep]);

  React.useEffect(() => {
    if (!editorDirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [editorDirty]);

  React.useEffect(() => {
    if (!editing || discardConfirmOpen || scannerTarget) return undefined;
    const handleEditorShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("id-ID") === "s") {
        event.preventDefault();
        if (!savingProduct) document.getElementById("product-form")?.requestSubmit();
      }
    };
    document.addEventListener("keydown", handleEditorShortcut);
    return () => document.removeEventListener("keydown", handleEditorShortcut);
  }, [discardConfirmOpen, editing, savingProduct, scannerTarget]);

  React.useEffect(() => {
    if (!variantUndo?.visible) return undefined;
    const timeout = window.setTimeout(() => {
      setVariantUndo((current) => (current ? { ...current, visible: false } : current));
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [variantUndo?.message, variantUndo?.visible]);

  const isProductsMutating = savingProduct;

  const closeEditor = ({ navigate = true } = {}) => {
    setPhotoPreviewURL("");
    setEditing(null);
    setEditorStep("details");
    setEditorBaseline("");
    setDiscardConfirmOpen(false);
    setVariantUndo(null);
    setProductErrors({});
    setTouchedFields({});
    setEditorRouteError("");
    initializedEditorPathRef.current = "";
    focusPrimaryEditorFieldRef.current = false;
    if (navigate) onNavigate(routes.products, { replace: true });
  };

  const requestCloseEditor = () => {
    if (savingProduct) return;
    if (discardConfirmOpen) {
      setDiscardConfirmOpen(false);
      return;
    }
    if (editorDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeEditor();
  };

  const openEditor = (product) => {
    setPhotoPreviewURL("");
    const draft = createEditorDraft(product);
    setEditing(draft);
    setEditorBaseline(productDraftFingerprint(draft));
    setEditorStep("details");
    setDiscardConfirmOpen(false);
    setVariantUndo(null);
    setProductErrors({});
    setTouchedFields({});
    setEditorRouteError("");
    focusPrimaryEditorFieldRef.current = true;
    const nextPath = product.id ? productEditPath(product.id) : routes.productNew;
    initializedEditorPathRef.current = nextPath;
    onNavigate(nextPath);
  };

  const selectPhoto = (file) => {
    const error = file ? validateProductPhoto(file) : "";
    setProductErrors((current) => ({ ...current, form: "", image: error }));
    if (error || !file) return;
    setPhotoPreviewURL(URL.createObjectURL(file));
    setEditing((current) => ({ ...current, imageFile: file, removeImage: false }));
  };

  const removePhoto = () => {
    setPhotoPreviewURL("");
    setEditing((current) => ({ ...current, imageFile: null, removeImage: true }));
    setProductErrors((current) => ({ ...current, form: "", image: "" }));
  };

  const handleProductBlur = (field) => {
    if (!editing) return;
    const validation = validateEditorDraft(editing, store.products);
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setProductErrors((current) => ({
      ...current,
      form: "",
      [field]: validation.errors[field] || "",
    }));
  };

  const handleVariantBlur = (key, field) => {
    if (!editing) return;
    const validation = validateEditorDraft(editing, store.products);
    const error = validation.variantValidation.variantRows?.[key]?.[field] || "";
    setProductErrors((current) => ({
      ...current,
      form: "",
      variants: validation.errors.variants || current.variants,
      variantRows: error
        ? { ...current.variantRows, [key]: { ...current.variantRows?.[key], [field]: error } }
        : clearVariantFieldError(current.variantRows, key, field),
    }));
  };

  const handleAttributeBlur = (index, field) => {
    if (!editing) return;
    const validation = validateEditorDraft(editing, store.products);
    const error = validation.variantValidation.attributeRows?.[index]?.[field] || "";
    setProductErrors((current) => ({
      ...current,
      form: "",
      variants: validation.errors.variants || current.variants,
      attributeRows: error
        ? { ...current.attributeRows, [index]: { ...current.attributeRows?.[index], [field]: error } }
        : clearAttributeFieldError(current.attributeRows, index, field),
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (savingProduct) return;
    const validation = validateEditorDraft(editing, store.products);
    const touched = { name: true, barcode: true, categoryId: true, price: true, stock: true, unitId: true };
    setTouchedFields(touched);
    setProductErrors((current) => ({
      ...validation.errors,
      form: "",
      variantFocusRequest: (current.variantFocusRequest || 0) + (validation.variantValidation.ok ? 0 : 1),
    }));
    if (!validation.valid) {
      setEditorStep(!validation.variantValidation.ok ? "variants" : "details");
      focusFirstProductError();
      return;
    }

    setSavingProduct(true);
    try {
      const saved = await store.saveProduct(validation.formProduct, { throwOnError: true });
      if (!saved) {
        const message = "Gagal menyimpan produk. Coba lagi.";
        setProductErrors((current) => ({ ...current, form: message }));
        toast.error(message);
        return;
      }

      toast.success(editing.id ? "Produk diperbarui" : "Produk ditambahkan", {
        description: saved.name,
      });
      closeEditor();
      await Promise.all([table.reset(), loadProducts({ force: true })]);
    } catch (error) {
      if (["INVALID_IMAGE", "IMAGE_TOO_LARGE", "IMAGE_STORAGE_UNAVAILABLE"].includes(error?.code)) {
        setProductErrors((current) => ({ ...current, form: "", image: localizedProductError(error) }));
      } else {
        const message = localizedProductError(error, "Produk belum tersimpan. Periksa isian lalu coba lagi.");
        setProductErrors((current) => ({ ...current, form: message }));
        toast.error(message);
      }
    } finally {
      setSavingProduct(false);
    }
  };

  const rememberVariantStructure = (message) => {
    setVariantUndo({
      message,
      visible: true,
      attributesConfig: editing.attributesConfig,
      variants: editing.variants,
      price: editing.price,
      stock: editing.stock,
    });
  };

  const addAttribute = () => {
    rememberVariantStructure("1 atribut ditambahkan.");
    setEditing((current) => {
      const index = current.attributesConfig.length;
      const [attribute] = withVariantDraftIdentity([
        { name: index === 0 ? "Ukuran" : `Atribut ${index + 1}`, options: [] },
      ]).config;
      const config = [...current.attributesConfig, attribute];
      return { ...current, attributesConfig: config };
    });
    setProductErrors((current) => ({ ...current, form: "", variants: "", attributeRows: {} }));
  };

  const renameAttribute = (index, name) => {
    setEditing((current) => {
      const { config, variants } = renameVariantAttribute(current.attributesConfig, current.variants, index, name);
      return { ...current, attributesConfig: config, variants };
    });
    setProductErrors((current) => ({ ...current, form: "" }));
  };

  const setAttributeOptions = (index, options) => {
    const nextConfig = editing.attributesConfig.map((attr, i) => (i === index ? { ...attr, options } : attr));
    const combinationCount = countVariantCombinations(nextConfig);
    if (combinationCount > MAX_VARIANT_COMBINATIONS) {
      setProductErrors((current) => ({
        ...current,
        form: "",
        variants: `Maksimal ${MAX_VARIANT_COMBINATIONS} variasi per produk. Kurangi jumlah pilihan.`,
      }));
      return;
    }
    const delta = combinationCount - (editing.variants || []).length;
    const message = delta > 0
      ? `${delta} variasi ditambahkan.`
      : delta < 0
        ? `${Math.abs(delta)} variasi dihapus.`
        : "Kombinasi variasi diperbarui.";
    rememberVariantStructure(message);
    setEditing((current) => {
      const config = current.attributesConfig.map((attr, i) => (i === index ? { ...attr, options } : attr));
      const variants = buildVariantMatrix(config, current.variants || [], { price: current.price, stock: current.stock });
      return { ...current, attributesConfig: config, variants };
    });
    setProductErrors((current) => ({ ...current, form: "", variants: "", variantRows: {}, attributeRows: {} }));
  };

  const duplicateAttribute = (index) => {
    const result = duplicateVariantAttribute(
      editing.attributesConfig,
      editing.variants,
      index,
      { price: editing.price, stock: 0 },
    );
    if (countVariantCombinations(result.config) > MAX_VARIANT_COMBINATIONS) {
      setProductErrors((current) => ({ ...current, form: "", variants: `Maksimal ${MAX_VARIANT_COMBINATIONS} variasi per produk. Kurangi jumlah pilihan.` }));
      return;
    }
    rememberVariantStructure(`${result.variants.length - editing.variants.length} variasi ditambahkan.`);
    setEditing((current) => ({ ...current, attributesConfig: result.config, variants: result.variants }));
    setProductErrors((current) => ({ ...current, form: "" }));
  };

  const moveAttribute = (fromIndex, toIndex) => {
    rememberVariantStructure("Urutan atribut diperbarui.");
    setEditing((current) => {
      const result = moveVariantAttribute(current.attributesConfig, current.variants, fromIndex, toIndex);
      return { ...current, attributesConfig: result.config, variants: result.variants };
    });
    setProductErrors((current) => ({ ...current, form: "" }));
  };

  const removeAttribute = (index) => {
    rememberVariantStructure("Atribut dihapus. Periksa kembali stok hasil penggabungan.");
    setEditing((current) => {
      const config = current.attributesConfig.filter((_, i) => i !== index);
      if (config.length === 0) {
        return {
          ...current,
          attributesConfig: [],
          variants: [],
          price: current.variants[0]?.price || current.price,
          stock: current.variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0),
        };
      }
      return {
        ...current,
        attributesConfig: config,
        variants: buildVariantMatrix(config, current.variants || [], { price: current.price, stock: 0 }),
      };
    });
    setProductErrors((current) => ({ ...current, form: "", variants: "", variantRows: {}, attributeRows: {} }));
  };

  const undoVariantStructure = () => {
    if (!variantUndo) return;
    setEditing((current) => ({
      ...current,
      attributesConfig: variantUndo.attributesConfig,
      variants: variantUndo.variants,
      price: variantUndo.price,
      stock: variantUndo.stock,
    }));
    setVariantUndo(null);
    setProductErrors((current) => ({ ...current, form: "", variants: "", variantRows: {}, attributeRows: {} }));
  };

  const updateVariantRow = (key, field, value) => {
    setEditing((current) => ({
      ...current,
      variants: (current.variants || []).map((variant) => (attributesKey(variant.attributes) === key ? { ...variant, [field]: value } : variant)),
    }));
    setProductErrors((current) => ({
      ...current,
      form: "",
      variants: "",
      variantRows: clearVariantFieldError(current.variantRows, key, field),
    }));
  };

  const applyBulkVariantValues = (values, message = `${editing.variants.length} variasi diperbarui.`) => {
    rememberVariantStructure(message);
    setEditing((current) => ({
      ...current,
      variants: applyVariantBulkValues(current.variants, values),
    }));
    setProductErrors((current) => ({ ...current, form: "", variants: "", variantRows: {} }));
  };

  const setAllVariantsActive = (active, message) => {
    rememberVariantStructure(message || (active ? "Semua variasi diaktifkan." : "Semua variasi dinonaktifkan."));
    setEditing((current) => ({
      ...current,
      variants: current.variants.map((variant) => ({ ...variant, active })),
    }));
    setProductErrors((current) => ({ ...current, form: "" }));
  };

  const openVariantEditor = () => {
    setDiscardConfirmOpen(false);
    setEditorStep("variants");
  };

  const updateEditing = (field, value) => {
    const updated = { ...editing, [field]: value };
    setEditing(updated);
    const shouldValidate = touchedFields[field] || productErrors[field];
    setProductErrors((current) => ({
      ...current,
      form: "",
      ...(shouldValidate ? { [field]: validateEditorDraft(updated, store.products).errors[field] || "" } : {}),
    }));
  };

  const loadMoreProducts = async () => {
    const page = await table.loadMore();
    const nextIds = (page?.items || [])
      .map((product) => product.id || product.sku)
      .filter(Boolean);
    setEnteringProductIds(nextIds);
  };

  if (editorVisible) {
    if (!editing) {
      return (
        <div className="flex h-full min-h-0 flex-col bg-surface text-text">
          <header className="sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-3 bg-surface/92 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/78 sm:px-6">
            <button
              type="button"
              onClick={() => closeEditor()}
              aria-label="Kembali ke daftar produk"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Icon name="chevron-left" className="size-4" />
              Kembali
            </button>
            <h1 className="text-lg font-semibold tracking-[-0.01em]">{pathname === routes.productNew ? "Tambah produk" : "Ubah produk"}</h1>
          </header>
          <main className="grid min-h-0 flex-1 place-items-center px-4 py-10" aria-busy={!editorRouteError}>
            {editorRouteError ? (
              <div className="grid max-w-md justify-items-center gap-3 text-center">
                <div className="grid size-10 place-items-center rounded-full bg-danger-soft text-danger" aria-hidden="true"><Icon name="x" className="size-5" /></div>
                <h2 className="text-base font-semibold">Produk tidak dapat dibuka</h2>
                <p className="text-sm leading-6 text-text-muted">{editorRouteError}</p>
                <Button type="button" variant="secondary" onClick={() => closeEditor()}>Kembali ke produk</Button>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Memuat editor produk…</p>
            )}
          </main>
        </div>
      );
    }

    return (
      <>
        <ProductEditorWorkspace
          editing={editing}
          editorStep={editorStep}
          headingRef={editorStepHeadingRef}
          primaryFieldRef={editorPrimaryFieldRef}
          discardConfirmOpen={discardConfirmOpen}
          savingProduct={savingProduct}
          productErrors={productErrors}
          categories={store.categories}
          units={store.units}
          photoPreviewURL={photoPreviewURL}
          variantUndoMessage={variantUndo?.visible ? variantUndo.message : ""}
          onBack={requestCloseEditor}
          onSubmit={save}
          onContinueEditing={() => setDiscardConfirmOpen(false)}
          onDiscard={() => closeEditor()}
          onStepChange={setEditorStep}
          onOpenVariantEditor={openVariantEditor}
          onUpdate={updateEditing}
          onBlurField={handleProductBlur}
          onSelectPhoto={selectPhoto}
          onRemovePhoto={removePhoto}
          onCreateCategory={store.createCategory}
          onRestoreCategory={store.restoreCategory}
          onCreateUnit={store.createUnit}
          onRestoreUnit={store.restoreUnit}
          onScanProductBarcode={() => {
            void primeScanSuccessSound();
            setScannerTarget({ kind: "product" });
          }}
          onUndoVariant={undoVariantStructure}
          onAddAttribute={addAttribute}
          onRenameAttribute={renameAttribute}
          onCommitOptions={setAttributeOptions}
          onDuplicateAttribute={duplicateAttribute}
          onMoveAttribute={moveAttribute}
          onRemoveAttribute={removeAttribute}
          onBlurAttributeField={handleAttributeBlur}
          onUpdateVariant={updateVariantRow}
          onBlurVariantField={handleVariantBlur}
          onApplyBulk={applyBulkVariantValues}
          onSetAllActive={setAllVariantsActive}
          onScanVariantBarcode={(key) => {
            void primeScanSuccessSound();
            setScannerTarget({ kind: "variant", key });
          }}
          formatNumberInput={formatNumberInput}
          normalizeNumberField={normalizeNumberField}
        />

        <BarcodeScanner
          open={Boolean(scannerTarget)}
          title={scannerTarget?.kind === "variant" ? "Pindai barcode varian" : "Pindai barcode produk"}
          onClose={() => setScannerTarget(null)}
          onDetected={(code) => {
            if (scannerTarget?.kind === "variant") {
              updateVariantRow(scannerTarget.key, "barcode", code);
            } else {
              updateEditing("barcode", code);
            }
            return {
              ok: true,
              message: scannerTarget?.kind === "variant" ? "Barcode varian berhasil dipindai" : "Barcode berhasil dipindai",
              description: code,
              close: true,
            };
          }}
        />
      </>
    );
  }

  const topBarActions = topBarActionsTarget
    ? createPortal(
      <>
        <BackgroundUpdateStatus active={table.isUpdating} label="Memperbarui daftar produk" />
        <ProductFilterDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          label="Filter produk"
          sort={`${table.sortKey}:${table.sortDir}`}
          onSortChange={(nextSort) => {
            const [sortKey, sortDir] = nextSort.split(":");
            table.setSort(sortKey, sortDir);
          }}
          category={categoryId}
          categoryOptions={categoryOptions}
          onCategoryChange={setCategoryId}
          status={status}
          onStatusChange={setStatus}
        />
      </>,
      topBarActionsTarget,
    )
    : null;

  if (table.isInitialLoading) {
    return (
      <>
        {topBarActions}
        <ProductsPageSkeleton />
      </>
    );
  }

  const hasProductFilters = Boolean(debouncedQuery.trim() || categoryId || status);
  const normalizedQuery = debouncedQuery.trim();
  const resultAnnouncement = table.error ? "" : `${table.rows.length} produk ditemukan.`;
  const emptyTitle = normalizedQuery
    ? `Tidak ada produk untuk “${normalizedQuery}”`
    : hasProductFilters
      ? "Tidak ada produk yang cocok dengan filter"
      : "Belum ada produk";
  const emptyDescription = hasProductFilters
    ? "Coba kata kunci, kategori, atau status lain."
    : "Tambahkan produk pertama agar bisa menjualnya di kasir.";

  return (
    <>
      {topBarActions}
      <main id="products-main" tabIndex={-1} className="relative flex h-full min-h-0 flex-col bg-surface">
        <header className="px-4 py-3">
          <div className="grid w-full">
            <div className="flex w-full min-w-0 items-center gap-2">
              <div className="mobile-search-control flex h-11 min-w-0 flex-1 items-center gap-3 rounded-control border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
                <Icon name="search" className="size-4 text-text-muted" />
                <input
                  aria-label="Cari produk"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                  placeholder="Nama, barcode, kategori"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{resultAnnouncement}</div>
          <div className="grid w-full gap-3">
            <div className="overflow-hidden rounded-panel bg-surface smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30">
              {table.rows.length ? (
                <ProductList
                  products={table.rows}
                  disabled={isProductsMutating}
                  onSelect={openEditor}
                  getCategory={(product) => resolveMasterName(store.categories, product.categoryId, product.category)}
                  getUnit={(product) => resolveMasterName(store.units, product.unitId, product.unit)}
                  enteringIds={enteringProductIds}
                />
              ) : (
                <EmptyState
                  icon={table.error ? "x" : hasProductFilters ? "search" : "bag"}
                  title={table.error ? "Produk gagal dimuat" : emptyTitle}
                  description={table.error ? localizedProductError(table.error) : emptyDescription}
                  action={table.error ? (
                    <Button size="sm" variant="secondary" onClick={table.retry}>Coba lagi</Button>
                  ) : !hasProductFilters ? (
                    <Button size="sm" variant="primary" disabled={isProductsMutating} onClick={() => openEditor(emptyProduct())}>
                      Tambah produk
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isProductsMutating}
                      onClick={() => { setQuery(""); setCategoryId(""); setStatus(""); }}
                    >
                      Atur ulang filter
                    </Button>
                  )}
                  role={table.error ? "alert" : undefined}
                  className="m-4 min-h-[240px]"
                />
              )}
            </div>
            {table.error && table.rows.length > 0 && (
              <div role="alert" className="grid gap-1 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
                <p className="font-semibold text-text">Sebagian produk belum termuat.</p>
                <p className="leading-6 text-text-muted">{localizedProductError(table.error)} Data yang terlihat mungkin belum lengkap.</p>
              </div>
            )}
            {(table.hasMore || (table.error && table.rows.length > 0)) && (
              <Button
                type="button"
                variant="secondary"
                className="mx-auto min-w-36"
                disabled={table.loading}
                onClick={loadMoreProducts}
              >
                {table.loading ? "Memuat…" : table.error ? "Coba lagi" : "Muat lebih banyak"}
              </Button>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label="Tambah produk"
          title="Tambah produk"
          disabled={isProductsMutating}
          onClick={() => openEditor(emptyProduct())}
          className="app-shell-floating-action absolute right-4 z-10 grid size-11 place-items-center rounded-full bg-accent text-white shadow-panel hover:bg-accent-hover hover:shadow-panel active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
        >
          <Icon name="plus" className="size-5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </button>
      </main>

    </>
  );
}
