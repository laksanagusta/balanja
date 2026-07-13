package stock

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) Register(group fiber.Router) {
	group.Get("/stock/movements", h.list)
	group.Post("/stock/movements", h.create)
}

func (h *Handler) list(c fiber.Ctx) error {
	identity, err := requestIdentity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	filter, err := parseFilter(c)
	if err != nil {
		return respond.Error(c, apperror.New(422, "INVALID_STOCK_MOVEMENT", "stock movement filter is invalid"))
	}
	page, err := h.service.List(c.Context(), identity, filter)
	if errors.Is(err, ErrInvalidCursor) {
		return respond.Error(c, apperror.New(400, "INVALID_CURSOR", "stock movement cursor is invalid"))
	}
	if err != nil {
		return stockError(c, err)
	}
	return c.JSON(fiber.Map{"data": page.Items, "meta": fiber.Map{"nextCursor": page.NextCursor, "hasNextPage": page.HasNextPage}})
}

func (h *Handler) create(c fiber.Ctx) error {
	identity, err := requestIdentity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	var input CreateInput
	if err := c.Bind().Body(&input); err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_JSON", "request body is invalid"))
	}
	result, err := h.service.Create(c.Context(), identity, input)
	if err != nil {
		return stockError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func requestIdentity(c fiber.Ctx) (database.Identity, error) {
	identity, ok := auth.FromContext(c)
	if !ok {
		return database.Identity{}, apperror.New(401, "AUTH_REQUIRED", "authentication is required")
	}
	return database.Identity{OrgID: identity.OrgID, UserID: identity.UserID}, nil
}

func parseFilter(c fiber.Ctx) (ListFilter, error) {
	filter := ListFilter{
		Type:      MovementType(c.Query("type")),
		Query:     c.Query("q"),
		Sort:      c.Query("sort"),
		Direction: c.Query("dir"),
		Cursor:    c.Query("cursor"),
	}
	if raw := c.Query("productId"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.ProductID = &id
	}
	if raw := c.Query("dateFrom"); raw != "" {
		value, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.DateFrom = &value
	}
	if raw := c.Query("dateTo"); raw != "" {
		value, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.DateTo = &value
	}
	if raw := c.Query("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil {
			return ListFilter{}, err
		}
		filter.Limit = limit
	}
	return filter, nil
}

func stockError(c fiber.Ctx, err error) error {
	if errors.Is(err, ErrProductNotFound) {
		return respond.Error(c, apperror.New(404, "PRODUCT_NOT_FOUND", "product was not found"))
	}
	if errors.Is(err, ErrProductInactive) {
		return respond.Error(c, apperror.New(409, "PRODUCT_INACTIVE", "product is inactive"))
	}
	if errors.Is(err, ErrInsufficientStock) {
		return respond.Error(c, apperror.New(409, "INSUFFICIENT_STOCK", "stock would become negative"))
	}
	if errors.Is(err, ErrInvalidStockMovement) {
		return respond.Error(c, apperror.New(422, "INVALID_STOCK_MOVEMENT", "stock movement is invalid"))
	}
	return respond.Error(c, err)
}
