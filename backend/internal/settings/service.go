package settings

import (
	"balanja/backend/internal/platform/database"
	"context"
	"errors"
	"strings"
)

var ErrInvalidSettings = errors.New("invalid settings")

type TenantRunner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}
type Repository interface {
	Get(context.Context, database.Tx, string) (Settings, error)
	Update(context.Context, database.Tx, string, UpdateInput) (Settings, error)
}
type Service struct {
	runner     TenantRunner
	repository Repository
}

func NewService(r TenantRunner, repo Repository) *Service {
	return &Service{runner: r, repository: repo}
}
func (s *Service) Get(ctx context.Context, id database.Identity) (value Settings, err error) {
	err = s.runner.Run(ctx, id, func(tx database.Tx) error { var e error; value, e = s.repository.Get(ctx, tx, id.OrgID); return e })
	return
}
func (s *Service) Update(ctx context.Context, id database.Identity, in UpdateInput) (value Settings, err error) {
	in.StoreName = strings.TrimSpace(in.StoreName)
	in.StoreAddress = strings.TrimSpace(in.StoreAddress)
	in.QRISLabel = strings.TrimSpace(in.QRISLabel)
	if in.StoreName == "" || in.TaxRate < 0 || in.TaxRate > 100 {
		return Settings{}, ErrInvalidSettings
	}
	err = s.runner.Run(ctx, id, func(tx database.Tx) error {
		var e error
		value, e = s.repository.Update(ctx, tx, id.OrgID, in)
		return e
	})
	return
}
