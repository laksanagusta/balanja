package objectstore

import (
	"bytes"
	"context"
	"io"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type fakeS3Client struct {
	put    *s3.PutObjectInput
	get    *s3.GetObjectInput
	delete *s3.DeleteObjectInput
}

func (f *fakeS3Client) PutObject(_ context.Context, input *s3.PutObjectInput, _ ...func(*s3.Options)) (*s3.PutObjectOutput, error) {
	f.put = input
	return &s3.PutObjectOutput{}, nil
}

func (f *fakeS3Client) GetObject(_ context.Context, input *s3.GetObjectInput, _ ...func(*s3.Options)) (*s3.GetObjectOutput, error) {
	f.get = input
	contentLength := int64(3)
	contentType := "image/jpeg"
	etag := `"abc123"`
	return &s3.GetObjectOutput{
		Body:          io.NopCloser(bytes.NewReader([]byte("jpg"))),
		ContentLength: &contentLength,
		ContentType:   &contentType,
		ETag:          &etag,
	}, nil
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
	if client.put == nil || *client.put.Bucket != "bucket" || *client.put.Key != stored.Key || *client.put.ContentType != "image/png" ||
		client.put.CacheControl == nil || *client.put.CacheControl != "public, max-age=31536000, immutable" {
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

func TestR2GetStreamsObjectMetadata(t *testing.T) {
	t.Parallel()

	client := &fakeS3Client{}
	store := newWithClient(client, Config{Bucket: "bucket", PublicBaseURL: "https://img.example"})
	object, err := store.Get(context.Background(), "products/org/a.jpg")
	if err != nil {
		t.Fatal(err)
	}
	defer object.Body.Close()

	body, err := io.ReadAll(object.Body)
	if err != nil {
		t.Fatal(err)
	}
	if client.get == nil || *client.get.Bucket != "bucket" || *client.get.Key != "products/org/a.jpg" {
		t.Fatalf("get = %#v", client.get)
	}
	if string(body) != "jpg" || object.ContentType != "image/jpeg" || object.ContentLength != 3 || object.ETag != `"abc123"` {
		t.Fatalf("object = %#v body=%q", object, body)
	}
}
