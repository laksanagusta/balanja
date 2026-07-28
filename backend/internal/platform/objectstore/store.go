package objectstore

import (
	"context"
	"errors"
	"io"
)

var ErrNotFound = errors.New("object not found")

type PutInput struct {
	Key         string
	ContentType string
	Body        []byte
}

type StoredObject struct {
	Key string
	URL string
}

type Object struct {
	Body          io.ReadCloser
	ContentType   string
	ContentLength int64
	ETag          string
}

type Store interface {
	Put(context.Context, PutInput) (StoredObject, error)
	Get(context.Context, string) (Object, error)
	Delete(context.Context, string) error
}
