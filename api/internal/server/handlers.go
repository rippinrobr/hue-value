package server

import (
	"context"
	"slices"

	"github.com/rippinrobr/hue-value/api/internal/apigen"
	"github.com/rippinrobr/hue-value/api/internal/catalog"
	"github.com/rippinrobr/hue-value/api/internal/config"
)

// handlers answers the requests described in openapi.yaml. The catalog only changes when it is
// seeded, so it is read once and kept in memory.
type handlers struct {
	cfg config.Config
	cat *catalog.Catalog
}

var _ apigen.StrictServerInterface = (*handlers)(nil)

func notFound(message string) apigen.NotFoundJSONResponse {
	return apigen.NotFoundJSONResponse{Code: "not_found", Message: message}
}

func (h *handlers) GetHealth(ctx context.Context, _ apigen.GetHealthRequestObject) (apigen.GetHealthResponseObject, error) {
	return apigen.GetHealth200JSONResponse{
		Status:  "ok",
		Version: h.cfg.Version,
		Env:     apigen.HealthEnv(h.cfg.Env),
	}, nil
}

func (h *handlers) line(l catalog.Line) apigen.Line {
	return apigen.Line{
		Id:        l.ID,
		Brand:     l.Brand,
		Name:      l.Name,
		Label:     l.Label,
		Medium:    apigen.Medium(l.Medium),
		White:     l.White,
		ItemCount: len(h.cat.LineItems(l.ID)),
	}
}

func (h *handlers) ListBrands(ctx context.Context, _ apigen.ListBrandsRequestObject) (apigen.ListBrandsResponseObject, error) {
	brands := []apigen.Brand{}
	for _, b := range h.cat.Brands {
		lines := []apigen.Line{}
		for _, l := range h.cat.Lines {
			if l.Brand == b.ID {
				lines = append(lines, h.line(l))
			}
		}
		brands = append(brands, apigen.Brand{Id: b.ID, Name: b.Name, Lines: lines})
	}
	return apigen.ListBrands200JSONResponse{Brands: brands}, nil
}

func (h *handlers) ListLines(ctx context.Context, req apigen.ListLinesRequestObject) (apigen.ListLinesResponseObject, error) {
	lines := []apigen.Line{}
	for _, l := range h.cat.Lines {
		if req.Params.Brand == nil || *req.Params.Brand == l.Brand {
			lines = append(lines, h.line(l))
		}
	}
	return apigen.ListLines200JSONResponse{Lines: lines}, nil
}

func (h *handlers) GetLine(ctx context.Context, req apigen.GetLineRequestObject) (apigen.GetLineResponseObject, error) {
	for _, l := range h.cat.Lines {
		if l.ID == req.Line {
			return apigen.GetLine200JSONResponse(h.line(l)), nil
		}
	}
	return apigen.GetLine404JSONResponse{NotFoundJSONResponse: notFound("No product line has that id.")}, nil
}

func item(it catalog.Item) apigen.Item {
	out := apigen.Item{
		Line:     it.Line,
		Id:       it.ID,
		Name:     it.Name,
		Label:    it.Label,
		Family:   apigen.Family(it.Family),
		Code:     it.Code,
		Rgb:      it.RGB[:],
		Strength: it.Strength,
		PureL:    it.PureL,
		Hue:      it.Hue,
		Chroma:   it.Chroma,
		Near:     it.Near,
		Comp:     it.Comp,
		Note:     it.Note,
		Favorite: it.Favorite,
	}
	if it.Recipe != nil {
		recipe := make([]apigen.PigmentPart, len(it.Recipe))
		for i, p := range it.Recipe {
			recipe[i] = apigen.PigmentPart{Code: p.Code, Parts: p.Parts}
		}
		out.Recipe = &recipe
	}
	return out
}

func (h *handlers) ListItems(ctx context.Context, req apigen.ListItemsRequestObject) (apigen.ListItemsResponseObject, error) {
	if !h.cat.HasLine(req.Line) {
		return apigen.ListItems404JSONResponse{NotFoundJSONResponse: notFound("No product line has that id.")}, nil
	}
	items := []apigen.Item{}
	for _, it := range h.cat.LineItems(req.Line) {
		if req.Params.Family == nil || string(*req.Params.Family) == it.Family {
			items = append(items, item(it))
		}
	}
	return apigen.ListItems200JSONResponse{Items: items}, nil
}

func (h *handlers) GetItem(ctx context.Context, req apigen.GetItemRequestObject) (apigen.GetItemResponseObject, error) {
	for _, it := range h.cat.LineItems(req.Line) {
		if it.ID == req.Item {
			return apigen.GetItem200JSONResponse(item(it)), nil
		}
	}
	return apigen.GetItem404JSONResponse{NotFoundJSONResponse: notFound("No paint in that line has that id.")}, nil
}

func (h *handlers) SearchItems(ctx context.Context, req apigen.SearchItemsRequestObject) (apigen.SearchItemsResponseObject, error) {
	q, line := "", "artisan"
	if req.Params.Q != nil {
		q = *req.Params.Q
	}
	if req.Params.Line != nil {
		line = *req.Params.Line
	}
	if !h.cat.HasLine(line) {
		return apigen.SearchItems404JSONResponse{NotFoundJSONResponse: notFound("No product line has that id.")}, nil
	}
	r := h.cat.Search(q, line)
	out := apigen.SearchItems200JSONResponse{Intro: r.Intro, Groups: []apigen.SearchGroup{}}
	for _, g := range r.Groups {
		items := make([]apigen.SearchItem, len(g.Items))
		for i, it := range g.Items {
			items[i] = apigen.SearchItem{Line: it.Line, Id: it.ID, Name: it.Name, Meta: it.Meta, ShowLine: it.ShowLine}
		}
		out.Groups = append(out.Groups, apigen.SearchGroup{Title: g.Title, Items: items})
	}
	return out, nil
}

func (h *handlers) ListPigments(ctx context.Context, _ apigen.ListPigmentsRequestObject) (apigen.ListPigmentsResponseObject, error) {
	pigments := make([]apigen.Pigment, len(h.cat.Pigments))
	for i, p := range h.cat.Pigments {
		pigments[i] = apigen.Pigment{Code: p.Code, Rgb: p.RGB[:], Strength: p.Strength}
	}
	return apigen.ListPigments200JSONResponse{Pigments: pigments}, nil
}

func (h *handlers) GetPigment(ctx context.Context, req apigen.GetPigmentRequestObject) (apigen.GetPigmentResponseObject, error) {
	i := slices.IndexFunc(h.cat.Pigments, func(p catalog.Pigment) bool { return p.Code == req.Code })
	if i < 0 {
		return apigen.GetPigment404JSONResponse{NotFoundJSONResponse: notFound("No pigment has that code.")}, nil
	}
	p := h.cat.Pigments[i]
	refs := []apigen.ItemRef{}
	for _, it := range h.cat.Items {
		if slices.ContainsFunc(it.Recipe, func(part catalog.PigmentPart) bool { return part.Code == p.Code }) {
			refs = append(refs, apigen.ItemRef{Line: it.Line, Id: it.ID, Name: it.Name})
		}
	}
	return apigen.GetPigment200JSONResponse{Code: p.Code, Rgb: p.RGB[:], Strength: p.Strength, Items: refs}, nil
}
