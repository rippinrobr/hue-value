package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/rippinrobr/hue-value/api/internal/catalog"
)

// ErrNoCatalog means the catalog tables are empty: run `server seed` first.
var ErrNoCatalog = errors.New("the catalog is empty; run `server seed` to load it from data/")

// SeedCatalog replaces the whole catalog with c, in one transaction.
func (s *Store) SeedCatalog(ctx context.Context, c *catalog.Catalog) error {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, table := range []string{"item_pigments", "items", "product_lines", "brands", "pigments"} {
		if _, err := tx.ExecContext(ctx, "DELETE FROM "+table); err != nil {
			return err
		}
	}
	for i, b := range c.Brands {
		if _, err := tx.ExecContext(ctx, `INSERT INTO brands (id, name, position) VALUES (?, ?, ?)`,
			b.ID, b.Name, i); err != nil {
			return err
		}
	}
	for i, l := range c.Lines {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO product_lines (id, brand_id, name, label, medium, white, position)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			l.ID, l.Brand, l.Name, l.Label, l.Medium, l.White, i); err != nil {
			return err
		}
	}
	for i, p := range c.Pigments {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO pigments (code, r, g, b, strength, position) VALUES (?, ?, ?, ?, ?, ?)`,
			p.Code, p.RGB[0], p.RGB[1], p.RGB[2], p.Strength, i); err != nil {
			return err
		}
	}
	item, err := tx.PrepareContext(ctx, `INSERT INTO items
		(line_id, id, name, label, family, code, r, g, b, strength, pure_l, hue, chroma,
		 near, comp, note, favorite, hand_set, position)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer item.Close()
	part, err := tx.PrepareContext(ctx, `INSERT INTO item_pigments
		(line_id, item_id, position, pigment_code, parts) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer part.Close()
	for i, it := range c.Items {
		handSet := 0
		if it.Recipe == nil {
			handSet = 1
		}
		if _, err := item.ExecContext(ctx, it.Line, it.ID, it.Name, it.Label, it.Family, it.Code,
			it.RGB[0], it.RGB[1], it.RGB[2], it.Strength, it.PureL, it.Hue, it.Chroma,
			it.Near, it.Comp, it.Note, it.Favorite, handSet, i); err != nil {
			return err
		}
		for j, p := range it.Recipe {
			if _, err := part.ExecContext(ctx, it.Line, it.ID, j, p.Code, p.Parts); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

// LoadCatalog reads the whole catalog, in seed order. It is small enough to keep in memory,
// so the server reads it once at startup.
func (s *Store) LoadCatalog(ctx context.Context) (*catalog.Catalog, error) {
	c := &catalog.Catalog{}
	rows, err := s.DB.QueryContext(ctx, `SELECT id, name FROM brands ORDER BY position`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var b catalog.Brand
		if err := rows.Scan(&b.ID, &b.Name); err != nil {
			rows.Close()
			return nil, err
		}
		c.Brands = append(c.Brands, b)
	}
	if err := closeRows(rows); err != nil {
		return nil, err
	}
	if len(c.Brands) == 0 {
		return nil, ErrNoCatalog
	}

	rows, err = s.DB.QueryContext(ctx,
		`SELECT id, brand_id, name, label, medium, white FROM product_lines ORDER BY position`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var l catalog.Line
		if err := rows.Scan(&l.ID, &l.Brand, &l.Name, &l.Label, &l.Medium, &l.White); err != nil {
			rows.Close()
			return nil, err
		}
		c.Lines = append(c.Lines, l)
	}
	if err := closeRows(rows); err != nil {
		return nil, err
	}

	rows, err = s.DB.QueryContext(ctx, `SELECT code, r, g, b, strength FROM pigments ORDER BY position`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var p catalog.Pigment
		if err := rows.Scan(&p.Code, &p.RGB[0], &p.RGB[1], &p.RGB[2], &p.Strength); err != nil {
			rows.Close()
			return nil, err
		}
		c.Pigments = append(c.Pigments, p)
	}
	if err := closeRows(rows); err != nil {
		return nil, err
	}

	recipes := map[[2]string][]catalog.PigmentPart{}
	rows, err = s.DB.QueryContext(ctx,
		`SELECT line_id, item_id, pigment_code, parts FROM item_pigments ORDER BY line_id, item_id, position`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var line, id string
		var p catalog.PigmentPart
		if err := rows.Scan(&line, &id, &p.Code, &p.Parts); err != nil {
			rows.Close()
			return nil, err
		}
		key := [2]string{line, id}
		recipes[key] = append(recipes[key], p)
	}
	if err := closeRows(rows); err != nil {
		return nil, err
	}

	rows, err = s.DB.QueryContext(ctx, `SELECT line_id, id, name, label, family, code, r, g, b,
		strength, pure_l, hue, chroma, near, comp, note, favorite, hand_set
		FROM items ORDER BY position`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var it catalog.Item
		var near, comp, note sql.NullString
		var fav sql.NullInt64
		var handSet int
		if err := rows.Scan(&it.Line, &it.ID, &it.Name, &it.Label, &it.Family, &it.Code,
			&it.RGB[0], &it.RGB[1], &it.RGB[2], &it.Strength, &it.PureL, &it.Hue, &it.Chroma,
			&near, &comp, &note, &fav, &handSet); err != nil {
			rows.Close()
			return nil, err
		}
		it.Near, it.Comp, it.Note = ptr(near), ptr(comp), ptr(note)
		if fav.Valid {
			v := int(fav.Int64)
			it.Favorite = &v
		}
		if handSet == 0 {
			it.Recipe = recipes[[2]string{it.Line, it.ID}]
			if it.Recipe == nil {
				it.Recipe = []catalog.PigmentPart{}
			}
		}
		c.Items = append(c.Items, it)
	}
	if err := closeRows(rows); err != nil {
		return nil, err
	}
	return c, nil
}

func ptr(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	return &v.String
}

func closeRows(rows *sql.Rows) error {
	err := rows.Err()
	if cerr := rows.Close(); err == nil {
		err = cerr
	}
	return err
}
