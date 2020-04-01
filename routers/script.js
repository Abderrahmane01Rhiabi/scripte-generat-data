const express = require('express');
const router = express.Router();
var mqtt = require('mqtt');
const thingsboardHost = "demo.thingsboard.io";
// Reads the access token from arguments
const accessToken = "WHWNzii8l9CdXUhAdVAO";

//Models
const Capteur = require('../modules/capteurs');
const Weather = require('../modules/weather');

router.post('/weatherData',(req,res) =>{
    Capteur.find({}).exec()
    .then(result => {
            if(!result){
                return res.status(409).json({
                    message : 'Capteur Is Not Existe'
                });
            }
            else{
                console.log(result)
                console.log(result.length)


                    const minTemperature = 17.5, maxTemperature = 30, minHumidity = 12, maxHumidity = 90;

                    // Initialization of temperature and humidity data with random values
                    var data = {
                        temperature: minTemperature + (maxTemperature - minTemperature) * Math.random() ,
                        humidity: minHumidity + (maxHumidity - minHumidity) * Math.random()
                    };

                    // Initialization of mqtt client using Thingsboard host and device access token
                    console.log('Connecting to: %s using access token: %s', thingsboardHost, accessToken);
                    var client  = mqtt.connect('mqtt://'+ thingsboardHost, { username: accessToken });
                    console.log('mqtt://'+ thingsboardHost, { username: accessToken })

                    // Triggers when client is successfully connected to the Thingsboard server

                    client.on('connect', function () {
                        console.log('Client connected!');
                        client.publish('v1/devices/me/attributes', JSON.stringify({"firmware_version":"1.0.1"}));
                        console.log('Uploading temperature and humidity data evry 5 min...');
                        setInterval(publishTelemetry, 5*60*1000);
                    });
                    // client.off('disconnect',function(){
                    //     console.log('Stop sending data');
                    // })
                    // Uploads telemetry data using 'v1/devices/me/telemetry' MQTT topic
                    function publishTelemetry() {
                        for(var i=0;i<result.length;i++)    {

                        data.temperature = genNextValue(data.temperature, minTemperature, maxTemperature);
                        data.humidity = genNextValue(data.humidity, minHumidity, maxHumidity);
                        client.publish('v1/devices/me/telemetry', JSON.stringify(data));
                        console.log('v1/devices/me/telemetry', JSON.stringify(data))
                        var d = {
                            "temp" : data.temperature,
                            "humidite" : data.humidity,
                            "macAddCapt" : result[i].macAddr
                        }
                        console.log(result[i].macAddr)
                         var newData = new Weather(d)
                         newData.save()
                         .then(err => {
                            if(err) return err; 
                             res.status(200).json({
                                 message : "data arrive"
                             })
                        })
                        .catch(err => {
                                console.log(err);
                                res.status(500).json({
                                    error : err
                                });
                            })

                    }

                    // Generates new random value that is within 3% range from previous value
                    function genNextValue(prevValue, min, max) {
                        var value = prevValue + ((max - min) * (Math.random() - 0.5)) * 0.03;
                        value = Math.max(min, Math.min(max, value));
                        return Math.round(value * 10) / 10;
                    }

                    //Catches ctrl+c event
                    process.on('SIGINT', function () {
                        console.log();
                        console.log('Disconnecting...');
                        client.end();
                        // res.status(200).json({
                        //     message : "data arrive"
                        // })
                        console.log('Exited!');
                        process.exit(2);
                    });

                    //Catches uncaught exceptions
                    process.on('uncaughtException', function(e) {
                        console.log('Uncaught Exception...');
                        console.log(e.stack);
                        process.exit(99);
                    });
                // var data = {
                //     "macAddCapt" : req.params.macAddCapt,
                //     "temp" : req.params.temp,
                //     "humidite" : req.params.humi 
                // }
                // var newData = new Weather(data)
            }
        
        }
    }).catch(err =>{
         res.status(500).json({
            error : err
        });
     })
 })

module.exports = router;