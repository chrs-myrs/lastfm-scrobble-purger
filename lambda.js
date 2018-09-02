"use strict"

console.log("Starting")

// Load the SDK for JavaScript
var AWS = require('aws-sdk')
// Set the region 
AWS.config.update({region: 'eu-west-2'})

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'})

var cw = new AWS.CloudWatch({apiVersion: '2010-08-01'})

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
  if(!process.env.hasOwnProperty('pages')) {
    callback("Environment variable 'pages' missing.")
    return
  }

  config.startPage = 1
  config.endPage = process.env.pages
  
  var crawler = require('./crawler')
  crawler(config)

  callback(null, 'OK');
};


function logMetric(metricName, value) {
  //[now lets send a metric to cloudwatch]
  // Create parameters JSON for putMetricData
  var params = {
    MetricData: [
      {
        MetricName: metricName,
        Unit: 'None',
        Value:  value
      },
    ],
    Namespace: 'PartyBuz/ProductSync'
  };
  cw.putMetricData(params, function(err) {
    if (err) {
      console.log("Error sending metric data", err)
    }
  });
}

function queueProduct(pid) {
  return new Promise((resolve, reject) => {
    sqs.sendMessage({
      MessageBody: pid,
      QueueUrl: sqs_url
    }, function(err, data) {
      if (err) {
        console.log("Error", err);
        reject(err)
      } else {
        console.log(`Product ${pid} successfully queued, message id: ${data.MessageId}`)
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
    sqs.deleteMessage(deleteParams, function(err, data) {
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
    }, function(err, data) {
      if (err) reject(err); // an error occurred
      else if(data.Messages) resolve(data.Messages)
      else resolve([])
    })
  })
}