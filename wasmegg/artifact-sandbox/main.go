// Convert eiafx-data.json to payload suitable for the app.

package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/fanaticscripter/Egg/wasmegg/_common/eiafx"
	"github.com/fanaticscripter/EggContractor/api"
)

const _appDataFile = "src/lib/data.json"

type AppPayload struct {
	Artifacts []Artifact `json:"artifacts"`
	Stones    []Stone    `json:"stones"`
}

type Artifact struct {
	Id string `json:"id"`

	AfxId     api.ArtifactSpec_Name   `json:"afx_id"`
	AfxLevel  api.ArtifactSpec_Level  `json:"afx_level"`
	AfxRarity api.ArtifactSpec_Rarity `json:"afx_rarity"`

	FamilyId   string `json:"family_id"`
	FamilyName string `json:"family_name"`

	TierId     string `json:"tier_id"`
	Name       string `json:"name"`
	TierNumber int    `json:"tier_number"`
	TierName   string `json:"tier_name"`

	Rarity string `json:"rarity"`

	Effect       string  `json:"effect"`
	EffectTarget string  `json:"effect_target"`
	EffectSize   string  `json:"effect_size"`
	EffectDelta  float64 `json:"effect_delta"`
	Slots        uint32  `json:"slots"`
	FamilyEffect string  `json:"family_effect"`

	BaseCraftingPrice float64 `json:"base_crafting_price"`

	IconFilename string `json:"icon_filename"`
}

type Stone struct {
	Id string `json:"id"`

	AfxId    api.ArtifactSpec_Name  `json:"afx_id"`
	AfxLevel api.ArtifactSpec_Level `json:"afx_level"`

	FamilyId   string `json:"family_id"`
	FamilyName string `json:"family_name"`

	TierId     string `json:"tier_id"`
	Name       string `json:"name"`
	TierNumber int    `json:"tier_number"`
	TierName   string `json:"tier_name"`

	Effect       string  `json:"effect"`
	EffectTarget string  `json:"effect_target"`
	EffectSize   string  `json:"effect_size"`
	EffectDelta  float64 `json:"effect_delta"`
	FamilyEffect string  `json:"family_effect"`

	BaseCraftingPrice float64 `json:"base_crafting_price"`

	IconFilename string `json:"icon_filename"`
}

func main() {
	if err := eiafx.LoadData(); err != nil {
		log.Fatal(err)
	}

	var artifacts []Artifact
	var stones []Stone
	for _, f := range eiafx.Data.ArtifactFamilies {
		for _, t := range f.Tiers {
			if t.AfxType == api.ArtifactSpec_ARTIFACT {
				for i, r := range t.Effects {
					artifacts = append(artifacts, Artifact{
						Id:                fmt.Sprintf("%s:%s", t.Id, strings.ToLower(r.Rarity)),
						AfxId:             t.AfxId,
						AfxLevel:          t.AfxLevel,
						AfxRarity:         r.AfxRarity,
						FamilyId:          f.Id,
						FamilyName:        f.Name,
						TierId:            t.Id,
						Name:              t.Name,
						TierNumber:        t.TierNumber,
						TierName:          t.TierName,
						Rarity:            r.Rarity,
						Effect:            r.Effect,
						EffectTarget:      r.EffectTarget,
						EffectSize:        r.EffectSize,
						EffectDelta:       r.EffectDelta,
						Slots:             *r.Slots,
						FamilyEffect:      r.FamilyEffect,
						BaseCraftingPrice: t.BaseCraftingPrices[i],
						IconFilename:      t.IconFilename,
					})
				}
			} else if t.AfxType == api.ArtifactSpec_STONE {
				e := t.Effects[0]
				stones = append(stones, Stone{
					Id:                t.Id,
					AfxId:             t.AfxId,
					AfxLevel:          t.AfxLevel,
					FamilyId:          f.Id,
					FamilyName:        f.Name,
					TierId:            t.Id,
					Name:              t.Name,
					TierNumber:        t.TierNumber,
					TierName:          t.TierName,
					Effect:            e.Effect,
					EffectTarget:      e.EffectTarget,
					EffectSize:        e.EffectSize,
					EffectDelta:       e.EffectDelta,
					FamilyEffect:      e.FamilyEffect,
					BaseCraftingPrice: t.BaseCraftingPrices[0],
					IconFilename:      t.IconFilename,
				})
			}
		}
	}

	payload := AppPayload{
		Artifacts: artifacts,
		Stones:    stones,
	}

	encoded, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		log.Fatalf("error serializing app payload: %s", err)
	}
	encoded = append(encoded, '\n')
	err = ioutil.WriteFile(_appDataFile, encoded, 0o644)
	if err != nil {
		log.Fatalf("error writing to %s: %s", _appDataFile, err)
	}
}
