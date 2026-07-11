package database

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestWithinTenantRejectsEmptyIdentity(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		identity Identity
	}{
		{name: "missing organization", identity: Identity{UserID: "user_1"}},
		{name: "missing user", identity: Identity{OrgID: "org_1"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			beginner := &fakeBeginner{tx: &fakeTx{}}
			if err := WithinTenant(context.Background(), beginner, tt.identity, func(Tx) error { return nil }); err == nil {
				t.Fatal("WithinTenant() error = nil, want validation error")
			}
			if beginner.called {
				t.Fatal("Begin() called for invalid identity")
			}
		})
	}
}

func TestWithinTenantSetsClaimsAndCommits(t *testing.T) {
	t.Parallel()

	tx := &fakeTx{}
	beginner := &fakeBeginner{tx: tx}
	callbackCalled := false

	err := WithinTenant(context.Background(), beginner, Identity{OrgID: "org_1", UserID: "user_1"}, func(got Tx) error {
		callbackCalled = true
		if got != tx {
			t.Fatal("callback received unexpected transaction")
		}
		return nil
	})
	if err != nil {
		t.Fatalf("WithinTenant() error = %v", err)
	}
	if !callbackCalled || !tx.committed {
		t.Fatalf("callbackCalled=%v committed=%v", callbackCalled, tx.committed)
	}
	if len(tx.execs) != 2 {
		t.Fatalf("Exec calls = %d, want 2", len(tx.execs))
	}
	if tx.execs[0].sql != "select set_config('app.org_id', $1, true)" || tx.execs[0].arg != "org_1" {
		t.Fatalf("first Exec = %#v", tx.execs[0])
	}
	if tx.execs[1].sql != "select set_config('app.user_id', $1, true)" || tx.execs[1].arg != "user_1" {
		t.Fatalf("second Exec = %#v", tx.execs[1])
	}
}

func TestWithinTenantRollsBackCallbackFailure(t *testing.T) {
	t.Parallel()

	want := errors.New("use case failed")
	tx := &fakeTx{}
	err := WithinTenant(context.Background(), &fakeBeginner{tx: tx}, Identity{OrgID: "org_1", UserID: "user_1"}, func(Tx) error {
		return want
	})
	if !errors.Is(err, want) {
		t.Fatalf("WithinTenant() error = %v, want wrapped callback error", err)
	}
	if !tx.rolledBack || tx.committed {
		t.Fatalf("rolledBack=%v committed=%v", tx.rolledBack, tx.committed)
	}
}

type fakeBeginner struct {
	tx     Tx
	err    error
	called bool
}

func (f *fakeBeginner) Begin(context.Context) (Tx, error) {
	f.called = true
	return f.tx, f.err
}

type execCall struct{ sql, arg string }

type fakeTx struct {
	execs      []execCall
	committed  bool
	rolledBack bool
}

func (f *fakeTx) Exec(_ context.Context, sql string, arguments ...any) (pgconn.CommandTag, error) {
	arg, _ := arguments[0].(string)
	f.execs = append(f.execs, execCall{sql: sql, arg: arg})
	return pgconn.CommandTag{}, nil
}
func (f *fakeTx) Query(context.Context, string, ...any) (pgx.Rows, error) { return nil, nil }
func (f *fakeTx) QueryRow(context.Context, string, ...any) pgx.Row        { return nil }
func (f *fakeTx) Commit(context.Context) error {
	f.committed = true
	return nil
}
func (f *fakeTx) Rollback(context.Context) error {
	f.rolledBack = true
	return nil
}
