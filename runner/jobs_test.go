package runner_test

import (
	"strings"
	"testing"

	"github.com/gosom/google-maps-scraper/grid"
	"github.com/gosom/google-maps-scraper/runner"
)

func TestCreateGridSeedJobsRejectsInvalidZoom(t *testing.T) {
	t.Parallel()

	bbox := grid.BoundingBox{
		MinLat: 40.30,
		MinLon: -3.80,
		MaxLat: 40.50,
		MaxLon: -3.60,
	}

	_, err := runner.CreateGridSeedJobs(
		"en",
		strings.NewReader("coffee"),
		10,
		false,
		bbox,
		1.0,
		0,
		nil,
		nil,
		false,
	)
	if err == nil || !strings.Contains(err.Error(), "invalid zoom level") {
		t.Fatalf("expected invalid zoom level error, got %v", err)
	}
}

func TestCreateSeedJobsRejectsEmptyQueryBeforeCustomID(t *testing.T) {
	t.Parallel()

	_, err := runner.CreateSeedJobs(
		false,
		"en",
		strings.NewReader("  #!#my-id\n"),
		10,
		false,
		"",
		15,
		10000,
		nil,
		nil,
		false,
	)
	if err == nil || !strings.Contains(err.Error(), "empty query text") {
		t.Fatalf("expected empty query text error, got %v", err)
	}
}

func TestCreateSeedJobsFastModeDepth1EmitsSingleJob(t *testing.T) {
	t.Parallel()

	jobs, err := runner.CreateSeedJobs(
		true,
		"br",
		strings.NewReader("assistência técnica de celular em Fortaleza, CE"),
		1,
		false,
		"-3.79,-38.53",
		15,
		10000,
		nil,
		nil,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(jobs) != 1 {
		t.Fatalf("expected 1 job for depth 1, got %d", len(jobs))
	}
}

func TestCreateSeedJobsFastModeDepth3EmitsGrid(t *testing.T) {
	t.Parallel()

	jobs, err := runner.CreateSeedJobs(
		true,
		"br",
		strings.NewReader("assistência técnica de celular em Fortaleza, CE"),
		3,
		false,
		"-3.79,-38.53",
		15,
		10000,
		nil,
		nil,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Depth 3 tiling a 20km-wide area into ~2.2km cells should produce ~9 jobs.
	if len(jobs) < 4 {
		t.Fatalf("expected a grid of sub-jobs for depth 3, got %d", len(jobs))
	}
}

func TestCreateGridSeedJobsRejectsEmptyQueryBeforeCustomID(t *testing.T) {
	t.Parallel()

	bbox := grid.BoundingBox{
		MinLat: 40.30,
		MinLon: -3.80,
		MaxLat: 40.50,
		MaxLon: -3.60,
	}

	_, err := runner.CreateGridSeedJobs(
		"en",
		strings.NewReader(" #!#my-id\n"),
		10,
		false,
		bbox,
		1.0,
		15,
		nil,
		nil,
		false,
	)
	if err == nil || !strings.Contains(err.Error(), "empty query text") {
		t.Fatalf("expected empty query text error, got %v", err)
	}
}
