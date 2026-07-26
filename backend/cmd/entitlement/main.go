package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"balanja/backend/internal/entitlement"
	"github.com/jackc/pgx/v5"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		log.Fatal(err)
	}
}

func run(arguments []string) error {
	flags := flag.NewFlagSet("entitlement", flag.ContinueOnError)
	orgID := flags.String("org-id", "", "Clerk organization ID")
	status := flags.String("status", "", "paid_active or paid_suspended")
	actor := flags.String("actor", "", "operator identity")
	note := flags.String("note", "", "payment or suspension reference")
	if err := flags.Parse(arguments); err != nil {
		return err
	}
	databaseURL := os.Getenv("ADMIN_DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("ADMIN_DATABASE_URL is required")
	}
	input, err := entitlement.NormalizeAdminInput(entitlement.AdminInput{
		OrgID: *orgID, Status: *status, Actor: *actor, Note: *note,
	})
	if err != nil {
		return fmt.Errorf("invalid entitlement transition: %w", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	connection, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		return fmt.Errorf("connect admin database: %w", err)
	}
	defer connection.Close(context.Background())
	result, err := (entitlement.AdminStore{DB: connection}).SetStatus(ctx, input)
	if err != nil {
		return err
	}
	fmt.Printf("%s (%s): %s -> %s; changed=%t\n",
		result.StoreName, result.OrgID, result.PreviousStatus, result.NewStatus, result.Changed)
	return nil
}
