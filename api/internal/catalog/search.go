package catalog

import (
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

// The same search as the app's color picker (app/src/lib/engine/search.ts), held to the same
// golden cases.

// SearchItem is one paint in the results.
type SearchItem struct {
	Line     string `json:"line"`
	ID       string `json:"id"`
	Name     string `json:"name"`
	Meta     string `json:"meta"`
	ShowLine bool   `json:"showLine"`
}

// SearchGroup is a titled run of results.
type SearchGroup struct {
	Title string       `json:"title"`
	Items []SearchItem `json:"items"`
}

// SearchResult is what a search returns.
type SearchResult struct {
	Intro  string        `json:"intro"`
	Groups []SearchGroup `json:"groups"`
}

// Pigment codes like PB29, PBk9, PBr7 or PR101, separated by spaces, commas, plus signs or
// nothing at all.
var (
	codeRE  = regexp.MustCompile(`(?i)P(?:BK|BR|[A-Z])\s?\d+(?::\d+)?`)
	splitRE = regexp.MustCompile(`[\s,;+&/]+`)
	flatRE  = regexp.MustCompile(`[\s,]`)
	spaceRE = regexp.MustCompile(`\s`)
)

func normCode(c string) string { return spaceRE.ReplaceAllString(strings.ToUpper(c), "") }

func codesIn(s string) []string {
	var out []string
	for _, m := range codeRE.FindAllString(s, -1) {
		if c := normCode(m); !slices.Contains(out, c) {
			out = append(out, c)
		}
	}
	return out
}

// value prints a paint's value on the 0 to 10 scale, as JavaScript's toFixed(1) does.
func value(it Item) string { return strconv.FormatFloat(it.PureL/10, 'f', 1, 64) }

// Search finds paints by name and pigment codes. With an empty query it browses line by family.
func (c *Catalog) Search(query, line string) SearchResult {
	raw := strings.TrimSpace(query)
	want := codesIn(raw)
	// Words left over once the codes are taken out narrow the results by name, e.g. "phthalo PB15".
	var words []string
	for _, w := range splitRE.Split(strings.ToLower(codeRE.ReplaceAllString(raw, " ")), -1) {
		if w != "" && w != "and" {
			words = append(words, w)
		}
	}
	if len(want) > 0 {
		return c.byPigment(want, words)
	}

	q := strings.ToLower(raw)
	flat := func(v string) string { return flatRE.ReplaceAllString(strings.ToLower(v), "") }
	var list []Item
	for _, it := range c.Items {
		if q == "" && it.Line != line {
			continue
		}
		if q == "" || strings.Contains(strings.ToLower(it.Name), q) || strings.Contains(flat(it.Code), flat(q)) {
			list = append(list, it)
		}
	}
	if len(list) == 0 {
		return SearchResult{
			Intro:  "No color in either brand matches that. Try part of the name, or pigment codes like PB29 PG7.",
			Groups: []SearchGroup{},
		}
	}
	groups := []SearchGroup{}
	for _, f := range Families {
		var items []Item
		for _, it := range list {
			if it.Family == f[0] {
				items = append(items, it)
			}
		}
		if len(items) == 0 {
			continue
		}
		slices.SortStableFunc(items, func(x, y Item) int {
			if d := compareNames(x.Name, y.Name); d != 0 {
				return d
			}
			return strings.Compare(x.Line, y.Line)
		})
		g := SearchGroup{Title: f[1]}
		for _, it := range items {
			g.Items = append(g.Items, SearchItem{
				Line: it.Line, ID: it.ID, Name: it.Name,
				Meta:     fmt.Sprintf("%s · value %s at full strength", it.Code, value(it)),
				ShowLine: q != "",
			})
		}
		groups = append(groups, g)
	}
	intro := ""
	if q != "" {
		es := "es"
		if len(list) == 1 {
			es = ""
		}
		intro = fmt.Sprintf("%d match%s in W&N Artisan and Cobra.", len(list), es)
	}
	return SearchResult{Intro: intro, Groups: groups}
}

func (c *Catalog) byPigment(want, words []string) SearchResult {
	type hit struct {
		it         Item
		hit, extra int
	}
	named := func(it Item) bool {
		name := strings.ToLower(it.Name)
		for _, w := range words {
			if !strings.Contains(name, w) {
				return false
			}
		}
		return true
	}
	tiers := make([][]hit, 3)
	for _, line := range c.Lines {
		for _, it := range c.LineItems(line.ID) {
			have := codesIn(it.Code)
			n := 0
			for _, w := range want {
				if slices.Contains(have, w) {
					n++
				}
			}
			if n == 0 || !named(it) {
				continue
			}
			tier := 2
			if n == len(want) {
				tier = 1
				if len(have) == len(want) {
					tier = 0
				}
			}
			tiers[tier] = append(tiers[tier], hit{it, n, len(have) - n})
		}
	}
	titles := []string{
		"Same pigments",
		"Has all of these pigments, plus others",
		"Shares some of these pigments",
	}
	nameBit := ""
	if len(words) > 0 {
		nameBit = ` with "` + strings.Join(words, " ") + `" in the name`
	}
	groups := []SearchGroup{}
	for t, list := range tiers {
		if len(list) == 0 {
			continue
		}
		slices.SortStableFunc(list, func(x, y hit) int {
			if x.hit != y.hit {
				return y.hit - x.hit
			}
			if x.extra != y.extra {
				return x.extra - y.extra
			}
			if d := compareNames(x.it.Name, y.it.Name); d != 0 {
				return d
			}
			return strings.Compare(x.it.Line, y.it.Line)
		})
		g := SearchGroup{Title: fmt.Sprintf("%s · %d", titles[t], len(list))}
		for _, r := range list {
			meta := r.it.Code
			if t == 2 {
				meta += fmt.Sprintf(" · shares %d of %d", r.hit, len(want))
			}
			g.Items = append(g.Items, SearchItem{
				Line: r.it.Line, ID: r.it.ID, Name: r.it.Name,
				Meta: meta + " · value " + value(r.it), ShowLine: true,
			})
		}
		groups = append(groups, g)
	}
	joined := strings.Join(want, " + ")
	intro := fmt.Sprintf("No paint in either brand contains %s%s. Check the spelling and codes, or try fewer of them.", joined, nameBit)
	if len(groups) > 0 {
		intro = fmt.Sprintf("Paints in both brands containing %s%s. Paints with the same pigments mix and tint very similarly.", joined, nameBit)
	}
	return SearchResult{Intro: intro, Groups: groups}
}

// compareNames orders names as the app's localeCompare does for these catalogs: letters before
// case, so "Cadmium red" and "Cadmium Red" sit together.
func compareNames(a, b string) int {
	if d := strings.Compare(strings.ToLower(a), strings.ToLower(b)); d != 0 {
		return d
	}
	return -strings.Compare(a, b)
}
