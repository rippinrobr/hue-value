package catalog

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

// The repo's seed files and the app's golden search cases.
var (
	dataDir     = filepath.Join("..", "..", "..", "data")
	searchCases = filepath.Join("..", "..", "..", "app", "tests", "golden", "cases", "search.json")
)

func load(t *testing.T) *Catalog {
	t.Helper()
	c, err := Load(dataDir)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestLoad(t *testing.T) {
	c := load(t)
	if len(c.Brands) != 2 || c.Brands[0] != (Brand{ID: "winsor-newton", Name: "Winsor & Newton"}) ||
		c.Brands[1].ID != "royal-talens" {
		t.Errorf("brands %+v", c.Brands)
	}
	if len(c.Lines) != 2 || c.Lines[0].ID != "artisan" || c.Lines[1].ID != "cobra" ||
		c.Lines[1].Brand != "royal-talens" || c.Lines[0].White != "Titanium White" {
		t.Errorf("lines %+v", c.Lines)
	}
	if n := len(c.LineItems("artisan")); n != 36 {
		t.Errorf("artisan has %d paints, want 36", n)
	}
	if n := len(c.LineItems("cobra")); n != 92 {
		t.Errorf("cobra has %d paints, want 92", n)
	}
	if len(c.Pigments) != 59 || c.Pigments[0].Code != "PW6" {
		t.Errorf("%d pigments, first %+v", len(c.Pigments), c.Pigments[0])
	}
	first := c.Items[0]
	if first.ID != "lemon-yellow" || first.Recipe[0] != (PigmentPart{"PY3", 1}) || *first.Near != "olive-green" {
		t.Errorf("first paint %+v", first)
	}
}

func TestLoadRefusesBrokenSeeds(t *testing.T) {
	dir := t.TempDir()
	for _, f := range []string{"brands.json", "pigments.json"} {
		b, _ := os.ReadFile(filepath.Join(dataDir, f))
		_ = os.WriteFile(filepath.Join(dir, f), b, 0o600)
	}
	broken := `{"artisan":[{"id":"x","name":"X","family":"blue","code":"PB29","recipe":[["PZZ",1]]}],"cobra":[]}`
	_ = os.WriteFile(filepath.Join(dir, "paints.json"), []byte(broken), 0o600)
	if _, err := Load(dir); err == nil {
		t.Fatal("an unknown pigment was accepted")
	}
}

type goldenSearch struct {
	Query  string `json:"query"`
	Brand  string `json:"brand"`
	Intro  string `json:"intro"`
	Groups []struct {
		Title string `json:"title"`
		Items []struct {
			Name  string `json:"name"`
			Brand string `json:"brand"`
			Meta  string `json:"meta"`
		} `json:"items"`
	} `json:"groups"`
}

func TestSearchMatchesTheApp(t *testing.T) {
	c := load(t)
	b, err := os.ReadFile(searchCases)
	if err != nil {
		t.Fatal(err)
	}
	var cases []goldenSearch
	if err := json.Unmarshal(b, &cases); err != nil {
		t.Fatal(err)
	}
	if len(cases) < 30 {
		t.Fatalf("only %d cases", len(cases))
	}
	for _, want := range cases {
		t.Run(want.Brand+":"+want.Query, func(t *testing.T) {
			got := c.Search(want.Query, want.Brand)
			if got.Intro != want.Intro {
				t.Errorf("intro\n got %q\nwant %q", got.Intro, want.Intro)
			}
			type row struct{ Name, Brand, Meta string }
			var g, w [][]row
			var gt, wt []string
			for _, grp := range got.Groups {
				gt = append(gt, grp.Title)
				var rows []row
				for _, it := range grp.Items {
					brand := ""
					if it.ShowLine {
						brand = it.Line
					}
					rows = append(rows, row{it.Name, brand, it.Meta})
				}
				g = append(g, rows)
			}
			for _, grp := range want.Groups {
				wt = append(wt, grp.Title)
				var rows []row
				for _, it := range grp.Items {
					rows = append(rows, row{it.Name, it.Brand, it.Meta})
				}
				w = append(w, rows)
			}
			if !reflect.DeepEqual(gt, wt) {
				t.Errorf("titles\n got %q\nwant %q", gt, wt)
			}
			if !reflect.DeepEqual(g, w) {
				t.Errorf("items\n got %v\nwant %v", g, w)
			}
		})
	}
}
