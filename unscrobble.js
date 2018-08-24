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

var trackTable = db.get('tracks')

var totalDeleted = 0;

var tracks = trackTable.take(10).value()

var index = 0
var total = tracks.length

tracks.forEach(track => {
    console.log("Deleting scrobble " + ++index + " of " + total + ": " + track.artist_name + " - " + track.track_name + " @ " + (new Date(track.timestamp * 1000)).toUTCString())
    console.log(track)
    unscrobble(track)
});

function unscrobble(trackData) {
    let cookie = 'lfmjs=1; lfmjs=1; sessionid=' + config.sessionid + '; csrftoken=' + config.csfrtoken + '; utag_main=v_id:0163baa06fda000159429b4c182a0104e001400d00bd0$_sn:29$_ss:0$_st:1534761723452$_pn:17\\"%\\"3Bexp-session$ses_id:1534755639743\\"%\\"3Bexp-session; CBS_INTERNAL=0; -1721684895=9k4taoviy4; lfmjs=1; _las=3; AMCV_10D31225525FF5790A490D4D\\"%\\"40AdobeOrg=-894706358\\"%\\"7CMCMID\\"%\\"7C86299563414495698020547759543834965968\\"%\\"7CMCAID\\"%\\"7CNONE\\"%\\"7CMCOPTOUT-1534762841s\\"%\\"7CNONE\\"%\\"7CvVersion\\"%\\"7C2.3.0\\"%\\"7CMCAAMLH-1535360441\\"%\\"7C6\\"%\\"7CMCAAMB-1535364722\\"%\\"7Cj8Odv6LonN4r3an7LhD3WZrU1bUpAkFkkiY1ncBR96t2PTI\\"%\\"7CMCCIDH\\"%\\"7C-5903735; cbsiaa=26542496869849736459150691288484; _evidon_consent_cookie={\\"\\"vendors\\"\\":{\\"\\"6\\"\\":[1,14,17,31,36,38,41,51,56,58,63,64,66,82,84,103,111,128,131,139,141,159,167,168,173,176,189,243,256,259,269,282,287,290,292,293,307,321,342,348,373,375,384,395,432,433,442,447,451,457,459,474,476,523,532,550,560,606,608,613,617,635,650,662,667,673,674,718,739,775,779,825,871,933,937,938,941,942,948,953,1171,1175,1194,1198,1256,1288,1371,1412,1463,1493,1635,1647,1727,1806,1816,1955,2088,2197,2253,2259,2366,2449,2521,2572,2609,2806,2882,2937,2952,3139,3162,3163,3222,3272,3524,3794,3994,4025,4160,4166,4286,4667,4668,4672,4900,5042,5136,5177]},\\"\\"consent_date\\"\\":\\"\\"2018-06-01T09:29:05.599Z\\"\\"}; _ga=GA1.2.701099555.1527867839; LDCLGFbrowser=b4e84cd7-e70b-4e22-8e77-4666b064dfb5; XCLGFbrowser=XsbvWVsRacCPoA5ZG2o; s_getNewRepeat=1534759923310-Repeat; s_lv_undefined=1534759923313; aam_uuid=86165926677767094900562249111239602856; trc_cookie_storage=taboola\\"%\\"2520global\\"%\\"253Auser-id\\"%\\"3Deab8d619-bd23-40bb-9d19-99eb677227a2-tuct1c0b56f; s_vnum=1536239416203\\"%\\"26vn\\"%\\"3D5; AMCVS_10D31225525FF5790A490D4D\\"%\\"40AdobeOrg=1; not_first_visit=1; prevPageType=user_library; s_cc=true; _stl=1; s_invisit=true; s_lv_undefined_s=More\\"%\\"20than\\"%\\"207\\"%\\"20days; _gid=GA1.2.1374182611.1534755643; s_sq=cbsilastfmsite\\"%\\"3D\\"%\\"2526c.\\"%\\"2526a.\\"%\\"2526activitymap.\\"%\\"2526page\\"%\\"253Dlastfm\\"%\\"25253A\\"%\\"25252Fuser\\"%\\"25252Flibrary\\"%\\"25252Foverview\\"%\\"2526link\\"%\\"253DDelete\\"%\\"252520scrobble\\"%\\"2526region\\"%\\"253Dchartlist-more-89e1d694-cff4-478d-8ef9-a1709f33ae43\\"%\\"2526pageIDType\\"%\\"253D1\\"%\\"2526.activitymap\\"%\\"2526.a\\"%\\"2526.c\\"%\\"2526pid\\"%\\"253Dlastfm\\"%\\"25253A\\"%\\"25252Fuser\\"%\\"25252Flibrary\\"%\\"25252Foverview\\"%\\"2526pidt\\"%\\"253D1\\"%\\"2526oid\\"%\\"253D\\"%\\"25250A\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520Delete\\"%\\"252520scrobble\\"%\\"25250A\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"252520\\"%\\"2526oidt\\"%\\"253D3\\"%\\"2526ot\\"%\\"253DSUBMIT; AnonSession=e34113fceeb57c182f5f633d917e9266-824489de6ba1717c32d61f6135e7cd1ee28a096d1c960578e1f298a9db18aefa; AnonTrack=3e258ad60ea6b14b0244abd9de68fb4f; FirstVisit=1534756205; BrowserCapabilities=H\\"%\\"3D1\\"%\\"7CJ\\"%\\"3D1\\"%\\"7CR\\"%\\"3D0\\"%\\"7CS\\"%\\"3D1; lfm_cors=0; javascript=enabled; LFM_Dismiss_cookielawbar=true; __utma=24701223.701099555.1527867839.1534756616.1534758966.3; __utmc=24701223; __utmz=24701223.1534756616.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not\\"%\\"20provided); __utmv=24701223.|2=VisitorStatus=Anonymous=1; __utma=168134055.701099555.1527867839.1534756616.1534758966.3; __utmc=168134055; __utmz=168134055.1534756616.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not\\"%\\"20provided); lfm_corschk=1; __utmb=24701223.12.10.1534758966; __utmb=168134055.0.10.1534758966; _gat_pT=1'
    var options = {
        method: 'POST',
        url: 'https://www.last.fm/user/chrsmyrs/unscrobble',
        headers:
            {
                Connection: 'keep-alive',
                Cookie: cookie,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept-Language': 'en-GB,en;q=0.7,en-US;q=0.3',
                Accept: '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0',
                'Content-Type': 'application/x-www-form-urlencoded',
                Referer: 'https://www.last.fm/user/chrsmyrs/library'
            },
        form: trackData
    };

    let body = Object.assign({ 'csrfmiddlewaretoken': config.csfrtoken, 'ajax': 1 }, trackData)

    if(config.hasOwnProperty('caFile')) {
        options.ca = config.caFile
    }

    (function (body, trackData) {
        try {
            request(options, function (error, response, body) {
                if (error) console.log("Error deleting " + JSON.stringify(body) + " - " + error)
                if (!(JSON.parse(body).result === true)) {
                    console.log("Error deleting " + JSON.stringify(body))
                } else {
                    totalDeleted++
                    trackTable.remove(trackData)
                }

            });
        } catch (error) {
            console.log("Error deleting " + JSON.stringify(body) + " - " + error)
        }


    })(body, trackData)

}

