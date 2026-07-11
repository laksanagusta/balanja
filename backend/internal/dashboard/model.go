package dashboard

import "time"

type Item struct {
	ProductID string `json:"productId"`
	Name      string `json:"name"`
	Quantity  int    `json:"qty"`
	Price     int    `json:"price"`
}
type Transaction struct {
	CreatedAt     time.Time
	Status        string
	Total         int
	PaymentMethod string
	Items         []Item
}
type Product struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Stock  int    `json:"stock"`
	Active bool   `json:"active"`
}
type Comparison struct {
	Direction string   `json:"direction"`
	Percent   *float64 `json:"percent"`
}
type TrendPoint struct {
	Date    string `json:"date"`
	Label   string `json:"label"`
	Revenue int    `json:"revenue"`
}
type PaymentMix struct {
	Label      string  `json:"label"`
	Value      int     `json:"value"`
	Percentage float64 `json:"percentage"`
}
type TopProduct struct {
	ProductID string `json:"productId"`
	Label     string `json:"label"`
	Quantity  int    `json:"quantity"`
	Revenue   int    `json:"revenue"`
}
type Summary struct {
	Revenue                 int                   `json:"revenue"`
	TransactionCount        int                   `json:"transactionCount"`
	AverageTransactionValue float64               `json:"averageTransactionValue"`
	LowStockCount           int                   `json:"lowStockCount"`
	Comparisons             map[string]Comparison `json:"comparisons"`
	RevenueTrend            []TrendPoint          `json:"revenueTrend"`
	PaymentMix              []PaymentMix          `json:"paymentMix"`
	TopProducts             []TopProduct          `json:"topProducts"`
	LowStock                []Product             `json:"lowStock"`
}
