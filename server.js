'use strict';
require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', (req, res) => {
    res.status(200).send("I'm Alive!");
});

app.post('/webhook', function(req, res) {
    let data = req.body;
    switch (data.object) {

        // page subscription
        case 'page':

            // iterate over each entry
            data.entry.forEach((entry) => {
                let pageID = entry.id;
                let timeOfEvent = entry.time;

                console.log('pageID: ', pageID);
                console.log('timeOfEvent: ', timeOfEvent);


                // iterate over each messaging event
                entry.messaging.forEach((event) => {
                    if (event.message) {
                        receivedMessage(event);
                    }
                    else {
                        console.log('webhook received unknown event : ', event);
                    }
                })
            });
    }
    res.sendStatus(200);
});

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientId = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message: ", senderID, recipientId, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;
    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {
        switch (messageText) {
            case 'generic':
                sendGenericMessage(senderID);
                break;

            default:
                sendTextMessage(senderID, messageText);
        }
    }
    else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

function sendGenericMessage(recipientId, messageText) {
    // add later
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    }
    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: process.env.PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: messageData
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
            console.log('Successfully sent generic message with id %s and text \'%s\' to recipient %s', messageId, messageData.message.text, recipientId);
        }
        else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    })
}

app.get('/webhook', function(req, res) {
    // FOR INITIAL VERIFICATION ONLY
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        console.log('validating webhook');
        res.status(200).send(req.query['hub.challenge']);
    }
    else {
        console.log('failed validation');
        res.sendStatus(403);
    }
});


var port = process.env.PORT || 8080;
app.listen(port, function() {
    console.log("server listening on " + port);
});
