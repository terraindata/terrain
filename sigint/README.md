# sigint: Terrain Analytics Server

The Terrain Analytics Server (sigint) tracks analytics events associated with variants served by Terrain. For instance, clickstream analytics events such as "impression", "click", "conversion", etc. can be tracked through a simple integration of the Terrain Analytics client library (analytics.js). The server optionally serves a website that serves as a demo of how to embed client functionality associated with analytics in a demo/e-commerce website. To see a demo in action, start the server in demo mode (`yarn start --demo`) and navigate to (`http://localhost:3001`).

## Project Commands
   - **bench**:
      Run a stress-test benchmark that posts synthetic tracking events to the server
   - **doc**:
      Generate API documentation for the server
   - **fix**:
      Style and lint the project source code
   - **lint**:
      Run linter against the project source
   - **postinstall**:
      Post-installation target that transpiles the TypeScript source to JavaScript
   - **start**:
      Start the server in production mode
   - **start-dev**:
      Start the server in development mode, watching in real-time for any changes to the project source
   - **style**:
      Format and style the source per the style guidelines
   - **test**:
      Run the unit and integration tests associated with the project

## Installation

```bash
$ yarn
```

This will pull in all of the required dependencies and build the project. To run the project in production mode, you need to have TypeScript installed (`yarn global add typescript`) and manually transpile the TS code to JS (`yarn install --production`).

### Alternate Docker Installation

To generate a docker container for the project, do:

```bash
$ docker build -t sigint .
```

Run the container by pointing it to a running ES instance:

```bash
$ docker run -p 3001:3001 sigint -d 172.17.0.1:9200
```

## Runtime Options

```
  -c, --config file   Configuration file to use.
  -p, --port number   Port to listen on.
      --debug         Turn on debug mode.
      --demo          Serve Terrain demo website.
  -h, --help          Show help and usage information.
  -v, --verbose       Print verbose information.
  -d, --db string     Analytics datastore connection parameters
```

## API Documentation

Refer to the API documentation in the `/doc` directory.
