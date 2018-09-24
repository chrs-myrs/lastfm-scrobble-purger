"use strict"

//const yaml = require('js-yaml');
//const fs = require('fs')
var config// = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

const limit = require("simple-rate-limiter");
//const request = limit(require("request")).to(config.requestsPerSecond).per(1000);
var limitedRequest
const request = require("request")

/**
 * @returns []
 * @param Object configIn 
 */
module.exports = {
    crawl: async function (configIn) {
        let totalProcessed = 0
        let totalQueued = 0
        let queue = []

        config = configIn
        limitedRequest = limit(request).to(config.requestsPerSecond).per(1000);
        for (let page = config.startPage; page <= config.endPage; page++) {
            console.log("Requesting page " + page + " (" + (page - config.startPage + 1) + " of " + (config.endPage - config.startPage + 1) + ")")
            let [pageQueue, pageCount] = await processPage(page)
            queue = queue.concat(pageQueue)
            console.log("Page " + page + ": Queued " + pageQueue.length + " scrobbles of " + pageCount + " found.");
            totalProcessed += pageCount;
            totalQueued += pageQueue.length;
            if (pageCount < config.itemsPerPage) break
        }
        console.log("Total: Queued " + totalQueued + " scrobbles of " + totalProcessed + " found.");
        return queue
    }
}

async function processPage(page) {
    try {
        var resTracks = await getPage(page)
    } catch (error) {
        console.error(err)
    }

    let pageQueue = []

    resTracks.filter(
        (t, i, tracks) => (
            (config.artistsToRemove.indexOf(t.artist['#text']) >= 0) ||
            (config.removeDuplicates && i+1 < tracks.length && t.url == tracks[i+1].url && (t.date.uts - tracks[i+1].date.uts) < config.duplicateDistance) 
        )
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
            pageQueue.push(unscrobbleTrack)
        })

    return [pageQueue, resTracks.length]
}

function getPage(page) {
    var options = {
        method: 'GET',
        url: 'http://ws.audioscrobbler.com/2.0/',
        qs:
            {
                method: 'user.getrecenttracks',
                user: config.username,
                limit: config.itemsPerPage,
                page: page,
                api_key: config.apiKey,
                format: 'json'
            },
        headers: {}
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) reject(error)
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            let obj = JSON.parse(body)
            if (typeof (obj) === 'undefined' || !obj.hasOwnProperty('recenttracks') || !obj.recenttracks.hasOwnProperty('track')) resolve([])
            else resolve(obj.recenttracks.track)
        })
    })
}