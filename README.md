# lastfm-scrobble-purger
I created this as a way to bulk remove music that is scrobbled by Spotify from Sonos alarms.  It seems impossible to selectively Scrobble this stuff, so I need to delete it afterwards.  There were over 20,000 scrobbles I needed to remove.

Since last.fm does not have an unscrobble api endpoint we have to hijack a browser session to do this.

# Useage

- Copy config.yml.example to config.yml
- Log in to last.fm
- Extract the sessionid from your cookies, and the csfr token from the page source.
- Set other paramaters as required
- Run