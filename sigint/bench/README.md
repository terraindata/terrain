# sigint-bench: Terrain Analytics Stress Testing Framework

This project contains a simple benchmark to stress-test sigint (Terrain's Analytics server). The benchmark operates in two modes:

1. Single: In the single mode, the benchmark floods the server with "view" events generated randomly for a given set of visitors and variants. Each event is registered with a separate "GET" request, for a total of 1000 events / requests.

2. Batch: In the batch mode, the benchmark sends a group of analytics events batched together for bulk processing. Each "GET" request sends up to `batchSize` events (defaults to 100) to the analytics server.

The benchmark prints a summary of results at the end with the aggregate execution statistics. For instance, here's the sample output from one instance of the benchmark run:
```
{
    "totalElapsed": 2185.151656150818,
    "main": {
        "meter": {
            "mean": 45.81527225086942,
            "count": 100,
            "currentRate": 45.815277500589865,
            "1MinuteRate": 0,
            "5MinuteRate": 0,
            "15MinuteRate": 0
        },
        "histogram": {
            "min": 220.82030391693115,
            "max": 642.8739719390869,
            "sum": 41751.60561585426,
            "variance": 7187.0678301320995,
            "mean": 417.51605615854265,
            "stddev": 84.7765759519226,
            "count": 100,
            "median": 417.6470820903778,
            "p75": 470.4254014492035,
            "p95": 571.0582006812094,
            "p99": 642.8342424988747,
            "p999": 642.8739719390869
        }
    }
}
```

## Usage

The benchmark can be run locally using

```bash
$ yarn bench [sigint-address]
```

This will spawn an instance of sigint if the address of an existing instance is not specified.

Alternatively, the benchmark can also be run in a distributed fashion in the "cloud" without having to worry about explicitly spawning separate instances. We use [serverless](https://www.serverless.com) — a convenient abstraction over AWS Lambda and Google Cloud Functions — to achieve this.

To try out this mode, first make sure that `serverless` is installed:

```bash
$ npm install -g serverless
```

Deploy the benchmark as a "cloud function":

```bash
$ serverless deploy
```

Once it's deployed, it can be explicitly invoked with:

```bash
$ serverless invoke --function runBench --data {"host": "<sigint-address>"}
```

or by using the http trigger to invoke it.