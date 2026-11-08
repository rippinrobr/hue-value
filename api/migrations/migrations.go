// Package migrations holds the database's numbered SQL migrations. Each runs once, in order,
// when the server starts. Never edit one that has shipped: add the next number instead.
package migrations

import "embed"

// FS holds the migration files, named like 0001_catalog.sql.
//
//go:embed *.sql
var FS embed.FS
