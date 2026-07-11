package product

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"

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
func (h *Handler) list(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	items, err := h.service.List(c.Context(), id)
	if err != nil {
		return productError(c, err)
	}
	return c.JSON(fiber.Map{"data": items})
}
func (h *Handler) create(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	input, err := decode[CreateInput](c)
	if err != nil {
		return respond.Error(c, err)
	}
	item, err := h.service.Create(c.Context(), id, input)
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
	input, err := decode[UpdateInput](c)
	if err != nil {
		return respond.Error(c, err)
	}
	item, err := h.service.Update(c.Context(), id, productID, input)
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
