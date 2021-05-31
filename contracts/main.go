package main

import (
	"encoding/base64"
	"encoding/json"
	"io/ioutil"
	"math"
	"os"
	"time"

	"github.com/avast/retry-go"
	"github.com/fanaticscripter/EggContractor/api"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"google.golang.org/protobuf/proto"
)

const datafile = "data/contracts.json"

var eiUserId string

type entry struct {
	Id       string                  `json:"id"`
	Proto    string                  `json:"proto"`
	Contract *api.ContractProperties `json:"-"`
}

func init() {
	eiUserId = os.Getenv("EI_USERID")
	if eiUserId == "" {
		log.Fatal("EI_USERID env var not set")
	}
}

func main() {
	log.SetLevel(log.InfoLevel)

	entries, err := loadContracts()
	if err != nil {
		log.Fatal(err)
	}

	var active []*api.ContractProperties
	err = retry.Do(
		func() error {
			active, err = getActiveContracts()
			if err != nil {
				log.Warn(err)
			}
			return err
		},
		retry.Attempts(3),
		retry.Delay(2*time.Second),
	)
	if err != nil {
		log.Fatal("failed to retrieve active contracts after 3 tries")
	}

LoopActiveContracts:
	for _, c := range active {
		if c.Id == "first-contract" {
			continue
		}
		for _, e := range entries {
			// Consider two contracts the same if IDs match and expiration times are
			// within 30 days of each other.
			if e.Id == c.Id && math.Abs(e.Contract.ExpiryTimestamp-c.ExpiryTimestamp) < 30*86400 {
				continue LoopActiveContracts
			}
		}
		log.Infof("new contract: %s (%s)", c.Name, c.Id)
		buf, err := proto.Marshal(c)
		if err != nil {
			log.Fatalf("error marshalling %s", c)
		}
		encoded := base64.StdEncoding.EncodeToString(buf)
		entries = append(entries, entry{
			Id:       c.Id,
			Proto:    encoded,
			Contract: c,
		})
	}

	err = persistContracts(entries)
	if err != nil {
		log.Fatal(err)
	}
}

func loadContracts() ([]entry, error) {
	body, err := ioutil.ReadFile(datafile)
	if err != nil {
		return nil, err
	}
	entries := []entry{}
	err = json.Unmarshal(body, &entries)
	if err != nil {
		return nil, errors.Wrapf(err, "error decoding %s as JSON", datafile)
	}
	for i, e := range entries {
		buf, err := base64.StdEncoding.DecodeString(e.Proto)
		if err != nil {
			return entries, errors.Wrapf(err, "error base64 decoding %s", e.Proto)
		}
		entries[i].Contract = &api.ContractProperties{}
		err = proto.Unmarshal(buf, entries[i].Contract)
		if err != nil {
			return entries, errors.Wrapf(err, "error unmarshalling %s as ContractProperties", e.Proto)
		}
	}
	return entries, nil
}

func getActiveContracts() ([]*api.ContractProperties, error) {
	resp, err := api.RequestPeriodicals(&api.GetPeriodicalsRequestPayload{
		UserId:               eiUserId,
		CurrentClientVersion: api.ClientVersion,
		Rinfo: &api.BasicRequestInfo{
			EiUserId:      eiUserId,
			ClientVersion: api.ClientVersion,
			Version:       api.AppVersion,
			Build:         api.AppBuild,
			Platform:      api.PlatformString,
		},
	})
	if err != nil {
		return nil, err
	}
	return resp.Contracts.Contracts, nil
}

func persistContracts(entries []entry) error {
	body, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return errors.Wrap(err, "error encoding contract list as JSON")
	}
	body = append(body, '\n')
	return ioutil.WriteFile(datafile, body, 0o644)
}
