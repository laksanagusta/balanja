package product

import (
	"bytes"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"net/http"
	"strings"
	"unicode"

	"github.com/google/uuid"
	_ "golang.org/x/image/webp"
)

const MaxProductImageBytes = 5 << 20

var (
	ErrInvalidImage    = errors.New("invalid product image")
	ErrImageTooLarge   = errors.New("product image too large")
	ErrStorageDisabled = errors.New("product image storage disabled")
	ErrImageStorage    = errors.New("product image storage unavailable")
)

type ImageUpload struct {
	Filename string
	Data     []byte
}

type ImageMode uint8

const (
	ImagePreserve ImageMode = iota
	ImageReference
	ImageReplace
	ImageRemove
)

type ImageMutation struct {
	Mode   ImageMode
	Upload *ImageUpload
}

type validatedImage struct {
	Data        []byte
	ContentType string
	Extension   string
}

func validateProductImage(upload ImageUpload) (validatedImage, error) {
	if len(upload.Data) > MaxProductImageBytes {
		return validatedImage{}, ErrImageTooLarge
	}
	if len(upload.Data) == 0 {
		return validatedImage{}, ErrInvalidImage
	}
	contentType := http.DetectContentType(upload.Data)
	extensions := map[string]string{
		"image/jpeg": "jpg",
		"image/png":  "png",
		"image/webp": "webp",
	}
	extension, ok := extensions[contentType]
	if !ok {
		return validatedImage{}, ErrInvalidImage
	}
	if _, _, err := image.DecodeConfig(bytes.NewReader(upload.Data)); err != nil {
		return validatedImage{}, ErrInvalidImage
	}
	return validatedImage{Data: upload.Data, ContentType: contentType, Extension: extension}, nil
}

func productImageKey(orgID, extension string) string {
	var safe strings.Builder
	for _, character := range orgID {
		if unicode.IsLetter(character) || unicode.IsDigit(character) || character == '-' || character == '_' {
			safe.WriteRune(character)
		}
	}
	organization := safe.String()
	if organization == "" {
		organization = "org"
	}
	return "products/" + organization + "/" + uuid.NewString() + "." + extension
}
