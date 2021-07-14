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
	Artifacts []Item `json:"artifacts"`
	Stones    []Item `json:"stones"`
}

type Item struct {
	Id string `json:"id"`

	AfxId     api.ArtifactSpec_Name   `json:"afxId"`
	AfxLevel  api.ArtifactSpec_Level  `json:"afxLevel"`
	AfxRarity api.ArtifactSpec_Rarity `json:"afxRarity"`

	FamilyId   string `json:"familyId"`
	FamilyName string `json:"familyName"`

	TierId     string `json:"tierId"`
	Name       string `json:"name"`
	TierNumber int    `json:"tierNumber"`
	TierName   string `json:"tierName"`
	Rarity     string `json:"rarity"`
	Display    string `json:"display"`

	Effect       string  `json:"effect"`
	EffectTarget string  `json:"effectTarget"`
	EffectSize   string  `json:"effectSize"`
	EffectDelta  float64 `json:"effectDelta"`
	Slots        uint32  `json:"slots"`
	FamilyEffect string  `json:"familyEffect"`

	BaseCraftingPrice float64 `json:"baseCraftingPrice"`

	IconPath string `json:"iconPath"`
}

func main() {
	if err := eiafx.LoadData(); err != nil {
		log.Fatal(err)
	}

	var artifacts []Item
	var stones []Item
	for _, f := range eiafx.Data.ArtifactFamilies {
		for _, t := range f.Tiers {
			if t.AfxType == api.ArtifactSpec_ARTIFACT {
				for i, r := range t.Effects {
					artifacts = append(artifacts, Item{
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
						Display:           fmt.Sprintf("%s (T%d), %s", t.Name, t.TierNumber, r.Rarity),
						Effect:            r.Effect,
						EffectTarget:      r.EffectTarget,
						EffectSize:        r.EffectSize,
						EffectDelta:       r.EffectDelta,
						Slots:             *r.Slots,
						FamilyEffect:      r.FamilyEffect,
						BaseCraftingPrice: t.BaseCraftingPrices[i],
						IconPath:          "egginc/" + t.IconFilename,
					})
				}
			} else if t.AfxType == api.ArtifactSpec_STONE {
				e := t.Effects[0]
				stones = append(stones, Item{
					Id:                t.Id,
					AfxId:             t.AfxId,
					AfxLevel:          t.AfxLevel,
					FamilyId:          f.Id,
					FamilyName:        f.Name,
					TierId:            t.Id,
					Name:              t.Name,
					TierNumber:        t.TierNumber,
					TierName:          t.TierName,
					Display:           fmt.Sprintf("%s (T%d)", t.Name, t.TierNumber),
					Effect:            e.Effect,
					EffectTarget:      e.EffectTarget,
					EffectSize:        e.EffectSize,
					EffectDelta:       e.EffectDelta,
					FamilyEffect:      e.FamilyEffect,
					BaseCraftingPrice: t.BaseCraftingPrices[0],
					IconPath:          "egginc/" + t.IconFilename,
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
