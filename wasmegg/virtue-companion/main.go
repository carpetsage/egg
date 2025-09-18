// Convert eiafx-data.json to payload suitable for the app.

package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"

	log "github.com/sirupsen/logrus"

	"github.com/carpetsage/Egg/wasmegg/_common/eiafx"
	"github.com/carpetsage/EggContractor/api"
)

const _catalogDataFile = "src/lib/catalog.json"

type catalogPayload []item

type item struct {
	// Key is afxId:afxLevel:afxRarity
	Key          string                  `json:"key"`
	AfxId        api.ArtifactSpec_Name   `json:"afxId"`
	AfxLevel     api.ArtifactSpec_Level  `json:"afxLevel"`
	AfxRarity    api.ArtifactSpec_Rarity `json:"afxRarity"`
	Name         string                  `json:"name"`
	Rarity       string                  `json:"rarity"`
	EffectTarget string                  `json:"effectTarget"`
	EffectSize   string                  `json:"effectSize"`
	EffectDelta  float64                 `json:"effectDelta"`
	Slots        uint32                  `json:"slots"`
	IconPath     string                  `json:"iconPath"`
}

func main() {
	if err := eiafx.LoadData(); err != nil {
		log.Fatal(err)
	}

	payload := catalogPayload{}
	for _, f := range eiafx.Data.ArtifactFamilies {
		for _, t := range f.Tiers {
			for _, r := range t.Effects {
				slots := uint32(0)
				if r.Slots != nil {
					slots = *r.Slots
				}
				payload = append(payload, item{
					Key:          fmt.Sprintf("%d:%d:%d", t.AfxId, t.AfxLevel, r.AfxRarity),
					AfxId:        t.AfxId,
					AfxLevel:     t.AfxLevel,
					AfxRarity:    r.AfxRarity,
					Name:         t.Name,
					Rarity:       r.Rarity,
					EffectTarget: r.EffectTarget,
					EffectSize:   r.EffectSize,
					EffectDelta:  r.EffectDelta,
					Slots:        slots,
					IconPath:     "egginc/" + t.IconFilename,
				})
			}
		}
	}

	encoded, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		log.Fatalf("error serializing app payload: %s", err)
	}
	encoded = append(encoded, '\n')
	err = ioutil.WriteFile(_catalogDataFile, encoded, 0o644)
	if err != nil {
		log.Fatalf("error writing to %s: %s", _catalogDataFile, err)
	}
}
