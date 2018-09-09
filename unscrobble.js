"use strict"

const yaml = require('js-yaml');
const fs = require('fs')
var config;
const session = yaml.safeLoad(fs.readFileSync('session.yml', 'utf8'));

const limit = require("simple-rate-limiter");
const request = require("request")
var limitedRequest
//const request = require("request")

const cookieUrl = 'https://www.last.fm'
var jar = request.jar()

module.exports = {
    unscrobble: async function (configIn, tracks, trackSuccessCallback, trackFailCallback) {
        config = configIn

        limitedRequest = limit(require("request")).to(config.requestsPerSecond).per(1000);

        var totalDeleted = 0;

        var index = 0
        var total = tracks.length

        jar.setCookie(request.cookie(' sessionid=' + session.sessionid), cookieUrl)
        jar.setCookie(request.cookie(' csrftoken=' + session.csrftoken), cookieUrl)

        return Promise.all(tracks.map(track => {
            //console.log(track)
            return unscrobble(track).then(() => {
                console.log("Deleted scrobble " + ++index + " of " + total + ": " + track.artist_name + " - " + track.track_name + " @ " + (new Date(track.timestamp * 1000)).toUTCString())
                totalDeleted++
                trackSuccessCallback(track)
            }, (error) => {
                console.log(error)
                trackFailCallback(error, track)
            })
        }))
    }
}


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
                    } else if (JSON.parse(body).result === false) {
                        reject("Delete returned fail: " + JSON.stringify(track))
                    } else {
                        reject("Error deleting " + JSON.stringify(track) + ' body:'+body)
                    }
                } catch (error) {
                    console.log(response)
                    reject("Error parsing JSON response " + body + " - " + error)
                }

            });
        } catch (error) {
            reject("Error deleting " + JSON.stringify(track) + " - " + error)
        }
    })


}

