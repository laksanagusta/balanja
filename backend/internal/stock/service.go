package stock

import (
	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

var stockSorts = map[string]struct{}{
	"createdAt":     {},
	"productName":   {},
	"type":          {},
	"quantityDelta": {},
	"stockAfter":    {},
}

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	Create(context.Context, database.Tx, database.Identity, CreateInput) (CreateResult, error)
	List(context.Context, database.Tx, database.Identity, ListFilter) ([]Movement, error)
}

type Service struct {
	runner     Runner
	repository Repository
}

func NewService(runner Runner, repository Repository) *Service {
	return &Service{runner: runner, repository: repository}
}

func normalizeListFilter(filter ListFilter) (ListFilter, error) {
	filter.Query = strings.TrimSpace(filter.Query)
	if filter.DateFrom != nil && filter.DateTo != nil && filter.DateFrom.After(*filter.DateTo) {
		return ListFilter{}, ErrInvalidStockMovement
	}
	if filter.Type != "" && filter.Type != MovementTypeSale && filter.Type != MovementTypeRestock && filter.Type != MovementTypeReduce && filter.Type != MovementTypeSetExact {
		return ListFilter{}, ErrInvalidStockMovement
	}
	if filter.Limit == 0 {
		filter.Limit = 20
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		return ListFilter{}, ErrInvalidStockMovement
	}
	if filter.Sort == "" {
		filter.Sort = "createdAt"
	}
	if filter.Direction == "" {
		filter.Direction = "desc"
	}
	if _, ok := stockSorts[filter.Sort]; !ok || (filter.Direction != "asc" && filter.Direction != "desc") {
		return ListFilter{}, ErrInvalidStockMovement
	}
	return filter, nil
}

func stockFingerprint(filter ListFilter) string {
	productID, dateFrom, dateTo := "", "", ""
	if filter.ProductID != nil {
		productID = filter.ProductID.String()
	}
	if filter.DateFrom != nil {
		dateFrom = filter.DateFrom.UTC().Format(time.RFC3339Nano)
	}
	if filter.DateTo != nil {
		dateTo = filter.DateTo.UTC().Format(time.RFC3339Nano)
	}
	return listcursor.Fingerprint(
		"stock-movements",
		"productId="+productID,
		"type="+string(filter.Type),
		"q="+filter.Query,
		"dateFrom="+dateFrom,
		"dateTo="+dateTo,
		fmt.Sprintf("limit=%d", filter.Limit),
		"sort="+filter.Sort,
		"dir="+filter.Direction,
	)
}

func decodeStockCursor(filter *ListFilter, fingerprint string) error {
	if filter.Cursor == "" {
		return nil
	}
	payload, err := listcursor.Decode(filter.Cursor)
	if err != nil || listcursor.Compatible(payload, filter.Sort, filter.Direction, fingerprint) != nil {
		return ErrInvalidCursor
	}
	var value any
	switch filter.Sort {
	case "createdAt":
		var typed time.Time
		err = json.Unmarshal(payload.Value, &typed)
		value = typed
	case "productName", "type":
		var typed string
		err = json.Unmarshal(payload.Value, &typed)
		value = typed
	case "quantityDelta", "stockAfter":
		var typed int
		err = json.Unmarshal(payload.Value, &typed)
		value = typed
	}
	if err != nil {
		return ErrInvalidCursor
	}
	filter.CursorValue = value
	filter.CursorID = payload.ID
	return nil
}

func stockCursorValue(movement Movement, sort string) any {
	switch sort {
	case "productName":
		return movement.ProductName
	case "type":
		return movement.Type
	case "quantityDelta":
		return movement.QuantityDelta
	case "stockAfter":
		return movement.StockAfter
	default:
		return movement.CreatedAt
	}
}

func (s *Service) Create(ctx context.Context, identity database.Identity, input CreateInput) (created CreateResult, err error) {
	input.Reason = strings.TrimSpace(input.Reason)
	if input.ProductID == [16]byte{} || input.Reason == "" {
		return CreateResult{}, ErrInvalidStockMovement
	}
	if input.Type != MovementTypeRestock && input.Type != MovementTypeReduce && input.Type != MovementTypeSetExact {
		return CreateResult{}, ErrInvalidStockMovement
	}
	if input.Type != MovementTypeSetExact && input.Quantity <= 0 {
		return CreateResult{}, ErrInvalidStockMovement
	}
	if input.Type == MovementTypeSetExact && input.Quantity < 0 {
		return CreateResult{}, ErrInvalidStockMovement
	}

	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var createErr error
		created, createErr = s.repository.Create(ctx, tx, identity, input)
		return createErr
	})
	return
}

func (s *Service) List(ctx context.Context, identity database.Identity, filter ListFilter) (page Page, err error) {
	filter, err = normalizeListFilter(filter)
	if err != nil {
		return Page{}, err
	}
	fingerprint := stockFingerprint(filter)
	if err = decodeStockCursor(&filter, fingerprint); err != nil {
		return Page{}, err
	}

	requestedLimit := filter.Limit
	filter.Limit++
	var rows []Movement
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var listErr error
		rows, listErr = s.repository.List(ctx, tx, identity, filter)
		return listErr
	})
	if err != nil {
		return Page{}, err
	}
	if rows == nil {
		rows = []Movement{}
	}
	if len(rows) > requestedLimit {
		page.HasNextPage = true
		rows = rows[:requestedLimit]
	}
	page.Items = rows
	if page.HasNextPage {
		last := rows[len(rows)-1]
		value, marshalErr := json.Marshal(stockCursorValue(last, filter.Sort))
		if marshalErr != nil {
			return Page{}, marshalErr
		}
		page.NextCursor, err = listcursor.Encode(listcursor.Payload{
			Version: listcursor.CurrentVersion, Sort: filter.Sort, Direction: filter.Direction,
			Fingerprint: fingerprint, Value: value, ID: last.ID,
		})
	}
	return page, err
}

func ResolveManualMovement(movementType MovementType, currentStock, quantity int) (int, int, error) {
	var delta int
	switch movementType {
	case MovementTypeRestock:
		if quantity <= 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = quantity
	case MovementTypeReduce:
		if quantity <= 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = -quantity
	case MovementTypeSetExact:
		if quantity < 0 {
			return 0, 0, ErrInvalidStockMovement
		}
		delta = quantity - currentStock
	default:
		return 0, 0, ErrInvalidStockMovement
	}
	after := currentStock + delta
	if after < 0 {
		return 0, 0, ErrInsufficientStock
	}
	if delta == 0 {
		return 0, 0, ErrInvalidStockMovement
	}
	return delta, after, nil
}
