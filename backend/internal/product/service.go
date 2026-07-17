package product

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/objectstore"
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
	Update(context.Context, database.Tx, string, uuid.UUID, UpdateInput) (UpdateResult, error)
	Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error)
}
type Service struct {
	runner     TenantRunner
	repository Repository
	images     objectstore.Store
	logger     *slog.Logger
}

type ServiceOption func(*Service)

func WithImageStore(images objectstore.Store) ServiceOption {
	return func(service *Service) { service.images = images }
}

func WithLogger(logger *slog.Logger) ServiceOption {
	return func(service *Service) {
		if logger != nil {
			service.logger = logger
		}
	}
}

func NewService(runner TenantRunner, repository Repository, options ...ServiceOption) *Service {
	service := &Service{runner: runner, repository: repository, logger: slog.Default()}
	for _, option := range options {
		option(service)
	}
	return service
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
func (s *Service) Create(ctx context.Context, identity database.Identity, input CreateInput, uploads ...*ImageUpload) (created Product, err error) {
	input.Name, input.Barcode, input.Category, input.Unit, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Category), strings.TrimSpace(input.Unit), strings.TrimSpace(input.Image)
	if input.Name == "" || input.Barcode == "" || input.Category == "" || input.Unit == "" || input.Price < 1 || input.Stock < 0 {
		return Product{}, ErrInvalidProduct
	}
	var newImageKey string
	if len(uploads) > 0 && uploads[0] != nil {
		if s.images == nil {
			return Product{}, ErrStorageDisabled
		}
		validated, validateErr := validateProductImage(*uploads[0])
		if validateErr != nil {
			return Product{}, validateErr
		}
		stored, uploadErr := s.images.Put(ctx, objectstore.PutInput{Key: productImageKey(identity.OrgID, validated.Extension), ContentType: validated.ContentType, Body: validated.Data})
		if uploadErr != nil {
			return Product{}, fmt.Errorf("%w: %v", ErrImageStorage, uploadErr)
		}
		input.Image, input.ImageKey, newImageKey = stored.URL, stored.Key, stored.Key
	}
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var createErr error
		created, createErr = s.repository.Create(ctx, tx, identity.OrgID, input)
		return createErr
	})
	if err != nil && newImageKey != "" {
		s.deleteImage(ctx, newImageKey, "compensate failed product create")
	}
	return
}
func (s *Service) Update(ctx context.Context, identity database.Identity, id uuid.UUID, input UpdateInput, mutations ...ImageMutation) (updated Product, err error) {
	input.Name, input.Barcode, input.Category, input.Unit, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Category), strings.TrimSpace(input.Unit), strings.TrimSpace(input.Image)
	if input.Name == "" || input.Barcode == "" || input.Category == "" || input.Unit == "" || input.Price < 1 {
		return Product{}, ErrInvalidProduct
	}
	mutation := ImageMutation{Mode: ImageReference}
	if len(mutations) > 0 {
		mutation = mutations[0]
	}
	var newImageKey string
	switch mutation.Mode {
	case ImagePreserve:
		input.PreserveImage = true
	case ImageReference:
		input.ImageKey = ""
	case ImageRemove:
		input.Image, input.ImageKey = "", ""
	case ImageReplace:
		if mutation.Upload == nil {
			return Product{}, ErrInvalidImage
		}
		if s.images == nil {
			return Product{}, ErrStorageDisabled
		}
		validated, validateErr := validateProductImage(*mutation.Upload)
		if validateErr != nil {
			return Product{}, validateErr
		}
		stored, uploadErr := s.images.Put(ctx, objectstore.PutInput{
			Key: productImageKey(identity.OrgID, validated.Extension), ContentType: validated.ContentType, Body: validated.Data,
		})
		if uploadErr != nil {
			return Product{}, fmt.Errorf("%w: %v", ErrImageStorage, uploadErr)
		}
		input.Image, input.ImageKey, newImageKey = stored.URL, stored.Key, stored.Key
	default:
		return Product{}, ErrInvalidImage
	}
	var result UpdateResult
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var updateErr error
		result, updateErr = s.repository.Update(ctx, tx, identity.OrgID, id, input)
		updated = result.Product
		return updateErr
	})
	if err != nil {
		if newImageKey != "" {
			s.deleteImage(ctx, newImageKey, "compensate failed product update")
		}
		return Product{}, err
	}
	if result.PreviousImageKey != "" && result.PreviousImageKey != updated.ImageKey {
		s.deleteImage(ctx, result.PreviousImageKey, "delete replaced product image")
	}
	return
}

func (s *Service) deleteImage(ctx context.Context, key, operation string) {
	if s.images == nil || key == "" {
		return
	}
	if err := s.images.Delete(ctx, key); err != nil {
		s.logger.Warn(operation, "imageKey", key, "error", err)
	}
}
func (s *Service) Deactivate(ctx context.Context, identity database.Identity, id uuid.UUID) (updated Product, err error) {
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var updateErr error
		updated, updateErr = s.repository.Deactivate(ctx, tx, identity.OrgID, id)
		return updateErr
	})
	return
}
