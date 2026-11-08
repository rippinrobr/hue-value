// Package server routes HTTP requests to the API's handlers.
package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"runtime/debug"
	"time"

	"github.com/rippinrobr/hue-value/api/internal/apigen"
	"github.com/rippinrobr/hue-value/api/internal/catalog"
	"github.com/rippinrobr/hue-value/api/internal/config"
)

// New returns the API's handler, with request logging and panic recovery around it. The routes
// come from openapi.yaml, through the generated apigen package.
func New(cfg config.Config, log *slog.Logger, cat *catalog.Catalog) http.Handler {
	mux := http.NewServeMux()
	badRequest := func(w http.ResponseWriter, r *http.Request, err error) {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
	}
	strict := apigen.NewStrictHandlerWithOptions(&handlers{cfg: cfg, cat: cat}, nil,
		apigen.StrictHTTPServerOptions{
			RequestErrorHandlerFunc: badRequest,
			ResponseErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				log.Error("handler failed", "path", r.URL.Path, "error", err)
				writeError(w, http.StatusInternalServerError, "internal", "Something went wrong.")
			},
		})
	apigen.HandlerWithOptions(strict, apigen.StdHTTPServerOptions{BaseRouter: mux, ErrorHandlerFunc: badRequest})
	return recoverPanics(log, logRequests(log, jsonMisses(mux)))
}

// jsonMisses answers addresses and methods the router doesn't know with a JSON error,
// keeping the router's own choice between 404 and 405 and its Allow header.
func jsonMisses(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, pattern := mux.Handler(r); pattern != "" {
			mux.ServeHTTP(w, r)
			return
		}
		probe := httptest.NewRecorder()
		mux.ServeHTTP(probe, r)
		if allow := probe.Header().Get("Allow"); allow != "" {
			w.Header().Set("Allow", allow)
		}
		if probe.Code == http.StatusMethodNotAllowed {
			writeError(w, probe.Code, "method_not_allowed", "That method isn't allowed here.")
			return
		}
		writeError(w, http.StatusNotFound, "not_found", "No such address.")
	})
}

// Error is the body of every error response.
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, Error{Code: code, Message: message})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

type recorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *recorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *recorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(b)
	r.bytes += n
	return n, err
}

func logRequests(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &recorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		log.LogAttrs(r.Context(), slog.LevelInfo, "request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", rec.status),
			slog.Int("bytes", rec.bytes),
			slog.Duration("took", time.Since(start)),
		)
	})
}

func recoverPanics(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				log.Error("panic", "path", r.URL.Path, "error", v, "stack", string(debug.Stack()))
				writeError(w, http.StatusInternalServerError, "internal", "Something went wrong.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
