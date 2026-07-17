package objectstore

import "context"

type PutInput struct {
	Key         string
	ContentType string
	Body        []byte
}

type StoredObject struct {
	Key string
	URL string
}

type Store interface {
	Put(context.Context, PutInput) (StoredObject, error)
	Delete(context.Context, string) error
}
