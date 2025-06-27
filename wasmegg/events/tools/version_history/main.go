package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/blang/semver/v4"
	"golang.org/x/exp/slices"
)

type VersionHistory struct {
	VersionDisplay   string `json:"versionDisplay"`
	ReleaseNotes     string `json:"releaseNotes"`
	ReleaseDate      string `json:"releaseDate"`
	ReleaseTimestamp string `json:"releaseTimestamp"`
}

func main() {
	url := "https://apps.apple.com/us/app/egg-inc/id993492744"
	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Failed to fetch URL: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Failed to fetch URL: HTTP %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Fatalf("Failed to parse HTML: %v", err)
	}

	re := regexp.MustCompile(`versionHistory\\":(\[.*?\])`)
	var versionHistory []VersionHistory
	doc.Find("script").Each(func(i int, s *goquery.Selection) {
		script := s.Text()
		matches := re.FindStringSubmatch(script)
		if len(matches) > 1 {
			cleanedJSON := strings.ReplaceAll(matches[1], `\"`, "\"")
			if err := json.Unmarshal([]byte(cleanedJSON), &versionHistory); err != nil {
				log.Fatalf("Failed to parse versionHistory JSON: %v", err)
			}
		}
	})

	if len(versionHistory) == 0 {
		log.Println("versionHistory JSON object not found")
		return
	}
	_, sourceFile, _, ok := runtime.Caller(0)
	if !ok {
		log.Fatalf("Failed to determine source file path")
	}
	baseDir := filepath.Dir(sourceFile)
	versionHistoryPath := filepath.Join(baseDir, "../../src/version_history.json")
	log.Printf("Base directory: %s", versionHistoryPath)
	rawHistory, err := os.ReadFile(versionHistoryPath)
	if err != nil {
		log.Fatalf("Failed to read existing version_history.json: %v", err)
	}
	var existingHistory []VersionHistory
	if err := json.Unmarshal(rawHistory, &existingHistory); err != nil {
		log.Fatalf("Failed to parse versionHistory JSON: %v", err)
	}

	var allHistoryMap = make(map[string]VersionHistory)
	for _, ver := range append(existingHistory, versionHistory...) {
		allHistoryMap[ver.VersionDisplay] = ver
	}

	var allHistory []VersionHistory
	for _, v := range allHistoryMap {
		allHistory = append(allHistory, v)
	}

	slices.SortFunc(allHistory, func(a, b VersionHistory) int {
		v1, err1 := semver.ParseTolerant(a.VersionDisplay)
		v2, err2 := semver.ParseTolerant(b.VersionDisplay)
		if err1 != nil || err2 != nil {
			log.Fatalf("Failed to parse version: %v, %v", err1, err2)
		}
		return v2.Compare(v1)
	})

	file, err := os.Create(versionHistoryPath)
	if err != nil {
		log.Fatalf("Failed to open version_history.json for writing: %v", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(allHistory); err != nil {
		log.Fatalf("Failed to write JSON to file: %v", err)
	}

	fmt.Println("version_history.json updated successfully")
}
