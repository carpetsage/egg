package main

import (
	"bytes"
	"compress/zlib"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"google.golang.org/protobuf/proto"
)

// Configuration constants (from defaults.py)
var (
	currentClientVersion = uint32(999)
	clientVersion        = uint32(67)
	version              = "1.33.1"
	build                = "111291"
	platform             = "IOS"
	eventFile            = "data/events.json"
	contractFile         = "data/contracts.json"
	eggFile              = "data/customeggs.json"
	contractSeasonsFile  = "data/contractseasons.json"

	periodicalsURL = "https://www.auxbrain.com/ei/get_periodicals"
	seasonInfoURL  = "https://www.auxbrain.com/ei_ctx/get_season_infos_v2"
)

var userID = os.Getenv("EI_USERID")

// Event represents a formatted event for JSON serialization
type Event struct {
	EndTimestamp   float64 `json:"endTimestamp"`
	ID             string  `json:"id"`
	Message        string  `json:"message"`
	Multiplier     float64 `json:"multiplier"`
	StartTimestamp float64 `json:"startTimestamp"`
	Type           string  `json:"type"`
	Ultra          bool    `json:"ultra"`
}

// ContractStore represents a contract for JSON persistence
type ContractStore struct {
	ID    string `json:"id"`
	Proto string `json:"proto"`
}

// ContractSeasonStore represents a contract season for JSON persistence
type ContractSeasonStore struct {
	ID    string `json:"id"`
	Proto string `json:"proto"`
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run main.go <command> [commands...]\nCommands: events, contracts, customeggs, download-customeggs, contractseasons")
	}

	ctx := context.Background()

	// Get periodicals data
	var _ context.Context = ctx
	periodicalsResp, err := requestPeriodicals()
	if err != nil {
		log.Fatalf("Failed to fetch periodicals: %v", err)
	}

	// Process commands in parallel
	var wg sync.WaitGroup
	for _, arg := range os.Args[1:] {
		wg.Add(1)
		go func(cmd string) {
			defer wg.Done()
			switch cmd {
			case "events":
				if err := updateEvents(periodicalsResp.GetEvents().GetEvents()); err != nil {
					log.Printf("Failed to update events: %v", err)
				}
			case "contracts":
				if err := updateContracts(periodicalsResp.GetContracts().GetContracts(), periodicalsResp.GetContracts()); err != nil {
					log.Printf("Failed to update contracts: %v", err)
				}
			case "customeggs":
				if err := updateCustomEggs(periodicalsResp.GetContracts().GetCustomEggs(), false); err != nil {
					log.Printf("Failed to update custom eggs: %v", err)
				}
			case "download-customeggs":
				if err := updateCustomEggs(periodicalsResp.GetContracts().GetCustomEggs(), true); err != nil {
					log.Printf("Failed to download custom eggs: %v", err)
				}
			case "contractseasons":
				seasonInfoResp, err := requestSeasonInfo()
				if err != nil {
					log.Printf("Failed to fetch season info: %v", err)
					return
				}
				if err := updateContractSeasons(seasonInfoResp); err != nil {
					log.Printf("Failed to update contract seasons: %v", err)
				}
			default:
				log.Printf("Unknown command: %s", cmd)
			}
		}(arg)
	}
	wg.Wait()
}

// createBasicRequestInfo creates a BasicRequestInfo with default values
func createBasicRequestInfo() *BasicRequestInfo {
	return &BasicRequestInfo{
		EiUserId:      &userID,
		ClientVersion: &clientVersion,
		Version:       &version,
		Build:         &build,
		Platform:      &platform,
	}
}

// encodeProtoMessage encodes a protobuf message to base64
func encodeProtoMessage(msg proto.Message) (string, error) {
	data, err := proto.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("failed to marshal proto: %w", err)
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

// makeAPIRequest is a helper function to make authenticated API requests
func makeAPIRequest(url string, req proto.Message) ([]byte, error) {
	encoded, err := encodeProtoMessage(req)
	if err != nil {
		return nil, err
	}

	data := "data=" + encoded
	resp, err := http.Post(url, "application/x-www-form-urlencoded", strings.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Try base64 decode, fallback to raw if it fails
	if decoded, err := base64.StdEncoding.DecodeString(string(body)); err == nil {
		return decoded, nil
	}
	return body, nil
}

// decodeProtoMessage decodes a protobuf message from bytes
func decodeProtoMessage(msg proto.Message, data []byte, authenticated bool) error {
	if !authenticated {
		decoded, err := base64.StdEncoding.DecodeString(string(data))
		if err != nil {
			return fmt.Errorf("failed to decode base64: %w", err)
		}
		return proto.Unmarshal(decoded, msg)
	}

	// Handle authenticated message
	authMsg := &AuthenticatedMessage{}
	if err := proto.Unmarshal(data, authMsg); err != nil {
		return fmt.Errorf("failed to unmarshal authenticated message: %w", err)
	}

	msgData := authMsg.GetMessage()
	if authMsg.GetCompressed() {
		reader, err := zlib.NewReader(bytes.NewReader(msgData))
		if err != nil {
			return fmt.Errorf("failed to create zlib reader: %w", err)
		}
		defer reader.Close()

		decompressed, err := io.ReadAll(reader)
		if err != nil {
			return fmt.Errorf("failed to decompress message: %w", err)
		}
		msgData = decompressed
	}

	return proto.Unmarshal(msgData, msg)
}

// requestPeriodicals makes an API request to get periodicals data
func requestPeriodicals() (*PeriodicalsResponse, error) {
	req := &GetPeriodicalsRequest{
		CurrentClientVersion: &currentClientVersion,
		UserId:               &userID,
		Rinfo:                createBasicRequestInfo(),
	}

	decoded, err := makeAPIRequest(periodicalsURL, req)
	if err != nil {
		return nil, err
	}

	periodicalsResp := &PeriodicalsResponse{}
	if err := decodeProtoMessage(periodicalsResp, decoded, true); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return periodicalsResp, nil
}

// requestSeasonInfo makes an API request to get season info data
func requestSeasonInfo() (*ContractSeasonInfos, error) {
	req := &GetPeriodicalsRequest{
		CurrentClientVersion: &currentClientVersion,
		UserId:               &userID,
		Rinfo:                createBasicRequestInfo(),
	}

	decoded, err := makeAPIRequest(seasonInfoURL, req)
	if err != nil {
		return nil, err
	}

	seasonInfo := &ContractSeasonInfos{}
	if err := decodeProtoMessage(seasonInfo, decoded, true); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return seasonInfo, nil
}

// updateCustomEggs processes custom eggs data
func updateCustomEggs(customEggs []*CustomEgg, download bool) error {
	if len(customEggs) == 0 {
		fmt.Println("Error fetching custom eggs")
		return nil
	}

	// Print egg list for convenience
	for _, egg := range customEggs {
		fmt.Println(egg.GetName())
	}

	if download {
		return downloadEggIcons(customEggs)
	}

	return saveCustomEggsToFile(customEggs)
}

// downloadEggIcons downloads icons for custom eggs
func downloadEggIcons(customEggs []*CustomEgg) error {
	var wg sync.WaitGroup

	for _, egg := range customEggs {
		icon := egg.GetIcon()
		if icon == nil || icon.GetUrl() == "" {
			continue
		}

		wg.Add(1)
		go func(egg *CustomEgg, iconURL string) {
			defer wg.Done()

			// Create simple filename: egg_eggname.png
			filename := fmt.Sprintf("egg_%s.png", strings.ReplaceAll(strings.ToLower(egg.GetName()), " ", ""))

			fmt.Printf("Downloading %s -> %s\n", egg.GetName(), filename)

			resp, err := http.Get(iconURL)
			if err != nil {
				fmt.Printf("Failed to download %s: %v\n", egg.GetName(), err)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				fmt.Printf("Failed to download %s: HTTP %d\n", egg.GetName(), resp.StatusCode)
				return
			}

			data, err := io.ReadAll(resp.Body)
			if err != nil {
				fmt.Printf("Failed to read %s: %v\n", egg.GetName(), err)
				return
			}

			if err := os.WriteFile(filename, data, 0644); err != nil {
				fmt.Printf("Failed to save %s: %v\n", egg.GetName(), err)
			}
		}(egg, icon.GetUrl())
	}

	wg.Wait()
	return nil
}

// saveJSONToFile saves data as JSON to a file with proper formatting
func saveJSONToFile(data interface{}, filePath string) error {
	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}

// saveCustomEggsToFile saves custom eggs to JSON file
func saveCustomEggsToFile(customEggs []*CustomEgg) error {
	var encodedEggs []string

	for _, egg := range customEggs {
		data, err := proto.Marshal(egg)
		if err != nil {
			return fmt.Errorf("failed to marshal egg %s: %w", egg.GetName(), err)
		}
		encodedEggs = append(encodedEggs, base64.StdEncoding.EncodeToString(data))
	}

	return saveJSONToFile(encodedEggs, eggFile)
}

// updateEvents processes and saves events
func updateEvents(activeEvents []*EggIncEvent) error {
	events, err := getEvents(activeEvents)
	if err != nil {
		return fmt.Errorf("failed to get events: %w", err)
	}

	return saveJSONToFile(events, eventFile)
}

// getEvents merges active events with past events
func getEvents(activeEvents []*EggIncEvent) ([]Event, error) {
	// Convert active events
	var active []Event
	for _, event := range activeEvents {
		active = append(active, Event{
			ID:             event.GetIdentifier(),
			Type:           event.GetType(),
			Multiplier:     event.GetMultiplier(),
			Message:        event.GetSubtitle(),
			StartTimestamp: event.GetStartTime(),
			EndTimestamp:   event.GetStartTime() + event.GetDuration(),
			Ultra:          event.GetCcOnly(),
		})
	}

	// Sort active events
	sort.Slice(active, func(i, j int) bool {
		if active[i].StartTimestamp != active[j].StartTimestamp {
			return active[i].StartTimestamp < active[j].StartTimestamp
		}
		return active[i].ID < active[j].ID
	})

	// Read past events
	var past []Event
	if data, err := os.ReadFile(eventFile); err == nil {
		if err := json.Unmarshal(data, &past); err != nil {
			return nil, fmt.Errorf("failed to unmarshal past events: %w", err)
		}
	}

	// Filter out events that are already in active list
	var filtered []Event
	for _, pastEvent := range past {
		if !containsEvent(active, pastEvent) {
			filtered = append(filtered, pastEvent)
		}
	}

	return append(filtered, active...), nil
}

// containsEvent checks if an event is already in the list
func containsEvent(events []Event, target Event) bool {
	const twoDays = 2 * 24 * 60 * 60 // 2 days in seconds

	for _, event := range events {
		if event.ID == target.ID &&
			abs(event.StartTimestamp-target.StartTimestamp) < twoDays {
			return true
		}
	}
	return false
}

// abs returns the absolute value of a float64
func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// updateContracts processes and saves contracts
func updateContracts(contracts []*Contract, contractsResp *ContractsResponse) error {
	allContracts, err := getContracts(contracts, contractsResp)
	if err != nil {
		return fmt.Errorf("failed to get contracts: %w", err)
	}

	return saveJSONToFile(allContracts, contractFile)
}

// getContracts merges active contracts with past contracts
func getContracts(activeContracts []*Contract, contractsResp *ContractsResponse) ([]ContractStore, error) {
	// Filter active contracts
	var active []*Contract
	for _, contract := range activeContracts {
		if contract.GetIdentifier() == "first-contract" {
			continue
		}
		// Save space by removing goals/goalsets from contracts with grade_specs
		if len(contract.GetGradeSpecs()) > 0 {
			contract.GoalSets = nil
			contract.Goals = nil
		}
		active = append(active, contract)
	}

	// Read and decode past contracts
	var past []*Contract
	if data, err := os.ReadFile(contractFile); err != nil {
		if !os.IsNotExist(err) {
			return nil, fmt.Errorf("failed to read past contracts file: %w", err)
		}
	} else {
		var pastStores []ContractStore
		if err := json.Unmarshal(data, &pastStores); err != nil {
			return nil, fmt.Errorf("failed to unmarshal past contracts: %w", err)
		}

		// Decode contracts in parallel
		type contractResult struct {
			contract *Contract
			err      error
		}

		results := make([]contractResult, len(pastStores))
		var wg sync.WaitGroup

		for i, store := range pastStores {
			wg.Add(1)
			go func(idx int, store ContractStore) {
				defer wg.Done()

				contract := &Contract{}
				decoded, err := base64.StdEncoding.DecodeString(store.Proto)
				if err != nil {
					results[idx] = contractResult{nil, fmt.Errorf("failed to decode contract proto %s: %w", store.ID, err)}
					return
				}
				if err := proto.Unmarshal(decoded, contract); err != nil {
					results[idx] = contractResult{nil, fmt.Errorf("failed to unmarshal contract %s: %w", store.ID, err)}
					return
				}
				results[idx] = contractResult{contract, nil}
			}(i, store)
		}

		wg.Wait()

		// Check for errors and collect results
		for _, result := range results {
			if result.err != nil {
				return nil, result.err
			}
			past = append(past, result.contract)
		}
	}

	// Split past contracts into recent and old
	var recent, old []*Contract
	for _, contract := range past {
		if contract.GetExpirationTime() > float64(time.Now().Unix()) {
			recent = append(recent, contract)
		} else {
			old = append(old, contract)
		}
	}

	// Merge and dedupe (active contracts override past ones)
	allContracts := uniqueContracts(append(active, recent...))
	sort.Slice(allContracts, func(i, j int) bool {
		return allContracts[i].GetStartTime() < allContracts[j].GetStartTime()
	})

	// Save current season contracts separately
	if currentSeasonId := contractsResp.GetCurrentSeason().GetId(); currentSeasonId != "" {
		var seasonContracts []ContractStore
		for _, contract := range append(old, allContracts...) {
			if contract.GetSeasonId() == currentSeasonId {
				if encoded, err := encodeProtoMessage(contract); err == nil {
					seasonContracts = append(seasonContracts, ContractStore{
						ID: contract.GetIdentifier(), Proto: encoded,
					})
				}
			}
		}
		if len(seasonContracts) > 0 {
			saveJSONToFile(seasonContracts, "data/seasoncontracts.json")
		}
	}

	// Convert all contracts to stores
	var result []ContractStore
	for _, contract := range append(old, allContracts...) {
		if encoded, err := encodeProtoMessage(contract); err == nil {
			result = append(result, ContractStore{
				ID: contract.GetIdentifier(), Proto: encoded,
			})
		}
	}

	return result, nil
}

// uniqueContracts removes duplicate contracts, keeping the first occurrence
func uniqueContracts(contracts []*Contract) []*Contract {
	seen := make(map[string]bool)
	var result []*Contract

	for _, contract := range contracts {
		id := contract.GetIdentifier()
		if !seen[id] {
			seen[id] = true
			result = append(result, contract)
		}
	}

	return result
}

// updateContractSeasons processes and saves contract seasons
func updateContractSeasons(seasonInfo *ContractSeasonInfos) error {
	// Fill in missing start times
	for _, season := range seasonInfo.GetInfos() {
		if season.GetStartTime() == 0 {
			switch season.GetId() {
			case "fall_2023":
				season.StartTime = proto.Float64(1695657600) // Monday 25th September 2023
			case "winter_2024":
				season.StartTime = proto.Float64(1703610000) // Tuesday 26th December 2023
			case "spring_2024":
				season.StartTime = proto.Float64(1711382400) // Monday 25th March 2024
			case "summer_2024":
				season.StartTime = proto.Float64(1719244800) // Monday 24th June 2024
			}
		}
	}

	allSeasons, err := getContractSeasons(seasonInfo)
	if err != nil {
		return fmt.Errorf("failed to get contract seasons: %w", err)
	}

	return saveJSONToFile(allSeasons, contractSeasonsFile)
}

// getContractSeasons merges current season info with existing data
func getContractSeasons(seasonInfo *ContractSeasonInfos) ([]ContractSeasonStore, error) {
	// Read existing contract seasons
	var existingStores []ContractSeasonStore
	if data, err := os.ReadFile(contractSeasonsFile); err == nil {
		if err := json.Unmarshal(data, &existingStores); err != nil {
			return nil, fmt.Errorf("failed to unmarshal existing seasons: %w", err)
		}
	}

	// Convert existing stores back to ContractSeasonInfo objects
	existing := make([]*ContractSeasonInfo, 0, len(existingStores))
	if len(existingStores) > 0 {
		type seasonResult struct {
			season *ContractSeasonInfo
			valid  bool
		}

		results := make([]seasonResult, len(existingStores))
		var wg sync.WaitGroup

		for i, store := range existingStores {
			wg.Add(1)
			go func(idx int, store ContractSeasonStore) {
				defer wg.Done()

				season := &ContractSeasonInfo{}
				decoded, err := base64.StdEncoding.DecodeString(store.Proto)
				if err != nil {
					results[idx] = seasonResult{nil, false}
					return
				}
				if err := proto.Unmarshal(decoded, season); err != nil {
					results[idx] = seasonResult{nil, false}
					return
				}
				results[idx] = seasonResult{season, true}
			}(i, store)
		}

		wg.Wait()

		// Collect valid results
		for _, result := range results {
			if result.valid {
				existing = append(existing, result.season)
			}
		}
	}

	// Deduplicate, replacing saved data with live API data
	allSeasons := uniqueSeasons(append(seasonInfo.GetInfos(), existing...))

	// Sort by start time
	sort.Slice(allSeasons, func(i, j int) bool {
		return allSeasons[i].GetStartTime() < allSeasons[j].GetStartTime()
	})

	// Convert to ContractSeasonStore format
	var result []ContractSeasonStore
	for _, season := range allSeasons {
		encoded, err := encodeProtoMessage(season)
		if err != nil {
			continue
		}
		result = append(result, ContractSeasonStore{
			ID:    season.GetId(),
			Proto: encoded,
		})
	}

	return result, nil
}

// uniqueSeasons removes duplicate seasons, keeping the first occurrence
func uniqueSeasons(seasons []*ContractSeasonInfo) []*ContractSeasonInfo {
	seen := make(map[string]bool)
	var result []*ContractSeasonInfo

	for _, season := range seasons {
		id := season.GetId()
		if !seen[id] {
			seen[id] = true
			result = append(result, season)
		}
	}

	return result
}
