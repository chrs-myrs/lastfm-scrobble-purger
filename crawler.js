"use strict"

const yaml = require('js-yaml');
const fs = require('fs')
const config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

const limit = require("simple-rate-limiter");
const request = limit(require("request")).to(config.requestsPerSecond).per(1000);
//const request = require("request")

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

// Set some defaults (required if your JSON file is empty)
db.defaults({ tracks: [] })
  .write()

var trackTable = db.get('tracks')

var totalProcessed = 0;
var totalQueued = 0;

main();

async function main() {
    for (var page = config.startPage; page <= config.endPage; page++) {
        console.log("Requesting page " + page + " (" + (page - config.startPage + 1) + " of " + (config.endPage - config.startPage + 1) + ")")
        let [queued, pageCount] = await processPage(page)
        console.log("Page " + page + ": Added "+queued+" scrobbles of "+pageCount+" found.");
        totalProcessed += pageCount;
        totalQueued += queued;
        if(!pageCount) break
    }
    console.log("Total: Added "+totalQueued+" scrobbles of "+totalProcessed+" found.");
}

async function processPage(page) {
    try{
       var resTracks = await getPage(page) 
    } catch (error) {
        console.error(err)
    }

    totalProcessed += resTracks.length
    let queued = 0
        
    resTracks.filter(
        t => (config.artistsToRemove.indexOf(t.artist['#text']) >= 0)
    ).map(
        t => {
            return {
                artist_name: t.artist['#text'],
                timestamp: t.date.uts,
                track_name: t.name
            }
        }
        )
        .forEach(function (unscrobbleTrack, index, all) {
            if(trackTable.find({'timestamp':unscrobbleTrack.timestamp}).value()) {
                console.log('Scrobble with timestamp '+unscrobbleTrack.timestamp+' already exisits on page '+page+ ' skipping.')
            } else {
                trackTable.push(unscrobbleTrack).write()
            }
            queued++
        })
    
    return [queued, resTracks.length]
}

function getPage(page) {
    var options = {
        method: 'GET',
        url: 'http://ws.audioscrobbler.com/2.0/',
        qs:
            {
                method: 'user.getrecenttracks',
                user: config.userName,
                limit: config.itemsPerPage,
                page: page,
                api_key: config.apiKey,
                format: 'json'
            },
        headers: { }
    };

   return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
            if (error) reject(error)
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            let obj = JSON.parse(body)
            if(typeof(obj) === 'undefined' || !obj.hasOwnProperty('recenttracks') || !obj.recenttracks.hasOwnProperty('track')) resolve([])
            else resolve(obj.recenttracks.track)
    })
   })
}