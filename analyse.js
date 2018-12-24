const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('download.json')
const db = low(adapter)

var trackTable = db.get('tracks')

var artist_count = {}
var album_count = {}

trackTable.value().forEach(t => {
    let date = new Date(t.date.uts * 1000)
    if(date.getHours() < 7 || date.getHours() == 23) {
        artist_count[t.artist['#text']] = (artist_count[t.artist['#text']] || 0) + 1
        album_count[t.album['#text']] = (album_count[t.album['#text']] || 0) + 1
    }
})

artist_count = Object
 .entries(artist_count)
 .sort(function(a,b) {return b[1]-a[1]})
 .reduce((_sortedObj, [k,v]) => ({
   ..._sortedObj, 
   [k]: v
 }), {})

 console.log("Artists:")
console.log(artist_count)

album_count = Object
 .entries(album_count)
 .sort(function(a,b) {return b[1]-a[1]})
 .reduce((_sortedObj, [k,v]) => ({
   ..._sortedObj, 
   [k]: v
 }), {})
 console.log("Albums:")
console.log(album_count)