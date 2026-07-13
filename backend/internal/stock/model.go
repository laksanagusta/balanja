package stock

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type MovementType string

const (
	MovementTypeSale     MovementType = "sale"
	MovementTypeRestock  MovementType = "restock"
	MovementTypeReduce   MovementType = "reduce"
	MovementTypeSetExact MovementType = "set_exact"
)

var (
	ErrInvalidStockMovement = errors.New("invalid stock movement")
	ErrProductNotFound      = errors.New("product not found")
	ErrProductInactive      = errors.New("product inactive")
	ErrInsufficientStock    = errors.New("insufficient stock")
	ErrInvalidCursor        = errors.New("invalid stock movement cursor")
)

type Movement struct {
	ID              uuid.UUID    `json:"id"`
	ProductID       uuid.UUID    `json:"productId"`
	ProductName     string       `json:"productName"`
	ProductBarcode  string       `json:"productBarcode"`
	ProductCategory string       `json:"productCategory"`
	ProductUnit     string       `json:"productUnit"`
	Type            MovementType `json:"type"`
	QuantityDelta   int          `json:"quantityDelta"`
	StockBefore     int          `json:"stockBefore"`
	StockAfter      int          `json:"stockAfter"`
	Reason          string       `json:"reason"`
	ReferenceType   *string      `json:"referenceType,omitempty"`
	ReferenceID     *uuid.UUID   `json:"referenceId,omitempty"`
	CreatedByUserID string       `json:"createdByUserId"`
	CreatedAt       time.Time    `json:"createdAt"`
}

type CreateInput struct {
	ProductID uuid.UUID    `json:"productId"`
	Type      MovementType `json:"type"`
	Quantity  int          `json:"quantity"`
	Reason    string       `json:"reason"`
}

type ProductStock struct {
	ID        uuid.UUID `json:"id"`
	Stock     int       `json:"stock"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateResult struct {
	Movement Movement     `json:"movement"`
	Product  ProductStock `json:"product"`
}

type ListFilter struct {
	ProductID   *uuid.UUID
	Type        MovementType
	Query       string
	DateFrom    *time.Time
	DateTo      *time.Time
	Limit       int
	Sort        string
	Direction   string
	Cursor      string
	CursorValue any
	CursorID    uuid.UUID
}

type Page struct {
	Items       []Movement `json:"items"`
	NextCursor  string     `json:"nextCursor,omitempty"`
	HasNextPage bool       `json:"hasNextPage"`
}

type LockedProduct struct {
	ID       uuid.UUID
	Name     string
	Stock    int
	IsActive bool
}
