# lastfm-scrobble-purger
I created this as a way to bulk remove music that is scrobbled by Spotify from Sonos alarms.  It seems impossible to selectively Scrobble this stuff, so I need to delete it afterwards.  There were over 20,000 scrobbles I needed to remove.

Since last.fm does not have an unscrobble api endpoint we have to hijack a browser session to do this.

# Useage

- Copy `config.yml.example` to `config.yml`
- Generate an API key and enter this and username into `config.yml`
- Run `node login.js` to log in, this session should last months.
- Update settings in `config.yml`, especially the artists to crawl.
- Run `node crawler.js`, this will crawl the specified pages and save all scrobbles to delete.
- Review the `db.json` file to check what will be removed.
- Run `node unscrobble.js` to remove the scrobbles, this can be aborted or restarted anytime.