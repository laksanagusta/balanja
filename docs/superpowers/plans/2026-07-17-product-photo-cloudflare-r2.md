# Product Photo Upload with Cloudflare R2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one optional product photo uploaded through the Go API to Cloudflare R2, with preview, replace, remove, and fallback display behavior.

**Architecture:** React sends product mutations as `multipart/form-data`. Fiber maps the transport to explicit preserve/replace/remove semantics; the product service validates bytes, uploads through an injected object-store interface, persists the public URL plus private `image_key`, and compensates for PostgreSQL failures. The R2 adapter uses Cloudflare's S3-compatible API, while existing JSON product requests remain supported.

**Tech Stack:** Go 1.25, Fiber v3, PostgreSQL/pgx, AWS SDK for Go v2, React 19, FormData/Object URLs, Tailwind CSS v4, Node test runner.

---

## File map

- Create backend migrations `000009_product_image_key.{up,down}.sql`, `internal/platform/objectstore/{store,r2,r2_test}.go`, `internal/product/{image,image_test,handler_test}.go`.
- Modify backend config, product model/repository/service/handler and tests, HTTP server, API wiring, `.env.example`, README, `go.mod`, and `go.sum`.
- Create frontend `components/product/{ProductImage,ProductPhotoField}.jsx`, `product-photo.js`, its test, `components/design/ProductPhotoShowcase.jsx`, and `pages/ProductsPage.test.js`.
- Modify frontend API/store serialization, POS image consumers, design-system page/showcases/tests, `DESIGN.md`, and `ProductsPage.jsx`.

Before editing an already-modified file, run `git diff -- <file>` and merge around the user's changes. Each commit stages only files named by its task.

### Task 1: Persist private R2 ownership

**Files:**
- Create: `backend/migrations/000009_product_image_key.up.sql`
- Create: `backend/migrations/000009_product_image_key.down.sql`
- Modify: `backend/internal/integration/migration_contract_test.go`
- Modify: `backend/internal/product/model.go`
- Modify: `backend/internal/product/repository.go`
- Modify: `backend/internal/product/repository_test.go`

- [ ] **Step 1: Write failing migration/model tests**

```go
func TestProductImageKeyMigration(t *testing.T) {
	content, err := os.ReadFile(filepath.Join("..", "..", "migrations", "000009_product_image_key.up.sql"))
	if err != nil { t.Fatal(err) }
	if !strings.Contains(strings.ToLower(string(content)), "add column image_key text not null default ''") { t.Fatal("missing image_key") }
}

func TestProductImageKeyStaysPrivate(t *testing.T) {
	encoded, _ := json.Marshal(Product{Image: "https://img/p.jpg", ImageKey: "products/org/p.jpg"})
	if strings.Contains(string(encoded), "products/org/p.jpg") { t.Fatalf("private key leaked: %s", encoded) }
}
```

- [ ] **Step 2: Verify red**

Run: `cd backend && go test ./internal/integration ./internal/product -run 'TestProductImageKey'`

Expected: FAIL because migration and `ImageKey` are absent.

- [ ] **Step 3: Add migration and persistence types**

```sql
-- up
alter table products add column image_key text not null default '';
-- down
alter table products drop column if exists image_key;
```

```go
// Add to Product/CreateInput; json:"-" prevents API exposure.
ImageKey string `json:"-"`

// Add to UpdateInput.
ImageKey string `json:"-"`
PreserveImage bool `json:"-"`

type UpdateResult struct { Product Product; PreviousImageKey string }
```

Include `image_key` in scans and inserts. Change repository `Update` to return `UpdateResult` using a locking CTE: select the previous key `for update`, update `image`/`image_key`, then return the updated product plus old key. Use these exact rules:

```sql
image=case when $10 then p.image else $8 end,
image_key=case when $10 then p.image_key when p.image=$8 and $9='' then p.image_key else $9 end
```

This preserves ownership when a JSON client echoes the unchanged URL and clears ownership when it replaces the URL.

- [ ] **Step 4: Verify green and commit**

Run: `cd backend && go test ./internal/product ./internal/integration`

Expected: PASS (database-dependent tests may SKIP without test DB variables).

```bash
git add backend/migrations/000009_product_image_key.* backend/internal/integration/migration_contract_test.go backend/internal/product/model.go backend/internal/product/repository.go backend/internal/product/repository_test.go
git commit -m "feat: persist product image ownership"
```

### Task 2: Add optional R2 config and adapter

**Files:**
- Create: `backend/internal/platform/objectstore/store.go`
- Create: `backend/internal/platform/objectstore/r2.go`
- Create: `backend/internal/platform/objectstore/r2_test.go`
- Modify: `backend/internal/config/config.go`
- Modify: `backend/internal/config/config_test.go`
- Modify: `backend/go.mod`
- Modify: `backend/go.sum`

- [ ] **Step 1: Write failing config/adapter tests**

```go
func TestLoadR2Configuration(t *testing.T) {
	values := validEnvironment()
	got, err := Load(mapGetter(values))
	if err != nil || got.R2.Enabled { t.Fatalf("R2 = %#v, err = %v", got.R2, err) }
	values["R2_ENABLED"] = "true"
	_, err = Load(mapGetter(values))
	if err == nil || !strings.Contains(err.Error(), "R2_ENDPOINT") { t.Fatalf("error = %v", err) }
}

func TestR2PutBuildsPublicURL(t *testing.T) {
	client := &fakeS3Client{}
	store := newWithClient(client, Config{Bucket: "bucket", PublicBaseURL: "https://img.example"})
	got, err := store.Put(context.Background(), PutInput{Key: "products/org/a.png", ContentType: "image/png", Body: []byte("png")})
	if err != nil { t.Fatal(err) }
	if got.URL != "https://img.example/products/org/a.png" { t.Fatalf("URL = %q", got.URL) }
}
```

- [ ] **Step 2: Verify red**

Run: `cd backend && go test ./internal/config ./internal/platform/objectstore`

Expected: FAIL because R2 configuration and package do not exist.

- [ ] **Step 3: Install SDK and implement the narrow contract**

Run: `cd backend && go get github.com/aws/aws-sdk-go-v2/config github.com/aws/aws-sdk-go-v2/credentials github.com/aws/aws-sdk-go-v2/service/s3`

```go
type PutInput struct { Key, ContentType string; Body []byte }
type StoredObject struct { Key, URL string }
type Store interface {
	Put(context.Context, PutInput) (StoredObject, error)
	Delete(context.Context, string) error
}

type R2Config struct {
	Enabled bool
	Endpoint, AccessKeyID, SecretAccessKey, Bucket, PublicBaseURL string
}
```

Parse `R2_ENABLED` as false by default. When true, require all five strings. Construct the SDK with static credentials, region `auto`, `options.BaseEndpoint = aws.String(cfg.Endpoint)`, and `options.UsePathStyle = true`. `Put` uses `s3.PutObjectInput`; `Delete` uses `s3.DeleteObjectInput`; wrap errors without credential values and join URL with a single slash.

- [ ] **Step 4: Verify green and commit**

Run: `cd backend && go test ./internal/config ./internal/platform/objectstore && go mod tidy`

Expected: PASS.

```bash
git add backend/internal/config backend/internal/platform/objectstore backend/go.mod backend/go.sum
git commit -m "feat: add Cloudflare R2 object storage"
```

### Task 3: Validate images and compensate failures

**Files:**
- Create: `backend/internal/product/image.go`
- Create: `backend/internal/product/image_test.go`
- Modify: `backend/internal/product/service.go`
- Modify: `backend/internal/product/service_test.go`

- [ ] **Step 1: Write failing validation/lifecycle tests**

Generate 1×1 JPEG/PNG images with the standard encoders and use a checked-in minimal valid WebP byte literal for WebP decoding; cover empty/malformed/spoofed content and `5 MiB + 1 byte`. Add compensation coverage:

```go
func TestReplaceImageCompensatesDatabaseFailure(t *testing.T) {
	images := &fakeImageStore{put: objectstore.StoredObject{Key: "products/org/new.png", URL: "https://img/new.png"}}
	service := NewService(fakeRunner{err: errors.New("db down")}, &fakeRepository{}, WithImageStore(images))
	_, err := service.Update(context.Background(), identity, uuid.New(), validUpdate(), ImageMutation{Mode: ImageReplace, Upload: &ImageUpload{Data: validPNG()}})
	if err == nil || !slices.Equal(images.deleted, []string{"products/org/new.png"}) { t.Fatalf("err=%v deleted=%v", err, images.deleted) }
}
```

- [ ] **Step 2: Verify red**

Run: `cd backend && go test ./internal/product -run 'Test(Validate|ReplaceImage|RemoveImage|CreateImage)'`

Expected: FAIL because image mutation types and storage option are absent.

- [ ] **Step 3: Implement validation and lifecycle**

```go
const MaxProductImageBytes = 5 << 20
var ErrInvalidImage = errors.New("invalid product image")
var ErrImageTooLarge = errors.New("product image too large")
var ErrStorageDisabled = errors.New("product image storage disabled")

type ImageUpload struct { Filename string; Data []byte }
type ImageMode uint8
const ( ImagePreserve ImageMode = iota; ImageReference; ImageReplace; ImageRemove )
type ImageMutation struct { Mode ImageMode; Upload *ImageUpload }
```

Detect MIME with `http.DetectContentType`, allow JPEG/PNG/WebP only, decode image config (register `golang.org/x/image/webp`), and derive extension from detected MIME. Generate `products/<safe-org>/<uuid>.<ext>` server-side.

Run: `cd backend && go get golang.org/x/image/webp`

Add `WithImageStore` and `WithLogger` options. Preserve leaves both fields unchanged; reference clears ownership unless URL is unchanged; replace validates/uploads then persists returned URL/key; remove clears both. Delete a new upload when DB fails. After successful replace/remove, delete the returned old key only when non-empty and different; log but do not fail if old-object deletion fails. Apply upload compensation to create and leave deactivation unchanged.

- [ ] **Step 4: Verify green and commit**

Run: `cd backend && go test ./internal/product`

Expected: PASS.

```bash
git add backend/internal/product/image.go backend/internal/product/image_test.go backend/internal/product/service.go backend/internal/product/service_test.go
git commit -m "feat: manage product image lifecycle"
```

### Task 4: Accept bounded multipart requests

**Files:**
- Create: `backend/internal/product/handler_test.go`
- Modify: `backend/internal/product/handler.go`
- Modify: `backend/internal/platform/httpserver/server.go`
- Modify: `backend/internal/platform/httpserver/server_test.go`

- [ ] **Step 1: Write failing multipart/body-limit tests**

Use `mime/multipart.Writer` to assert: create binds file/numbers; update with no photo preserves; `remove_image=true` removes; upload+remove returns 422; JSON still works; body over 6 MiB returns 413.

```go
func TestMultipartUpdatePreservesWithoutPhoto(t *testing.T) {
	response, mutation := sendMultipartUpdate(t, validFields(), nil)
	if response.StatusCode != http.StatusOK || mutation.Mode != ImagePreserve { t.Fatalf("status=%d mode=%v", response.StatusCode, mutation.Mode) }
}
```

- [ ] **Step 2: Verify red**

Run: `cd backend && go test ./internal/product ./internal/platform/httpserver -run 'Test(Multipart|JSONProduct|ServerRejectsBodies)'`

Expected: FAIL because handlers decode JSON only.

- [ ] **Step 3: Bind multipart and map errors**

```go
type multipartProduct struct {
	Name string `form:"name"`; Barcode string `form:"barcode"`; Category string `form:"category"`
	Price int `form:"price"`; Stock int `form:"stock"`; Unit string `form:"unit"`; Active bool `form:"active"`
	RemoveImage bool `form:"remove_image"`; ImageFile *multipart.FileHeader `form:"image_file"`
}
```

Dispatch using parsed media type. Bind with `c.Bind().Form`, read file with `io.LimitReader(file, MaxProductImageBytes+1)`, reject upload+remove, and map update to preserve/remove/replace. JSON update maps to `ImageReference`. Return `INVALID_IMAGE` 422, `IMAGE_TOO_LARGE` 413, and `IMAGE_STORAGE_UNAVAILABLE` 503. Set Fiber `BodyLimit: 6 << 20`.

- [ ] **Step 4: Verify green and commit**

Run: `cd backend && go test ./internal/product ./internal/platform/httpserver`

Expected: PASS.

```bash
git add backend/internal/product/handler.go backend/internal/product/handler_test.go backend/internal/platform/httpserver/server.go backend/internal/platform/httpserver/server_test.go
git commit -m "feat: accept product photo multipart requests"
```

### Task 5: Wire and document R2 runtime

**Files:**
- Modify: `backend/cmd/api/main.go`
- Modify: `backend/internal/config/config_test.go`
- Modify: `backend/.env.example`
- Modify: `backend/README.md`

- [ ] **Step 1: Write a failing source wiring test**

```go
func TestMainWiresR2IntoProducts(t *testing.T) {
	source, err := os.ReadFile(filepath.Join("..", "..", "cmd", "api", "main.go")); if err != nil { t.Fatal(err) }
	if !bytes.Contains(source, []byte("objectstore.NewR2")) || !bytes.Contains(source, []byte("product.WithImageStore")) { t.Fatal("R2 not wired") }
}
```

- [ ] **Step 2: Verify red, implement, and verify green**

Run: `cd backend && go test ./internal/config -run TestMainWiresR2IntoProducts`

Expected: FAIL. Then construct the store only when `cfg.R2.Enabled`, pass it and `slog.Default()` to product service, and document:

```dotenv
R2_ENABLED=false
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=balanja-product-images
R2_PUBLIC_BASE_URL=https://images.example.com
```

Document least-privilege put/delete credentials and public read domain. Run: `cd backend && go test ./...`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/cmd/api/main.go backend/internal/config/config_test.go backend/.env.example backend/README.md
git commit -m "feat: wire product uploads to R2"
```

### Task 6: Send product FormData from the frontend

**Files:**
- Modify: `frontend/src/pos/api-client.js`
- Modify: `frontend/src/pos/api-client.test.js`
- Modify: `frontend/src/pos/store-data.js`
- Modify: `frontend/src/pos/store-data.test.js`
- Modify: `frontend/src/pos/store.jsx`

- [ ] **Step 1: Write failing serialization tests**

```js
test("product form data carries one file", () => {
  const file = new File(["png"], "rice.png", { type: "image/png" });
  const form = toProductFormData({ name: "Rice", barcode: "1", category: "Sembako", price: 10, stock: 2, unit: "pcs", imageFile: file }, true);
  assert.equal(form.get("stock"), "2"); assert.equal(form.get("image_file"), file);
});

test("multipart request leaves boundary to fetch", async () => {
  let sent; const api = createAPIClient({ getToken: async () => "t", fetchImpl: async (_u, o) => { sent=o; return new Response('{"data":{}}',{status:201}); } });
  const form = new FormData(); await api.createProduct(form);
  assert.equal(sent.body, form); assert.equal(sent.headers["Content-Type"], undefined);
});
```

- [ ] **Step 2: Verify red**

Run: `cd frontend && node --test src/pos/api-client.test.js src/pos/store-data.test.js`

Expected: FAIL because request bodies are JSON-only.

- [ ] **Step 3: Implement multipart serialization**

```js
export function toProductFormData(product, includeStock) {
  const payload = toProductPayload(product, includeStock); delete payload.image;
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => form.set(key, String(value)));
  if (product.imageFile) form.set("image_file", product.imageFile, product.imageFile.name);
  if (product.removeImage) form.set("remove_image", "true");
  return form;
}
```

In `fetchResponse`, pass `FormData` unchanged and omit content type; retain JSON behavior otherwise. Make `store.saveProduct` use `toProductFormData` for create/update and accept `{ throwOnError: true }`: in that mode it still updates the shared notice but rethrows the original `APIError` so ProductsPage can attach image-related failures to the photo field. Existing scanner callers keep the default null-on-error behavior.

- [ ] **Step 4: Verify green and commit**

Run: `cd frontend && node --test src/pos/api-client.test.js src/pos/store-data.test.js src/pos/store.test.js`

Expected: PASS.

```bash
git add frontend/src/pos/api-client.js frontend/src/pos/api-client.test.js frontend/src/pos/store-data.js frontend/src/pos/store-data.test.js frontend/src/pos/store.jsx
git commit -m "feat: send product photo form data"
```

### Task 7: Publish reusable photo patterns in the design system

**Files:**
- Create: `frontend/src/components/product/ProductImage.jsx`
- Create: `frontend/src/components/product/ProductPhotoField.jsx`
- Create: `frontend/src/components/product/product-photo.js`
- Create: `frontend/src/components/product/product-photo.test.js`
- Create: `frontend/src/components/design/ProductPhotoShowcase.jsx`
- Modify: `frontend/src/components/pos/ProductCard.jsx`
- Modify: `frontend/src/components/pos/CartRow.jsx`
- Modify: `frontend/src/components/pos/pos-components.test.js`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`
- Modify: `frontend/src/components/design/DataTableShowcase.jsx`
- Modify: `frontend/src/components/design/DataTableShowcase.test.js`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Write failing helper/source tests**

```js
test("validates product photo", () => {
  assert.equal(validateProductPhoto(new File(["x"], "a.png", { type: "image/png" })), "");
  assert.match(validateProductPhoto(new File(["x"], "a.gif", { type: "image/gif" })), /JPG, PNG, atau WebP/);
  assert.match(validateProductPhoto({ size: (5 * 1024 * 1024) + 1, type: "image/png" }), /5 MB/);
});
```

Also assert `DesignSystemPage` imports/renders `ProductPhotoShowcase` and POS consumers import shared `ProductImage`.

- [ ] **Step 2: Verify red**

Run: `cd frontend && node --test src/components/product/product-photo.test.js src/components/pos/pos-components.test.js src/components/design/DataTableShowcase.test.js`

Expected: FAIL because components are absent.

- [ ] **Step 3: Implement shared renderer and controlled field**

`ProductImage` owns the existing category fallback map, resets on URL/category change, falls back once on error, and renders decorative `alt=""`. `ProductThumbnail` wraps it in a 40px rounded bordered container.

```jsx
export function ProductPhotoField({ product, previewURL, filename, error, disabled, onSelect, onRemove }) {
  const id = React.useId(); const visible = previewURL || product.image;
  return <fieldset disabled={disabled} className="grid gap-2">
    <legend className="text-sm font-semibold text-text">Foto produk</legend>
    <div className={`flex items-center gap-3 rounded-card border bg-surface p-3 ${error ? "border-danger" : "border-border"}`}>
      <ProductThumbnail product={{ ...product, image: visible }} size="lg" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{filename || (visible ? "Foto saat ini" : "Belum ada foto")}</p><p className="text-xs text-text-muted">JPG, PNG, atau WebP. Maksimal 5 MB.</p></div>
      <label htmlFor={id} className="inline-flex h-9 cursor-pointer items-center rounded-control border border-border px-3 text-sm font-semibold">{visible ? "Ganti" : "Pilih foto"}</label>
      <input id={id} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onSelect(event.target.files?.[0] || null)} />
      {visible && <button type="button" onClick={onRemove} className="h-9 rounded-control px-3 text-sm font-semibold text-danger">Hapus</button>}
    </div>{error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
  </fieldset>;
}
```

Use existing focus/disabled tokens in final markup. Replace duplicate POS/cart image logic with `ProductImage` without changing layout.

- [ ] **Step 4: Update design system before feature page**

Add showcase plus 40px inventory thumbnail and add to `DESIGN.md`:

```markdown
### Product photos
Product forms use one controlled photo field with visible label, preview, JPG/PNG/WebP helper text, 5 MB limit, replace/remove actions, and inline error. Product tables place a 40px rounded thumbnail before the name. Empty or broken URLs use the POS category fallback.
```

- [ ] **Step 5: Verify green and commit**

Run: `cd frontend && node --test src/components/product/product-photo.test.js src/components/pos/pos-components.test.js src/components/design/DataTableShowcase.test.js`

Expected: PASS.

```bash
git add frontend/DESIGN.md frontend/src/components/product frontend/src/components/design/ProductPhotoShowcase.jsx frontend/src/components/design/DataTableShowcase.jsx frontend/src/components/design/DataTableShowcase.test.js frontend/src/components/pos/ProductCard.jsx frontend/src/components/pos/CartRow.jsx frontend/src/components/pos/pos-components.test.js frontend/src/pages/DesignSystemPage.jsx
git commit -m "feat: add product photo design patterns"
```

### Task 8: Integrate photo editing into ProductsPage

**Files:**
- Create: `frontend/src/pages/ProductsPage.test.js`
- Modify: `frontend/src/pages/ProductsPage.jsx`

- [ ] **Step 1: Write a failing integration contract**

```js
test("product page owns one photo preview and thumbnail", async () => {
  const source = await readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8");
  for (const pattern of [/ProductPhotoField/, /ProductThumbnail/, /URL\.createObjectURL/, /URL\.revokeObjectURL/, /imageFile/, /removeImage/]) assert.match(source, pattern);
});
```

- [ ] **Step 2: Verify red**

Run: `cd frontend && node --test src/pages/ProductsPage.test.js`

Expected: FAIL.

- [ ] **Step 3: Implement state and preview cleanup**

Add `image`, `imageFile`, and `removeImage` to form state. Validate with `validateProductPhoto`. Revoke the prior object URL before replacement and on dialog close/unmount:

```jsx
React.useEffect(() => () => { if (photoPreviewURL) URL.revokeObjectURL(photoPreviewURL); }, [photoPreviewURL]);
const selectPhoto = (file) => {
  const error = file ? validateProductPhoto(file) : "";
  setProductErrors((current) => ({ ...current, image: error }));
  if (error || !file) return;
  setPhotoPreviewURL(URL.createObjectURL(file));
  setEditing((current) => ({ ...current, imageFile: file, removeImage: false }));
};
const removePhoto = () => { setPhotoPreviewURL(""); setEditing((current) => ({ ...current, imageFile: null, removeImage: true })); };
```

Call `store.saveProduct(editing, { throwOnError: true })`. Catch `INVALID_IMAGE`, `IMAGE_TOO_LARGE`, and `IMAGE_STORAGE_UNAVAILABLE`, preserve the file/preview, and set `productErrors.image` respectively to an actionable format, size, or temporary-storage message. Other failures retain the existing general toast. Clear photo state only after successful save or cancel.

- [ ] **Step 4: Render the field and table thumbnail**

Place `ProductPhotoField` after name. Render the name cell as:

```jsx
<div className="flex min-w-[180px] items-center gap-3"><ProductThumbnail product={product} /><span className="font-semibold">{product.name}</span></div>
```

Disable all photo actions while saving and show Indonesian validation messages.

- [ ] **Step 5: Verify green and commit**

Run: `cd frontend && node --test src/pages/ProductsPage.test.js src/pos/store-data.test.js src/pos/api-client.test.js`

Expected: PASS.

```bash
git add frontend/src/pages/ProductsPage.jsx frontend/src/pages/ProductsPage.test.js
git commit -m "feat: add product photo editor"
```

### Task 9: Full verification

**Files:** Modify only if a feature-specific defect is found.

- [ ] **Step 1: Format and test backend**

Run: `cd backend && gofmt -w cmd/api/main.go internal/config/*.go internal/platform/objectstore/*.go internal/platform/httpserver/*.go internal/product/*.go internal/integration/migration_contract_test.go && go test ./...`

Expected: formatting exits 0; all tests PASS, with environment-dependent integration tests optionally SKIP.

- [ ] **Step 2: Test and build frontend**

Run: `cd frontend && npm test && npm run build`

Expected: all tests PASS and Vite production build exits 0.

- [ ] **Step 3: Manually verify UI and R2 lifecycle**

Run: `cd frontend && npm run dev`. At narrow and desktop widths verify create without photo, select/preview/replace/cancel/retry/save/reload/remove, keyboard access, no overflow, and table/POS/cart fallback. With non-production R2 credentials, confirm keys live under `products/<org>/`, replacement deletes the previous owned object after save, and deactivation retains its image. Never print credentials.

- [ ] **Step 4: Commit only verification fixes if needed**

Stage exact changed files and run `git commit -m "fix: complete product photo verification"`. If no fixes were needed, do not create an empty commit.
