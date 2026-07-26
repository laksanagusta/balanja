package entitlement

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

var (
	ErrInvalidAdminTransition = errors.New("invalid admin transition")
	ErrEntitlementNotFound    = errors.New("organization entitlement not found")
)

type AdminInput struct {
	OrgID  string
	Status string
	Actor  string
	Note   string
}

type AdminResult struct {
	OrgID          string
	StoreName      string
	PreviousStatus string
	NewStatus      string
	Changed        bool
}

func NormalizeAdminInput(input AdminInput) (AdminInput, error) {
	input.OrgID = strings.TrimSpace(input.OrgID)
	input.Status = strings.TrimSpace(input.Status)
	input.Actor = strings.TrimSpace(input.Actor)
	input.Note = strings.TrimSpace(input.Note)
	if input.OrgID == "" || input.Actor == "" {
		return AdminInput{}, ErrInvalidAdminTransition
	}
	if input.Status != StatusPaidActive && input.Status != StatusPaidSuspended {
		return AdminInput{}, ErrInvalidAdminTransition
	}
	return input, nil
}

type AdminStore struct {
	DB *pgx.Conn
}

func (s AdminStore) SetStatus(ctx context.Context, raw AdminInput) (AdminResult, error) {
	input, err := NormalizeAdminInput(raw)
	if err != nil {
		return AdminResult{}, err
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return AdminResult{}, fmt.Errorf("begin entitlement transition: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	result := AdminResult{OrgID: input.OrgID, NewStatus: input.Status}
	err = tx.QueryRow(ctx, `
		select e.status,coalesce(s.store_name,'Toko Balanja')
		from organization_entitlements e
		left join store_settings s on s.org_id=e.org_id
		where e.org_id=$1
		for update of e
	`, input.OrgID).Scan(&result.PreviousStatus, &result.StoreName)
	if errors.Is(err, pgx.ErrNoRows) {
		return AdminResult{}, ErrEntitlementNotFound
	}
	if err != nil {
		return AdminResult{}, fmt.Errorf("load entitlement transition: %w", err)
	}
	if result.PreviousStatus == input.Status {
		if err := tx.Commit(ctx); err != nil {
			return AdminResult{}, fmt.Errorf("commit unchanged entitlement transition: %w", err)
		}
		return result, nil
	}

	if _, err := tx.Exec(ctx, `
		update organization_entitlements
		set status=$2,
		    transaction_limit=null,
		    activated_at=case when $2='paid_active' then coalesce(activated_at,now()) else activated_at end,
		    activated_by=case when $2='paid_active' then $3 else activated_by end,
		    suspended_at=case when $2='paid_suspended' then now() else null end,
		    updated_at=now()
		where org_id=$1
	`, input.OrgID, input.Status, input.Actor); err != nil {
		return AdminResult{}, fmt.Errorf("update entitlement status: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		insert into organization_entitlement_audit
		  (org_id,actor,previous_status,new_status,note)
		values ($1,$2,$3,$4,$5)
	`, input.OrgID, input.Actor, result.PreviousStatus, input.Status, input.Note); err != nil {
		return AdminResult{}, fmt.Errorf("audit entitlement transition: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return AdminResult{}, fmt.Errorf("commit entitlement transition: %w", err)
	}
	result.Changed = true
	return result, nil
}
