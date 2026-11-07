package server

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/rippinrobr/hue-value/api/internal/config"
)

func newTestServer(t *testing.T) (http.Handler, *bytes.Buffer) {
	t.Helper()
	var logs bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&logs, nil))
	cfg := config.Config{Env: "local", Version: "test"}
	return New(cfg, log), &logs
}

func TestHealth(t *testing.T) {
	h, logs := newTestServer(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/health", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type %q", got)
	}
	var body Health
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body != (Health{Status: "ok", Version: "test", Env: "local"}) {
		t.Errorf("body %+v", body)
	}
	if !strings.Contains(logs.String(), `"path":"/v1/health"`) || !strings.Contains(logs.String(), `"status":200`) {
		t.Errorf("request not logged: %s", logs.String())
	}
}

func TestHealthOnlyAnswersGet(t *testing.T) {
	h, _ := newTestServer(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/v1/health", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status %d, want 405", rec.Code)
	}
	if rec.Header().Get("Allow") == "" {
		t.Error("no Allow header")
	}
	var body Error
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil || body.Code != "method_not_allowed" {
		t.Errorf("body %+v, err %v", body, err)
	}
}

func TestUnknownAddress(t *testing.T) {
	h, _ := newTestServer(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/nope", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status %d, want 404", rec.Code)
	}
	var body Error
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil || body.Code != "not_found" {
		t.Errorf("body %+v, err %v", body, err)
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
