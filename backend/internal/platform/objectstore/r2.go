package objectstore

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Config struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	PublicBaseURL   string
}

type s3Client interface {
	PutObject(context.Context, *s3.PutObjectInput, ...func(*s3.Options)) (*s3.PutObjectOutput, error)
	DeleteObject(context.Context, *s3.DeleteObjectInput, ...func(*s3.Options)) (*s3.DeleteObjectOutput, error)
}

type r2Store struct {
	client        s3Client
	bucket        string
	publicBaseURL string
}

func NewR2(ctx context.Context, cfg Config) (Store, error) {
	awsConfig, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion("auto"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("load R2 configuration: %w", err)
	}
	client := s3.NewFromConfig(awsConfig, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(cfg.Endpoint)
		options.UsePathStyle = true
	})
	return newWithClient(client, cfg), nil
}

func newWithClient(client s3Client, cfg Config) Store {
	return &r2Store{
		client:        client,
		bucket:        cfg.Bucket,
		publicBaseURL: strings.TrimRight(cfg.PublicBaseURL, "/"),
	}
}

func (s *r2Store) Put(ctx context.Context, input PutInput) (StoredObject, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(input.Key),
		ContentType: aws.String(input.ContentType),
		Body:        bytes.NewReader(input.Body),
	})
	if err != nil {
		return StoredObject{}, fmt.Errorf("put R2 object: %w", err)
	}
	return StoredObject{
		Key: input.Key,
		URL: s.publicBaseURL + "/" + strings.TrimLeft(input.Key, "/"),
	}, nil
}

func (s *r2Store) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("delete R2 object: %w", err)
	}
	return nil
}
