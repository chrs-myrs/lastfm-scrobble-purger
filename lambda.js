"use strict"

console.log("Starting")

// Load the SDK for JavaScript
var AWS = require('aws-sdk')
// Set the region 
AWS.config.update({ region: 'eu-west-2' })

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' })

var cw = new AWS.CloudWatch({ apiVersion: '2010-08-01' })

const yaml = require('js-yaml');
const fs = require('fs')
const config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

const sqs_url = process.env.sqs_url

/**
 * @typedef {Object} env - creates a new type named 'SpecialType'
 * @property {number} pages - a number property of SpecialType
 */

exports.crawler = (event, context, callback) => {
  /**
   * @type env process.env
   */
  if (!process.env.hasOwnProperty('pages')) {
    callback("Environment variable 'pages' missing.")
    return
  }

  config.startPage = 1
  config.endPage = process.env.pages || 1

  const crawler = require('./crawler')
  crawler.crawl(config).then(tracks => {
    // get a promise to queue all tracks
    return Promise.all(tracks.map((track, i) => queueTrack(track, i)))
  }).then(res => {
    callback(null, 'Queued ' + res.length + ' tracks on SQS.')
    logMetric('Queued', res.length || 0)
  }).catch(err => {
    callback(err)
  })
};

exports.unscrobbler = (event, context, callback) => {
  getMessages(Math.min(config.maxUnscrobbleBatchSize, 10)).then(msgs => {
    if (!msgs.length) {
      console.log("No messages on queue")
      logMetric("Unscrobbled", 0)
      return 0;
    }

    console.log(`Fetched ${msgs.length} messages`)

    try {
      let tracksToUnscrobble = msgs.map(msg => Object.assign({ msgId: msg.ReceiptHandle }, JSON.parse(msg.Body)))
      require('./unscrobble').unscrobble(config, tracksToUnscrobble, track => {
        deleteMessage(track.msgId)
      }, (error, track) => {
        // log already sent to console                     
      }).then((ret) => {
        let successes = ret.reduce((a, b) => a + b, 0)
        logMetric("Unscrobbled", successes)
        logMetric("Unscrobble Fails", ret.length - successes)
        console.log("Finished with " + ret.reduce((a, b) => a + b, 0) + "/" + ret.length + " sucesses")
      }).catch(err => console.log(err))
    } catch (err) {
      console.log(err)
    }


  })
}

exports.unscrobbleTrigger = (event, context, callback) => {


  let msgs = event.Records

  console.log(`Fetched ${msgs.length} messages`)

  try {
    let tracksToUnscrobble = msgs.map(msg => Object.assign({ msgId: msg.receiptHandle }, JSON.parse(msg.body)))
    require('./unscrobble').unscrobble(config, tracksToUnscrobble, track => {
      deleteMessage(track.msgId)
    }, (error, track) => {
      // log already sent to console                     
    }).then((ret) => {
      let successes = ret.reduce((a, b) => a + b, 0)
      logMetric("Unscrobbled", successes)
      logMetric("Unscrobble Fails", ret.length - successes)
      console.log("Finished with " + ret.reduce((a, b) => a + b, 0) + "/" + ret.length + " sucesses")
    }).catch(err => console.log(err))
  } catch (err) {
    console.log(err)
  }

}


function logMetric(metricName, value) {
  //[now lets send a metric to cloudwatch]
  // Create parameters JSON for putMetricData
  var params = {
    MetricData: [
      {
        MetricName: metricName,
        Unit: 'None',
        Value: value
      },
    ],
    Namespace: 'LastFM/Unscrobbler'
  };
  cw.putMetricData(params, function (err) {
    if (err) {
      console.log("Error sending metric data", err)
    } else {
      console.log("Sucessfully recorded metric data")
    }
  });
}

function queueTrack(track, index = 0) {
  return new Promise((resolve, reject) => {
    sqs.sendMessage({
      MessageBody: JSON.stringify(track),
      QueueUrl: sqs_url,
      DelaySeconds: 10 * Math.ceil(index / 10)
    }, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err)
      } else {
        console.log(`Track successfully queued, message id: ${data.MessageId}`)
        resolve(data.MessageId)
      }
    });
  })

}






function deleteMessage(receiptHandle) {
  return new Promise((resolve, reject) => {
    var deleteParams = {
      QueueUrl: sqs_url,
      ReceiptHandle: receiptHandle
    };
    sqs.deleteMessage(deleteParams, function (err, data) {
      if (err) reject(err)
      resolve(data)
    });
  })
}

function getMessages(maxNumberOfMessages) {
  return new Promise((resolve, reject) => {
    sqs.receiveMessage({
      QueueUrl: sqs_url,
      MaxNumberOfMessages: maxNumberOfMessages,
      VisibilityTimeout: 60
    }, function (err, data) {
      if (err) reject(err); // an error occurred
      else if (data.Messages) resolve(data.Messages)
      else resolve([])
    })
  })
}