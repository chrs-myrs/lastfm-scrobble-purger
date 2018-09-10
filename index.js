    const yaml = require('js-yaml');
const fs = require('fs')
const config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

// Set some defaults (required if your JSON file is empty)
db.defaults({ tracks: [], 'failed-tracks': [] })
  .write()

var trackTable = db.get('tracks')


switch(process.argv[2]) {
    case 'login':
    require('./login')()
    break
  case 'crawl':
    require('./crawler').crawl(config).then(tracks => tracks.forEach(track => {
        if (trackTable.find({ 'timestamp': track.timestamp }).value()) {
            console.log('Scrobble with timestamp ' + track.timestamp + ' already exisits - skipping.')
        } else {
            trackTable.push(track).write()
        }
    })).catch(err => console.log(err))
    break
  case 'unscrobble':
  db.get('failed-tracks').push({test:1}).write()   
    console.log("Database contains "+trackTable.size().value()+" items")
    let tracksToUnscrobble = trackTable.take(config.maxUnscrobbleBatchSize).value()
    require('./unscrobble').unscrobble(config, tracksToUnscrobble, track => {
        trackTable.remove(track).write()
    }, (error, track) => {
        db.get('failed-tracks').push(Object.assign({ 'fails': 1, 'error': error }, track)).write()
        trackTable.remove(track).write()                             
    }).then((ret) => {
        console.log("Finished with "+ret.reduce((a,b) => a+b, 0)+"/"+ret.length+" sucesses")
    }).catch(err => console.log(err))
    break

  default:
    console.log("Invalid operation: "+process.argv[2])
  }