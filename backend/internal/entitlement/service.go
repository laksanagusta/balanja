package entitlement

import (
	"context"
	"errors"

	"balanja/backend/internal/platform/database"
)

var ErrInvalidEvent = errors.New("invalid entitlement event")

var clientEvents = map[string]struct{}{
	"upgrade_whatsapp_clicked": {},
	"upgrade_email_clicked":    {},
}

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	GetOrCreate(context.Context, database.Tx, string) (Record, error)
	RecordEvent(context.Context, database.Tx, string, string) error
}

type Service struct {
	runner     Runner
	repository Repository
}

func NewService(runner Runner, repository Repository) *Service {
	return &Service{runner: runner, repository: repository}
}

func (s *Service) Get(ctx context.Context, identity database.Identity) (summary Summary, err error) {
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		record, loadErr := s.repository.GetOrCreate(ctx, tx, identity.OrgID)
		if loadErr != nil {
			return loadErr
		}
		summary = Summarize(record)
		return nil
	})
	return summary, err
}

func (s *Service) RecordEvent(ctx context.Context, identity database.Identity, event string) error {
	if _, ok := clientEvents[event]; !ok {
		return ErrInvalidEvent
	}
	return s.runner.Run(ctx, identity, func(tx database.Tx) error {
		return s.repository.RecordEvent(ctx, tx, identity.OrgID, event)
	})
}
