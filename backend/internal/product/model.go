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
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateInput struct {
	Name     string `json:"name"`
	Barcode  string `json:"barcode"`
	Category string `json:"category"`
	Price    int    `json:"price"`
	Stock    int    `json:"stock"`
	Unit     string `json:"unit"`
	Image    string `json:"image"`
}
type UpdateInput struct {
	Name     string `json:"name"`
	Barcode  string `json:"barcode"`
	Category string `json:"category"`
	Price    int    `json:"price"`
	Unit     string `json:"unit"`
	Image    string `json:"image"`
	Active   bool   `json:"active"`
}
