package store

import (
	"context"
	"errors"
	"path/filepath"
	"reflect"
	"testing"
	"testing/fstest"

	"github.com/rippinrobr/hue-value/api/internal/catalog"
)

var dataDir = filepath.Join("..", "..", "..", "data")

func open(t *testing.T) *Store {
	t.Helper()
	s, err := Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestMigrationsRunOnce(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "test.db")
	for i := 0; i < 2; i++ {
		s, err := Open(ctx, path)
		if err != nil {
			t.Fatalf("open %d: %v", i, err)
		}
		v, err := s.Version(ctx)
		if err != nil || v != 1 {
			t.Fatalf("open %d: version %d, err %v", i, v, err)
		}
		s.Close()
	}
}

func TestMigrateRefusesBadNames(t *testing.T) {
	s := open(t)
	for _, files := range []fstest.MapFS{
		{"first.sql": {Data: []byte("SELECT 1")}},
		{"0002_a.sql": {Data: []byte("SELECT 1")}, "0002_b.sql": {Data: []byte("SELECT 1")}},
	} {
		if err := s.Migrate(context.Background(), files); err == nil {
			t.Errorf("%v: no error", files)
		}
	}
}

func TestAFailedMigrationLeavesNothing(t *testing.T) {
	s := open(t)
	ctx := context.Background()
	err := s.Migrate(ctx, fstest.MapFS{
		"0002_half.sql": {Data: []byte("CREATE TABLE half (x INTEGER); SELECT nope FROM nowhere;")},
	})
	if err == nil {
		t.Fatal("no error")
	}
	if v, _ := s.Version(ctx); v != 1 {
		t.Errorf("version %d after a failed migration", v)
	}
	var n int
	_ = s.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM sqlite_master WHERE name = 'half'`).Scan(&n)
	if n != 0 {
		t.Error("the failed migration's table was kept")
	}
}

func TestEmptyCatalog(t *testing.T) {
	if _, err := open(t).LoadCatalog(context.Background()); !errors.Is(err, ErrNoCatalog) {
		t.Fatalf("err %v, want ErrNoCatalog", err)
	}
}

func TestSeedRoundTrips(t *testing.T) {
	want, err := catalog.Load(dataDir)
	if err != nil {
		t.Fatal(err)
	}
	s := open(t)
	ctx := context.Background()
	// Twice, because seeding replaces what is there.
	for i := 0; i < 2; i++ {
		if err := s.SeedCatalog(ctx, want); err != nil {
			t.Fatal(err)
		}
	}
	got, err := s.LoadCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(got.Brands, want.Brands) || !reflect.DeepEqual(got.Lines, want.Lines) ||
		!reflect.DeepEqual(got.Pigments, want.Pigments) {
		t.Fatal("brands, lines or pigments changed on the way through the database")
	}
	if len(got.Items) != len(want.Items) {
		t.Fatalf("%d items, want %d", len(got.Items), len(want.Items))
	}
	for i := range want.Items {
		if !reflect.DeepEqual(got.Items[i], want.Items[i]) {
			t.Fatalf("item %d\n got %+v\nwant %+v", i, got.Items[i], want.Items[i])
		}
	}
}

func TestForeignKeysAreOn(t *testing.T) {
	s := open(t)
	_, err := s.DB.Exec(`INSERT INTO product_lines (id, brand_id, name, label, medium, white, position)
		VALUES ('x', 'no-such-brand', 'X', 'X', 'oil', 'White', 0)`)
	if err == nil {
		t.Fatal("a line with no brand was accepted")
	}
}
