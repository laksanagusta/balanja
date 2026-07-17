# Product Photo Upload with Cloudflare R2

**Date:** 2026-07-17  
**Status:** Approved for implementation planning

## Summary

Add an optional single primary photo to each product. A user selects the photo from the product create or edit form, the Go backend validates and uploads it to Cloudflare R2, and the product stores the resulting public URL. Existing category fallback images remain in use when a product has no photo.

The browser must never receive R2 credentials. Product create and update endpoints will accept multipart requests from the application while continuing to accept their existing JSON payloads for compatibility.

## Goals

- Let users add one primary photo while creating a product.
- Let users preview, replace, or remove that photo while editing a product.
- Store uploaded files in Cloudflare R2 and display them in the product table, POS catalog, and cart surfaces that already consume `product.image`.
- Avoid leaked objects when a database write fails and avoid deleting objects not owned by this application.
- Keep existing JSON API clients and products without photos working.

## Non-goals

- Multiple-image galleries, image ordering, cropping, or an image editor.
- Direct browser-to-R2 uploads or presigned upload URLs.
- Migrating existing external image URLs into R2.
- Making deactivated products delete their photos; deactivation is reversible.
- Private image delivery or per-request signed read URLs.

## Existing System

- The `products.image` database column and the `Image` fields in the backend product models already exist.
- Product repository create and update operations already persist `image`.
- POS product cards and cart rows already render `product.image` with category-based fallbacks.
- The frontend product payload already serializes an `image` string, but `ProductsPage` has no image control.
- Product handlers currently decode JSON only, and the repository has no object-storage integration.

## User Experience

### Create product

The product form adds a visible **Foto produk** field. It initially shows the category fallback and a choose-file action. After selection it shows a local preview, filename, and actions to replace or remove the pending file. Saving uploads the file and product data together. A photo remains optional.

### Edit product

The field shows the current product photo when present. Selecting a new file changes only the local preview until save succeeds. Removing the photo marks it for removal, but the stored image is not deleted until the product update succeeds. Cancelling the form leaves stored data and R2 unchanged.

### Product list and existing consumers

The product table adds a compact thumbnail beside the product name, using the existing fallback when `image` is empty or fails to load. Existing POS and cart consumers continue using the returned public image URL without a separate fetch flow.

### Interaction states

- During submission, the save action is disabled and communicates that the product and photo are being saved.
- Inline errors distinguish unsupported format, oversized file, upload failure, and ordinary product validation errors.
- A failed save retains the selected file and preview so the user can retry.
- File input, replace, and remove controls remain keyboard accessible and have explicit labels.

## Design-system impact

Before implementing the feature page, add the reusable single-image field pattern and compact product thumbnail pattern to the design-system page and document them in `frontend/DESIGN.md`. The implementation must use the existing form control sizing, spacing, colors, radii, labels, helper text, and inline validation conventions.

## API Design

The existing routes remain unchanged:

- `POST /api/v1/products`
- `PUT /api/v1/products/:id`

They support two content types:

1. `application/json`: preserve the existing request contract and behavior.
2. `multipart/form-data`: accept the ordinary product fields plus:
   - `image_file`: optional uploaded JPEG, PNG, or WebP file.
   - `remove_image`: optional boolean used by update requests; defaults to `false`.

`image_file` and `remove_image=true` are mutually exclusive. Sending both returns a validation error. On create, `remove_image` has no effect and should be rejected when true rather than silently ignored.

Successful responses keep the existing product response shape. `image` contains the public URL or an empty string. The internal R2 object key is not returned to clients.

The frontend uses multipart requests for product create and update so text fields and the optional file are submitted as one operation. Other clients can continue using JSON.

## Storage and Persistence

### R2 client

Introduce a small object-storage interface owned by the backend, with operations equivalent to:

- upload an object and return its key and public URL;
- delete an object by key.

The production adapter uses Cloudflare R2's S3-compatible API. Product services depend on the interface so handler and service tests can use a fake without network access.

### Configuration

Add documented backend environment variables:

- `R2_ENABLED`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

`R2_ENABLED` defaults to `false` so existing development and test environments can start without cloud credentials. Startup validation requires the other five values when it is `true`. Upload attempts return a controlled unavailable error when storage is disabled, while photo-free JSON product operations remain functional. Secrets must never be logged or exposed to the frontend. `R2_PUBLIC_BASE_URL` may point to a Cloudflare custom domain or an explicitly configured public R2 development URL.

### Object naming

Use application-generated, unguessable keys under an owned prefix:

`products/<organization-id>/<uuid>.<detected-extension>`

Do not use the original filename in the key. The extension is derived from the detected content type, not the user-supplied filename.

### Ownership metadata

Add a nullable/empty-by-default `image_key` column to `products`. `image` remains the public display URL; `image_key` is internal storage ownership metadata. This avoids deriving deletion targets from URLs and ensures legacy or external URLs are never deleted from R2. API response models do not expose `image_key`.

Repository create/update operations persist both fields atomically with the rest of the product record. Existing rows receive an empty key.

## Validation and Security

- Limit the uploaded file to 5 MiB, with a small bounded allowance for multipart fields at the HTTP layer.
- Accept only content detected as `image/jpeg`, `image/png`, or `image/webp`; do not trust the extension or browser-provided MIME type alone.
- Reject empty files and malformed image headers.
- Generate the object key server-side and never accept a bucket key from the client.
- Scope the key by organization and only delete the exact `image_key` loaded from that organization's product row.
- Escape/display URLs through normal React attributes; never treat image metadata as HTML.
- Return safe user-facing errors while logging storage errors with request context but without credentials.

## Consistency and Failure Handling

Object storage and PostgreSQL cannot share a transaction, so the service uses compensating actions.

### Create with photo

1. Validate product fields and file.
2. Upload the new object to R2.
3. Insert the product with `image` and `image_key` in a database transaction.
4. If the database operation fails, attempt to delete the newly uploaded object and return the original save error.

### Replace photo

1. Load the current product and its owned `image_key` within the organization scope.
2. Validate and upload the replacement.
3. Update the product to the new URL and key.
4. If the database update fails, delete the replacement as compensation.
5. After a successful update, attempt to delete the previous object when its key is non-empty.

Failure to delete the previous object is logged for later cleanup but does not roll back a successfully saved product. The new product state remains authoritative.

### Remove photo

1. Update the product so `image` and `image_key` are empty.
2. After the database succeeds, attempt to delete the previous object when owned.
3. Log a deletion failure without restoring the removed URL.

### Ordinary edit and deactivation

An edit with no file and `remove_image=false` preserves both existing image fields. Product deactivation preserves the photo because the product can be reactivated.

## Backend Structure

- Add R2 configuration to the existing application configuration layer and `.env.example`.
- Add a storage interface and R2 adapter outside the product HTTP handler.
- Extend product persistence models/repository internals with `image_key` while keeping it out of JSON responses.
- Extend product handlers with bounded multipart parsing and explicit content-type dispatch.
- Keep field validation and image lifecycle orchestration in the product service rather than the handler.
- Wire the production R2 adapter through the application's existing dependency construction.

## Frontend Structure

- Extend the product form state with the current image URL, selected `File`, local preview URL, and removal intent.
- Add a reusable single-image field to the design-system primitives/patterns before consuming it on `ProductsPage`.
- Update the API client to build `FormData` for product create/update. Do not set the multipart `Content-Type` header manually; the browser supplies its boundary.
- Revoke generated object preview URLs when a file is replaced, the dialog closes, or the component unmounts.
- Preserve existing category fallback behavior for empty and failed image URLs.

## Testing

### Backend

- Handler tests for JSON compatibility and multipart field parsing.
- Validation tests for supported formats, MIME spoofing, empty files, malformed images, files over 5 MiB, and conflicting remove/upload intent.
- Service tests for create, preserve, replace, and remove flows.
- Compensation tests for database failure after upload.
- Tests confirming old-object deletion only occurs after a successful update and only for a stored owned key.
- Repository/migration tests for `image_key` persistence and existing-row compatibility.
- R2 adapter tests around request construction using a fake S3-compatible server or mocked client; no live credentials in the test suite.

### Frontend

- Product form tests for selection, preview, replace, remove, cancel, retry, and disabled submission state.
- API-client tests for multipart fields and JSON response handling.
- Product table and existing POS component tests for custom image and fallback behavior.
- Design-system showcase tests for the new reusable patterns.

### Verification

- Run `go test ./...` in the backend.
- Run the relevant frontend test suite and lint checks.
- Run `npm run build` in the frontend.
- Inspect the product form and table at supported viewport sizes for clipping, overflow, keyboard access, loading state, and broken-image fallback.

## Rollout and Operations

1. Create the R2 bucket and a public delivery domain.
2. Provision least-privilege credentials limited to object read/write/delete for the configured bucket/prefix.
3. Apply the database migration; existing products remain valid with an empty `image_key`.
4. Configure backend R2 environment variables and set `R2_ENABLED=true` before enabling the upload UI.
5. Deploy backend support before or together with the frontend.
6. Monitor upload errors and old-object deletion warnings. A later maintenance job may clean verified orphaned keys if operational data shows it is needed.

## Acceptance Criteria

- A user can create a product with one valid photo and see it after reload.
- A user can create and use a product without a photo.
- A user can replace or remove an existing owned photo.
- Invalid or oversized files are rejected with an inline, actionable message.
- Failed product persistence does not intentionally leave the newly uploaded object behind.
- Legacy JSON create/update requests continue to work.
- External or legacy URLs are never selected for deletion from R2.
- The image appears consistently in the product table and existing POS/cart surfaces, with fallback behavior intact.
- R2 credentials remain backend-only.
- Design-system documentation and showcase are updated before the feature-page implementation.
