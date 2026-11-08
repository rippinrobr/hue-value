package server

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/rippinrobr/hue-value/api/internal/catalog"
	"github.com/rippinrobr/hue-value/api/internal/config"
)

var (
	catOnce sync.Once
	cat     *catalog.Catalog
	catErr  error
)

func testCatalog(t *testing.T) *catalog.Catalog {
	t.Helper()
	catOnce.Do(func() { cat, catErr = catalog.Load(filepath.Join("..", "..", "..", "data")) })
	if catErr != nil {
		t.Fatal(catErr)
	}
	return cat
}

func newTestServer(t *testing.T) (http.Handler, *bytes.Buffer) {
	t.Helper()
	var logs bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&logs, nil))
	cfg := config.Config{Env: "local", Version: "test"}
	return New(cfg, log, testCatalog(t)), &logs
}

// get calls the server and decodes a JSON body into out.
func get(t *testing.T, h http.Handler, method, path string, out any) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("%s %s: Content-Type %q, body %s", method, path, ct, rec.Body)
	}
	if out != nil {
		if err := json.Unmarshal(rec.Body.Bytes(), out); err != nil {
			t.Fatalf("%s %s: %v in %s", method, path, err, rec.Body)
		}
	}
	return rec
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func TestHealth(t *testing.T) {
	h, logs := newTestServer(t)
	var body struct{ Status, Version, Env string }
	rec := get(t, h, http.MethodGet, "/v1/health", &body)
	if rec.Code != http.StatusOK || body.Status != "ok" || body.Version != "test" || body.Env != "local" {
		t.Fatalf("status %d, body %+v", rec.Code, body)
	}
	if !strings.Contains(logs.String(), `"path":"/v1/health"`) || !strings.Contains(logs.String(), `"status":200`) {
		t.Errorf("request not logged: %s", logs.String())
	}
}

func TestBrandsAndLines(t *testing.T) {
	h, _ := newTestServer(t)
	var brands struct {
		Brands []struct {
			ID    string `json:"id"`
			Name  string `json:"name"`
			Lines []struct {
				ID        string `json:"id"`
				ItemCount int    `json:"itemCount"`
				Medium    string `json:"medium"`
			} `json:"lines"`
		} `json:"brands"`
	}
	get(t, h, http.MethodGet, "/v1/brands", &brands)
	if len(brands.Brands) != 2 || brands.Brands[0].Name != "Winsor & Newton" ||
		len(brands.Brands[0].Lines) != 1 || brands.Brands[0].Lines[0].ItemCount != 36 ||
		brands.Brands[0].Lines[0].Medium != "water-mixable oil" {
		t.Errorf("brands %+v", brands)
	}

	var lines struct {
		Lines []struct{ ID string } `json:"lines"`
	}
	get(t, h, http.MethodGet, "/v1/lines?brand=royal-talens", &lines)
	if len(lines.Lines) != 1 || lines.Lines[0].ID != "cobra" {
		t.Errorf("royal-talens lines %+v", lines)
	}
	var line struct {
		Label     string `json:"label"`
		ItemCount int    `json:"itemCount"`
	}
	get(t, h, http.MethodGet, "/v1/lines/cobra", &line)
	if line.Label != "Cobra" || line.ItemCount != 92 {
		t.Errorf("cobra %+v", line)
	}
	var missing errorBody
	if rec := get(t, h, http.MethodGet, "/v1/lines/nope", &missing); rec.Code != 404 || missing.Code != "not_found" {
		t.Errorf("missing line: %d %+v", rec.Code, missing)
	}
}

func TestItems(t *testing.T) {
	h, _ := newTestServer(t)
	var all struct {
		Items []struct {
			ID     string    `json:"id"`
			Family string    `json:"family"`
			Rgb    []float64 `json:"rgb"`
			Recipe *[]any    `json:"recipe"`
		} `json:"items"`
	}
	get(t, h, http.MethodGet, "/v1/lines/artisan/items", &all)
	if len(all.Items) != 36 || all.Items[0].ID != "lemon-yellow" || len(all.Items[0].Rgb) != 3 {
		t.Fatalf("artisan items: %d, first %+v", len(all.Items), all.Items[0])
	}
	handSet := 0
	for _, it := range all.Items {
		if it.Recipe == nil {
			handSet++
		}
	}
	if handSet == 0 {
		t.Error("no paint came back with a null recipe")
	}

	var blues struct {
		Items []struct{ Family string } `json:"items"`
	}
	get(t, h, http.MethodGet, "/v1/lines/cobra/items?family=blue", &blues)
	if len(blues.Items) == 0 {
		t.Error("no cobra blues")
	}
	for _, it := range blues.Items {
		if it.Family != "blue" {
			t.Errorf("family filter let through %q", it.Family)
		}
	}

	var one struct {
		Name string `json:"name"`
		Code string `json:"code"`
	}
	get(t, h, http.MethodGet, "/v1/lines/artisan/items/french-ultramarine", &one)
	if one.Name != "French Ultramarine" || one.Code != "PB29" {
		t.Errorf("french-ultramarine %+v", one)
	}
	if rec := get(t, h, http.MethodGet, "/v1/lines/artisan/items/nope", nil); rec.Code != 404 {
		t.Errorf("missing item: %d", rec.Code)
	}
	if rec := get(t, h, http.MethodGet, "/v1/lines/nope/items", nil); rec.Code != 404 {
		t.Errorf("items of a missing line: %d", rec.Code)
	}
}

func TestSearch(t *testing.T) {
	h, _ := newTestServer(t)
	type result struct {
		Intro  string `json:"intro"`
		Groups []struct {
			Title string `json:"title"`
			Items []struct {
				Line     string `json:"line"`
				Name     string `json:"name"`
				ShowLine bool   `json:"showLine"`
			} `json:"items"`
		} `json:"groups"`
	}
	var r result
	get(t, h, http.MethodGet, "/v1/items/search?q=PB29", &r)
	if len(r.Groups) == 0 || r.Groups[0].Title != "Same pigments · 2" ||
		r.Groups[0].Items[0].Name != "French Ultramarine" || !r.Groups[0].Items[0].ShowLine {
		t.Errorf("PB29: %+v", r)
	}
	// The same answer the catalog gives, which the golden cases hold to the app.
	want := testCatalog(t).Search("phthalo PB15", "cobra")
	var p result
	get(t, h, http.MethodGet, "/v1/items/search?q=phthalo+PB15&line=cobra", &p)
	if p.Intro != want.Intro || len(p.Groups) != len(want.Groups) {
		t.Errorf("phthalo PB15: %+v, want %+v", p, want)
	}
	if rec := get(t, h, http.MethodGet, "/v1/items/search?q=&line=nope", nil); rec.Code != 404 {
		t.Errorf("unknown line: %d", rec.Code)
	}
	var empty struct {
		Groups []any `json:"groups"`
	}
	get(t, h, http.MethodGet, "/v1/items/search?q=zzzz", &empty)
	if empty.Groups == nil {
		t.Error("no matches should give an empty list, not null")
	}
}

func TestPigments(t *testing.T) {
	h, _ := newTestServer(t)
	var list struct {
		Pigments []struct {
			Code string    `json:"code"`
			Rgb  []float64 `json:"rgb"`
		} `json:"pigments"`
	}
	get(t, h, http.MethodGet, "/v1/pigments", &list)
	if len(list.Pigments) != 59 || list.Pigments[0].Code != "PW6" {
		t.Errorf("%d pigments, first %+v", len(list.Pigments), list.Pigments[0])
	}
	var pb29 struct {
		Code  string                            `json:"code"`
		Items []struct{ Line, ID, Name string } `json:"items"`
	}
	get(t, h, http.MethodGet, "/v1/pigments/PB29", &pb29)
	if pb29.Code != "PB29" || len(pb29.Items) == 0 {
		t.Errorf("PB29 %+v", pb29)
	}
	if rec := get(t, h, http.MethodGet, "/v1/pigments/PZ1", nil); rec.Code != 404 {
		t.Errorf("missing pigment: %d", rec.Code)
	}
}

func TestHealthOnlyAnswersGet(t *testing.T) {
	h, _ := newTestServer(t)
	var body errorBody
	rec := get(t, h, http.MethodPost, "/v1/health", &body)
	if rec.Code != http.StatusMethodNotAllowed || body.Code != "method_not_allowed" || rec.Header().Get("Allow") == "" {
		t.Fatalf("status %d, body %+v, Allow %q", rec.Code, body, rec.Header().Get("Allow"))
	}
}

func TestUnknownAddress(t *testing.T) {
	h, _ := newTestServer(t)
	var body errorBody
	if rec := get(t, h, http.MethodGet, "/v1/nope", &body); rec.Code != http.StatusNotFound || body.Code != "not_found" {
		t.Errorf("status %d, body %+v", rec.Code, body)
	}
}

func TestPanicBecomes500(t *testing.T) {
	var logs bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&logs, nil))
	h := recoverPanics(log, http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") }))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status %d, want 500", rec.Code)
	}
	if !strings.Contains(logs.String(), "boom") {
		t.Errorf("panic not logged")
	}
}
