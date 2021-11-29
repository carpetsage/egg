package loot

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/pkg/errors"

	"github.com/fanaticscripter/Egg/wasmegg/_common/eiafx"
	"github.com/fanaticscripter/EggContractor/api"
)

//go:embed mission_reward_count.json
var _lootDataJSON []byte

var (
	SourceData SourceLootStore
	Data       LootStore
)

// ----- Source data types -----

type (
	ShipName         string
	DurationTypeName string
	MissionLevel     int
	ArtifactName     string
	RarityName       string
)

type SourceLootStore map[ShipName]SourceShipLootStore

type SourceShipLootStore map[DurationTypeName]SourceMissionLootStore

type SourceMissionLootStore map[MissionLevel]SourceMissionLevelLootStore

type SourceMissionLevelLootStore struct {
	TotalDrops int                                            `json:"count"`
	LootCounts map[ArtifactName]SourceArtifactFamilyLootStore `json:"rewards"`
}

type SourceArtifactFamilyLootStore map[api.ArtifactSpec_Level]SourceArtifactTierLootStore

type SourceArtifactTierLootStore map[RarityName]int

// ----- Transformed data types -----

type LootStore struct {
	Missions []MissionLootStore `json:"missions"`
}

type MissionLootStore struct {
	AfxShip         api.MissionInfo_Spaceship    `json:"afxShip"`
	AfxDurationType api.MissionInfo_DurationType `json:"afxDurationType"`
	MissionId       string                       `json:"missionId"`
	Levels          []MissionLevelLootStore      `json:"levels"`
}

type MissionLevelLootStore struct {
	Level      MissionLevel            `json:"level"`
	TotalDrops int                     `json:"totalDrops"`
	Items      []ArtifactTierLootStore `json:"items"`
}

type ArtifactTierLootStore struct {
	AfxId    api.ArtifactSpec_Name  `json:"afxId"`
	AfxLevel api.ArtifactSpec_Level `json:"afxLevel"`
	ItemId   string                 `json:"itemId"`
	Counts   [4]int                 `json:"counts"`
	sortKey  int
}

// ----- End of data types -----

func LoadData() error {
	err := json.Unmarshal(_lootDataJSON, &SourceData)
	if err != nil {
		return errors.Wrapf(err, "error unmarshalling mission_reward_count.json")
	}
	err = eiafx.LoadConfig()
	if err != nil {
		return err
	}
	err = eiafx.LoadData()
	if err != nil {
		return err
	}
	err = transformData()
	if err != nil {
		return errors.Wrapf(err, "error transforming mission_reward_count.json")
	}
	return nil
}

func transformData() error {
	missions := []MissionLootStore{}
	for shipName, sourceShipLoot := range SourceData {
		ship, err := shipName.ToEnum()
		if err != nil {
			return err
		}
		maxLevel := maxMissionLevel(ship)
		for durationTypeName, sourceMissionLoot := range sourceShipLoot {
			durationType, err := durationTypeName.ToEnum()
			if durationType == api.MissionInfo_TUTORIAL {
				continue
			}
			if err != nil {
				return err
			}
			missionId := strings.ReplaceAll(strings.ToLower(ship.Name()+" "+durationType.Display()), " ", "-")
			missionMinQuality, missionMaxQuality := missionQualityRange(ship, durationType)
			levels := []MissionLevelLootStore{}
			for level := MissionLevel(0); level <= maxLevel; level++ {
				sourceMissionLevelLoot := sourceMissionLoot[MissionLevel(level)]
				items := []ArtifactTierLootStore{}
				for artifactName, sourceArtifactFamilyLoot := range sourceMissionLevelLoot.LootCounts {
					afxId, err := artifactName.ToEnum()
					if err != nil {
						return err
					}
					for afxLevel, sourceArtifactTierLoot := range sourceArtifactFamilyLoot {
						tier, err := eiafx.GetTier(&api.ArtifactSpec{
							Name:  afxId,
							Level: afxLevel,
						})
						if err != nil {
							return err
						}
						itemId := tier.Id
						var counts [4]int
						for rarity := api.ArtifactSpec_COMMON; rarity <= api.ArtifactSpec_LEGENDARY; rarity++ {
							rarityName := RarityName(strings.ToLower(api.ArtifactSpec_Rarity_name[int32(rarity)]))
							counts[rarity] = sourceArtifactTierLoot[rarityName]
						}
						items = append(items, ArtifactTierLootStore{
							AfxId:    afxId,
							AfxLevel: afxLevel,
							ItemId:   itemId,
							Counts:   counts,
							sortKey:  tierSortKey(tier),
						})
					}
				}

				// Add items that should be droppable but aren't represented.
				seenItemIds := make(map[string]struct{})
				for _, item := range items {
					seenItemIds[item.ItemId] = struct{}{}
				}
				for _, family := range eiafx.Data.ArtifactFamilies {
					for _, tier := range family.Tiers {
						_, ok := seenItemIds[tier.Id]
						if ok {
							continue
						}
						if tier.Quality < missionMinQuality || tier.Quality > missionMaxQuality {
							continue
						}
						items = append(items, ArtifactTierLootStore{
							AfxId:    tier.AfxId,
							AfxLevel: tier.AfxLevel,
							ItemId:   tier.Id,
							Counts:   [4]int{0, 0, 0, 0},
							sortKey:  tierSortKey(tier),
						})
						seenItemIds[tier.Id] = struct{}{}
					}
				}

				sort.Slice(items, func(i, j int) bool {
					return items[i].sortKey < items[j].sortKey
				})
				levels = append(levels, MissionLevelLootStore{
					Level:      level,
					TotalDrops: sourceMissionLevelLoot.TotalDrops,
					Items:      items,
				})
			}
			sort.Slice(levels, func(i, j int) bool {
				return levels[i].Level < levels[j].Level
			})
			missions = append(missions, MissionLootStore{
				AfxShip:         ship,
				AfxDurationType: durationType,
				MissionId:       missionId,
				Levels:          levels,
			})
		}
	}
	sort.Slice(missions, func(i, j int) bool {
		if missions[i].AfxShip < missions[j].AfxShip {
			return true
		}
		if missions[i].AfxShip > missions[j].AfxShip {
			return false
		}
		if missions[i].AfxDurationType < missions[j].AfxDurationType {
			return true
		}
		return false
	})
	Data = LootStore{
		Missions: missions,
	}
	return nil
}

func (n ShipName) ToEnum() (api.MissionInfo_Spaceship, error) {
	ship, ok := api.MissionInfo_Spaceship_value[strings.ToUpper(string(n))]
	if !ok {
		return 0, errors.Errorf("invalid ship name: %s", n)
	}
	return api.MissionInfo_Spaceship(ship), nil
}

func (n DurationTypeName) ToEnum() (api.MissionInfo_DurationType, error) {
	dt, ok := api.MissionInfo_DurationType_value[strings.ToUpper(string(n))]
	if !ok {
		return 0, errors.Errorf("invalid duration type name: %s", n)
	}
	return api.MissionInfo_DurationType(dt), nil
}

func (n ArtifactName) ToEnum() (api.ArtifactSpec_Name, error) {
	name, ok := api.ArtifactSpec_Name_value[strings.ToUpper(string(n))]
	if !ok {
		return 0, errors.Errorf("invalid artifact name: %s", n)
	}
	return api.ArtifactSpec_Name(name), nil
}

func maxMissionLevel(ship api.MissionInfo_Spaceship) MissionLevel {
	for _, shipParams := range eiafx.Config.MissionParameters {
		if shipParams.Ship == ship {
			return MissionLevel(len(shipParams.LevelMissionRequirements))
		}
	}
	panic(fmt.Sprintf("ship %s not found", ship))
}

func missionQualityRange(ship api.MissionInfo_Spaceship, durationType api.MissionInfo_DurationType) (min float64, max float64) {
	for _, shipParams := range eiafx.Config.MissionParameters {
		if shipParams.Ship != ship {
			continue
		}
		for _, missionParams := range shipParams.Durations {
			if missionParams.DurationType != durationType {
				continue
			}
			min = float64(missionParams.MinQuality)
			max = float64(missionParams.MaxQuality)
			return
		}
	}
	panic(fmt.Sprintf("mission %s %s not found", ship, durationType))
}

func tierSortKey(t *eiafx.Tier) int {
	return int(t.Family.SortKey<<8) + t.TierNumber
}
