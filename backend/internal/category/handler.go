package category

import (
	"bytes"
	"encoding/json"
	"errors"
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
	group.Get("/categories", h.list)
	group.Post("/categories", h.create)
	group.Put("/categories/:id", h.rename)
	group.Post("/categories/:id/archive", h.archive)
	group.Post("/categories/:id/restore", h.restore)
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

func categoryError(c fiber.Ctx, err error) error {
	var archived *ArchivedNameConflict
	switch {
	case errors.Is(err, ErrInvalidName):
		return respond.Error(c, apperror.New(422, "INVALID_CATEGORY", "category is invalid"))
	case errors.Is(err, ErrNameConflict):
		return respond.Error(c, apperror.New(409, "CATEGORY_NAME_CONFLICT", "category name already exists"))
	case errors.As(err, &archived):
		return respond.Error(c, apperror.WithDetails(
			apperror.New(409, "CATEGORY_ARCHIVED_NAME_CONFLICT", "category name matches an archived record"),
			map[string]any{"id": archived.ID.String()},
		))
	case errors.Is(err, ErrNotFound):
		return respond.Error(c, apperror.New(404, "CATEGORY_NOT_FOUND", "category was not found"))
	default:
		return respond.Error(c, err)
	}
}

func parseCategoryID(c fiber.Ctx) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return uuid.Nil, apperror.New(400, "INVALID_CATEGORY_ID", "category ID is invalid")
	}
	return id, nil
}

func (h *Handler) list(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	includeArchived := false
	if raw := c.Query("includeArchived"); raw != "" {
		parsed, parseErr := strconv.ParseBool(raw)
		if parseErr != nil {
			return respond.Error(c, apperror.New(400, "INVALID_CATEGORY_FILTER", "category filter is invalid"))
		}
		includeArchived = parsed
	}
	items, err := h.service.List(c.Context(), id, includeArchived)
	if err != nil {
		return categoryError(c, err)
	}
	return c.JSON(fiber.Map{"data": items})
}

func (h *Handler) create(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	input, err := decode[WriteInput](c)
	if err != nil {
		return respond.Error(c, err)
	}
	item, err := h.service.Create(c.Context(), id, input)
	if err != nil {
		return categoryError(c, err)
	}
	return c.Status(http.StatusCreated).JSON(fiber.Map{"data": item})
}

func (h *Handler) rename(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	categoryID, err := parseCategoryID(c)
	if err != nil {
		return respond.Error(c, err)
	}
	input, err := decode[WriteInput](c)
	if err != nil {
		return respond.Error(c, err)
	}
	item, err := h.service.Rename(c.Context(), id, categoryID, input)
	if err != nil {
		return categoryError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *Handler) archive(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	categoryID, err := parseCategoryID(c)
	if err != nil {
		return respond.Error(c, err)
	}
	item, err := h.service.Archive(c.Context(), id, categoryID)
	if err != nil {
		return categoryError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *Handler) restore(c fiber.Ctx) error {
	id, err := identity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	categoryID, err := parseCategoryID(c)
	if err != nil {
		return respond.Error(c, err)
	}
	item, err := h.service.Restore(c.Context(), id, categoryID)
	if err != nil {
		return categoryError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}
