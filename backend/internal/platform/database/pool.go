package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Pool struct {
	pool *pgxpool.Pool
}

func NewPool(ctx context.Context, databaseURL string, maxConns int32) (*Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}
	config.MaxConns = maxConns
	config.MinConns = 1
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 15 * time.Minute
	config.HealthCheckPeriod = time.Minute

	pgxPool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create database pool: %w", err)
	}
	if err := pgxPool.Ping(ctx); err != nil {
		pgxPool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &Pool{pool: pgxPool}, nil
}

func (p *Pool) Begin(ctx context.Context) (Tx, error) {
	return p.pool.Begin(ctx)
}

func (p *Pool) Ping(ctx context.Context) error {
	return p.pool.Ping(ctx)
}

func (p *Pool) Close() {
	p.pool.Close()
}
