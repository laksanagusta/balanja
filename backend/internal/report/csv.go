package report

import (
	"encoding/csv"
	"io"
	"strconv"
	"strings"
	"unicode"
)

var dailyCSVHeader = []string{
	"Tanggal", "Transaksi Selesai", "Item Terjual", "Penjualan Bersih",
	"Pajak", "Total Diterima", "Transaksi Void", "Nilai Void",
}

var transactionCSVHeader = []string{
	"Nomor Transaksi", "Waktu WIB", "Kasir", "ID Kasir", "Metode Pembayaran",
	"Jumlah Item", "Subtotal", "Pajak", "Total", "Status",
}

func WriteDailyCSV(w io.Writer, rows []DailyRow) error {
	writer, err := newCSVWriter(w, dailyCSVHeader)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err := writer.Write([]string{
			safeCell(row.Date),
			strconv.FormatInt(row.CompletedTransactions, 10),
			strconv.FormatInt(row.ItemsSold, 10),
			strconv.FormatInt(row.NetSales, 10),
			strconv.FormatInt(row.Tax, 10),
			strconv.FormatInt(row.TotalReceived, 10),
			strconv.FormatInt(row.VoidCount, 10),
			strconv.FormatInt(row.VoidOriginalValue, 10),
		}); err != nil {
			return err
		}
	}
	return flushCSV(writer)
}

func WriteTransactionCSV(w io.Writer, rows []TransactionRow) error {
	encoder, err := newTransactionCSVEncoder(w)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err := encoder.write(row); err != nil {
			return err
		}
	}
	return encoder.flush()
}

type transactionCSVEncoder struct{ writer *csv.Writer }

func newTransactionCSVEncoder(w io.Writer) (*transactionCSVEncoder, error) {
	writer, err := newCSVWriter(w, transactionCSVHeader)
	if err != nil {
		return nil, err
	}
	return &transactionCSVEncoder{writer: writer}, nil
}

func (e *transactionCSVEncoder) write(row TransactionRow) error {
	return e.writer.Write([]string{
		safeCell(row.Number),
		row.CreatedAt.In(WIBLocation()).Format("2006-01-02 15:04:05"),
		safeCell(row.CashierLabel),
		safeCell(row.CashierUserID),
		safeCell(row.PaymentMethod),
		strconv.FormatInt(row.ItemCount, 10),
		strconv.FormatInt(row.Subtotal, 10),
		strconv.FormatInt(row.Tax, 10),
		strconv.FormatInt(row.Total, 10),
		safeCell(row.Status),
	})
}

func (e *transactionCSVEncoder) flush() error { return flushCSV(e.writer) }

func newCSVWriter(w io.Writer, header []string) (*csv.Writer, error) {
	if _, err := io.WriteString(w, "\ufeff"); err != nil {
		return nil, err
	}
	writer := csv.NewWriter(w)
	if err := writer.Write(header); err != nil {
		return nil, err
	}
	return writer, nil
}

func flushCSV(writer *csv.Writer) error {
	writer.Flush()
	return writer.Error()
}

func safeCell(value string) string {
	if value == "" {
		return ""
	}
	if value[0] == '\t' || value[0] == '\r' {
		return "'" + value
	}
	trimmed := strings.TrimLeftFunc(value, unicode.IsSpace)
	if trimmed != "" && strings.ContainsRune("=+-@", rune(trimmed[0])) {
		return "'" + value
	}
	return value
}
