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

                    else if (event.postback) {
                        receivedPostback(event);
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
            case 'test buttons':
                sendTestButtons(senderID);
                break;

            default:
                sendTextMessage(senderID, messageText);
            request({
              uri: 'https://graph.facebook.com/v2.6/' + recipientId + '&access_token=' + process.env.PAGE_ACCESS_TOKEN,
              method: 'GET'
              }, (error, response, body) => {
      if (error) {
        // console.log('error getting profile', error);
        return;
      }
      console.log('body: ', body);

    });
        }
    }
    else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

function sendTestButtons(recipientId) {
    // create structure message
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "Hungry?",
                        subtitle: "for apples?",
                        item_url: "https://www.amazon.com/Mens-Hungry-Apples-shirt-Asphalt/dp/B01M5JUF7H/ref=sr_1_2/144-8639100-9173167?ie=UTF8&qid=1491532456&sr=8-2&keywords=hungry+for+apples",
                        image_url: "https://images-na.ssl-images-amazon.com/images/I/81EpLRXCUJL._UX569_.jpg",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.amazon.com/Mens-Hungry-Apples-shirt-Asphalt/dp/B01M5JUF7H/ref=sr_1_2/144-8639100-9173167?ie=UTF8&qid=1491532456&sr=8-2&keywords=hungry+for+apples",
                            title: "see on Amazon"
                        }, {
                            type: "postback",
                            title: "call postback",
                            payload: "payload for first bubble"
                        }]
                    }, {
                        title: "Hungry again?",
                        subtitle: "for more apples?",
                        item_url: "https://www.amazon.com/Mens-Hungry-Apples-shirt-Asphalt/dp/B01M5JUF7H/ref=sr_1_2/144-8639100-9173167?ie=UTF8&qid=1491532456&sr=8-2&keywords=hungry+for+apples",
                        image_url: "https://images-na.ssl-images-amazon.com/images/I/81EpLRXCUJL._UX569_.jpg",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.amazon.com/Mens-Hungry-Apples-shirt-Asphalt/dp/B01M5JUF7H/ref=sr_1_2/144-8639100-9173167?ie=UTF8&qid=1491532456&sr=8-2&keywords=hungry+for+apples",
                            title: "see on Amazon"
                        }, {
                            type: "postback",
                            title: "call postback",
                            payload: "payload for second bubble"
                        }]
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
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

function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    var payload = event.postback.payload;

      request({
      uri: 'https://graph.facebook.com/v2.6/' + senderID + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + process.env.PAGE_ACCESS_TOKEN,
      method: 'GET'
    }, (error, response, body) => {
      if (error) {
        // console.log('error getting profile', error);
        return;
      }
       var user_info =body;
      sendTextMessage(senderID, "User Info " + user_info);

      console.log('User Info response: ', body);

    });

    console.log("Received postback for user %d and page %d with payload '%s' " + "at %d", senderID, recipientID, payload, timeOfPostback);


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
            console.log('Successfully sent message with id %s to recipient %s', messageId, recipientId);
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
