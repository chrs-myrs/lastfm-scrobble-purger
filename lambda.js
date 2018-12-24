"use strict"

console.log("Starting")

// Load the SDK for JavaScript
var AWS = require('aws-sdk')
// Set the region 
AWS.config.update({ region: 'eu-west-2' })

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' })
var cw = new AWS.CloudWatch({ apiVersion: '2010-08-01' })



const yaml = require('js-yaml')
const fs = require('fs')

if (!process.env.hasOwnProperty('sqs_url')) {
  console.error("Environment variable 'sqs_url' missing.")
  process.abort()
}

const sqs_url = process.env.sqs_url

function getConfigPromise() {
  return getConfigFileAsStringPromise().then(data => {
    var config = yaml.safeLoad(data)
    if (process.env.hasOwnProperty('config'))
      Object.assign(config, JSON.parse(process.env.config))
    return config
  })
}

function getConfigFileAsStringPromise() {
  if (process.env.hasOwnProperty('s3_config_url')) {
    
    const s3 = new AWS.S3();
    var url = require('url').parse(process.env.s3_config_url)
    console.log("Loading config file from: "+url.href)

    let protocol = url.protocol.replace(':', '')
    if (protocol !== "s3") throw new Error("Protocol " + protocol + " not supported. [Supported: s3]")

    let params = {
      Bucket: url.hostname,
      Key: url.pathname.substr(1)
    }

    return s3.getObject(params).promise().then(res => res.Body.toString()).catch(err => {throw err})

  } else {
    return new Promise(function (resolve, reject) {
      fs.readFile('config.yml', 'utf8', (err, data) => {
        err ? reject(err) : resolve(data)
      });
    })
  }
}


/**
 * @typedef {Object} env - creates a new type named 'SpecialType'
 * @property {string} sqs_url - a number property of SpecialType
 */

exports.crawler = (event, context, callback) => {

  getConfigPromise().then(config => {
    config.startPage = 1
    config.endPage = config.pages || 1

    const crawler = require('./crawler')
    crawler.crawl(config).then(
      tracks => queueTracks(tracks)
    ).then(res => {
      let tracksQueued = res.reduce((a, b) => a + b, 0)

      callback(null, 'Queued ' + tracksQueued + ' tracks on SQS.')
      logMetric('Queued', tracksQueued)
    }).catch(err => {
      callback(err)
    })
  })


};

exports.unscrobbler = (event, context, callback) => {
  getConfigPromise().then(config => {
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
      console.log("Finished with " + successes + "/" + ret.length + " sucesses")
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

function queueTracks(tracks) {
  var promises = []
  var delay = 0
  while (tracks.length) {
    promises.push(new Promise((resolve, reject) => {
      let entries = tracks.splice(0, 10).map((track, i) => ({
        Id: i + '-' + track.timestamp,
        MessageBody: JSON.stringify(track),
        DelaySeconds: delay
      }))
      sqs.sendMessageBatch({
        Entries: entries,
        QueueUrl: sqs_url
      }, function (err, data) {
        if (err) {
          console.log("Error", err);
          reject(err)
        } else {
          console.log("Tracks successfully queued, message ids: " + data.Successful.map(res => res.Id).join(', '))
          resolve(data.Successful.length)
        }
      })
    }))
    delay += 10
  }

  return Promise.all(promises)
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