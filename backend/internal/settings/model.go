package settings

import "time"

type Settings struct {
	StoreName    string    `json:"storeName"`
	StoreAddress string    `json:"storeAddress"`
	TaxEnabled   bool      `json:"taxEnabled"`
	TaxRate      int       `json:"taxRate"`
	QRISLabel    string    `json:"qrisLabel"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
type UpdateInput struct {
	StoreName    string `json:"storeName"`
	StoreAddress string `json:"storeAddress"`
	TaxEnabled   bool   `json:"taxEnabled"`
	TaxRate      int    `json:"taxRate"`
	QRISLabel    string `json:"qrisLabel"`
}
