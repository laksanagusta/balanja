package report

import (
	"balanja/backend/internal/platform/database"
	"context"
	"io"
	"math"
	"time"
)

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	Load(context.Context, database.Tx, string, Query) (ReportData, error)
	Daily(context.Context, database.Tx, string, Query) ([]DailyRow, error)
	StreamTransactions(context.Context, database.Tx, string, Query, func(TransactionRow) error) error
}

func (s *Service) Prepare(input FilterInput, now time.Time) (Query, error) {
	return NormalizeFilter(input, now)
}

func (s *Service) ExportDaily(ctx context.Context, id database.Identity, input FilterInput, now time.Time, w io.Writer) error {
	query, err := s.Prepare(input, now)
	if err != nil {
		return err
	}
	var rows []DailyRow
	if err := s.runner.Run(ctx, id, func(tx database.Tx) error {
		var loadErr error
		rows, loadErr = s.repository.Daily(ctx, tx, id.OrgID, query)
		return loadErr
	}); err != nil {
		return err
	}
	return WriteDailyCSV(w, rows)
}

func (s *Service) ExportTransactions(ctx context.Context, id database.Identity, input FilterInput, now time.Time, w io.Writer) error {
	query, err := s.Prepare(input, now)
	if err != nil {
		return err
	}
	encoder, err := newTransactionCSVEncoder(w)
	if err != nil {
		return err
	}
	if err := s.runner.Run(ctx, id, func(tx database.Tx) error {
		return s.repository.StreamTransactions(ctx, tx, id.OrgID, query, encoder.write)
	}); err != nil {
		return err
	}
	return encoder.flush()
}

type Service struct {
	runner     Runner
	repository Repository
}

func NewService(runner Runner, repository Repository) *Service {
	return &Service{runner: runner, repository: repository}
}

func (s *Service) Report(ctx context.Context, id database.Identity, input FilterInput, now time.Time) (Report, error) {
	query, err := NormalizeFilter(input, now)
	if err != nil {
		return Report{}, err
	}

	var data ReportData
	err = s.runner.Run(ctx, id, func(tx database.Tx) error {
		var loadErr error
		data, loadErr = s.repository.Load(ctx, tx, id.OrgID, query)
		return loadErr
	})
	if err != nil {
		return Report{}, err
	}
	return buildReport(query, data, now.In(WIBLocation())), nil
}

func buildReport(query Query, data ReportData, generatedAt time.Time) Report {
	return Report{
		Period:           query.Current,
		ComparisonPeriod: query.Previous,
		Metrics:          data.CurrentMetrics,
		PreviousMetrics:  data.PreviousMetrics,
		Comparisons: map[string]Comparison{
			"netSales":              compare(float64(data.CurrentMetrics.NetSales), float64(data.PreviousMetrics.NetSales)),
			"tax":                   compare(float64(data.CurrentMetrics.Tax), float64(data.PreviousMetrics.Tax)),
			"totalReceived":         compare(float64(data.CurrentMetrics.TotalReceived), float64(data.PreviousMetrics.TotalReceived)),
			"completedTransactions": compare(float64(data.CurrentMetrics.CompletedTransactions), float64(data.PreviousMetrics.CompletedTransactions)),
			"itemsSold":             compare(float64(data.CurrentMetrics.ItemsSold), float64(data.PreviousMetrics.ItemsSold)),
			"averageTransaction":    compare(data.CurrentMetrics.AverageTransaction, data.PreviousMetrics.AverageTransaction),
		},
		Voids:           data.Voids,
		Trend:           emptyTrend(data.CurrentTrend),
		ComparisonTrend: emptyTrend(data.PreviousTrend),
		TopProducts:     emptyProducts(data.TopProducts),
		PaymentMethods:  emptyPayments(data.PaymentMethods),
		Cashiers:        emptyCashiers(data.Cashiers),
		CashierOptions:  emptyCashierOptions(data.CashierOptions),
		GeneratedAt:     generatedAt,
	}
}

func compare(current, previous float64) Comparison {
	absolute := current - previous
	direction := "neutral"
	if absolute > 0 {
		direction = "up"
	} else if absolute < 0 {
		direction = "down"
	}
	comparison := Comparison{Absolute: absolute, Direction: direction}
	if previous == 0 {
		return comparison
	}
	percent := math.Round(((absolute/previous)*100)*10) / 10
	comparison.Percent = &percent
	return comparison
}

func emptyTrend(values []TrendPoint) []TrendPoint {
	if values == nil {
		return []TrendPoint{}
	}
	return values
}

func emptyProducts(values []ProductBreakdown) []ProductBreakdown {
	if values == nil {
		return []ProductBreakdown{}
	}
	return values
}

func emptyPayments(values []PaymentBreakdown) []PaymentBreakdown {
	if values == nil {
		return []PaymentBreakdown{}
	}
	return values
}

func emptyCashiers(values []CashierBreakdown) []CashierBreakdown {
	if values == nil {
		return []CashierBreakdown{}
	}
	return values
}

func emptyCashierOptions(values []CashierOption) []CashierOption {
	if values == nil {
		return []CashierOption{}
	}
	return values
}
