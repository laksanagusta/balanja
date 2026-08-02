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
	ErrInvalidProduct         = errors.New("invalid product")
	ErrInvalidCursor          = errors.New("invalid product cursor")
	ErrBarcodeConflict        = errors.New("barcode conflict")
	ErrInvalidReference       = errors.New("invalid product reference")
	ErrNotFound               = errors.New("product not found")
	ErrVariantNotFound        = errors.New("variant not found")
	ErrVariantBarcodeConflict = errors.New("variant barcode conflict")
	ErrMissingVariantId       = errors.New("variant id required")
	ErrInvalidAttributes      = errors.New("invalid variant attributes")
	ErrMinVariants            = errors.New("at least one active variant is required")
)

const MaxVariantCombinations = 100

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
	Get(context.Context, database.Tx, string, uuid.UUID) (Product, error)
	CategoryIsActive(context.Context, database.Tx, string, uuid.UUID) (bool, error)
	UnitIsActive(context.Context, database.Tx, string, uuid.UUID) (bool, error)
	Update(context.Context, database.Tx, string, uuid.UUID, UpdateInput) (UpdateResult, error)
	Deactivate(context.Context, database.Tx, string, uuid.UUID) (Product, error)
	ListVariants(context.Context, database.Tx, string, uuid.UUID) ([]Variant, error)
	GetVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID) (Variant, error)
	CreateVariant(context.Context, database.Tx, string, uuid.UUID, VariantInput) (Variant, error)
	UpdateVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID, VariantInput) (Variant, error)
	DeleteVariant(context.Context, database.Tx, string, uuid.UUID, uuid.UUID) error
	CountActiveVariants(context.Context, database.Tx, string, uuid.UUID) (int, error)
	VariantSoldHistory(context.Context, database.Tx, string, uuid.UUID) (bool, error)
	ValidateVariantBarcodeUnique(context.Context, database.Tx, string, string, uuid.UUID, uuid.UUID) error
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

func (s *Service) withDeliveredImage(product Product) Product {
	if s.images != nil && product.ImageKey != "" {
		product.Image = "/api/v1/product-images/" + product.ImageKey
	}
	return product
}

func normalizeListFilter(filter ListFilter) (ListFilter, error) {
	filter.Query = strings.TrimSpace(filter.Query)
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
		"categoryId="+filter.CategoryID.String(),
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
		if queryErr != nil {
			return queryErr
		}
		for i := range products {
			variants, vErr := s.repository.ListVariants(ctx, tx, identity.OrgID, products[i].ID)
			if vErr != nil {
				return vErr
			}
			products[i].Variants = variants
		}
		return nil
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
	for index := range products {
		products[index] = s.withDeliveredImage(products[index])
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
	input.Name, input.Barcode, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Image)
	input.AttributesConfig, err = normalizeAttributeConfig(input.AttributesConfig)
	if err != nil {
		return Product{}, err
	}
	input.Variants, err = prepareVariantSave(input.AttributesConfig, input.Variants, input.Price, input.Stock)
	if err != nil {
		return Product{}, err
	}
	if err = validateParentVariantBarcodes(input.Barcode, input.Variants); err != nil {
		return Product{}, err
	}
	if input.Name == "" || input.Barcode == "" || input.CategoryID == uuid.Nil || input.UnitID == uuid.Nil || input.Price < 1 || input.Stock < 0 {
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
		activeCategory, refErr := s.repository.CategoryIsActive(ctx, tx, identity.OrgID, input.CategoryID)
		if refErr != nil {
			return refErr
		}
		activeUnit, refErr := s.repository.UnitIsActive(ctx, tx, identity.OrgID, input.UnitID)
		if refErr != nil {
			return refErr
		}
		if !activeCategory || !activeUnit {
			return ErrInvalidReference
		}
		if barcodeErr := s.repository.ValidateVariantBarcodeUnique(ctx, tx, identity.OrgID, input.Barcode, uuid.Nil, uuid.Nil); barcodeErr != nil {
			return barcodeErr
		}
		var createErr error
		created, createErr = s.repository.Create(ctx, tx, identity.OrgID, input)
		if createErr != nil {
			return createErr
		}
		created.AttributesConfig = input.AttributesConfig
		for _, variant := range input.Variants {
			if barcodeErr := s.repository.ValidateVariantBarcodeUnique(ctx, tx, identity.OrgID, variant.Barcode, created.ID, uuid.Nil); barcodeErr != nil {
				return barcodeErr
			}
			createdVariant, variantErr := s.repository.CreateVariant(ctx, tx, identity.OrgID, created.ID, variant)
			if variantErr != nil {
				return variantErr
			}
			created.Variants = append(created.Variants, createdVariant)
		}
		return nil
	})
	if err != nil && newImageKey != "" {
		s.deleteImage(ctx, newImageKey, "compensate failed product create")
	}
	created = s.withDeliveredImage(created)
	return
}
func (s *Service) Update(ctx context.Context, identity database.Identity, id uuid.UUID, input UpdateInput, mutations ...ImageMutation) (updated Product, err error) {
	input.Name, input.Barcode, input.Image = strings.TrimSpace(input.Name), strings.TrimSpace(input.Barcode), strings.TrimSpace(input.Image)
	input.AttributesConfig, err = normalizeAttributeConfig(input.AttributesConfig)
	if err != nil {
		return Product{}, err
	}
	if input.Name == "" || input.Barcode == "" || input.CategoryID == uuid.Nil || input.UnitID == uuid.Nil || input.Price < 1 {
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
		current, getErr := s.repository.Get(ctx, tx, identity.OrgID, id)
		if getErr != nil {
			return getErr
		}
		activeCategory, refErr := s.repository.CategoryIsActive(ctx, tx, identity.OrgID, input.CategoryID)
		if refErr != nil {
			return refErr
		}
		if !activeCategory && input.CategoryID != current.CategoryID {
			return ErrInvalidReference
		}
		activeUnit, refErr := s.repository.UnitIsActive(ctx, tx, identity.OrgID, input.UnitID)
		if refErr != nil {
			return refErr
		}
		if !activeUnit && input.UnitID != current.UnitID {
			return ErrInvalidReference
		}
		if barcodeErr := s.repository.ValidateVariantBarcodeUnique(ctx, tx, identity.OrgID, input.Barcode, id, uuid.Nil); barcodeErr != nil {
			return barcodeErr
		}
		existingVariants, variantsErr := s.repository.ListVariants(ctx, tx, identity.OrgID, id)
		if variantsErr != nil {
			return variantsErr
		}
		desiredVariants := input.Variants
		if len(input.AttributesConfig) == 0 && len(desiredVariants) == 0 {
			stock := current.Stock
			var defaultID uuid.UUID
			for _, variant := range existingVariants {
				if len(variant.Attributes) == 0 {
					defaultID = variant.ID
					stock = variant.Stock
					break
				}
			}
			desiredVariants = []VariantInput{{ID: defaultID, Attributes: map[string]string{}, Price: input.Price, Stock: stock, Active: true}}
		}
		desiredVariants, variantsErr = prepareVariantSave(input.AttributesConfig, desiredVariants, input.Price, current.Stock)
		if variantsErr != nil {
			return variantsErr
		}
		if variantsErr = validateParentVariantBarcodes(input.Barcode, desiredVariants); variantsErr != nil {
			return variantsErr
		}
		input.Variants = desiredVariants
		var updateErr error
		result, updateErr = s.repository.Update(ctx, tx, identity.OrgID, id, input)
		if updateErr != nil {
			return updateErr
		}
		updated = result.Product
		updated.AttributesConfig = input.AttributesConfig
		updated.Variants, updateErr = s.syncVariants(ctx, tx, identity.OrgID, id, existingVariants, desiredVariants)
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
	updated = s.withDeliveredImage(updated)
	return
}

func normalizeAttributeConfig(config []AttributeConfig) ([]AttributeConfig, error) {
	normalized := make([]AttributeConfig, 0, len(config))
	names := make(map[string]struct{}, len(config))
	for _, attribute := range config {
		attribute.Name = strings.TrimSpace(attribute.Name)
		nameKey := strings.ToLower(attribute.Name)
		if attribute.Name == "" {
			return nil, ErrInvalidAttributes
		}
		if _, exists := names[nameKey]; exists {
			return nil, ErrInvalidAttributes
		}
		names[nameKey] = struct{}{}
		options := make([]string, 0, len(attribute.Options))
		seenOptions := make(map[string]struct{}, len(attribute.Options))
		for _, option := range attribute.Options {
			option = strings.TrimSpace(option)
			optionKey := strings.ToLower(option)
			if option == "" {
				continue
			}
			if _, exists := seenOptions[optionKey]; exists {
				return nil, ErrInvalidAttributes
			}
			seenOptions[optionKey] = struct{}{}
			options = append(options, option)
		}
		if len(options) == 0 {
			return nil, ErrInvalidAttributes
		}
		attribute.Options = options
		normalized = append(normalized, attribute)
	}
	return normalized, nil
}

func prepareVariantSave(config []AttributeConfig, variants []VariantInput, fallbackPrice, fallbackStock int) ([]VariantInput, error) {
	if len(config) == 0 {
		if len(variants) == 0 {
			return []VariantInput{{Attributes: map[string]string{}, Price: fallbackPrice, Stock: fallbackStock, Active: true}}, nil
		}
		if len(variants) != 1 || len(variants[0].Attributes) != 0 {
			return nil, ErrInvalidAttributes
		}
	}
	if len(variants) == 0 {
		return nil, ErrMinVariants
	}
	if len(config) > 0 {
		expected := 1
		for _, attribute := range config {
			expected *= len(attribute.Options)
			if expected > MaxVariantCombinations {
				return nil, ErrInvalidAttributes
			}
		}
		if len(variants) != expected {
			return nil, ErrInvalidAttributes
		}
	}
	attributeKeys := make(map[string]struct{}, len(variants))
	barcodes := make(map[string]struct{}, len(variants))
	for index := range variants {
		variant := &variants[index]
		variant.Barcode = strings.TrimSpace(variant.Barcode)
		if variant.Price < 0 || (variant.Active && variant.Price < 1) || variant.Stock < 0 {
			return nil, ErrInvalidProduct
		}
		if err := validateVariantAttributes(variant.Attributes, config); err != nil {
			return nil, err
		}
		rawAttributes, _ := json.Marshal(variant.Attributes)
		key := string(rawAttributes)
		if _, exists := attributeKeys[key]; exists {
			return nil, ErrInvalidAttributes
		}
		attributeKeys[key] = struct{}{}
		if variant.Barcode != "" {
			barcodeKey := strings.ToLower(variant.Barcode)
			if _, exists := barcodes[barcodeKey]; exists {
				return nil, ErrVariantBarcodeConflict
			}
			barcodes[barcodeKey] = struct{}{}
		}
	}
	return variants, nil
}

func validateParentVariantBarcodes(parentBarcode string, variants []VariantInput) error {
	parentBarcode = strings.TrimSpace(parentBarcode)
	for _, variant := range variants {
		if variant.Barcode != "" && strings.EqualFold(parentBarcode, variant.Barcode) {
			return ErrVariantBarcodeConflict
		}
	}
	return nil
}

func (s *Service) syncVariants(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID, existing []Variant, desired []VariantInput) ([]Variant, error) {
	desiredIDs := make(map[uuid.UUID]struct{}, len(desired))
	existingByID := make(map[uuid.UUID]Variant, len(existing))
	for _, variant := range existing {
		existingByID[variant.ID] = variant
	}
	for _, variant := range desired {
		if variant.ID != uuid.Nil {
			if _, exists := existingByID[variant.ID]; !exists {
				return nil, ErrVariantNotFound
			}
			desiredIDs[variant.ID] = struct{}{}
		}
	}
	for _, variant := range existing {
		if _, keep := desiredIDs[variant.ID]; keep {
			continue
		}
		sold, err := s.repository.VariantSoldHistory(ctx, tx, orgID, variant.ID)
		if err != nil {
			return nil, err
		}
		if sold {
			_, err = s.repository.UpdateVariant(ctx, tx, orgID, productID, variant.ID, VariantInput{
				Attributes: variant.Attributes, Price: variant.Price, Stock: variant.Stock, Barcode: "",
				Image: variant.Image, ImageKey: variant.ImageKey, Active: false,
			})
		} else {
			err = s.repository.DeleteVariant(ctx, tx, orgID, productID, variant.ID)
		}
		if err != nil {
			return nil, err
		}
	}
	for _, variant := range desired {
		if variant.ID == uuid.Nil {
			continue
		}
		current := existingByID[variant.ID]
		if current.Barcode != "" && current.Barcode != variant.Barcode {
			current.Barcode = ""
			if _, err := s.repository.UpdateVariant(ctx, tx, orgID, productID, current.ID, VariantInput{
				Attributes: current.Attributes, Price: current.Price, Stock: current.Stock, Barcode: "",
				Image: current.Image, ImageKey: current.ImageKey, Active: current.Active,
			}); err != nil {
				return nil, err
			}
		}
	}
	result := make([]Variant, 0, len(desired))
	for _, variant := range desired {
		var saved Variant
		var err error
		if err = s.repository.ValidateVariantBarcodeUnique(ctx, tx, orgID, variant.Barcode, productID, variant.ID); err != nil {
			return nil, err
		}
		if variant.ID == uuid.Nil {
			saved, err = s.repository.CreateVariant(ctx, tx, orgID, productID, variant)
		} else {
			saved, err = s.repository.UpdateVariant(ctx, tx, orgID, productID, variant.ID, variant)
		}
		if err != nil {
			return nil, err
		}
		result = append(result, saved)
	}
	return result, nil
}

func (s *Service) GetImage(ctx context.Context, key string) (objectstore.Object, error) {
	if s.images == nil {
		return objectstore.Object{}, objectstore.ErrNotFound
	}
	return s.images.Get(ctx, key)
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
	updated = s.withDeliveredImage(updated)
	return
}

func validateVariantAttributes(attrs map[string]string, config []AttributeConfig) error {
	if len(config) == 0 {
		if len(attrs) == 0 {
			return nil
		}
		return ErrInvalidAttributes
	}
	if len(attrs) != len(config) {
		return ErrInvalidAttributes
	}
	for _, attr := range config {
		value, ok := attrs[attr.Name]
		if !ok || strings.TrimSpace(value) == "" {
			return ErrInvalidAttributes
		}
		matched := false
		for _, option := range attr.Options {
			if option == value {
				matched = true
				break
			}
		}
		if !matched {
			return ErrInvalidAttributes
		}
	}
	return nil
}

func (s *Service) CreateVariant(ctx context.Context, identity database.Identity, productID uuid.UUID, input VariantInput) (Variant, error) {
	input.Barcode = strings.TrimSpace(input.Barcode)
	if input.Price < 1 || input.Stock < 0 {
		return Variant{}, ErrInvalidProduct
	}
	var created Variant
	err := s.runner.Run(ctx, identity, func(tx database.Tx) error {
		product, getErr := s.repository.Get(ctx, tx, identity.OrgID, productID)
		if getErr != nil {
			return getErr
		}
		if err := validateVariantAttributes(input.Attributes, product.AttributesConfig); err != nil {
			return err
		}
		if err := s.repository.ValidateVariantBarcodeUnique(ctx, tx, identity.OrgID, input.Barcode, productID, uuid.Nil); err != nil {
			return err
		}
		var createErr error
		created, createErr = s.repository.CreateVariant(ctx, tx, identity.OrgID, productID, input)
		return createErr
	})
	return created, err
}

func (s *Service) UpdateVariant(ctx context.Context, identity database.Identity, productID, variantID uuid.UUID, input VariantInput) (Variant, error) {
	input.Barcode = strings.TrimSpace(input.Barcode)
	if input.Price < 1 || input.Stock < 0 {
		return Variant{}, ErrInvalidProduct
	}
	var updated Variant
	err := s.runner.Run(ctx, identity, func(tx database.Tx) error {
		product, getErr := s.repository.Get(ctx, tx, identity.OrgID, productID)
		if getErr != nil {
			return getErr
		}
		if err := validateVariantAttributes(input.Attributes, product.AttributesConfig); err != nil {
			return err
		}
		if err := s.repository.ValidateVariantBarcodeUnique(ctx, tx, identity.OrgID, input.Barcode, productID, variantID); err != nil {
			return err
		}
		var updateErr error
		updated, updateErr = s.repository.UpdateVariant(ctx, tx, identity.OrgID, productID, variantID, input)
		return updateErr
	})
	return updated, err
}

func (s *Service) DeleteVariant(ctx context.Context, identity database.Identity, productID, variantID uuid.UUID) error {
	return s.runner.Run(ctx, identity, func(tx database.Tx) error {
		count, countErr := s.repository.CountActiveVariants(ctx, tx, identity.OrgID, productID)
		if countErr != nil {
			return countErr
		}
		if count <= 1 {
			return ErrMinVariants
		}
		sold, soldErr := s.repository.VariantSoldHistory(ctx, tx, identity.OrgID, variantID)
		if soldErr != nil {
			return soldErr
		}
		if sold {
			_, softErr := s.repository.UpdateVariant(ctx, tx, identity.OrgID, productID, variantID, VariantInput{Active: false})
			return softErr
		}
		return s.repository.DeleteVariant(ctx, tx, identity.OrgID, productID, variantID)
	})
}
