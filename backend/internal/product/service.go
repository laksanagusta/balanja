package product

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
)

var (
	ErrInvalidProduct  = errors.New("invalid product")
	ErrInvalidCursor   = errors.New("invalid product cursor")
	ErrBarcodeConflict = errors.New("barcode conflict")
	ErrNotFound        = errors.New("product not found")
)

var productSorts = map[string]struct{}{
	"createdAt": {},
	"name":      {},
	"category":  {},
	"price":     {},
	"stock":     {},
}

type TenantRunner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}
type Repository interface {
	List(context.Context, database.Tx, string, ListFilter) ([]Product, error)
	Create(context.Context, database.Tx, string, CreateInput) (Product, error)
	Update(context.Context, database.Tx, string, uuid.UUID, UpdateInput) (Product, error)
	Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error)
}
type Service struct {
	runner     TenantRunner
	repository Repository
}

func NewService(runner TenantRunner, repository Repository) *Service {
	return &Service{runner: runner, repository: repository}
}

func normalizeListFilter(filter ListFilter) (ListFilter, error) {
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Category = strings.TrimSpace(filter.Category)
	if filter.Limit == 0 {
		filter.Limit = 20
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		return ListFilter{}, ErrInvalidProduct
	}
	if filter.Sort == "" {
		filter.Sort = "createdAt"
	}
	if filter.Direction == "" {
		filter.Direction = "desc"
	}
	if _, ok := productSorts[filter.Sort]; !ok || (filter.Direction != "asc" && filter.Direction != "desc") {
		return ListFilter{}, ErrInvalidProduct
	}
	return filter, nil
}

func productFingerprint(filter ListFilter) string {
	active := ""
	if filter.Active != nil {
		active = strconv.FormatBool(*filter.Active)
	}
	return listcursor.Fingerprint(
		"products",
		"q="+filter.Query,
		"category="+filter.Category,
		"active="+active,
		fmt.Sprintf("limit=%d", filter.Limit),
		"sort="+filter.Sort,
		"dir="+filter.Direction,
	)
}

func decodeProductCursor(filter *ListFilter, fingerprint string) error {
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
	case "name", "category":
		var typed string
		err = json.Unmarshal(payload.Value, &typed)
		value = typed
	case "price", "stock":
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

func productCursorValue(product Product, sort string) any {
	switch sort {
	case "name":
		return product.Name
	case "category":
		return product.Category
	case "price":
		return product.Price
	case "stock":
		return product.Stock
	default:
		return product.CreatedAt
	}
}

func (s *Service) List(ctx context.Context, identity database.Identity, filter ListFilter) (page Page, err error) {
	filter, err = normalizeListFilter(filter)
	if err != nil {
		return Page{}, err
	}
	fingerprint := productFingerprint(filter)
	if err = decodeProductCursor(&filter, fingerprint); err != nil {
		return Page{}, err
	}
	requestedLimit := filter.Limit
	filter.Limit++
	var products []Product
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var queryErr error
		products, queryErr = s.repository.List(ctx, tx, identity.OrgID, filter)
		return queryErr
	})
	if err != nil {
		return Page{}, err
	}
	if products == nil {
		products = []Product{}
	}
	if len(products) > requestedLimit {
		page.HasNextPage = true
		products = products[:requestedLimit]
	}
	page.Items = products
	if page.HasNextPage {
		last := products[len(products)-1]
		value, marshalErr := json.Marshal(productCursorValue(last, filter.Sort))
		if marshalErr != nil {
			return Page{}, marshalErr
		}
		page.NextCursor, err = listcursor.Encode(listcursor.Payload{
			Version:     listcursor.CurrentVersion,
			Sort:        filter.Sort,
			Direction:   filter.Direction,
			Fingerprint: fingerprint,
			Value:       value,
			ID:          last.ID,
		})
	}
	return page, err
}
func (s *Service) Create(ctx context.Context, identity database.Identity, input CreateInput) (created Product, err error) {
	input.Name, input.Barcode, input.Category, input.Unit, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Category), strings.TrimSpace(input.Unit), strings.TrimSpace(input.Image)
	if input.Name == "" || input.Barcode == "" || input.Category == "" || input.Unit == "" || input.Price < 1 || input.Stock < 0 {
		return Product{}, ErrInvalidProduct
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var createErr error
		created, createErr = s.repository.Create(ctx, tx, identity.OrgID, input)
		return createErr
	})
	return
}
func (s *Service) Update(ctx context.Context, identity database.Identity, id uuid.UUID, input UpdateInput) (updated Product, err error) {
	input.Name, input.Barcode, input.Category, input.Unit, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Category), strings.TrimSpace(input.Unit), strings.TrimSpace(input.Image)
	if input.Name == "" || input.Barcode == "" || input.Category == "" || input.Unit == "" || input.Price < 1 {
		return Product{}, ErrInvalidProduct
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var updateErr error
		updated, updateErr = s.repository.Update(ctx, tx, identity.OrgID, id, input)
		return updateErr
	})
	return
}
func (s *Service) Deactivate(ctx context.Context, identity database.Identity, id uuid.UUID) (updated Product, err error) {
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var updateErr error
		updated, updateErr = s.repository.Deactivate(ctx, tx, identity.OrgID, id)
		return updateErr
	})
	return
}
