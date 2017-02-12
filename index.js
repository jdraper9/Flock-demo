var config = require('./config.js');
var flock = require('flockos');
var express = require('express');
var store = require('./store');
var chrono = require('chrono-node');
var Mustache = require('mustache');
var fs = require('fs');

flock.appId = config.appId;
flock.appSecret = config.appSecret;

var app = express();
app.use(flock.events.tokenVerifier);
app.post('/events', flock.events.listener);

app.listen(8080, function() {
	console.log('Listening on 8080')
});

flock.events.on('app.install', function (event, callback) {
	store.saveToken(event.userId, event.token);
	callback();
});

flock.events.on('client.slashCommand', function (event, callback) {
    var r = parseDate(event.text);
    console.log('parse result', r);
    if (r) {
        var alarm = {
            userId: event.userId,
            time: r.date.getTime(),
            text: event.text.slice(r.end).trim()
        };
        console.log('adding alarm', alarm);
        addAlarm(alarm);
        callback(null, { text: 'Alarm added' });
    } else {
        callback(null, { text: 'Alarm time not specified' });
    }
});

var parseDate = function (text) {
    var r = chrono.parse(text);
    if (r && r.length > 0) {
        return {
            date: r[0].start.date(),
            start: r[0].index,
            end: r[0].index + r[0].text.length
        };
    } else {
        return null;
    }
};

var addAlarm = function (alarm) {
    store.addAlarm(alarm);
    scheduleAlarm(alarm);
};

var scheduleAlarm = function (alarm) {
    var delay = Math.max(0, alarm.time - new Date().getTime());
    setTimeout(function () {
        sendAlarm(alarm);
        store.removeAlarm(alarm);
    }, delay);
};

// schedule all alarms saved in db
store.allAlarms().forEach(scheduleAlarm);

var widgetTemplate = fs.readFileSync('widget.mustache.html', 'utf8');
app.get('/widget', function (req, res) {
    // var event = JSON.parse(req.query.flockEvent);
    // var alarms = store.userAlarms(event.userId).map(function (alarm) {
    //     return {
    //         text: alarm.text,
    //         timeString: new Date(alarm.time).toLocaleString()
    //     }
    // });
    res.set('Content-Type', 'text/html');
    var body = Mustache.render(widgetTemplate);
    res.send(body);
});

var sendAlarm = function (alarm) {
	attachment = 
    flock.chat.sendMessage(config.botToken, {
        to: alarm.userId,
        text: alarm.text,
        attachments: [{
    "title": "attachment title",
    "description": "attachment description",
    "views": {
        "widget": { "src": "https://31c7f464.ngrok.io/widget", "width": 400, "height": 400 }
    }
	}] 
    });
};