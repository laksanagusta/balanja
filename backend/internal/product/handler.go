package product

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"strconv"

	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }
func (h *Handler) Register(group fiber.Router) {
	group.Get("/products", h.list)
	group.Post("/products", h.create)
	group.Put("/products/:id", h.update)
	group.Delete("/products/:id", h.deactivate)
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
	if errors.Is(err, ErrBarcodeConflict) {
		return respond.Error(c, apperror.New(409, "BARCODE_CONFLICT", "barcode already exists"))
	}
	if errors.Is(err, ErrNotFound) {
		return respond.Error(c, apperror.New(404, "PRODUCT_NOT_FOUND", "product was not found"))
	}
	return respond.Error(c, err)
}

type multipartProduct struct {
	Name        string                `form:"name"`
	Barcode     string                `form:"barcode"`
	Category    string                `form:"category"`
	Price       int                   `form:"price"`
	Stock       int                   `form:"stock"`
	Unit        string                `form:"unit"`
	Active      bool                  `form:"active"`
	RemoveImage bool                  `form:"remove_image"`
	ImageFile   *multipart.FileHeader `form:"image_file"`
}

func isMultipartRequest(c fiber.Ctx) bool {
	mediaType, _, err := mime.ParseMediaType(c.Get(fiber.HeaderContentType))
	return err == nil && mediaType == "multipart/form-data"
}

func decodeMultipartProduct(c fiber.Ctx) (multipartProduct, *ImageUpload, error) {
	var form multipartProduct
	if err := c.Bind().Form(&form); err != nil {
		return form, nil, ErrInvalidProduct
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
	page, err := h.service.List(c.Context(), id, ListFilter{
		Query: c.Query("q"), Category: c.Query("category"), Active: active, Limit: limit,
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
		input = CreateInput{Name: form.Name, Barcode: form.Barcode, Category: form.Category, Price: form.Price, Stock: form.Stock, Unit: form.Unit}
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
		input = UpdateInput{Name: form.Name, Barcode: form.Barcode, Category: form.Category, Price: form.Price, Unit: form.Unit, Active: form.Active}
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
