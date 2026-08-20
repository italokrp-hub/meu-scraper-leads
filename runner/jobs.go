package runner

import (
	"bufio"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"plugin"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/gosom/google-maps-scraper/deduper"
	"github.com/gosom/google-maps-scraper/exiter"
	"github.com/gosom/google-maps-scraper/gmaps"
	"github.com/gosom/google-maps-scraper/grid"
	"github.com/gosom/scrapemate"
)

func CreateSeedJobs(
	fastmode bool,
	langCode string,
	r io.Reader,
	maxDepth int,
	email bool,
	geoCoordinates string,
	zoom int,
	radius float64,
	dedup deduper.Deduper,
	exitMonitor exiter.Exiter,
	extraReviews bool,
) (jobs []scrapemate.IJob, err error) {
	var lat, lon float64

	if fastmode {
		if geoCoordinates == "" {
			return nil, fmt.Errorf("geo coordinates are required in fast mode")
		}

		parts := strings.Split(geoCoordinates, ",")
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid geo coordinates: %s", geoCoordinates)
		}

		lat, err = strconv.ParseFloat(parts[0], 64)
		if err != nil {
			return nil, fmt.Errorf("invalid latitude: %w", err)
		}

		lon, err = strconv.ParseFloat(parts[1], 64)
		if err != nil {
			return nil, fmt.Errorf("invalid longitude: %w", err)
		}

		if lat < -90 || lat > 90 {
			return nil, fmt.Errorf("invalid latitude: %f", lat)
		}

		if lon < -180 || lon > 180 {
			return nil, fmt.Errorf("invalid longitude: %f", lon)
		}

		if zoom < 1 || zoom > 21 {
			return nil, fmt.Errorf("invalid zoom level: %d", zoom)
		}

		if radius < 0 {
			return nil, fmt.Errorf("invalid radius: %f", radius)
		}
	}

	scanner := bufio.NewScanner(r)

	for scanner.Scan() {
		q, ok, parseErr := parseQueryLine(scanner.Text())
		if parseErr != nil {
			return nil, parseErr
		}

		if !ok {
			continue
		}

		query := q.text
		id := q.id

		if !fastmode {
			opts := []gmaps.GmapJobOptions{}

			if dedup != nil {
				opts = append(opts, gmaps.WithDeduper(dedup))
			}

			if exitMonitor != nil {
				opts = append(opts, gmaps.WithExitMonitor(exitMonitor))
			}

			if extraReviews {
				opts = append(opts, gmaps.WithExtraReviews())
			}

			jobs = append(jobs, gmaps.NewGmapJob(id, langCode, query, maxDepth, email, geoCoordinates, zoom, opts...))
		} else {
			opts := []gmaps.SearchJobOptions{}

			if exitMonitor != nil {
				opts = append(opts, gmaps.WithSearchJobExitMonitor(exitMonitor))
			}

			if dedup != nil {
				opts = append(opts, gmaps.WithSearchJobDeduper(dedup))
			}

			if maxDepth > 1 {
				// Profundidade acima de 1: divide a área ao redor da cidade em
				// uma grade de sub-buscas. Cada célula roda uma busca stealth-HTTP
				// com zoom ajustado ao tamanho da célula, contornando o limite de
				// ~7 resultados que uma única coordenada retorna.
				gridJobs := createFastSearchGridJobs(query, langCode, lat, lon, radius, zoom, maxDepth, opts)
				jobs = append(jobs, gridJobs...)
			} else {
				jparams := gmaps.MapSearchParams{
					Location: gmaps.MapLocation{
						Lat:     lat,
						Lon:     lon,
						ZoomLvl: float64(zoom),
						Radius:  radius,
					},
					Query:     query,
					ViewportW: 1920,
					ViewportH: 450,
					Hl:        langCode,
				}

				job := gmaps.NewSearchJob(&jparams, opts...)
				jobs = append(jobs, job)
			}
		}
	}

	return jobs, scanner.Err()
}

// createFastSearchGridJobs splits the area around (lat, lon) into a
// maxDepth×maxDepth grid of sub-searches. Each cell runs a single stealth-HTTP
// search with a zoom level matched to the cell size, so each request returns
// the small result set that Google exposes per viewport. Tiling the whole
// radius with cells recovers far more of the municipality than the ~7 results
// a single coordinate search returns.
//
// Deduplication across cells is handled by the shared deduper wired through
// opts, guaranteeing the final CSV/JSON has no repeated places.
func createFastSearchGridJobs(
	query, langCode string,
	lat, lon, radius float64,
	zoom, maxDepth int,
	opts []gmaps.SearchJobOptions,
) []scrapemate.IJob {
	const (
		kmPerDegreeLat  = 111.32
		defaultRadiusKm = 10.0
		minCosLatitude  = 1e-6
	)

	if radius <= 0 {
		radius = defaultRadiusKm * 1000
	}

	radiusKm := radius / 1000

	latHalf := radiusKm / kmPerDegreeLat

	cosLat := math.Cos(lat * math.Pi / 180)
	if cosLat < minCosLatitude {
		cosLat = minCosLatitude
	}

	lonHalf := radiusKm / (kmPerDegreeLat * cosLat)

	bbox := grid.BoundingBox{
		MinLat: lat - latHalf,
		MaxLat: lat + latHalf,
		MinLon: lon - lonHalf,
		MaxLon: lon + lonHalf,
	}

	cellSizeKm := (2 * radiusKm) / float64(maxDepth)

	cells := grid.GenerateCells(bbox, cellSizeKm)
	if len(cells) == 0 {
		return nil
	}

	jobs := make([]scrapemate.IJob, 0, len(cells))

	for _, cell := range cells {
		cellRadiusMeters := cellSizeKm * 1000

		jparams := gmaps.MapSearchParams{
			Location: gmaps.MapLocation{
				Lat:     cell.Lat,
				Lon:     cell.Lon,
				ZoomLvl: float64(zoomForCell(cell.Lat, cellSizeKm, zoom)),
				Radius:  cellRadiusMeters,
			},
			Query:     query,
			ViewportW: 1920,
			ViewportH: 450,
			Hl:        langCode,
		}

		job := gmaps.NewSearchJob(&jparams, opts...)

		jobs = append(jobs, job)
	}

	return jobs
}

// zoomForCell returns the Google Maps zoom level that makes a cell of the given
// size roughly fill the horizontal viewport of a stealth search. It clamps to
// [minCellZoom, maxZoom] so cells stay readable without exceeding the zoom the
// user originally requested.
func zoomForCell(lat, cellSizeKm float64, maxZoom int) int {
	const (
		metersPerPixelZoomZero = 156543.03
		viewportWidthPx        = 600
		minCellZoom            = 10
		minCosLatitude         = 1e-6
	)

	cosLat := math.Cos(lat * math.Pi / 180)
	if cosLat < minCosLatitude {
		cosLat = minCosLatitude
	}

	cellMeters := cellSizeKm * 1000

	zoom := math.Log2(metersPerPixelZoomZero * cosLat * viewportWidthPx / cellMeters)

	z := int(math.Round(zoom))
	if z < minCellZoom {
		z = minCellZoom
	}

	if maxZoom > 0 && z > maxZoom {
		z = maxZoom
	}

	return z
}

// CreateGridSeedJobs reads search queries from r and produces one GmapJob per
// (query, grid-cell) pair. Each cell covers approximately cellSizeKm × cellSizeKm
// on the ground. The zoom level controls how much of the map Google Maps renders
// per cell (use 14-16 for most cases).
//
// Deduplication across cells is handled automatically by the shared deduper.
func CreateGridSeedJobs(
	langCode string,
	r io.Reader,
	maxDepth int,
	email bool,
	bbox grid.BoundingBox,
	cellSizeKm float64,
	zoom int,
	dedup deduper.Deduper,
	exitMonitor exiter.Exiter,
	extraReviews bool,
) ([]scrapemate.IJob, error) {
	if zoom < 1 || zoom > 21 {
		return nil, fmt.Errorf("invalid zoom level: %d", zoom)
	}

	cells := grid.GenerateCells(bbox, cellSizeKm)
	if len(cells) == 0 {
		return nil, fmt.Errorf("grid produced 0 cells — check bounding box and cell size")
	}

	queries, err := readQueries(r)
	if err != nil {
		return nil, err
	}

	if len(queries) == 0 {
		return nil, fmt.Errorf("no queries found in input")
	}

	var jobs []scrapemate.IJob

	for _, q := range queries {
		queryText := q.text
		queryID := q.id

		for _, cell := range cells {
			// Each cell gets a unique ID derived from the query ID (or a new UUID).
			cellID := uuid.New().String()
			if queryID != "" {
				cellID = fmt.Sprintf("%s-%s", queryID, cellID)
			}

			opts := []gmaps.GmapJobOptions{}

			if dedup != nil {
				opts = append(opts, gmaps.WithDeduper(dedup))
			}

			if exitMonitor != nil {
				opts = append(opts, gmaps.WithExitMonitor(exitMonitor))
			}

			if extraReviews {
				opts = append(opts, gmaps.WithExtraReviews())
			}

			job := gmaps.NewGmapJob(
				cellID,
				langCode,
				queryText,
				maxDepth,
				email,
				cell.GeoCoordinates(),
				zoom,
				opts...,
			)

			jobs = append(jobs, job)
		}
	}

	return jobs, nil
}

// query holds a parsed input line.
type query struct {
	text string
	id   string
}

// readQueries reads all non-empty lines from r and parses optional custom IDs
// using the "#!#" delimiter (same format as CreateSeedJobs).
func readQueries(r io.Reader) ([]query, error) {
	var queries []query

	scanner := bufio.NewScanner(r)

	for scanner.Scan() {
		q, ok, parseErr := parseQueryLine(scanner.Text())
		if parseErr != nil {
			return nil, parseErr
		}

		if !ok {
			continue
		}

		queries = append(queries, q)
	}

	return queries, scanner.Err()
}

func parseQueryLine(line string) (query, bool, error) {
	line = strings.TrimSpace(line)
	if line == "" {
		return query{}, false, nil
	}

	var q query

	if before, after, ok := strings.Cut(line, "#!#"); ok {
		q.text = strings.TrimSpace(before)
		q.id = strings.TrimSpace(after)
	} else {
		q.text = line
	}

	if q.text == "" {
		return query{}, false, fmt.Errorf("invalid query line %q: empty query text", line)
	}

	return q, true, nil
}

func LoadCustomWriter(pluginDir, pluginName string) (scrapemate.ResultWriter, error) {
	files, err := os.ReadDir(pluginDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read plugin directory: %w", err)
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		if filepath.Ext(file.Name()) != ".so" && filepath.Ext(file.Name()) != ".dll" {
			continue
		}

		pluginPath := filepath.Join(pluginDir, file.Name())

		p, err := plugin.Open(pluginPath)
		if err != nil {
			return nil, fmt.Errorf("failed to open plugin %s: %w", file.Name(), err)
		}

		symWriter, err := p.Lookup(pluginName)
		if err != nil {
			return nil, fmt.Errorf("failed to lookup symbol %s: %w", pluginName, err)
		}

		writer, ok := symWriter.(*scrapemate.ResultWriter)
		if !ok {
			return nil, fmt.Errorf("unexpected type %T from writer symbol in plugin %s", symWriter, file.Name())
		}

		return *writer, nil
	}

	return nil, fmt.Errorf("no plugin found in %s", pluginDir)
}
