# lastfm-scrobble-purger - Delete scrobbles en-mass (ununscrobbler)
I created this as a way to bulk remove music that is scrobbled by Spotify from Sonos alarms.  It seems impossible to selectively Scrobble this stuff, so I need to delete it afterwards.  There were over 20,000 scrobbles I needed to remove.

Since last.fm does not have an unscrobble api endpoint we have to simulate a browser session to do this.  With this method we can use nearly unlimited batch sizes, I have tested this with 35,000 tracks, limited only by the list you can store in a JSON file.

# Useage

- Copy `config.yml.example` to `config.yml`
- Generate an API key and enter this and username into `config.yml`
- Run `npm run login` to log in, this session should last months.
- Update settings in `config.yml`, especially the artists to crawl.
- Run `node run crawl`, this will crawl the specified pages and save all scrobbles to delete.
- Review the `db.json` file to check what will be removed.
- Run `node run unscrobble` to remove the scrobbles, this can be aborted or restarted anytime.

# AWS

The tool can also be readily deployed to AWS.  If anyone wants detailed instructions please open an issue.

I run the crawler every hour on the first page of 200, which places the tracks in an SQS queue (url must be set in the environment variable sqs_url).

You have two options for the unscrobbler, scheduling it every X seconds, so it will take up to 10 items from the queue, or using an S@S trigger to run the unscrobble trigger.  The latter is more complex to set up and manage but less costly, recommended for AWS experts.

Handler for crawler:        lambda.crawl
Handler for unscrobbler:    lambda.unscrobble
Handler for SQS trigger:    lambda.unscrobbleTrigger

You will need to run `npm run login` to generate a `session.yml` to include in your deployment package for the lambda unscrobbler.

A windows build tool is included for deyloying the lambda, it requires the AWS CLI to be avaliable and configured and can be run in PowerShell as so...
` .\build\deploy.ps1 {LAMBDA_FUNCTION_NAME}`