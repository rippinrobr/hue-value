// Package catalog holds the brands, product lines, paints and pigments, read from the seed
// files in data/ that the app bundles too.
package catalog

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// Brand is a paint maker.
type Brand struct {
	ID   string
	Name string
}

// Line is a brand's product line, such as W&N Artisan.
type Line struct {
	ID     string
	Brand  string // the brand's ID
	Name   string
	Label  string
	Medium string
	White  string
}

// PigmentPart is one pigment in an item's recipe.
type PigmentPart struct {
	Code  string  `json:"code"`
	Parts float64 `json:"parts"`
}

// Item is one paint in a line.
type Item struct {
	Line     string
	ID       string
	Name     string
	Label    string
	Family   string
	Code     string
	RGB      [3]float64
	Strength float64
	PureL    float64
	Hue      float64
	Chroma   float64
	Near     *string
	Comp     *string
	Note     *string
	Favorite *int
	// Recipe is nil when the color was set by hand.
	Recipe []PigmentPart
}

// Pigment is one entry of the mixing model's pigment library.
type Pigment struct {
	Code     string
	RGB      [3]float64
	Strength float64
}

// Catalog is everything, in seed-file order.
type Catalog struct {
	Brands   []Brand
	Lines    []Line
	Items    []Item // grouped by line, in each line's order
	Pigments []Pigment
}

// LineItems returns a line's paints in order.
func (c *Catalog) LineItems(line string) []Item {
	var out []Item
	for _, it := range c.Items {
		if it.Line == line {
			out = append(out, it)
		}
	}
	return out
}

// HasLine reports whether a line exists.
func (c *Catalog) HasLine(id string) bool {
	for _, l := range c.Lines {
		if l.ID == id {
			return true
		}
	}
	return false
}

// Families lists the color families in the order the app shows them, with their titles.
var Families = [][2]string{
	{"blue", "Blues"},
	{"green", "Greens"},
	{"yellow", "Yellows"},
	{"orange", "Oranges"},
	{"red", "Reds"},
	{"pink", "Pinks and magentas"},
	{"violet", "Violets"},
	{"earth", "Earths"},
	{"gray", "Grays and blacks"},
}

type seedLine struct {
	Brand  string `json:"brand"`
	Line   string `json:"line"`
	Medium string `json:"medium"`
	Label  string `json:"label"`
	White  string `json:"white"`
}

type seedItem struct {
	Name   string            `json:"name"`
	Family string            `json:"family"`
	Code   string            `json:"code"`
	ID     string            `json:"id"`
	Fav    *int              `json:"fav"`
	RGB    [3]float64        `json:"rgb"`
	S      float64           `json:"s"`
	Near   *string           `json:"near"`
	Comp   *string           `json:"comp"`
	Note   *string           `json:"note"`
	Label  string            `json:"label"`
	PureL  float64           `json:"pureL"`
	Hue    float64           `json:"hue"`
	Chroma float64           `json:"chroma"`
	Recipe []json.RawMessage `json:"recipe"`
}

type seedPigment struct {
	RGB [3]float64 `json:"rgb"`
	S   float64    `json:"s"`
}

// Load reads brands.json, paints.json and pigments.json from dir. The files are objects keyed
// by line or code, so their order is read from the JSON itself.
func Load(dir string) (*Catalog, error) {
	c := &Catalog{}
	var lineOrder []string
	lines := map[string]seedLine{}
	if err := readOrdered(filepath.Join(dir, "brands.json"), &lineOrder, &lines); err != nil {
		return nil, err
	}
	seenBrand := map[string]bool{}
	for _, id := range lineOrder {
		l := lines[id]
		brand := slug(l.Brand)
		if !seenBrand[brand] {
			seenBrand[brand] = true
			c.Brands = append(c.Brands, Brand{ID: brand, Name: l.Brand})
		}
		c.Lines = append(c.Lines, Line{ID: id, Brand: brand, Name: l.Line, Label: l.Label, Medium: l.Medium, White: l.White})
	}

	var paintOrder []string
	paints := map[string][]seedItem{}
	if err := readOrdered(filepath.Join(dir, "paints.json"), &paintOrder, &paints); err != nil {
		return nil, err
	}
	for _, line := range lineOrder {
		list, ok := paints[line]
		if !ok {
			return nil, fmt.Errorf("paints.json has no paints for line %q", line)
		}
		for _, s := range list {
			it := Item{
				Line: line, ID: s.ID, Name: s.Name, Label: s.Label, Family: s.Family, Code: s.Code,
				RGB: s.RGB, Strength: s.S, PureL: s.PureL, Hue: s.Hue, Chroma: s.Chroma,
				Near: s.Near, Comp: s.Comp, Note: s.Note, Favorite: s.Fav,
			}
			if s.Recipe != nil {
				it.Recipe = []PigmentPart{}
				for _, raw := range s.Recipe {
					var pair []json.RawMessage
					if err := json.Unmarshal(raw, &pair); err != nil || len(pair) != 2 {
						return nil, fmt.Errorf("%s/%s: recipe entries are [code, parts]", line, s.ID)
					}
					var part PigmentPart
					if err := json.Unmarshal(pair[0], &part.Code); err != nil {
						return nil, err
					}
					if err := json.Unmarshal(pair[1], &part.Parts); err != nil {
						return nil, err
					}
					it.Recipe = append(it.Recipe, part)
				}
			}
			c.Items = append(c.Items, it)
		}
	}
	for _, line := range paintOrder {
		if !c.HasLine(line) {
			return nil, fmt.Errorf("paints.json has paints for unknown line %q", line)
		}
	}

	var pigmentOrder []string
	pigments := map[string]seedPigment{}
	if err := readOrdered(filepath.Join(dir, "pigments.json"), &pigmentOrder, &pigments); err != nil {
		return nil, err
	}
	for _, code := range pigmentOrder {
		p := pigments[code]
		c.Pigments = append(c.Pigments, Pigment{Code: code, RGB: p.RGB, Strength: p.S})
	}
	return c, c.check()
}

// check catches seed mistakes that the database's keys would also refuse.
func (c *Catalog) check() error {
	pigments := map[string]bool{}
	for _, p := range c.Pigments {
		pigments[p.Code] = true
	}
	families := map[string]bool{}
	for _, f := range Families {
		families[f[0]] = true
	}
	seen := map[string]bool{}
	for _, it := range c.Items {
		key := it.Line + "/" + it.ID
		if it.ID == "" || seen[key] {
			return fmt.Errorf("item %q is missing or repeated", key)
		}
		seen[key] = true
		if !families[it.Family] {
			return fmt.Errorf("%s: unknown family %q", key, it.Family)
		}
		for _, p := range it.Recipe {
			if !pigments[p.Code] {
				return fmt.Errorf("%s: unknown pigment %q", key, p.Code)
			}
		}
	}
	for _, it := range c.Items {
		for _, ref := range []*string{it.Near, it.Comp} {
			if ref != nil && !seen[it.Line+"/"+*ref] {
				return fmt.Errorf("%s/%s: points at missing paint %q", it.Line, it.ID, *ref)
			}
		}
	}
	return nil
}

// readOrdered decodes a JSON object into into, and its keys in file order into keys.
func readOrdered(path string, keys *[]string, into any) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, into); err != nil {
		return fmt.Errorf("%s: %w", filepath.Base(path), err)
	}
	var obj orderedKeys
	if err := json.Unmarshal(b, &obj); err != nil {
		return fmt.Errorf("%s: %w", filepath.Base(path), err)
	}
	*keys = obj
	return nil
}

type orderedKeys []string

func (k *orderedKeys) UnmarshalJSON(b []byte) error {
	dec := json.NewDecoder(strings.NewReader(string(b)))
	if t, err := dec.Token(); err != nil || t != json.Delim('{') {
		return fmt.Errorf("expected an object")
	}
	for dec.More() {
		t, err := dec.Token()
		if err != nil {
			return err
		}
		*k = append(*k, t.(string))
		var skip json.RawMessage
		if err := dec.Decode(&skip); err != nil {
			return err
		}
	}
	return nil
}

var nonWord = regexp.MustCompile(`[^a-z0-9]+`)

// slug turns "Winsor & Newton" into "winsor-newton".
func slug(s string) string {
	return strings.Trim(nonWord.ReplaceAllString(strings.ToLower(s), "-"), "-")
}
