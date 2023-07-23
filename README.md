# fundraiseup-tech-assignment

## Setup

```bash
# Install dependencies
$ npm install

# Create a configuration (fill in with correct values)
$ cp .env.sample .env
```
_Ensure that your MongoDB server is runinng in **replica sets** or **sharded clusters** mode_

## Running the app

```bash
# The Listener (sync.ts)
$ npm run start:sync

# The Generator (app.ts)
$ npm run start:app

# The Keeper (sync.ts --full-reindex)
$ npm run start:fsync
```
Or you can build it once and run manually from `dist` folder:
```bash
$ npm run build
$ cd dist

$ node sync.js [--full-reindex]
$ node app.js
```
