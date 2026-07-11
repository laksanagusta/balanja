package settings

import (
	"context"
	"errors"
	"testing"

	"balanja/backend/internal/platform/database"
)

func TestServiceUpdateValidatesSettings(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input UpdateInput
	}{
		{name: "empty store", input: UpdateInput{TaxRate: 11}},
		{name: "negative tax", input: UpdateInput{StoreName: "Store", TaxRate: -1}},
		{name: "tax above one hundred", input: UpdateInput{StoreName: "Store", TaxRate: 101}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := NewService(fakeSettingsRunner{}, &fakeSettingsRepository{}).Update(context.Background(), database.Identity{OrgID: "org", UserID: "user"}, tt.input)
			if !errors.Is(err, ErrInvalidSettings) {
				t.Fatalf("Update() error = %v, want ErrInvalidSettings", err)
			}
		})
	}
}

type fakeSettingsRunner struct{}

func (fakeSettingsRunner) Run(_ context.Context, _ database.Identity, fn func(database.Tx) error) error {
	return fn(nil)
}

type fakeSettingsRepository struct{}

func (*fakeSettingsRepository) Get(context.Context, database.Tx, string) (Settings, error) {
	return Settings{StoreName: "Toko Balanja", TaxRate: 11}, nil
}
func (*fakeSettingsRepository) Update(_ context.Context, _ database.Tx, _ string, input UpdateInput) (Settings, error) {
	return Settings{StoreName: input.StoreName, StoreAddress: input.StoreAddress, TaxEnabled: input.TaxEnabled, TaxRate: input.TaxRate, QRISLabel: input.QRISLabel}, nil
}
