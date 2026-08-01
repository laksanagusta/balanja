package product

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	_ "image/png"
	"math"
	"net/http"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/rwcarlsen/goexif/exif"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const (
	MaxProductImageBytes       = 5 << 20
	MaxStoredProductImageBytes = 200_000
	maxProductImageDimension   = 1600
	maxProductImagePixels      = 40_000_000
	maxProductImageQuality     = 85
	minProductImageQuality     = 35
)

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
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		return validatedImage{}, ErrInvalidImage
	}
	config, _, err := image.DecodeConfig(bytes.NewReader(upload.Data))
	if err != nil || config.Width <= 0 || config.Height <= 0 ||
		config.Height > maxProductImagePixels/config.Width {
		return validatedImage{}, ErrInvalidImage
	}
	decoded, _, err := image.Decode(bytes.NewReader(upload.Data))
	if err != nil {
		return validatedImage{}, ErrInvalidImage
	}
	oriented := applyProductImageOrientation(contentType, upload.Data, decoded)
	compressed, err := compressProductImage(oriented)
	if err != nil {
		return validatedImage{}, ErrInvalidImage
	}
	return validatedImage{Data: compressed, ContentType: "image/jpeg", Extension: "jpg"}, nil
}

func applyProductImageOrientation(contentType string, data []byte, source image.Image) image.Image {
	if contentType != "image/jpeg" {
		return source
	}
	metadata, err := exif.Decode(bytes.NewReader(data))
	if err != nil {
		return source
	}
	tag, err := metadata.Get(exif.Orientation)
	if err != nil {
		return source
	}
	orientation, err := tag.Int(0)
	if err != nil {
		return source
	}
	if orientation < 2 || orientation > 8 {
		return source
	}
	return orientedProductImage(source, orientation)
}

func orientedProductImage(source image.Image, orientation int) *image.NRGBA {
	bounds := source.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	swapped := orientation == 5 || orientation == 6 || orientation == 7 || orientation == 8
	outWidth, outHeight := width, height
	if swapped {
		outWidth, outHeight = height, width
	}
	target := image.NewNRGBA(image.Rect(0, 0, outWidth, outHeight))
	for y := 0; y < outHeight; y++ {
		for x := 0; x < outWidth; x++ {
			sx, sy := orientedSourceCoordinate(orientation, x, y, width, height)
			target.SetNRGBA(x, y, color.NRGBAModel.Convert(source.At(bounds.Min.X+sx, bounds.Min.Y+sy)).(color.NRGBA))
		}
	}
	return target
}

func orientedSourceCoordinate(orientation, x, y, width, height int) (int, int) {
	switch orientation {
	case 2:
		return width - 1 - x, y
	case 3:
		return width - 1 - x, height - 1 - y
	case 4:
		return x, height - 1 - y
	case 5:
		return y, x
	case 6:
		return y, height - 1 - x
	case 7:
		return width - 1 - y, height - 1 - x
	case 8:
		return width - 1 - y, x
	default:
		return x, y
	}
}

func compressProductImage(source image.Image) ([]byte, error) {
	width, height := fittedDimensions(source.Bounds().Dx(), source.Bounds().Dy(), maxProductImageDimension)

	for {
		resized := resizeProductImage(source, width, height)
		encoded, fits, err := encodeProductJPEG(resized)
		if err != nil {
			return nil, err
		}
		if fits {
			return encoded, nil
		}
		if width == 1 && height == 1 {
			return nil, ErrInvalidImage
		}

		scale := math.Sqrt(float64(MaxStoredProductImageBytes) / float64(len(encoded)))
		scale = math.Min(scale*0.9, 0.9)
		width = max(1, int(float64(width)*scale))
		height = max(1, int(float64(height)*scale))
	}
}

func fittedDimensions(width, height, limit int) (int, int) {
	if width <= limit && height <= limit {
		return width, height
	}
	scale := math.Min(float64(limit)/float64(width), float64(limit)/float64(height))
	return max(1, int(float64(width)*scale)), max(1, int(float64(height)*scale))
}

func resizeProductImage(source image.Image, width, height int) *image.NRGBA {
	target := image.NewNRGBA(image.Rect(0, 0, width, height))
	draw.Draw(target, target.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
	xdraw.CatmullRom.Scale(target, target.Bounds(), source, source.Bounds(), draw.Over, nil)
	return target
}

func encodeProductJPEG(source image.Image) ([]byte, bool, error) {
	encode := func(quality int) ([]byte, error) {
		var output bytes.Buffer
		if err := jpeg.Encode(&output, source, &jpeg.Options{Quality: quality}); err != nil {
			return nil, err
		}
		return output.Bytes(), nil
	}

	best, err := encode(maxProductImageQuality)
	if err != nil {
		return nil, false, err
	}
	if len(best) <= MaxStoredProductImageBytes {
		return best, true, nil
	}

	lowest, err := encode(minProductImageQuality)
	if err != nil {
		return nil, false, err
	}
	if len(lowest) > MaxStoredProductImageBytes {
		return lowest, false, nil
	}

	low, high := minProductImageQuality, maxProductImageQuality-1
	best = lowest
	for low <= high {
		quality := low + (high-low)/2
		candidate, encodeErr := encode(quality)
		if encodeErr != nil {
			return nil, false, encodeErr
		}
		if len(candidate) <= MaxStoredProductImageBytes {
			best = candidate
			low = quality + 1
		} else {
			high = quality - 1
		}
	}
	return best, true, nil
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
