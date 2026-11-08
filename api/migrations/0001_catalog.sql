-- The catalog: brands, their product lines, the pigment library, and each line's paints.
-- Seeded from data/ by `server seed`. Position keeps the seed files' order.

CREATE TABLE brands (
	id       TEXT PRIMARY KEY,
	name     TEXT NOT NULL,
	position INTEGER NOT NULL
) STRICT;

CREATE TABLE product_lines (
	id       TEXT PRIMARY KEY,
	brand_id TEXT NOT NULL REFERENCES brands (id),
	name     TEXT NOT NULL,
	label    TEXT NOT NULL,
	medium   TEXT NOT NULL,
	white    TEXT NOT NULL,
	position INTEGER NOT NULL
) STRICT;

CREATE TABLE pigments (
	code     TEXT PRIMARY KEY,
	r        REAL NOT NULL,
	g        REAL NOT NULL,
	b        REAL NOT NULL,
	strength REAL NOT NULL,
	position INTEGER NOT NULL
) STRICT;

CREATE TABLE items (
	line_id  TEXT NOT NULL REFERENCES product_lines (id),
	id       TEXT NOT NULL,
	name     TEXT NOT NULL,
	label    TEXT NOT NULL,
	family   TEXT NOT NULL CHECK (family IN
		('blue', 'green', 'yellow', 'orange', 'red', 'pink', 'violet', 'earth', 'gray')),
	code     TEXT NOT NULL,
	r        REAL NOT NULL,
	g        REAL NOT NULL,
	b        REAL NOT NULL,
	strength REAL NOT NULL,
	pure_l   REAL NOT NULL,
	hue      REAL NOT NULL,
	chroma   REAL NOT NULL,
	near     TEXT,
	comp     TEXT,
	note     TEXT,
	favorite INTEGER,
	-- 1 when the color was set by hand, so it has no pigment recipe.
	hand_set INTEGER NOT NULL CHECK (hand_set IN (0, 1)),
	position INTEGER NOT NULL,
	PRIMARY KEY (line_id, id)
) STRICT;

CREATE TABLE item_pigments (
	line_id      TEXT NOT NULL,
	item_id      TEXT NOT NULL,
	position     INTEGER NOT NULL,
	pigment_code TEXT NOT NULL REFERENCES pigments (code),
	parts        REAL NOT NULL,
	PRIMARY KEY (line_id, item_id, position),
	FOREIGN KEY (line_id, item_id) REFERENCES items (line_id, id) ON DELETE CASCADE
) STRICT;

CREATE INDEX item_pigments_by_pigment ON item_pigments (pigment_code);
