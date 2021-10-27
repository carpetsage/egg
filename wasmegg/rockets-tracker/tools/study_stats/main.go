// Generate src/lib/study_stats.ts.
//
// This tool should be run from the root directory of rockets-tracker"
//
//   go run tools/study_stats/main.go
//
// The EIAPI_TOKEN environment variable has to be set to properly query the API.
// Without an API token, one has to use the -fake flag to generate with preset
// values.

package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

type stat struct {
	LegendariesJealousyThreshold int
	ZLCExthenRecord              int
}

var _preset = stat{
	LegendariesJealousyThreshold: 5,
	ZLCExthenRecord:              222,
}

var _fake bool

const _template = `export const LEGENDARIES_JEALOUSY_THRESHOLD = {{.LegendariesJealousyThreshold}};
export const ZLC_EXTHEN_RECORD = {{.ZLCExthenRecord}};
`

func init() {
	flag.BoolVar(&_fake, "fake", false, "generate a usable study_stats.ts with preset values")
}

func main() {
	flag.Parse()
	s := _preset
	if !_fake {
		s = retrieveStat()
	}
	generateSourceFile(s)
}

func retrieveStat() stat {
	token := os.Getenv("EIAPI_TOKEN")
	if token == "" {
		log.Fatal("EIAPI_TOKEN not set")
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	resp, err := client.Get("https://eiapi.tcl.sh/legendaries/rcstats?token=" + token)
	if err != nil {
		log.Fatal(err)
	}
	body, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != 200 {
		log.Fatalf("HTTP %d: %s\n", resp.StatusCode, body)
	}
	if err != nil {
		log.Fatal(err)
	}

	var s struct {
		LegendariesJealousyThreshold *int `json:"legendaries_jealousy_threshold"`
		ZLCExthenRecord              *int `json:"zlc_exthen_record"`
	}
	err = json.Unmarshal(body, &s)
	if err != nil {
		log.Fatalf("JSON decode error: %s: %s\n", err, body)
	}

	if s.LegendariesJealousyThreshold == nil {
		log.Fatalf("no .legendaries_jealousy_threshold: %s\n", body)
	}
	if s.ZLCExthenRecord == nil {
		log.Fatalf("no .zlc_exthen_record: %s\n", body)
	}

	return stat{
		LegendariesJealousyThreshold: *s.LegendariesJealousyThreshold,
		ZLCExthenRecord:              *s.ZLCExthenRecord,
	}
}

func generateSourceFile(s stat) {
	t := template.Must(template.New("source").Parse(_template))
	var b bytes.Buffer
	err := t.Execute(&b, s)
	if err != nil {
		log.Fatal(err)
	}
	path := "src/lib/study_stats.ts"
	err = os.WriteFile(path, b.Bytes(), 0644)
	if err != nil {
		log.Fatalf("error writing to %s: %s\n", path, err)
	}
	log.Printf("%s written", path)
}
