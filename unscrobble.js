"use strict"

const yaml = require('js-yaml');
const fs = require('fs')
const config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));
const session = yaml.safeLoad(fs.readFileSync('session.yml', 'utf8'));

const limit = require("simple-rate-limiter");
const request = require("request")
const limitedRequest = limit(require("request")).to(config.requestsPerSecond).per(1000);
//const request = require("request")

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ tracks: [], 'failed-tracks': [] })
  .write()

const cookieUrl = 'https://www.last.fm'

var trackTable = db.get('tracks')

var totalDeleted = 0;

console.log("Database contains "+trackTable.size().value()+" items")

var tracks = trackTable.take(config.maxUnscrobbleBatchSize).value()

var index = 0
var total = tracks.length

var jar = request.jar()
jar.setCookie(request.cookie(' sessionid=' + session.sessionid), cookieUrl)
jar.setCookie(request.cookie(' csrftoken=' + session.csrftoken), cookieUrl)

tracks.forEach(track => {
    //console.log(track)
    unscrobble(track).then(() => {
        console.log("Deleted scrobble " + ++index + " of " + total + ": " + track.artist_name + " - " + track.track_name + " @ " + (new Date(track.timestamp * 1000)).toUTCString())
        totalDeleted++
        trackTable.remove(track).write()
    }, (error) => {
        console.log(error)
        db.get('failed-tracks').push(Object.assign({ 'fails': 1, 'error': error }, track)).write()
        trackTable.remove(track).write()
    })
});



function unscrobble(track) {
    var options = {
        method: 'POST',
        url: 'https://www.last.fm/user/chrsmyrs/unscrobble',
        headers:
            {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Language': 'en-GB,en;q=0.7,en-US;q=0.3',
                Accept: '*/*',
                Referer: 'https://www.last.fm/user/chrsmyrs/library'
            },
        jar: jar,
        gzip: true,
        form: Object.assign({ 'csrfmiddlewaretoken': session.csrftoken, 'ajax': 1 }, track)
    };

    if (config.hasOwnProperty('caFile')) {
        options.ca = config.caFile
    }

    return new Promise((resolve, reject) => {
            try {
                limitedRequest(options, function (error, response, body) {
                    if (error) reject("Error deleting " + JSON.stringify(track) + " - " + error)
                    try {
                        if (JSON.parse(body).result === true) {
                            resolve()
                        } else {
                            reject("Error deleting " + JSON.stringify(track))
                        }
                    } catch {
                        console.log(response)
                        reject("Error parsing JSON response " + body + " - " + error)
                    }

                });
            } catch (error) {
                reject("Error deleting " + JSON.stringify(track) + " - " + error)
            }
    })


}

