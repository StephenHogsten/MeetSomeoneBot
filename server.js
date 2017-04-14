'use strict';
require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var EventSearch = require('facebook-events-by-location-core');

var app = express();

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({
    extended: true
}));
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));

passport.use(new Strategy({
        clientID: '406891689679457',
        clientSecret: '77ae45309a9d5fa290c294578ef834e9',
        callbackURL: 'https://ab210d06.ngrok.io/login/facebook/return',
        profileFields: ['id', 'name', 'email', 'age_range', 'gender', 'timezone', 'picture', 'friends']
    },
    function (accessToken, refreshToken, profile, cb) {
        // In this example, the user's Facebook profile is supplied as the user
        // record.  In a production-quality application, the Facebook profile should
        // be associated with a user record in the application's database, which
        // allows for account linking and authentication with other identity
        // providers.
        return cb(null, profile);
    }));

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});


var es = new EventSearch({
    "lat":36.169941,
    "lng": -115.139830,
    "accessToken": "EAAFyENqgGmEBANjgJbXaL9qUYxZBCbKfqogks4ZBHWhixxBQwG1pK2gfM7QuVakiobgLDuXcanHIEnBiYD03bwJVOCgpGHC9mfH91IfkqCPl7UgNwp99FGfYn5ZBqQ7XFpJwLHkRbn21Ule9yZAZBZAXeyzqeWewJbRFxQABf9cAZDZD"
});
es.search().then(function (events) {
    console.log(JSON.stringify(events));
}).catch(function (error) {
    console.error(JSON.stringify(error));
});

app.post('/webhook', function (req, res) {
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
                    } else if (event.postback) {
                        receivedPostback(event);
                    } else {
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
            case 'btn':
                sendTestButtons(senderID);
                break;

            case 'info':
                getUserInfo(senderID);
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
    } else if (messageAttachments) {
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
                        title: "test",
                        image_url: "https://images-na.ssl-images-amazon.com/images/I/81EpLRXCUJL._UX569_.jpg",
                        buttons: [{
                            type: "account_link",
                            url: "https://ab210d06.ngrok.io/login/facebook/",
                        }]
                    }, ]
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
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
            console.log('Successfully sent message with id %s to recipient %s', messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    })
}

function getUserInfo(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
        request({
            uri: 'https://graph.facebook.com/v2.6/' + senderID + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + process.env.PAGE_ACCESS_TOKEN,
            method: 'GET',
            json: messageData
        }, function (error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the Google homepage.

        })
}



app.get('/webhook', function (req, res) {
    // FOR INITIAL VERIFICATION ONLY
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        console.log('validating webhook');
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.log('failed validation');
        res.sendStatus(403);
    }
});


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');



// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


// Define routes.
app.get('/',
    function (req, res) {
        res.render('home', {
            user: req.user
        });
    });

app.get('/login',
    function (req, res) {
        res.render('login');
    });

app.get('/login/facebook',
    passport.authenticate('facebook', {
        scope: ['public_profile', 'email', 'user_friends']
    })
);

app.get('/login/facebook/return',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/');
    });

app.get('/profile',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        res.render('profile', {
            user: req.user
        });
    });

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

var port = process.env.PORT || 8080;

app.listen(port, function () {
    console.log("server listening on " + port);
    });