package objectstore

import (
	"context"
	"io"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type fakeS3Client struct {
	put    *s3.PutObjectInput
	delete *s3.DeleteObjectInput
}

func (f *fakeS3Client) PutObject(_ context.Context, input *s3.PutObjectInput, _ ...func(*s3.Options)) (*s3.PutObjectOutput, error) {
	f.put = input
	return &s3.PutObjectOutput{}, nil
}

func (f *fakeS3Client) DeleteObject(_ context.Context, input *s3.DeleteObjectInput, _ ...func(*s3.Options)) (*s3.DeleteObjectOutput, error) {
	f.delete = input
	return &s3.DeleteObjectOutput{}, nil
}

func TestR2PutBuildsPublicURL(t *testing.T) {
	t.Parallel()

	client := &fakeS3Client{}
	store := newWithClient(client, Config{Bucket: "bucket", PublicBaseURL: "https://img.example/"})
	stored, err := store.Put(context.Background(), PutInput{Key: "products/org/a.png", ContentType: "image/png", Body: []byte("png")})
	if err != nil {
		t.Fatal(err)
	}
	if stored.Key != "products/org/a.png" || stored.URL != "https://img.example/products/org/a.png" {
		t.Fatalf("stored = %#v", stored)
	}
	if client.put == nil || *client.put.Bucket != "bucket" || *client.put.Key != stored.Key || *client.put.ContentType != "image/png" {
		t.Fatalf("put = %#v", client.put)
	}
	body, err := io.ReadAll(client.put.Body)
	if err != nil || string(body) != "png" {
		t.Fatalf("body = %q, err = %v", body, err)
	}
}

func TestR2DeleteUsesConfiguredBucket(t *testing.T) {
	t.Parallel()

	client := &fakeS3Client{}
	store := newWithClient(client, Config{Bucket: "bucket", PublicBaseURL: "https://img.example"})
	if err := store.Delete(context.Background(), "products/org/a.png"); err != nil {
		t.Fatal(err)
	}
	if client.delete == nil || *client.delete.Bucket != "bucket" || *client.delete.Key != "products/org/a.png" {
		t.Fatalf("delete = %#v", client.delete)
	}
}
