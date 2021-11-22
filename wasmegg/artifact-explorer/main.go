package main

import (
	"encoding/json"
	"log"
	"os"

	"github.com/fanaticscripter/Egg/wasmegg/_common/loot"
)

func main() {
	err := loot.LoadData()
	if err != nil {
		log.Fatal(err)
	}
	payload, err := json.MarshalIndent(loot.Data, "", "  ")
	if err != nil {
		log.Fatal(err)
	}
	err = os.WriteFile("src/lib/loot.json", payload, 0o644)
	if err != nil {
		log.Fatal(err)
	}
}
