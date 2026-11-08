// Package store keeps the API's data in SQLite.
package store

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite" // the pure-Go SQLite driver, registered as "sqlite"

	"github.com/rippinrobr/hue-value/api/migrations"
)

// Store is the database.
type Store struct {
	DB *sql.DB
}

// Open opens or creates the database file at path and brings it up to date. ":memory:" makes
// a private in-memory database, for tests.
func Open(ctx context.Context, path string) (*Store, error) {
	q := url.Values{}
	for _, p := range []string{"foreign_keys(1)", "busy_timeout(5000)", "journal_mode(WAL)", "synchronous(NORMAL)"} {
		q.Add("_pragma", p)
	}
	dsn := "file:" + path + "?" + q.Encode()
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	if path == ":memory:" {
		// Each connection to :memory: is its own database, so keep to one.
		db.SetMaxOpenConns(1)
	}
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	s := &Store{DB: db}
	if err := s.Migrate(ctx, migrations.FS); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

// Close closes the database.
func (s *Store) Close() error { return s.DB.Close() }

// Migrate applies, in order, each numbered .sql file in files that hasn't run yet. Each runs
// in its own transaction with its record in schema_migrations.
func (s *Store) Migrate(ctx context.Context, files fs.FS) error {
	if _, err := s.DB.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version    INTEGER PRIMARY KEY,
		name       TEXT NOT NULL,
		applied_at TEXT NOT NULL
	) STRICT`); err != nil {
		return err
	}
	names, err := fs.Glob(files, "*.sql")
	if err != nil {
		return err
	}
	type migration struct {
		version int
		name    string
	}
	var list []migration
	seen := map[int]string{}
	for _, name := range names {
		number, _, ok := strings.Cut(name, "_")
		v, err := strconv.Atoi(number)
		if !ok || err != nil || v < 1 {
			return fmt.Errorf("migration %s: names start with a number and an underscore", name)
		}
		if other, dup := seen[v]; dup {
			return fmt.Errorf("migrations %s and %s share number %d", other, name, v)
		}
		seen[v] = name
		list = append(list, migration{v, name})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].version < list[j].version })

	applied := map[int]bool{}
	rows, err := s.DB.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			rows.Close()
			return err
		}
		applied[v] = true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	for _, m := range list {
		if applied[m.version] {
			continue
		}
		body, err := fs.ReadFile(files, m.name)
		if err != nil {
			return err
		}
		tx, err := s.DB.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, string(body)); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %s: %w", m.name, err)
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`,
			m.version, m.name, time.Now().UTC().Format(time.RFC3339)); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

// Version returns the number of the newest migration applied.
func (s *Store) Version(ctx context.Context) (int, error) {
	var v sql.NullInt64
	err := s.DB.QueryRowContext(ctx, `SELECT MAX(version) FROM schema_migrations`).Scan(&v)
	return int(v.Int64), err
}
