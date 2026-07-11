package dashboard

import (
	"balanja/backend/internal/platform/database"
	"context"
	"errors"
	"math"
	"sort"
	"strings"
	"time"
)

var ErrInvalidPeriod = errors.New("invalid dashboard period")

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}
type Repository interface {
	Load(context.Context, database.Tx, string, time.Time) ([]Transaction, []Product, error)
}
type Service struct {
	runner     Runner
	repository Repository
	location   *time.Location
}

func NewService(r Runner, repo Repository) *Service {
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.FixedZone("WIB", 7*3600)
	}
	return &Service{runner: r, repository: repo, location: location}
}
func (s *Service) Summary(ctx context.Context, id database.Identity, days int, now time.Time) (Summary, error) {
	if days != 7 && days != 30 {
		return Summary{}, ErrInvalidPeriod
	}
	local := now.In(s.location)
	today := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, s.location)
	start := today.AddDate(0, 0, -(days - 1))
	previous := start.AddDate(0, 0, -days)
	var txs []Transaction
	var products []Product
	err := s.runner.Run(ctx, id, func(tx database.Tx) error {
		var e error
		txs, products, e = s.repository.Load(ctx, tx, id.OrgID, previous)
		return e
	})
	if err != nil {
		return Summary{}, err
	}
	return BuildSummary(txs, products, days, now.In(s.location)), nil
}
func BuildSummary(txs []Transaction, products []Product, days int, now time.Time) Summary {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	start := today.AddDate(0, 0, -(days - 1))
	end := today.AddDate(0, 0, 1)
	previous := start.AddDate(0, 0, -days)
	current := filter(txs, start, end)
	prior := filter(txs, previous, start)
	revenue := sum(current)
	priorRevenue := sum(prior)
	avg := 0.0
	if len(current) > 0 {
		avg = float64(revenue) / float64(len(current))
	}
	priorAvg := 0.0
	if len(prior) > 0 {
		priorAvg = float64(priorRevenue) / float64(len(prior))
	}
	low := make([]Product, 0)
	for _, p := range products {
		if p.Active && p.Stock <= 10 {
			low = append(low, p)
		}
	}
	sort.Slice(low, func(i, j int) bool {
		if low[i].Stock == low[j].Stock {
			return low[i].Name < low[j].Name
		}
		return low[i].Stock < low[j].Stock
	})
	summary := Summary{Revenue: revenue, TransactionCount: len(current), AverageTransactionValue: avg, LowStockCount: len(low), Comparisons: map[string]Comparison{"revenue": compare(float64(revenue), float64(priorRevenue)), "transactions": compare(float64(len(current)), float64(len(prior))), "average": compare(avg, priorAvg)}, RevenueTrend: trend(current, start, days), PaymentMix: paymentMix(current), TopProducts: topProducts(current), LowStock: low}
	if len(summary.LowStock) > 5 {
		summary.LowStock = summary.LowStock[:5]
	}
	return summary
}
func filter(txs []Transaction, start, end time.Time) []Transaction {
	out := []Transaction{}
	for _, tx := range txs {
		if tx.Status == "completed" && !tx.CreatedAt.Before(start) && tx.CreatedAt.Before(end) {
			out = append(out, tx)
		}
	}
	return out
}
func sum(txs []Transaction) int {
	v := 0
	for _, tx := range txs {
		v += tx.Total
	}
	return v
}
func compare(current, previous float64) Comparison {
	if previous == 0 {
		return Comparison{Direction: "neutral"}
	}
	percent := math.Round(((current-previous)/previous)*1000) / 10
	direction := "neutral"
	if percent > 0 {
		direction = "up"
	} else if percent < 0 {
		direction = "down"
	}
	return Comparison{Direction: direction, Percent: &percent}
}
func trend(txs []Transaction, start time.Time, days int) []TrendPoint {
	totals := map[string]int{}
	for _, tx := range txs {
		totals[tx.CreatedAt.In(start.Location()).Format("2006-01-02")] += tx.Total
	}
	out := make([]TrendPoint, days)
	for i := range days {
		date := start.AddDate(0, 0, i)
		out[i] = TrendPoint{Date: date.Format("2006-01-02"), Label: date.Format("2 Jan"), Revenue: totals[date.Format("2006-01-02")]}
	}
	return out
}
func paymentMix(txs []Transaction) []PaymentMix {
	totals := map[string]int{}
	all := 0
	for _, tx := range txs {
		label := strings.ToUpper(tx.PaymentMethod)
		if label != "CASH" && label != "QRIS" {
			label = "OTHER"
		}
		label = map[string]string{"CASH": "Cash", "QRIS": "QRIS", "OTHER": "Other"}[label]
		totals[label] += tx.Total
		all += tx.Total
	}
	out := []PaymentMix{}
	for _, label := range []string{"Cash", "QRIS", "Other"} {
		if value, ok := totals[label]; ok {
			percentage := 0.0
			if all > 0 {
				percentage = math.Round(float64(value)/float64(all)*1000) / 10
			}
			out = append(out, PaymentMix{Label: label, Value: value, Percentage: percentage})
		}
	}
	return out
}
func topProducts(txs []Transaction) []TopProduct {
	values := map[string]TopProduct{}
	for _, tx := range txs {
		for _, item := range tx.Items {
			v := values[item.ProductID]
			v.ProductID = item.ProductID
			v.Label = item.Name
			v.Quantity += item.Quantity
			v.Revenue += item.Price * item.Quantity
			values[item.ProductID] = v
		}
	}
	out := make([]TopProduct, 0, len(values))
	for _, v := range values {
		out = append(out, v)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Quantity == out[j].Quantity {
			return out[i].Revenue > out[j].Revenue
		}
		return out[i].Quantity > out[j].Quantity
	})
	if len(out) > 5 {
		out = out[:5]
	}
	return out
}
