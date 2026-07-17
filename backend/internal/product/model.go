package product

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Barcode   string    `json:"barcode"`
	Category  string    `json:"category"`
	Price     int       `json:"price"`
	Stock     int       `json:"stock"`
	Unit      string    `json:"unit"`
	Image     string    `json:"image"`
	ImageKey  string    `json:"-"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ListFilter struct {
	Query       string
	Category    string
	Active      *bool
	Limit       int
	Sort        string
	Direction   string
	Cursor      string
	CursorValue any
	CursorID    uuid.UUID
}

type Page struct {
	Items       []Product
	NextCursor  string
	HasNextPage bool
}

type CreateInput struct {
	Name     string `json:"name"`
	Barcode  string `json:"barcode"`
	Category string `json:"category"`
	Price    int    `json:"price"`
	Stock    int    `json:"stock"`
	Unit     string `json:"unit"`
	Image    string `json:"image"`
	ImageKey string `json:"-"`
}
type UpdateInput struct {
	Name          string `json:"name"`
	Barcode       string `json:"barcode"`
	Category      string `json:"category"`
	Price         int    `json:"price"`
	Unit          string `json:"unit"`
	Image         string `json:"image"`
	ImageKey      string `json:"-"`
	PreserveImage bool   `json:"-"`
	Active        bool   `json:"active"`
}

type UpdateResult struct {
	Product          Product
	PreviousImageKey string
}
