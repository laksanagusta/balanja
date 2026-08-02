package product

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"regexp"
	"strconv"

	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/objectstore"
	"balanja/backend/internal/platform/respond"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type Handler struct{ service *Service }

var productImageKeyPattern = regexp.MustCompile(`^products/[A-Za-z0-9_-]+/[0-9a-fA-F-]+\.(?:jpg|jpeg|png|webp)$`)

func NewHandler(service *Service) *Handler { return &Handler{service: service} }
func (h *Handler) RegisterPublic(router fiber.Router) {
	router.Get("/api/v1/product-images/*", h.image)
}
func (h *Handler) Register(group fiber.Router) {
	group.Get("/products", h.list)
	group.Post("/products", h.create)
	group.Put("/products/:id", h.update)
	group.Delete("/products/:id", h.deactivate)
	group.Post("/products/:id/variants", h.createVariant)
	group.Patch("/products/:id/variants/:variantId", h.updateVariant)
	group.Delete("/products/:id/variants/:variantId", h.deleteVariant)
}

func (h *Handler) image(c fiber.Ctx) error {
	key := c.Params("*")
	if !productImageKeyPattern.MatchString(key) {
		return c.SendStatus(http.StatusNotFound)
	}
	object, err := h.service.GetImage(c.Context(), key)
	if errors.Is(err, objectstore.ErrNotFound) {
		return c.SendStatus(http.StatusNotFound)
	}
	if err != nil {
		return c.SendStatus(http.StatusServiceUnavailable)
	}
	if object.ContentType != "image/jpeg" && object.ContentType != "image/png" && object.ContentType != "image/webp" {
		object.Body.Close()
		return c.SendStatus(http.StatusUnsupportedMediaType)
	}
	c.Set(fiber.HeaderContentType, object.ContentType)
	c.Set(fiber.HeaderCacheControl, "public, max-age=31536000, immutable")
	if object.ETag != "" {
		c.Set(fiber.HeaderETag, object.ETag)
	}
	return c.SendStream(object.Body, int(object.ContentLength))
}
func identity(c fiber.Ctx) (database.Identity, error) {
	id, ok := auth.FromContext(c)
	if !ok {
		return database.Identity{}, apperror.New(401, "AUTH_REQUIRED", "authentication is required")
	}
	return database.Identity{OrgID: id.OrgID, UserID: id.UserID}, nil
}
func decode[T any](c fiber.Ctx) (T, error) {
	var value T
	decoder := json.NewDecoder(bytes.NewReader(c.Body()))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&value); err != nil {
		return value, apperror.New(400, "INVALID_JSON", "request body is invalid")
	}
	return value, nil
}
func productError(c fiber.Ctx, err error) error {
	if errors.Is(err, ErrImageTooLarge) {
		return respond.Error(c, apperror.New(413, "IMAGE_TOO_LARGE", "product image must not exceed 5 MB"))
	}
	if errors.Is(err, ErrInvalidImage) {
		return respond.Error(c, apperror.New(422, "INVALID_IMAGE", "product image must be a valid JPG, PNG, or WebP file"))
	}
	if errors.Is(err, ErrStorageDisabled) || errors.Is(err, ErrImageStorage) {
		return respond.Error(c, apperror.New(503, "IMAGE_STORAGE_UNAVAILABLE", "product image storage is temporarily unavailable"))
	}
	if errors.Is(err, ErrInvalidCursor) {
		return respond.Error(c, apperror.New(400, "INVALID_CURSOR", "product cursor is invalid"))
	}
	if errors.Is(err, ErrInvalidProduct) {
		return respond.Error(c, apperror.New(422, "INVALID_PRODUCT", "product is invalid"))
	}
	if errors.Is(err, ErrInvalidReference) {
		return respond.Error(c, apperror.New(422, "INVALID_PRODUCT_REFERENCE", "product reference is invalid"))
	}
	if errors.Is(err, ErrBarcodeConflict) {
		return respond.Error(c, apperror.New(409, "BARCODE_CONFLICT", "barcode already exists"))
	}
	if errors.Is(err, ErrNotFound) {
		return respond.Error(c, apperror.New(404, "PRODUCT_NOT_FOUND", "product was not found"))
	}
	if errors.Is(err, ErrVariantNotFound) {
		return respond.Error(c, apperror.New(404, "VARIANT_NOT_FOUND", "variant was not found"))
	}
	if errors.Is(err, ErrVariantBarcodeConflict) {
		return respond.Error(c, apperror.New(409, "BARCODE_CONFLICT", "barcode already exists"))
	}
	if errors.Is(err, ErrMissingVariantId) {
		return respond.Error(c, apperror.New(422, "MISSING_VARIANT_ID", "variant id is required for this product"))
	}
	if errors.Is(err, ErrInvalidAttributes) {
		return respond.Error(c, apperror.New(422, "INVALID_VARIANT_ATTRIBUTES", "variant attributes do not match the product configuration"))
	}
	if errors.Is(err, ErrMinVariants) {
		return respond.Error(c, apperror.New(409, "MIN_VARIANTS", "product must have at least one active variant"))
	}
	return respond.Error(c, err)
}

type multipartProduct struct {
	Name             string                `form:"name"`
	Barcode          string                `form:"barcode"`
	CategoryID       string                `form:"categoryId"`
	Price            int                   `form:"price"`
	Stock            int                   `form:"stock"`
	UnitID           string                `form:"unitId"`
	Active           bool                  `form:"active"`
	RemoveImage      bool                  `form:"remove_image"`
	AttributesConfig []AttributeConfig     `form:"attributesConfig"`
	Variants         []VariantInput        `form:"variants"`
	ImageFile        *multipart.FileHeader `form:"image_file"`
}

func isMultipartRequest(c fiber.Ctx) bool {
	mediaType, _, err := mime.ParseMediaType(c.Get(fiber.HeaderContentType))
	return err == nil && mediaType == "multipart/form-data"
}

func decodeMultipartProduct(c fiber.Ctx) (multipartProduct, *ImageUpload, error) {
	rawForm, err := c.MultipartForm()
	if err != nil {
		return multipartProduct{}, nil, ErrInvalidProduct
	}
	fieldValue := func(key string) string {
		values := rawForm.Value[key]
		if len(values) == 0 {
			return ""
		}
		return values[0]
	}
	form := multipartProduct{
		Name:       fieldValue("name"),
		Barcode:    fieldValue("barcode"),
		CategoryID: fieldValue("categoryId"),
		UnitID:     fieldValue("unitId"),
	}
	if rawPrice := fieldValue("price"); rawPrice != "" {
		price, err := strconv.Atoi(rawPrice)
		if err != nil {
			return form, nil, ErrInvalidProduct
		}
		form.Price = price
	}
	if rawStock := fieldValue("stock"); rawStock != "" {
		stock, err := strconv.Atoi(rawStock)
		if err != nil {
			return form, nil, ErrInvalidProduct
		}
		form.Stock = stock
	}
	if rawActive := fieldValue("active"); rawActive != "" {
		active, err := strconv.ParseBool(rawActive)
		if err != nil {
			return form, nil, ErrInvalidProduct
		}
		form.Active = active
	}
	if rawRemove := fieldValue("remove_image"); rawRemove != "" {
		removeImage, err := strconv.ParseBool(rawRemove)
		if err != nil {
			return form, nil, ErrInvalidProduct
		}
		form.RemoveImage = removeImage
	}
	if rawConfig := fieldValue("attributesConfig"); rawConfig != "" {
		if err := json.Unmarshal([]byte(rawConfig), &form.AttributesConfig); err != nil {
			return form, nil, ErrInvalidProduct
		}
	}
	if rawVariants := fieldValue("variants"); rawVariants != "" {
		if err := json.Unmarshal([]byte(rawVariants), &form.Variants); err != nil {
			return form, nil, ErrInvalidProduct
		}
	}
	if files := rawForm.File["image_file"]; len(files) > 0 {
		form.ImageFile = files[0]
	}
	if form.ImageFile == nil {
		return form, nil, nil
	}
	file, err := form.ImageFile.Open()
	if err != nil {
		return form, nil, ErrInvalidImage
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, MaxProductImageBytes+1))
	if err != nil {
		return form, nil, ErrInvalidImage
	}
	if len(data) > MaxProductImageBytes {
		return form, nil, ErrImageTooLarge
	}
	return form, &ImageUpload{Filename: form.ImageFile.Filename, Data: data}, nil
}

func parseMultipartUUID(value string) uuid.UUID {
	parsed, err := uuid.Parse(value)
	if err != nil {
		return uuid.Nil
	}
	return parsed
}

func (h *Handler) list(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	limit := 0
	if rawLimit := c.Query("limit"); rawLimit != "" {
		parsed, parseErr := strconv.Atoi(rawLimit)
		if parseErr != nil {
			return respond.Error(c, apperror.New(422, "INVALID_PRODUCT", "product filter is invalid"))
		}
		limit = parsed
	}
	var active *bool
	if rawActive := c.Query("active"); rawActive != "" {
		parsed, parseErr := strconv.ParseBool(rawActive)
		if parseErr != nil {
			return respond.Error(c, apperror.New(422, "INVALID_PRODUCT", "product filter is invalid"))
		}
		active = &parsed
	}
	categoryID := uuid.Nil
	if rawCategoryID := c.Query("categoryId"); rawCategoryID != "" {
		parsed, parseErr := uuid.Parse(rawCategoryID)
		if parseErr != nil {
			return respond.Error(c, apperror.New(422, "INVALID_PRODUCT", "product filter is invalid"))
		}
		categoryID = parsed
	}
	page, err := h.service.List(c.Context(), id, ListFilter{
		Query: c.Query("q"), CategoryID: categoryID, Active: active, Limit: limit,
		Sort: c.Query("sort"), Direction: c.Query("dir"), Cursor: c.Query("cursor"),
	})
	if err != nil {
		return productError(c, err)
	}
	return c.JSON(fiber.Map{
		"data": page.Items,
		"meta": fiber.Map{"nextCursor": page.NextCursor, "hasNextPage": page.HasNextPage},
	})
}
func (h *Handler) create(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	var input CreateInput
	var upload *ImageUpload
	if isMultipartRequest(c) {
		form, image, decodeErr := decodeMultipartProduct(c)
		if decodeErr != nil {
			return productError(c, decodeErr)
		}
		if form.RemoveImage {
			return productError(c, ErrInvalidImage)
		}
		input = CreateInput{
			Name:             form.Name,
			Barcode:          form.Barcode,
			CategoryID:       parseMultipartUUID(form.CategoryID),
			Price:            form.Price,
			Stock:            form.Stock,
			UnitID:           parseMultipartUUID(form.UnitID),
			AttributesConfig: form.AttributesConfig,
			Variants:         form.Variants,
		}
		upload = image
	} else {
		var decodeErr error
		input, decodeErr = decode[CreateInput](c)
		if decodeErr != nil {
			return respond.Error(c, decodeErr)
		}
	}
	item, err := h.service.Create(c.Context(), id, input, upload)
	if err != nil {
		return productError(c, err)
	}
	return c.Status(http.StatusCreated).JSON(fiber.Map{"data": item})
}
func (h *Handler) update(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	var input UpdateInput
	mutation := ImageMutation{Mode: ImageReference}
	if isMultipartRequest(c) {
		form, upload, decodeErr := decodeMultipartProduct(c)
		if decodeErr != nil {
			return productError(c, decodeErr)
		}
		if form.RemoveImage && upload != nil {
			return productError(c, ErrInvalidImage)
		}
		input = UpdateInput{
			Name:             form.Name,
			Barcode:          form.Barcode,
			CategoryID:       parseMultipartUUID(form.CategoryID),
			Price:            form.Price,
			UnitID:           parseMultipartUUID(form.UnitID),
			Active:           form.Active,
			AttributesConfig: form.AttributesConfig,
			Variants:         form.Variants,
		}
		mutation = ImageMutation{Mode: ImagePreserve}
		if form.RemoveImage {
			mutation = ImageMutation{Mode: ImageRemove}
		}
		if upload != nil {
			mutation = ImageMutation{Mode: ImageReplace, Upload: upload}
		}
	} else {
		var decodeErr error
		input, decodeErr = decode[UpdateInput](c)
		if decodeErr != nil {
			return respond.Error(c, decodeErr)
		}
	}
	item, err := h.service.Update(c.Context(), id, productID, input, mutation)
	if err != nil {
		return productError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}
func (h *Handler) deactivate(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	item, err := h.service.Deactivate(c.Context(), id, productID)
	if err != nil {
		return productError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *Handler) createVariant(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	input, decodeErr := decode[VariantInput](c)
	if decodeErr != nil {
		return respond.Error(c, decodeErr)
	}
	item, err := h.service.CreateVariant(c.Context(), id, productID, input)
	if err != nil {
		return productError(c, err)
	}
	return c.Status(http.StatusCreated).JSON(fiber.Map{"data": item})
}

func (h *Handler) updateVariant(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	variantID, err := uuid.Parse(c.Params("variantId"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_VARIANT_ID", "variant ID is invalid"))
	}
	input, decodeErr := decode[VariantInput](c)
	if decodeErr != nil {
		return respond.Error(c, decodeErr)
	}
	item, err := h.service.UpdateVariant(c.Context(), id, productID, variantID, input)
	if err != nil {
		return productError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *Handler) deleteVariant(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	productID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PRODUCT_ID", "product ID is invalid"))
	}
	variantID, err := uuid.Parse(c.Params("variantId"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_VARIANT_ID", "variant ID is invalid"))
	}
	if err := h.service.DeleteVariant(c.Context(), id, productID, variantID); err != nil {
		return productError(c, err)
	}
	return c.Status(http.StatusNoContent).Send(nil)
}
