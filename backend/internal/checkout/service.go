package checkout

import (
	"balanja/backend/internal/platform/database"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
)

var (
	ErrInvalidCheckout      = errors.New("invalid checkout")
	ErrIdempotencyKeyReused = errors.New("idempotency key reused")
	ErrProductNotFound      = errors.New("product not found")
	ErrProductInactive      = errors.New("product inactive")
	ErrInsufficientStock    = errors.New("insufficient stock")
	ErrInsufficientCash     = errors.New("insufficient cash")
)

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}
type Repository interface {
	Execute(context.Context, database.Tx, database.Identity, string, string, Input) (Result, error)
}
type Service struct {
	runner     Runner
	repository Repository
}

func NewService(r Runner, repo Repository) *Service { return &Service{runner: r, repository: repo} }
func (s *Service) Checkout(ctx context.Context, id database.Identity, key string, input Input) (result Result, err error) {
	if !validKey(key) || len(input.Items) == 0 || (input.Payment.Method != "cash" && input.Payment.Method != "qris") {
		return Result{}, ErrInvalidCheckout
	}
	quantities := map[string]ItemInput{}
	for _, item := range input.Items {
		if item.ProductID == [16]byte{} || item.Quantity < 1 {
			return Result{}, ErrInvalidCheckout
		}
		k := item.ProductID.String()
		existing := quantities[k]
		existing.ProductID = item.ProductID
		existing.Quantity += item.Quantity
		quantities[k] = existing
	}
	input.Items = input.Items[:0]
	for _, item := range quantities {
		input.Items = append(input.Items, item)
	}
	sort.Slice(input.Items, func(i, j int) bool { return input.Items[i].ProductID.String() < input.Items[j].ProductID.String() })
	if input.Payment.Method == "qris" {
		input.Payment.CashReceived = 0
	}
	canonical, _ := json.Marshal(input)
	sum := sha256.Sum256(canonical)
	fingerprint := hex.EncodeToString(sum[:])
	err = s.runner.Run(ctx, id, func(tx database.Tx) error {
		var e error
		result, e = s.repository.Execute(ctx, tx, id, key, fingerprint, input)
		return e
	})
	return result, err
}
func validKey(key string) bool {
	if len(key) < 8 || len(key) > 128 {
		return false
	}
	for _, r := range key {
		if r < 0x21 || r > 0x7e || strings.ContainsRune("\r\n", r) {
			return false
		}
	}
	return true
}
