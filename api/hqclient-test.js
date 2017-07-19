/*global console require module*/
'use strict';
var bodyParser = require('body-parser');
var express = require('express');
var firebase = require('firebase');
var should = require('should');
var format = require('string-format');
var request = require('request');
var logfile = require('fs');
// This postgres dependency
var pg = require('pg');
var config = require('../models/config');
var general = require('./general');
var helper = require('./helper');
var moment = require('moment');

// var dbUtils = require('../models/dbUtils');

// Server Details
var server_ip_address = "";
var server_port = '';
var response_lock_status;
var current_order_number;
var current_order_number_createddate;
var previous_order_number;
var previous_order_number_createddate;
var current_formatted_date;
var json_ordernumber_array = {};
var current_ordernumber_details;
var mobileapp_outlets = [];



// // For Local - Client
//var conString = "postgres://atchayam:foodbox123@192.168.0.87:5432/foodbox_singapore";                                                                  
//var firebase_connection = "https://atchayam-dev.firebaseio.com";
//var firebase_connection_outlet = "https://atchayam-dev.firebaseio.com";
//var imagepath = process.env.IMAGES_FOLDER;
//server_ip_address = "103.21.76.186";
//server_port = '9099';
//var router = express();


//// // For Live - Atchayam-gofrugal
//var conString = "postgres://atchayam:foodbox123@localhost/foodbox";
//var firebase_connection = "https://atp-chat.firebaseio.com";
//var firebase_connection_outlet = "https://torrid-fire-8553.firebaseio.com";
//var imagepath = process.env.IMAGES_FOLDER;
//server_ip_address = "atchayam.gofrugal.com";
//server_port = '9099';
//var router = express();


//// // For Live - Atchayam-gofrugal - Test server
//var conString = "postgres://atchayam:foodbox123@localhost/foodbox";
//var firebase_connection = "https://atctesthq2.firebaseio.com";
//var firebase_connection_outlet = "https://atctestoutlet2.firebaseio.com";
//var imagepath = process.env.IMAGES_FOLDER;
//server_ip_address = "115.114.95.49";
//server_port = '9099';
//var router = express();


// // For Local - Shlok
//var conString = "postgres://atchayam:foodbox123@192.168.0.87:5432/foodboxdev";
//var firebase_connection = "https://atcpaymentstage.firebaseio.com";
//var firebase_connection_outlet = "https://atcorderstage.firebaseio.com";
//var imagepath = process.env.IMAGES_FOLDER;
//server_ip_address = "192.168.0.141";
//server_port = '9500';
//var router = express();


// // For Singapore
//var conString = "postgres://atchayam:foodbox123@192.168.1.97:5432/f25dayend";
//var firebase_connection = "https://atp-sg-chat.firebaseio.com";
//var firebase_connection_outlet = "https://atchayam-outlet.firebaseio.com";
//var imagepath = process.env.IMAGES_FOLDER;
//server_ip_address = "192.168.1.97";
//server_port = '9099';
//var router = express();

// For Muthu system
//var conString = "postgres://atchayam:foodbox123@localhost/f25dayend";
//var firebase_connection = "https://atp-sg-chat.firebaseio.com";
//var firebase_connection_outlet = "https://atchayam-outlet.firebaseio.com";
//var imagepath = process.env.IMAGES_FOLDER;
//server_ip_address = "1.23.70.170";
//server_port = '9099';
//var router = express();


// // For live server - Read from .bootstraprc file
var conString = config.dbConn;
var firebase_connection = process.env.FIREBASE_CONN;
var firebase_connection_outlet = process.env.FIREBASE_CONN_OUTLET;
var imagepath = process.env.IMAGES_FOLDER;
server_ip_address = process.env.LOCAL_IP;
server_port = process.env.SERVER_PORT;
var listen_port = process.env.LISTEN_PORT;
var router = express();

//var router = express.Router();

// general.genericError("conString: " + conString + "\n firebase_connection: " + firebase_connection);

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use("/images", express.static(__dirname + '/images'));

// symbolic link
router.use("/linkimages", express.static(__dirname + '/linkimages'));

var rootref = new firebase(firebase_connection);

// to create a server for temporary use

// to hit this server use http://localhost:9099

//// // For local - client
//router.listen(9091, function () {
//    general.genericError('Example router listening on port 9091!'); 
//});

//// // For Live - Atchayam-gofrugal
//router.listen(9091, function () {
//    general.genericError('Example router listening on port 9091!');
//});

//// // For Live - Atchayam-gofrugal - Test server
//router.listen(9091, function () {
//    general.genericError('Example router listening on port 9091!');
//});

//// // For MUTHU
//router.listen(9091, function () {
//    general.genericError('Example router listening on port 9091!');
//});

// // For local - shlok
router.listen(9091, function () {
    general.genericError('Example router listening on port 9091' );
});

// // For Singapore
//router.listen(9091, function () {
//    general.genericError('Example router listening on port 9091!'); 
//});

format.extend(String.prototype);

var client = new pg.Client(conString);
client.connect();

GetMobileAppOutlets();

// Get mobile app outlets every 1 min
setInterval(GetMobileAppOutlets, 60 * 1000);

var success_status = "SUCCESS";
var fail_status = "FAIL";
var no_data_found = "NO DATA FOUND";

var output = '';
var message_text = '';
var status_text = '';
var context = '';



var handleError = function (msg) {
    general.genericError("api.js :: " + msg);
};

//var query = client.query("SELECT * FROM outlet");
////fired after last row is emitted

//query.on('row', function (row) {
//    // general.genericError(row);
//});

//query.on('end', function () {
//    // client.end();
//});

router.get('/', function (req, res) {
    try
    {
        ClearContext();
        GetOutlets(req, res);
    } catch (e)
    {
        general.genericError("api.js :: outlets: " + e);
    }
});

router.get('/outlets', function (req, res) {
    try
    {
        ClearContext();
        GetOutlets(req, res);
    } catch (e)
    {
        general.genericError("api.js :: outlets: " + e);
    }
});

function GetOutlets(req, res) {
    try
    {
        // general.genericError("GetOutlets: " + JSON.stringify(req.body));
        // general.genericError(new Buffer("1234").toString('base64'));
        //general.genericError(new Buffer("MTIzNA ==", 'base64').toString('ascii')) // 1234    
        //general.genericError(new Buffer("MTIz", 'base64').toString('ascii')) // 123

        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                client.query('SELECT * FROM Outlet', function (query_err, result) {
                    try
                    {
                        if (query_err)
                        {
                            handleError('error running query' + query_err);
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { user: output, message: message_text, status: status_text };
                            res.send(context);
                            return;
                        }

                        // releasing the connection
                        done();

                        if (result)
                        {
                            output = result.rows;
                            message_text = result.rows.length;
                            status_text = success_status;
                        }
                        else
                        {
                            output = '';
                            message_text = no_data_found;
                            status_text = fail_status;
                        }

                        context = { outlets: output, message: message_text, status: status_text };
                        res.json(context);
                        return;
                    } catch (e)
                    {
                        general.genericError("api.js :: GetOutlets: " + e);
                    }
                });
            } catch (e)
            {
                general.genericError("api.js :: GetOutlets: " + e);
            }
        });
    }
    catch (e)
    {
        general.genericError("api.js :: GetOutlets: " + e);
    }
}

router.post('/login', function (req, res) {
    try
    {
        general.genericError("Login: " + JSON.stringify(req.body));
        ClearContext();
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { userdetails: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // read username and password  
                var request = req.body;
                var username = request.mobileno;
                var password = request.password;

                // decrypt the password
                // var decypt_password = new Buffer(password).toString('base64');
                // general.genericError("Username: " + username + " Password: " + password);

                // connect with database and check whether user exists       

                client.query('Select * from users \
                      where username = $1 and password_hash = $2 and isaccepted=true LIMIT 1 ', [username, password],
                          function (query_err, result) {
                              try
                              {
                                  if (query_err)
                                  {
                                      handleError('error running query' + query_err);
                                      message_text = no_data_found;
                                      status_text = fail_status;
                                      context = { userdetails: output, message: message_text, status: status_text };
                                      res.send(context);
                                      return;
                                  }

                                  // releasing the connection
                                  done();

                                  // general.genericError("UserId: " + result.rows.length);
                                  // general.genericError("UserId: " + result.rows[0].id);

                                  if (result.rows.length != 0)
                                  {
                                      var userid = result.rows[0].id;
                                      var query_login = 'select row_to_json(t) ' +
                                                    'from (' +
                                                    'select uuid_generate_v1() as token,' +
                                                    '(' +
                                                    'select array_to_json(array_agg(row_to_json(d))) ' +
                                                    'from (' +
                                                    'select distinct(o.city) from outlet o  ' +
                                                    'order by o.city ' +
                                                    ') d ' +
                                                    ') as citylist ' +
                                                    'from users u ' +
                                                    'where u.username=\'' + username + '\' and u.password_hash=\'' + password + '\' ' +
                                                    ')as t LIMIT 1';

                                      // general.genericError(query_login);

                                      // Delete old tokens
                                      client.query('delete from tokens where userid =$1', [userid],
                                      function (query_err, result) {
                                          try
                                          {
                                              if (query_err)
                                              {
                                                  handleError('error running query' + query_err);
                                                  message_text = no_data_found;
                                                  status_text = fail_status;
                                                  context = { userdetails: output, message: message_text, status: status_text };
                                                  res.send(context);
                                                  return;
                                              }
                                          } catch (e)
                                          {
                                              general.genericError("api.js :: login: " + e);
                                          }
                                      });

                                      // Save new token to database
                                      client.query(query_login, function (query_err1, resulttoken) {
                                          try
                                          {
                                              var token_result = resulttoken.rows[0].row_to_json.token;
                                              // general.genericError("Token: " + token_result);

                                              var expirydate = new Date();
                                              expirydate.setDate(expirydate.getDate() + 1);
                                              client.query("insert into tokens(userid,token,expirydate) \
                        values ($1,$2,$3)", [userid, token_result, expirydate],
                                                      function (query_err, resultquery) {
                                                          try
                                                          {
                                                              if (query_err)
                                                              {
                                                                  handleError('error running query' + query_err);
                                                                  message_text = no_data_found;
                                                                  status_text = fail_status;
                                                                  context = { userdetails: output, message: message_text, status: status_text };
                                                                  res.send(context);
                                                                  return;
                                                              }

                                                              // output = resulttoken.rows[0];                                                                                                         
                                                              output: result.rows;
                                                              message_text = "Login Successfully";
                                                              status_text = success_status;

                                                              context = { userdetails: result.rows, message: message_text, status: status_text };
                                                              res.send(context);
                                                              return;
                                                          } catch (e)
                                                          {
                                                              general.genericError("api.js :: login: " + e);
                                                          }
                                                      });
                                          } catch (e)
                                          {
                                              general.genericError("api.js :: login: " + e);
                                          }
                                      });

                                  }
                                  else
                                  {
                                      output = 0;
                                      message_text = "Username or password is incorrect";
                                      status_text = fail_status;

                                      context = { userdetails: output, message: message_text, status: status_text };
                                      res.send(context);
                                      return;
                                  }
                              } catch (e)
                              {
                                  general.genericError("api.js :: login: " + e);
                              }
                          });
            }
            catch (e)
            {
                general.genericError("api.js :: login: " + e);
            }
        });
    }
    catch (e)
    {
        general.genericError("api.js :: login: " + e);
    }
});

router.get('/getorderhistory/:mobileno', function (req, res) {
    general.genericError("api.js :: getorderhistory: " + JSON.stringify(req.params));
    try
    {
        general.genericError("getorderhistory: " + JSON.stringify(req.params));
        ClearContext();

        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { orderhistory: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                var mobileno = req.params.mobileno;

                var query_orderhistory = 'select  order_history from users_history where mobileno = $1';
                // var query_orderhistory = 'select  json_object_keys(order_history) from users_history where mobileno = $1';

                // Save Tokens to database
                client.query(query_orderhistory, [mobileno], function (query_err, resultorderhistory) {
                    try
                    {
                        if (query_err)
                        {
                            handleError('error running query' + query_err);
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { orderhistory: output, message: message_text, status: status_text };
                            res.send(context);
                            return;
                        }

                        // releasing the connection
                        done();

                        if (resultorderhistory.rows.length > 0)
                        {
                            // general.genericError(JSON.stringify(resultorderhistory.rows[0]));
                            output = resultorderhistory.rows[0].order_history;
                            message_text = resultorderhistory.rows.length;
                            status_text = success_status;
                        }
                        else
                        {
                            output = '';
                            message_text = no_data_found;
                            status_text = fail_status;
                        }
                    }
                    catch (e)
                    {
                        general.genericError("api.js :: getorderhistory: " + e);
                    }

                    context = { orderhistory: output, message: message_text, status: status_text };
                    res.send(context);
                    return;

                });

            }
            catch (e)
            {
                general.genericError("api.js :: getorderhistory: " + e);
            }
        });
    }
    catch (e)
    {
        general.genericError("api.js :: getorderhistory: " + e);
    }
});

router.post('/forgotpassword', function (req, res) {
    try
    {
        general.genericError("forgotpassword: " + JSON.stringify(req.body));
        ClearContext();
        // read mobile no
        var request = req.body;
        var mobileno;
        var userid;

        var mobileno = request.mobileno;

        // Get user details
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { referenceno: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // sends one time password to mobileno
                // one time registration process.                            
                if (mobileno != null && mobileno.length == 10)
                {

                    client.query('select id from users where mobileno=$1', [mobileno],
                                     function (query_err, result_register_user) {
                                         if (query_err)
                                         {
                                             handleError('error running query' + query_err);
                                             message_text = no_data_found;
                                             status_text = fail_status;
                                             context = { user: output, message: message_text, status: status_text };
                                             res.send(context);
                                             return;
                                         }

                                         if (result_register_user.rows.length > 0)
                                         {
                                             var otp = GenerateRandomNumber(6);
                                             var referenceno = mobileno + GenerateRandomNumber(8);
                                             // Save otp and mobileno in Firebase
                                             rootref.child('users').child(referenceno).set({ "mobileno": mobileno, "otp": otp, "referenceno": referenceno });

                                             // Send OTP
                                             // SendSMS(mobileno, otp);

                                             //var message = "OTP for Foodbox update password is ('" + otp + "') and is valid for 30  Minutes (Generated at '" + general.GetFormattedDateDDMMYYYY_HHMMSS(); +"')";
                                             var message = "OTP for Foodbox update password is " + otp + " and is valid for 30  Minutes (Generated at " + general.GetFormattedDateDDMMYYYY_HHMMSS() + ")";
                                             SendSMS(mobileno, message);

                                             output = referenceno;
                                             message_text = "OTP sent successfully";
                                             status_text = success_status;
                                             context = { referenceno: output, message: message_text, status: status_text };
                                             res.send(context);
                                             return;
                                         }
                                         else
                                         {
                                             output = 0;
                                             message_text = "No user registered for given mobile number. Please check the mobile number";
                                             status_text = fail_status;

                                             context = { referenceno: output, message: message_text, status: status_text };
                                             res.send(context);
                                             return;
                                         }
                                     });
                }
                else
                {
                    message_text = "In-valid mobile number";
                    status_text = fail_status;
                    context = { referenceno: '', message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
            } catch (e)
            {
                general.genericError("api.js :: forgotpassword: " + e);
            }
        });
    }
    catch (e)
    {
        general.genericError("api.js :: forgotpassword: " + e);
    }
});

router.post('/confirmotp', function (req, res) {
    try
    {
        general.genericError("confirmotp: " + JSON.stringify(req.body));
        ClearContext();
        // read mobile no
        var request = req.body;
        var otp = request.otp;
        var referenceno = request.referenceno;
        var otp_firebase = '';
        var mobileno_firebase;
        var referenceno_firebase;

        //rootref.once("value", function (snapshot) {
        //    var rootkey = snapshot.exists();
        //    var child1 = false;
        //    var child2 = false;

        //    general.genericError("Root");
        //    if (rootkey === true)
        //    {
        //        child1 = snapshot.child("users").exists();
        //        general.genericError("Child 1");
        //        child2 = snapshot.child("users").child(referenceno).exists();

        //        if(child2 === true)
        //        {
        //            general.genericError("Child 2");
        //        }
        //    }
        //});

        if (referenceno != null)
        {
            // read otp from firebase
            rootref.child('users').child(referenceno).on('value', function (snapshot) {
                try
                {
                    // general.genericError("Mobile no from Firebase: " + referenceno);    

                    snapshot.forEach(function (childSnapshot) {
                        var key = childSnapshot.key();
                        var value = childSnapshot.val();

                        switch (key)
                        {
                            case 'otp':
                                otp_firebase = value;
                                break;
                            case 'mobileno':
                                mobileno_firebase = value;
                                break;
                            case 'referenceno':
                                referenceno_firebase = value;
                                break;
                            default:
                                break;
                        }
                    });

                    if (otp_firebase != null && referenceno_firebase != null)
                    {

                        // Check user typed OTP with saved firebase OTP
                        general.genericError("OTP: " + otp + " otp_firebase:" + otp_firebase + " referenceno: " + referenceno + " referenceno_firebase: " + referenceno_firebase);
                        if (otp != otp_firebase || referenceno != referenceno_firebase)
                        {
                            rootref.child('users').child(referenceno).set({ "mobileno": mobileno_firebase, "otp": otp_firebase, "referenceno": referenceno });
                            output = referenceno;
                            message_text = "OTP do not match. Confimation failed.";
                            status_text = fail_status;
                            context = { referenceno: output, message: message_text, status: status_text };
                            res.send(context);
                            return;
                        }

                        output = referenceno;
                        message_text = "OTP validated successfully.";
                        status_text = success_status;
                        context = { referenceno: output, message: message_text, status: status_text };
                        res.send(context);
                        return;
                    }
                } catch (e)
                {
                    general.genericError("api.js :: confirmotp: " + e);
                }
            });
        }
    } catch (e)
    {
        general.genericError("api.js :: confirmotp: " + e);
    }
});

router.post('/changepassword', function (req, res) {
    try
    {
        general.genericError("changepassword: " + JSON.stringify(req.body));

        ClearContext();
        // read mobile no
        var request = req.body;
        //var mobileno = request.mobileno;
        var password = request.password;
        var referenceNumber = request.referenceNumber;
        var otp = request.otp;
        var referenceNumber_firebase;
        var otp_firebase;
        var mobileNo_firebase;
        var userid;


        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                rootref.child('users').child(referenceNumber).on('value', function (snapshot) {
                    try
                    {
                        snapshot.forEach(function (childSnapshot) {
                            var key = childSnapshot.key();
                            var value = childSnapshot.val();

                            switch (key)
                            {
                                case 'otp':
                                    otp_firebase = value;
                                    break;
                                case 'mobileno':
                                    mobileNo_firebase = value;
                                    break;
                                case 'referenceno':
                                    referenceNumber_firebase = value;
                                    break;
                                default:
                                    break;
                            }
                        });

                        if (otp_firebase != null && referenceNumber_firebase != null)
                        {
                            // Check user typed OTP with saved firebase OTP
                            general.genericError("OTP: " + otp + " otp_firebase:" + otp_firebase + " referenceno: " + referenceNumber + " referenceno_firebase: " + referenceNumber_firebase + " mobileNo_firebase: " + mobileNo_firebase);
                            if (otp == otp_firebase && referenceNumber == referenceNumber_firebase)
                            {
                                if (mobileNo_firebase.length == 10)
                                {
                                    general.genericError("mobileNo_firebase: " + mobileNo_firebase);
                                    client.query('select id from users where mobileno=$1', [mobileNo_firebase],
                 function (query_err, resultuser) {
                     if (query_err)
                     {
                         handleError('error running query' + query_err);
                         message_text = no_data_found;
                         status_text = fail_status;
                         context = { user: output, message: message_text, status: status_text };
                         res.send(context);
                         return;
                     }

                     // releasing the connection
                     done();

                     general.genericError("resultuser.rows.length: " + resultuser.rows.length);
                     if (resultuser.rows.length != 0)
                     {
                         general.genericError("resultuser.rows.length 1: " + resultuser.rows.length);
                         client.query('update users set password_hash=$1 \
                                  where mobileno = $2 RETURNING id', [password, mobileNo_firebase],
                                       function (query_err, result) {
                                           try
                                           {
                                               if (query_err)
                                               {
                                                   handleError('error running query' + query_err);
                                                   message_text = no_data_found;
                                                   status_text = fail_status;
                                                   context = { user: output, message: message_text, status: status_text };
                                                   res.send(context);
                                                   return;
                                               }

                                               userid = result.rows[0].id;
                                               // general.genericError("UserId: " + userid + " Count: " + result.rows.length);


                                               client.query('delete from tokens where userid =$1', [userid],
                                             function (query_err, result) {
                                                 if (query_err)
                                                 {
                                                     handleError('error running query' + query_err);
                                                     message_text = no_data_found;
                                                     status_text = fail_status;
                                                     context = { user: output, message: message_text, status: status_text };
                                                     res.send(context);
                                                     return;
                                                 }
                                             });

                                               output = userid;
                                               message_text = "Password changed susscessfully. Please Login again.";
                                               status_text = success_status;
                                               context = { user: output, message: message_text, status: status_text };
                                               res.send(context);
                                               return;
                                           } catch (e)
                                           {
                                               general.genericError("api.js :: changepassword: " + e);
                                           }
                                       });
                     }
                     else
                     {
                         output = 0;
                         message_text = "No user registered for given mobile number. Please check the mobile number";
                         status_text = fail_status;

                         context = { user: output, message: message_text, status: status_text };
                         res.send(context);
                         return;
                     }
                 });
                                }
                                else
                                {
                                    message_text = "In-valid mobile number";
                                    status_text = fail_status;
                                    context = { referenceno: referenceNumber, message: message_text, status: status_text };
                                    res.send(context);
                                    return;
                                }
                            }
                            else
                            {
                                message_text = "Given data's are in-correct";
                                status_text = fail_status;
                                context = { referenceno: referenceNumber, message: message_text, status: status_text };
                                res.send(context);
                                return;
                            }
                        }
                    } catch (e)
                    {
                        general.genericError("api.js :: confirmotp: " + e);
                    }
                });

            } catch (e)
            {
                general.genericError("api.js :: changepassword: " + e);
            }
        });

    } catch (e)
    {
        general.genericError("api.js :: changepassword: " + e);
    }
});

router.get('/getcities', function (req, res) {
    try
    {
        ClearContext();
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                var query_cities = 'select distinct(o.city),c.name from city c join outlet o on c.short_name = o.city where o.active = true';

                // Save Tokens to database
                client.query(query_cities, function (query_err, resultcities) {
                    try
                    {
                        if (query_err)
                        {
                            handleError('error running query' + query_err);
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { cities: output, message: message_text, status: status_text };
                            res.send(context);
                            return;
                        }

                        // releasing the connection
                        done();
                        if (resultcities.rows.length > 0)
                        {
                            output = resultcities.rows;
                            message_text = resultcities.rows.length;
                            status_text = success_status;
                            context = { cities: output, message: message_text, status: status_text };
                            res.send(context);
                            return;
                        }
                        else
                        {
                            output = '';
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { cities: output, message: message_text, status: status_text };
                            res.send(context);
                            return;
                        }
                    } catch (e)
                    {
                        general.genericError("api.js :: getcities: " + e);
                    }
                });
            } catch (e)
            {
                general.genericError("api.js :: getcities: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: getcities: " + e);
    }
});

router.post('/registernewuser', function (req, res) {
    general.genericError("registernewuser: " + JSON.stringify(req.body));

    ClearContext();

    // general.genericError(new Buffer("123").toString('base64'));
    // general.genericError(new Buffer("MTIz", 'base64').toString('ascii'))
    pg.connect(conString, function (err, client, done) {
        if (err)
        {
            handleError('error fetching client from pool' + err);
            message_text = no_data_found;
            status_text = fail_status;
            context = { user: output, message: message_text, status: status_text };
            res.send(context);
            return;
        }

        // save the data to database
        // This is the no. of initial params upon which more are dynamically added

        // read name,mobileno,userid,password,
        var token = '';
        var reg_userid = 0;
        var num_parameters = 8;

        var request = req.body;
        var name = request.name;
        var userid = request.userid;
        var password = request.password;
        var email = request.email;
        var mobileno = request.mobileno;
        var address = request.address;
        var isaccepted = false;

        // general.genericError("Name: " + name + " Userid: " + userid + " Mobileno: " + mobileno);

        client.query('insert into users(full_name, username, password_hash, email, mobileno, address, isaccepted) \
                        values($1,$2,$3,$4,$5,$6,$7) \
                        RETURNING id',
                        [name, userid, password, email, mobileno, address, isaccepted],
                        function (query_err, atpresult) {
                            if (query_err)
                            {
                                handleError('error running query' + query_err);
                                message_text = no_data_found;
                                status_text = fail_status;
                                context = { user: output, message: message_text, status: status_text };
                                res.send(context);
                                return;
                            }

                            // releasing the connection
                            done();
                            // general.genericError("Returning Id: " + atpresult.rows[0].id);
                            reg_userid = atpresult.rows[0].id;

                            // one time registration process.                            
                            if (reg_userid)
                            {
                                var otp = GenerateRandomNumber(6);
                                var referenceno = mobileno + GenerateRandomNumber(8);

                                // general.genericError("Generated OTP:" + otp);
                                // Save otp and mobileno in Firebase
                                rootref.child('users').child(referenceno).set({ "userid": reg_userid, "mobileno": mobileno, "otp": otp });
                                // general.genericError("Data saved to firebase");

                                var message = "OTP for Foodbox update password is " + otp + " and is valid for 30  Minutes (Generated at " + general.GetFormattedDateDDMMYYYY_HHMMSS() + ")";
                                SendSMS(mobileno, message);

                                output = referenceno;
                                message_text = "OTP sent successfully";
                                status_text = success_status;

                                context = { referenceno: output, message: message_text, status: status_text };
                                res.send(context);
                                return;
                            }
                        });
    });
});

router.post('/updateuser', function (req, res) {
    try
    {
        general.genericError("Update User: " + JSON.stringify(req.body));
        ClearContext();
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // save the data to database
                // This is the no. of initial params upon which more are dynamically added

                // read name,mobileno,userid,password,    
                var reg_userid = 0;
                var request = req.body;
                var name = request.name;
                var address = request.address;
                var email = request.email;
                var mobileno = request.mobileno;
                var countryCode = request.countryCode;
                var dob = request.dob;
                var modifieddate = new Date();
                // general.genericError("Name: " + name + " Username: " + username + " Mobileno: " + mobileno);
                // var isValid = UserValidation(mobileno, email);


                if (dob == '')
                {
                    dob = null;
                }

                if (validateEmail(email))
                {
                    client.query('SELECT id FROM users \
      WHERE mobileno=$1', [mobileno], function (query_err, result) {
          try
          {
              if (query_err)
              {
                  handleError('error running query' + query_err);
                  isValid = false;
              }

              // releasing the connection
              done();

              if (result.rows.length > 0)
              {
                  client.query('update users set full_name=$1, email=$2, modifieddate=$3,address=$4,DOB=$6,countryCode=$7 where mobileno=$5 RETURNING id',
                            [name, email, modifieddate, address, mobileno, dob, countryCode],
                            function (query_err, userresult) {
                                try
                                {
                                    if (query_err)
                                    {
                                        general.genericError("Qry errr");
                                        handleError('error running query' + query_err);
                                        message_text = no_data_found;
                                        status_text = fail_status;
                                        context = { user: output, message: message_text, status: status_text };
                                        res.send(context);
                                        return;
                                    }

                                    // general.genericError("Returning Id: " + userresult.rows[0].id);
                                    reg_userid = userresult.rows[0].id;

                                    //output = token;
                                    output = { 'userid': reg_userid, 'name': name, 'email': email, 'mobileno': mobileno, 'address': address, 'countryCode': countryCode };
                                    message_text = "User Details Updated Successfully";
                                    status_text = success_status;

                                    context = { userdetails: output, message: message_text, status: status_text };
                                    res.send(context);
                                    return;
                                } catch (e)
                                {
                                    general.genericError("api.js :: updateuser: " + e);
                                }
                            });
              }
              else
              {
                  message_text = "Update user details failed. There is no user for this mobile number.";
                  status_text = fail_status;
                  context = { user: output, message: message_text, status: status_text };
                  res.send(context);
                  return;
              }
          } catch (e)
          {
              general.genericError("api.js :: updateuser: " + e);
          }
      });
                }
                else
                {
                    message_text = "In-valid Email";
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
            } catch (e)
            {
                general.genericError("api.js :: updateuser: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: updateuser: " + e);
    }
});

router.get('/getuser/:id', function (req, res) {
    try
    {
        ClearContext();
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // read cityid
                var id = req.params.id;

                client.query('SELECT id, full_name, username, mobileno,address,isaccepted,registrationtype,otheruserid FROM users \
      WHERE id=$1', [id], function (query_err, result) {
          try
          {
              if (query_err)
              {
                  handleError('error running query' + query_err);
                  message_text = no_data_found;
                  status_text = fail_status;
                  context = { user: output, message: message_text, status: status_text };
                  res.send(context);
                  return;
              }

              // releasing the connection
              done();

              if (result.rows.length > 0)
              {
                  output = result.rows;
                  message_text = result.rows.length;
                  status_text = success_status;
                  context = { user: output, message: message_text, status: status_text };
                  res.json(context);
                  return;
              }
              else
              {
                  output = '';
                  message_text = no_data_found;
                  status_text = fail_status;
                  context = { user: output, message: message_text, status: status_text };
                  res.json(context);
                  return;
              }
          } catch (e)
          {
              general.genericError("api.js :: getuser: " + e);
          }
      });
            } catch (e)
            {
                general.genericError("api.js :: getuser: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: getuser: " + e);
    }
});

router.get('/getoutlets/:citycode/:area/:latlong', function (req, res) {
    try
    {
        ClearContext();
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { outlets: output, message: message_text, status: status_text };
                    res.json(context);
                    return;
                }

                var condition = '';
                var citycode = req.params.citycode;
                var area = req.params.area;
                var latlong = req.params.latlong;
                var qry_distance = '';


                // Build the conditions to add to the querystring

                condition += " where o.active=true ";

                if (citycode != '\'\'')
                {
                    condition += '  and o.city=\'' + citycode + '\'';
                };

                if (area != '\'\'')
                {
                    condition += '  and o.address like \'\%' + area + '\%\'';
                };

                if (latlong != '\'\'')
                {
                    // expects value lat:long 255:455
                    var latlongvalue = latlong.split(":");
                    // for lat long queries you need to install cube and earth distance in postgresql
                    // then only the below queries will work.
                    if (latlongvalue.length == 2)
                    {
                        var latitude = latlongvalue[0];
                        var longitude = latlongvalue[1];
                        // 1 miles = 1609.34 meters
                        qry_distance += ' (point(' + longitude + ',' + latitude + ') <@> point(o.longitude,o.latitude)::point) * 1609.34 as distanceinmeters ';
                        // return within 10 km outlet from mobile location
                        condition += ' and (point(' + longitude + ',' + latitude + ') <@> point(o.longitude,o.latitude)) * 1609.34 < 10000';
                    }
                }
                else
                {
                    qry_distance += ' 0 as distanceinmeters ';
                }

                //        var querystr = 'select row_to_json(t) ' +
                //' from (' +
                //' select o.id, o.name,o.short_name,o.address,o.latitude,o.longitude,' + qry_distance + ',' +
                //'(' +
                //' select array_to_json(array_agg(row_to_json(d))) ' +
                //' from (' +
                //' select r.id, r.name, concat(\'/images/restaurant/\',r.id,\'.png\') as imagepath from food_item fi  ' +
                //' join restaurant r on r.id = fi.restaurant_id ' +
                //' where fi.outlet_id=o.id' +
                //' group by r.id,r.name ' +
                //' order by r.id ' +
                //') d ' +
                //') as Restaurants ' +
                //' from outlet o ' + // + condition +  
                //' where o.id = 12 order by distanceinmeters ' +
                //')as t'



                var querystr = 'select row_to_json(t) ' +
        ' from (' +
        ' select o.id, o.name,o.short_name,o.address,o.latitude,o.longitude,' + qry_distance + ',' +
        '(' +
        ' select array_to_json(array_agg(row_to_json(d))) ' +
        ' from (' +
        " select r.id, r.name, concat('\/linkimages/restaurant/\',r.id,\'.png\') as imagepath from food_item fi  " +
        ' join restaurant r on r.id = fi.restaurant_id ' +
        ' where fi.outlet_id=o.id' +
        ' group by r.id,r.name ' +
        ' order by r.id ' +
        ') d ' +
        ') as Restaurants ' +
        ' from outlet o ' + condition +
        ' order by distanceinmeters ' +
        ')as t'

                if (latlong != '\'\'')
                {
                    querystr += ' LIMIT 10';
                }

                // general.genericError(querystr);
                client.query(querystr, function (query_err, result) {
                    try
                    {
                        if (query_err)
                        {
                            general.genericError("api.js :: getoutlets: " + e);
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { outlets: output, message: message_text, status: status_text };
                            res.json(context);
                            return;
                        }

                        // releasing the connection
                        done();

                        if (result)
                        {
                            output = result.rows;
                            message_text = result.rows.length;
                            status_text = success_status;
                            context = { outlets: output, message: message_text, status: status_text };
                            res.json(context);
                            return;
                        }
                        else
                        {
                            output = '';
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { outlets: output, message: message_text, status: status_text };
                            res.json(context);
                            return;
                        }

                        context = { outlets: output, message: message_text, status: status_text };
                        res.json(context);
                        return;
                    } catch (e)
                    {
                        message_text = no_data_found;
                        status_text = fail_status;
                        context = { outlets: output, message: message_text, status: status_text };
                        res.json(context);
                        return;
                        general.genericError("api.js :: getoutlets: " + e);
                    }
                });
            } catch (e)
            {
                general.genericError("api.js :: getoutlets: " + e);
                message_text = no_data_found;
                status_text = fail_status;
                context = { outlets: output, message: message_text, status: status_text };
                res.json(context);
                return;

            }
        });
    } catch (e)
    {
        general.genericError("api.js :: getoutlets: " + e);
    }
});

router.get('/getrestaurants/:outletid', isAuthenticated, function (req, res) {
    try
    {
        ClearContext();
        // return restaurant details
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool ' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // read outletid        
                var outletid = req.params.outletid;

                var qry_restaurants = 'select row_to_json(t) ' +
                            'from (' +
                            "select r.id, r.name,r.short_name,concat('\/linkimages/restaurant/\',r.id,\'.png\') as imagepath, " +
                            '( ' +
                            'select array_to_json(array_agg(row_to_json(d))) ' +
                            'from (' +
                            "select *, concat('\/linkimages/\',master_id,'\/4.png\') as imagepath from food_item fi " +
                            'where fi.restaurant_id=r.id  and fi.outlet_id=' + outletid +
                            ' order by fi.id ' +
                            ') d ' +
                            ') as food_items ' +
                            'from restaurant r  ' +
                            'order by r.id ' +
                            ')as t where food_items is not null'

                // general.genericError(qry_restaurants);
                // general.genericError("api.js :: getrestaurants: qry_restaurants: " + qry_restaurants);
                client.query(qry_restaurants, function (query_err, result) {
                    try
                    {
                        if (query_err)
                        {
                            handleError('error running query' + query_err);
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { restaurants: output, message: message_text, status: status_text };
                            res.json(context);
                            return;
                        }

                        // releasing the connection
                        done();

                        if (result.rows.length > 0)
                        {
                            output = result.rows;
                            message_text = result.rows.length;
                            status_text = success_status;
                        }
                        else
                        {
                            output = '';
                            message_text = no_data_found;
                            status_text = fail_status;
                        }

                        context = { restaurants: output, message: message_text, status: status_text };
                        res.json(context);
                    } catch (e)
                    {
                        general.genericError("api.js :: getrestaurants: " + e);
                    }
                });
            } catch (e)
            {
                general.genericError("api.js :: getrestaurants: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: getrestaurants: " + e);
    }
});

router.get('/getstock/:outletid/:restaurantid', isAuthenticated, function (req, res) {
    try
    {
        ClearContext();
        var live_stock_data_firebase = [];
        // read outletid,restaurantid
        var outletid = req.params.outletid;
        var restaurantid = req.params.restaurantid;

        // Get live stock from firebase based on barcode
        var rootref = new firebase(firebase_connection_outlet);
        var stock_count_node = rootref.child('{}/{}'.format(outletid, helper.stock_count_node));
        var item_data = [];
        // Getting the stock data
        stock_count_node.once("value", function (data) {
            var data = data.val();

            for (var key in data)
            {
                // ignore if the item is in test mode
                if (isTestModeItem(Number(key)))
                {
                    continue;
                }
                //totalItems = 0;
                //totalbarcodes = '';
                // If there are no items, just continue
                var locked_count = data[key].locked_count;
                if (data[key]["item_details"] == undefined)
                {
                    continue;
                }
                data[key]["item_details"].map(function (item) {
                    if (!item.expired && !item.spoiled)
                    {
                        //totalItems += item.count;
                        live_stock_data_firebase.push({
                            id: Number(key),
                            live_stock_id: Number(key),
                            food_item_id: Number(key),
                            // barcode: item.barcode,
                            quantity: item.count,
                            timestamp: item.timestamp,
                            locked_count: locked_count
                        });
                    }

                });

            }

            // general.genericError("Live Stock Data: " + JSON.stringify(live_stock_data_firebase));

            pg.connect(conString, function (err, client, done) {
                try
                {
                    if (err)
                    {
                        handleError('error fetching client from pool ' + err);
                        message_text = no_data_found;
                        status_text = fail_status;
                        context = { user: output, message: message_text, status: status_text };
                        res.send(context);
                        return;
                    }

                    // Getting food item id
                    var food_itemid_data = [];
                    var params = [];

                    for (var i = 0; i <= live_stock_data_firebase.length - 1; i++)
                    {
                        food_itemid_data.push((live_stock_data_firebase[i].food_item_id));
                        params.push('$' + (i + 1));
                    }

                    var queryText = "Select id as food_item_id,name,item_tag,restaurant_id,outlet_id,expiry_time,side_order,ingredients1a,ingredients1b,ingredients2,ingredients3,veg,heating_required \
                                    ,location,cuisine,category,packaging_cost,production_cost,purchase_price,selling_price,mrp,service_tax_percent,vat_percent,foodbox_fee \
                                    ,restaurant_fee,master_id,gf_id,condiment_slot,recommended,heating_reduction \
                                    ,CASE WHEN (ft.location = \'outside\' and ft.cuisine != \'Beverage\') THEN true ELSE false END as issnacks \
                                    ,ft.recommended as isrecommended,concat('\/linkimages/\',ft.master_id,'\/4.png\') as imagepath from food_item ft \
                                    where ft.outlet_id=" + outletid + " and ft.restaurant_id=" + restaurantid + " and ft.id in (" + params.join(',') + ")";



                    //  general.genericError(queryText);
                    // return food items
                    client.query(queryText, food_itemid_data, function (query_err, result) {
                        try
                        {
                            if (query_err)
                            {
                                handleError('error running query' + query_err);
                                message_text = no_data_found;
                                status_text = fail_status;
                                context = { fooditems: output, message: message_text, status: status_text };
                                res.json(context);
                                return;
                            }

                            // releasing the connection
                            done();
                            if (result.rows.length > 0)
                            {
                                var food_item_data = result.rows;

                                // food_item table
                                var stock_combine_data = {};
                                food_item_data.forEach(function (food_item) { stock_combine_data[food_item.food_item_id] = food_item; });

                                // now do the "join": firebase stock 
                                live_stock_data_firebase.forEach(function (stock) {
                                    if (stock_combine_data[stock.food_item_id] != undefined || stock_combine_data[stock.food_item_id] != null)
                                    {
                                        // Check expiry items before 45 mins (using moment.js)
                                        var currentdate = moment();
                                        // expiry time from database result
                                        var expitytimedata = stock_combine_data[stock.food_item_id].expiry_time;
                                        var expiry_time = Number(expitytimedata.substring(0, expitytimedata.length - 1));

                                        // item packed date from firebase result
                                        var food_item_date = moment.unix(stock.timestamp).format('YYYY-MM-DD HH:mm:ss');

                                        // add expirty time with food_item_date
                                        var food_item_expiry_date = moment(food_item_date).add(expiry_time, 'hours').format('YYYY-MM-DD HH:mm:ss');

                                        // subtract 45 mins 
                                        var food_item_date_subtract_45 = moment(food_item_expiry_date).subtract(45, 'minutes').format('YYYY-MM-DD HH:mm:ss');

                                        if (new Date(currentdate) <= new Date(food_item_date_subtract_45))
                                        {
                                            var stock_combine_food_item_id = stock_combine_data[stock.food_item_id];

                                            stock.name = stock_combine_food_item_id.name;
                                            stock.item_tag = stock_combine_food_item_id.item_tag;
                                            stock.restaurant_id = stock_combine_food_item_id.restaurant_id;
                                            stock.outlet_id = stock_combine_food_item_id.outlet_id;
                                            stock.name = stock_combine_food_item_id.name;

                                            stock.item_tag = stock_combine_food_item_id.item_tag;
                                            stock.expiry_time = stock_combine_food_item_id.expiry_time;
                                            stock.side_order = stock_combine_food_item_id.side_order;
                                            stock.ingredients1a = stock_combine_food_item_id.ingredients1a;
                                            stock.ingredients1b = stock_combine_food_item_id.ingredients1b;

                                            stock.ingredients2 = stock_combine_food_item_id.ingredients2;
                                            stock.ingredients3 = stock_combine_food_item_id.ingredients3;
                                            stock.veg = stock_combine_food_item_id.veg;
                                            stock.heating_required = stock_combine_food_item_id.heating_required;
                                            stock.location = stock_combine_food_item_id.location;

                                            stock.cuisine = stock_combine_food_item_id.cuisine;
                                            stock.category = stock_combine_food_item_id.category;
                                            stock.packaging_cost = stock_combine_food_item_id.packaging_cost;
                                            stock.production_cost = stock_combine_food_item_id.production_cost;
                                            stock.purchase_price = stock_combine_food_item_id.purchase_price;

                                            stock.selling_price = stock_combine_food_item_id.selling_price;
                                            stock.mrp = stock_combine_food_item_id.mrp;
                                            stock.service_tax_percent = stock_combine_food_item_id.service_tax_percent;
                                            stock.vat_percent = stock_combine_food_item_id.vat_percent;
                                            stock.foodbox_fee = stock_combine_food_item_id.foodbox_fee;

                                            stock.restaurant_fee = stock_combine_food_item_id.restaurant_fee;
                                            stock.master_id = stock_combine_food_item_id.master_id;
                                            stock.gf_id = stock_combine_food_item_id.gf_id;
                                            stock.condiment_slot = stock_combine_food_item_id.condiment_slot;
                                            stock.recommended = stock_combine_food_item_id.recommended;

                                            stock.heating_reduction = stock_combine_food_item_id.heating_reduction;
                                            stock.issnacks = stock_combine_food_item_id.issnacks;
                                            stock.imagepath = stock_combine_food_item_id.imagepath;
                                        }
                                    }

                                });

                                // Merge all barcode items quantity in single item quantity based on food_item_id
                                var consolidated = [];
                                live_stock_data_firebase.forEach(function (record) {
                                    if (consolidated[record.food_item_id] !== undefined)
                                    {
                                        consolidated[record.food_item_id].quantity += record.quantity;
                                    }
                                    else
                                    {
                                        consolidated[record.food_item_id] = record;
                                    }
                                });

                                // Reduce locked_count from total quantity                                
                                consolidated.forEach(function (record) {
                                    if (consolidated[record.food_item_id] !== undefined)
                                    {
                                        consolidated[record.food_item_id].quantity -= record.locked_count;
                                    }
                                    else
                                    {
                                        consolidated[record.food_item_id] = record;
                                    }
                                });

                                var filtered_result = consolidated.filter(function (record) {
                                    return (record != null && record.quantity > 0 && (record.item_tag != undefined || record.item_tag != null));
                                });


                                //// now do the "join": firebase stock 
                                //food_item_data.forEach(function (food_item) {
                                //    if (stock_combine_data[food_item.food_item_id] != undefined || stock_combine_data[food_item.food_item_id] != null)
                                //    {
                                //        // food_item.expiry_time
                                //        // stock_combine_data[food_item.food_item_id].timestamp
                                //        // general.genericError("moment functionality: " + moment.unix(stock_combine_data[food_item.food_item_id].timestamp).format('YYYY-MM-DD HH:mm:ss'));
                                //        // var timestampvalue = moment.unix(1463626320).format('YYYY-MM-DD HH:mm:ss');
                                //        // console.log(moment(timestampvalue).add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'));

                                //        // Check expiry items before 45 mins (using moment.js)
                                //        var currentdate = moment();
                                //        // expiry time from database result
                                //        var expiry_time = Number(food_item.expiry_time.substring(0, food_item.expiry_time.length - 1));

                                //        // item packed date from firebase result
                                //        var food_item_date = moment.unix(stock_combine_data[food_item.food_item_id].timestamp).format('YYYY-MM-DD HH:mm:ss');

                                //        // add expirty time with food_item_date
                                //        var food_item_expiry_date = moment(food_item_date).add(expiry_time, 'hours').format('YYYY-MM-DD HH:mm:ss');

                                //        // subtract 45 mins 
                                //        var food_item_date_subtract_45 = moment(food_item_expiry_date).subtract(45, 'minutes').format('YYYY-MM-DD HH:mm:ss');

                                //        if (new Date(currentdate) <= new Date(food_item_date_subtract_45))
                                //        {
                                //            food_item.food_item_id = stock_combine_data[food_item.food_item_id].food_item_id;
                                //            food_item.barcode = stock_combine_data[food_item.food_item_id].barcode;
                                //            food_item.quantity = stock_combine_data[food_item.food_item_id].quantity;
                                //            food_item.timestamp = stock_combine_data[food_item.food_item_id].timestamp;
                                //            food_item.locked_count = stock_combine_data[food_item.food_item_id].locked_count;
                                //        }
                                //    }
                                //});

                                //var filtered_result = food_item_data.filter(function (obj) {
                                //    return (obj.barcode != '');
                                //});

                                output = filtered_result;
                                message_text = result.rows.length;
                                status_text = success_status;
                            }
                            else
                            {
                                output = '';
                                message_text = no_data_found;
                                status_text = fail_status;
                            }

                            context = { fooditems: output, message: message_text, status: status_text };
                            res.json(context);
                            return;
                        } catch (e)
                        {
                            general.genericError("api.js :: getstock: " + e);
                        }
                    });
                } catch (e)
                {
                    general.genericError("api.js :: getstock: " + e);
                }
            });
        });

    } catch (e)
    {
        general.genericError("api.js :: getstock: " + e);
    }
});

router.get('/fooditems/:outletid/:restaurantid', isAuthenticated, function (req, res) {
    try
    {
        ClearContext();

        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool ' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // read outletid,restaurantid
                var outletid = req.params.outletid;
                var restaurantid = req.params.restaurantid;



                // return food items
                client.query("Select id, name, item_tag, expiry_time, veg, location, mrp, master_id \
                        ,CASE WHEN (location = \'outside\' and cuisine != \'Beverage\') THEN true ELSE false END as issnacks\
                        ,\'false\' as isrecommded\
                        ,concat('\/linkimages/\',master_id,'\/4.png\') from food_item \
                        where outlet_id=$1 \
                        and restaurant_id=$2", [outletid, restaurantid], function (query_err, result) {
                            try
                            {
                                if (query_err)
                                {
                                    handleError('error running query' + query_err);
                                    message_text = no_data_found;
                                    status_text = fail_status;
                                    context = { fooditems: output, message: message_text, status: status_text };
                                    res.json(context);
                                    return;
                                }

                                // releasing the connection
                                done();
                                if (result.rows.length > 0)
                                {
                                    output = result.rows;
                                    message_text = result.rows.length;
                                    status_text = success_status;
                                }
                                else
                                {
                                    output = '';
                                    message_text = no_data_found;
                                    status_text = fail_status;
                                }

                                context = { fooditems: output, message: message_text, status: status_text };
                                res.json(context);
                                return;
                            } catch (e)
                            {
                                general.genericError("api.js :: fooditems: " + e);
                            }
                        });
            } catch (e)
            {
                general.genericError("api.js :: fooditems: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: fooditems: " + e);
    }
});

router.get('/placeorder/:outletid/:restaurantid', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("placeorder: " + JSON.stringify(req.params));

        ClearContext();

        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool ' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // read outletid,restaurantid
                var outletid = req.params.outletid;
                var restaurantid = req.params.restaurantid;

                // return food items
                client.query('Select id, name, item_tag, expiry_time, veg, location from food_item \
            where outlet_id=$1 \
            and restaurant_id=$2', [outletid, restaurantid], function (query_err, result) {
                try
                {
                    if (query_err)
                    {
                        handleError('error running query' + query_err);
                        message_text = no_data_found;
                        status_text = fail_status;
                        context = { user: output, message: message_text, status: status_text };
                        res.send(context);
                        return;
                    }

                    // releasing the connection
                    done();

                    if (result.rows.length > 0)
                    {
                        output = result.rows;
                        message_text = result.rows.length;
                        status_text = success_status;
                    }
                    else
                    {
                        output = '';
                        message_text = no_data_found;
                        status_text = fail_status;
                    }

                    context = { placeorder: output, message: message_text, status: status_text };
                    res.json(context);
                    return;
                } catch (e)
                {
                    general.genericError("api.js :: placeorder: " + e);
                }
            });
            } catch (e)
            {
                general.genericError("api.js :: placeorder: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: placeorder: " + e);
    }
});

router.post('/resetpassword', function (req, res) {
    try
    {
        general.genericError("resetpassword: " + JSON.stringify(req.body));

        ClearContext();

        // read mobile no
        var request = req.body;
        var mobileno;
        var userid;

        var token = request.token;
        var newpassword = request.password;

        // Get user details
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                client.query('select u.id, u.mobileno from users u join tokens t on u.id = t.userid where t.token =$1', [token],
                      function (query_err, result) {
                          try
                          {
                              if (query_err)
                              {
                                  handleError('error running query' + query_err);
                                  message_text = no_data_found;
                                  status_text = fail_status;
                                  context = { user: output, message: message_text, status: status_text };
                                  res.send(context);
                                  return;
                              }

                              // releasing the connection
                              done();

                              userid = result.rows[0].id;
                              mobileno = result.rows[0].mobileno;

                              // sends one time password to mobileno
                              // one time registration process.                            
                              if (mobileno)
                              {
                                  var otp = GenerateRandomNumber(6);
                                  var referenceno = mobileno + GenerateRandomNumber(8);
                                  // general.genericError("Generated OTP:" + otp);
                                  // Save otp and mobileno in Firebase
                                  rootref.child('users').child(referenceno).set({ "userid": userid, "mobileno": mobileno, "newpassword": newpassword, "otp": otp });
                                  // general.genericError("Data saved to firebase - Reference No: " + referenceno + " OTP: " + otp);

                                  // Send OTP
                                  var message = "OTP for Foodbox update password is " + otp + " and is valid for 30  Minutes (Generated at " + general.GetFormattedDateDDMMYYYY_HHMMSS() + ")";
                                  SendSMS(mobileno, message);

                                  output = referenceno;
                                  message_text = "OTP sent successfully";
                                  status_text = success_status;

                                  context = { referenceno: output, message: message_text, status: status_text };
                                  res.send(context);
                                  return;
                              }
                          } catch (e)
                          {
                              general.genericError("api.js :: resetpassword: " + e);
                          }
                      });
            } catch (e)
            {
                general.genericError("api.js :: resetpassword: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: resetpassword: " + e);
    }
});

router.post('/confirmresetpassword', function (req, res) {
    try
    {
        ClearContext();

        // read mobile no
        var request = req.body;
        var userid;
        var otp = request.otp;
        var referenceno = request.referenceno;
        var otpfirebase = '';
        var newpassword;
        var mobileno;

        // read otp from firebase
        rootref.child('users').child(referenceno).on('value', function (snapshot) {
            try
            {
                // general.genericError("Mobile no from Firebase: " + referenceno);    

                snapshot.forEach(function (childSnapshot) {
                    try
                    {
                        var key = childSnapshot.key();
                        var value = childSnapshot.val();

                        if (key === 'userid')
                        {
                            // general.genericError("Key from Firebase: " + key + " Userid from Firebase: " + value);
                            userid = value;
                        }

                        if (key === 'newpassword')
                        {
                            newpassword = value;
                        }

                        if (key === 'otp')
                        {
                            otpfirebase = value;
                            // general.genericError("Key from Firebase: " + key + " OTP from Firebase: " + value);
                        }

                        if (key === 'mobileno')
                        {
                            mobileno = value;

                        }
                    } catch (e)
                    {
                        general.genericError("api.js :: confirmresetpassword: " + e);
                    }
                });

                // Check user typed OTP with saved firebase OTP
                if (otp == otpfirebase)
                {
                    pg.connect(conString, function (err, client, done) {
                        try
                        {
                            if (err)
                            {
                                handleError('error fetching client from pool' + err);
                                message_text = no_data_found;
                                status_text = fail_status;
                                context = { user: output, message: message_text, status: status_text };
                                res.send(context);
                                return;
                            }

                            client.query('update users set password_hash=$1 \
                                  where id = $2', [newpassword, userid],
                              function (query_err, result) {
                                  try
                                  {
                                      if (query_err)
                                      {
                                          handleError('error running query' + query_err);
                                          message_text = no_data_found;
                                          status_text = fail_status;
                                          context = { user: output, message: message_text, status: status_text };
                                          res.send(context);
                                          return;
                                      }

                                      client.query('delete from tokens where userid =$1', [userid],
                                    function (query_err, result) {
                                        try
                                        {
                                            if (query_err)
                                            {
                                                handleError('error running query' + query_err);
                                                message_text = no_data_found;
                                                status_text = fail_status;
                                                context = { user: output, message: message_text, status: status_text };
                                                res.send(context);
                                                return;
                                            }
                                        } catch (e)
                                        {
                                            general.genericError("api.js :: confirmresetpassword: " + e);
                                        }
                                    });

                                      // releasing the connection
                                      done();
                                      output = userid;
                                      message_text = "Password changed susscessfully. Please Login again.";
                                      status_text = success_status;
                                      context = { user: output, message: message_text, status: status_text };
                                      res.send(context);
                                      return;
                                  } catch (e)
                                  {
                                      general.genericError("api.js :: confirmresetpassword: " + e);
                                  }
                              });
                        } catch (e)
                        {
                            general.genericError("api.js :: confirmresetpassword: " + e);
                        }
                    });
                }
                else
                {
                    // general.genericError("Userid: " + userid + " Mobileno: " + mobileno);
                    // Save otp and mobileno in Firebase
                    rootref.child('users').child(referenceno).set({ "userid": userid, "mobileno": mobileno, "newpassword": newpassword, "otp": otpfirebase });

                    output = userid;
                    message_text = "OTP should not match. Confimation failed.";
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
            } catch (e)
            {
                general.genericError("api.js :: confirmresetpassword: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: confirmresetpassword: " + e);
    }
});

router.post('/registeruser', function (req, res) {
    try
    {
        general.genericError("registeruser: " + JSON.stringify(req.body));

        ClearContext();
        // general.genericError(new Buffer("123").toString('base64'));
        // general.genericError(new Buffer("MTIz", 'base64').toString('ascii'))
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    message_text = no_data_found;
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }

                // save the data to database
                // This is the no. of initial params upon which more are dynamically added

                // read name,mobileno,userid,password,
                var token = '';
                var reg_userid = 0;
                var num_parameters = 8;

                var request = req.body;
                var name = request.name;
                var email = request.email;
                var password = request.password;
                var countryCode = request.countryCode;
                var mobileno = request.mobileno;
                var registrationtype = request.registrationtype;
                var otheruserid = request.otheruserid;
                var isaccepted = true;
                var createddate = new Date();
                // general.genericError("Name: " + name + " Username: " + username + " Mobileno: " + mobileno);
                // var isValid = UserValidation(mobileno, email);
                if (validateEmail(email))
                {
                    client.query('SELECT id FROM users \
      WHERE mobileno=$1', [mobileno], function (query_err, result) {
          try
          {
              if (query_err)
              {
                  handleError('error running query' + query_err);
                  isValid = false;
              }

              // releasing the connection
              done();

              if (result.rows.length > 0)
              {
                  message_text = "Duplicate Mobile no.";
                  status_text = fail_status;
                  context = { user: output, message: message_text, status: status_text };
                  res.send(context);
                  return;
              }

              client.query('insert into users(full_name, username, password_hash, email, mobileno, registrationtype, otheruserid, isaccepted,createddate,modifieddate,countryCode) \
                        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) \
                        RETURNING id',
                          [name, mobileno, password, email, mobileno, registrationtype, otheruserid, isaccepted, createddate, createddate, countryCode],
                          function (query_err, userresult) {
                              try
                              {
                                  if (query_err)
                                  {
                                      general.genericError("Qry errr");
                                      handleError('error running query' + query_err);
                                      message_text = no_data_found;
                                      status_text = fail_status;
                                      context = { user: output, message: message_text, status: status_text };
                                      res.send(context);
                                      return;
                                  }

                                  // general.genericError("Returning Id: " + userresult.rows[0].id);
                                  reg_userid = userresult.rows[0].id;

                                  // Save new token to database
                                  client.query("select uuid_generate_v1()", function (query_err1, resulttoken) {
                                      try
                                      {
                                          token = resulttoken.rows[0].uuid_generate_v1;
                                          // general.genericError("Token: " + token);

                                          var expirydate = new Date();
                                          expirydate.setDate(expirydate.getDate() + 1);
                                          client.query("insert into tokens(userid,token,expirydate) \
                        values ($1,$2,$3)", [reg_userid, token, expirydate],
                                                  function (query_err, result) {
                                                      try
                                                      {
                                                          if (query_err)
                                                          {
                                                              handleError('error running query' + query_err);
                                                              message_text = no_data_found;
                                                              status_text = fail_status;
                                                              context = { user: output, message: message_text, status: status_text };
                                                              res.send(context);
                                                              return;
                                                          }

                                                          //output = token;
                                                          output = { 'userid': reg_userid, 'name': name, 'username': mobileno, 'password': password, 'email': email, 'mobileno': mobileno, 'registrationtype': registrationtype, 'otheruserid': otheruserid, 'isaccepted': isaccepted, 'token': token, 'createddate': createddate, 'countryCode': countryCode };
                                                          message_text = "Login Successfully";
                                                          status_text = success_status;

                                                          context = { userdetails: output, message: message_text, status: status_text };
                                                          res.send(context);
                                                          return;
                                                      } catch (e)
                                                      {
                                                          general.genericError("api.js :: registeruser: " + e);
                                                      }
                                                  });
                                      } catch (e)
                                      {
                                          general.genericError("api.js :: registeruser: " + e);
                                      }
                                  });
                              } catch (e)
                              {
                                  general.genericError("api.js :: registeruser: " + e);
                              }
                          });
          } catch (e)
          {
              general.genericError("api.js :: registeruser: " + e);
          }
      });
                }
                else
                {
                    message_text = "In-valid Email";
                    status_text = fail_status;
                    context = { user: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
            } catch (e)
            {
                general.genericError("api.js :: registeruser: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: registeruser: " + e);
    }
});

router.post('/confirmregistration', function (req, res) {
    try
    {
        // read mobile no
        var userid;
        var otpfirebase = '';
        var request = req.body;
        var mobileno = request.mobileno;
        var referenceno = request.referenceno;
        var otp = request.otp;

        // read otp from firebase
        rootref.child('users').child(referenceno).on('value', function (snapshot) {
            // general.genericError("Mobile no from Firebase: " + mobileno);

            snapshot.forEach(function (childSnapshot) {
                try
                {
                    var key = childSnapshot.key();
                    var value = childSnapshot.val();

                    if (key === 'userid')
                    {
                        // general.genericError("Key from Firebase: " + key + " Userid from Firebase: " + value);
                        userid = value;
                    }

                    if (key === 'otp')
                    {
                        otpfirebase = value;
                        // general.genericError("Key from Firebase: " + key + " OTP from Firebase: " + value);
                    }
                } catch (e)
                {
                    general.genericError("api.js :: confirmregistration: " + e);
                }
            });

            if (otp == otpfirebase)
            {
                // general.genericError("OTP:" + otp + " OTP Firebase: " + otpfirebase);
                pg.connect(conString, function (err, client, done) {
                    try
                    {
                        if (err)
                        {
                            handleError('error fetching client from pool' + err);
                            message_text = no_data_found;
                            status_text = fail_status;
                            context = { user: output, message: message_text, status: status_text };
                            res.send(context);
                            return;
                        }

                        client.query('update users set isaccepted=true \
                                  where id = $1', [userid],
                              function (query_err, result) {
                                  if (query_err)
                                  {
                                      handleError('error running query' + query_err);
                                      message_text = no_data_found;
                                      status_text = fail_status;
                                      context = { user: output, message: message_text, status: status_text };
                                      res.send(context);
                                      return;
                                  }

                                  // releasing the connection
                                  done();
                                  output = userid;
                                  message_text = "Registration Confirmed";
                                  status_text = success_status;
                                  context = { user: output, message: message_text, status: status_text };
                                  res.send(context);
                                  return;
                              });
                    }
                    catch (e)
                    {
                        general.genericError("api.js :: confirmregistration: " + e);
                    }
                });
            }
            else
            {
                // Save otp and mobileno in Firebase
                rootref.child('users').child(referenceno).set({ "userid": userid, "mobileno": mobileno, "otp": otpfirebase });
                // general.genericError("Mobile no: " + mobileno + " OTP: " + otp);
                output = userid;
                message_text = "OTP should not match. Confimation failed.";
                status_text = fail_status;
                context = { user: output, message: message_text, status: status_text };
                res.send(context);
                return;
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: confirmregistration: " + e);
    }
});

router.get('/sendsmstest', function (req, res) {
    // "Thanks for order # Rs-(Amount) at (Store name) \n View your bill at Http: (link) \nCall us at (Phone number from the table for particular store) \nEnjoy your meals"
    // OTP for Foodbox update password is (Number) and is valid for 30  Minutes \n(Generated at DD-MM-YYYY HH-MM-SS)

    var otp = 2235;
    // var message = "OTP for Foodbox update password is " + otp + " and is valid for 30  Minutes \nGenerated at " + general.GetFormattedDateDDMMYYYY_HHMMSS() + "";
    // var message = "Thanks for order #" + otp + " Rs-" + otp + " at ATP \n View your bill at http://flofl/fdf \nCall us at 04498238498 \nEnjoy your meals";

    // var message = 'Thanks for Order #' + otp + ' \n Rs. 44 at OTP \n View your bill at http://flofl/fdf \n Call us at 04498238498 \n Enjoy your meal!';
    // OTP for Foodbox update password is <Variable1> and is valid for 30  Minutes (Generated at <Variable2>)

    var message = "OTP for Foodbox update password is " + otp + " and is valid for 30  Minutes (Generated at 22-05-2016 16-44-09)";

    SendSMS('9994057500', message);
    return 'success';
});

// send sms
function SendSMS(mobileno, message) {
    try
    {
        var queryString = {
            UserName: 'atchayam',
            password: '123456',
            MobileNo: mobileno,
            SenderID: 'FOODBX',
            CDMAHeader: 'FOODBX',
            Message: message // 'Thanks for Order #' + message + ' \n Rs. 44 at OTP \n View your bill at http://flofl/fdf \n Call us at 04498238498 \n Enjoy your meal!'
        };

        general.genericError("Send SMS - Mobileno: " + mobileno + " Message: " + message);

        request({
            url: 'http://whitelist.smsapi.org/SendSMS.aspx',
            qs: queryString
        }, function (sms_error, sms_response, sms_body) {
            try
            {
                if (sms_error || (sms_response && sms_response.statusCode != 200))
                {
                    //console.error('{}: {} {}'.format(hq_url, sms_error, sms_body));
                    return;
                }
            } catch (e)
            {
                general.genericError("api.js :: SendSMS: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: SendSMS: " + e);
    }
}

function GenerateRandomNumber(no_of_digits) {
    try
    {
        if (no_of_digits === 7)
        {
            return Math.floor(Math.random() * 9000000) + 1000000;
        }
        else if (no_of_digits === 8)
        {
            return Math.floor(Math.random() * 90000000) + 10000000;
        }

        return Math.floor(Math.random() * 900000) + 100000;
    } catch (e)
    {
        general.genericError("api.js :: GenerateRandomNumber: " + e);
    }
}

function ClearContext() {
    try
    {
        output = '';
        message_text = '';
        status_text = fail_status;
        context = { result: output, message: message_text, status: status_text };
    } catch (e)
    {
        general.genericError("api.js :: ClearContext: " + e);
    }
}

// Socket connection
var socket = require('socket.io-client')('http://' + server_ip_address + ':' + server_port, {
    forceNew: true
});

// Tell the server about it
var username = 'HQ-user';
socket.emit("add-user", { "username": username });

var result = TestPrivateMessage();
var lock_status;
var received_outletid;

socket.emit("private-message", {
    "username": result.username,
    "content": result.content
});

// Whenever we receieve a message, append it to the <ul>
socket.on("add-message", function (data) {
    try
    {
        general.genericError(data.content);
    } catch (e)
    {
        general.genericError("api.js :: add-message: " + e);
    }
});

function TestPrivateMessage() {
    try
    {
        var result = { "username": "HQ-user", "content": "Server client test content message" };
        return result;
    } catch (e)
    {
        general.genericError("api.js :: TestPrivateMessage: " + e);
    }
}

socket.on("stock_count", function (data) {
    try
    {
        general.genericError(data);
    } catch (e)
    {
        general.genericError("api.js :: stock_count: " + e);
    }
});

router.post('/PayUSuccess', function (req, res) {
    try
    {
        console.log("PayUSuccess: " + JSON.stringify(req.body));


        //Enumeration<String> kayParams = request.getParameterNames();
        //String result = "";
        //String key = "";
        //while (kayParams.hasMoreElements()) {
        //    key = (String) kayParams.nextElement();
        // result += key + "=" + request.getParameter(key) + (kayParams.hasMoreElements() ? "," : "");
        //}

        // PayUSuccess: {"mihpayid":"592854175","mode":"CC","status":"success","unmappedstatus":"captured","key":"hD87se","txnid":"1147037335","amount":"1.00","cardCategory":"domestic","discount":"0.00","net_amount_debit":"1","addedon":"2016-05-24 10:42:59","productinfo":"Tshirt","firstname":"Nishanth Kumar","lastname":"","address1":"","address2":"","city":"","state":"","country":"","zipcode":"","email":"q@m.com","phone":"","udf1":"udfl","udf2":"udf2","udf3":"udf3","udf4":"udf4","udf5":"udf5","udf6":"","udf7":"","udf8":"","udf9":"","udf10":"","hash":"a5e68d4bb313eccf1401c9970bdca9bf2b6096aed7ed8e93ce17c304890e0edad649afbec0c96999d15721a310a9263da41637cbc2505c90fe082e08ce4275d7","field1":"201605241738317","field2":"058200","field3":"201605996546","field4":"","field5":"0","field6":"Transaction Successful","field7":"","field8":"","field9":"Transaction Successful","payment_source":"payu","PG_TYPE":"UBIPG","bank_ref_num":"201605996546","bankcode":"CC","error":"E000","error_Message":"No Error","name_on_card":"nishanth","cardnum":"533744XXXXXX0747","cardhash":"This field is no longer supported in postback params.","device_type":"1"}

        var resultPayU = "";
        var mihpayid = req.body.mihpayid;
        var mode = req.body.mode;
        var status = req.body.status;
        var key = req.body.key;
        var txnid = req.body.txnid;
        var amount = req.body.amount;
        var cardCategory = req.body.cardCategory;
        var hash = req.body.hash;
        var firstname = req.body.firstname;
        var email = req.body.email;
        var field6 = req.body.field6;
        var payment_source = req.body.payment_source;
        var PG_TYPE = req.body.PG_TYPE;
        var bank_ref_num = req.body.bank_ref_num;
        var name_on_card = req.body.name_on_card;
        var cardnum = req.body.cardnum;

        resultPayU += "mihpayid=" + mihpayid + ",mode=" + mode + ",status=" + status + ",key=" + key + ",txnid=" + txnid + ",amount=" + amount + ",cardCategory=" + cardCategory;
        resultPayU += ",hash=" + hash + ",firstname=" + firstname + ",email=" + email + ",field6=" + field6 + ",payment_source=" + payment_source + ",PG_TYPE=" + PG_TYPE;
        resultPayU += ",bank_ref_num=" + bank_ref_num + ",name_on_card=" + name_on_card + ",cardnum=" + cardnum;

        general.genericError("resultPayU " + resultPayU);
        AndroidSuccess(resultPayU);

        return res.send('success');
    }
    catch (e)
    {
        general.genericError("PayUSuccess:" + e);
    }
});

router.post('/PayUFailure', function (req, res) {
    try
    {
        console.log("PayUFailure: " + JSON.stringify(req.body));
        return res.send('success');
    }
    catch (e)
    {
        general.genericError("PayUFailure:" + e);
    }
});

function AndroidSuccess(input) {
    try
    {

        PayU.onSuccess(input);
        general.genericError("AndroidSuccess: " + JSON.stringify(input));
    }
    catch (e)
    {
        general.genericError("AndroidSuccess:" + e);
    }
}

//for Android failure
function AndroidFailure(input) {
    try
    {
        PayU.onFailure(input);
        general.genericError("AndroidFailure: " + JSON.stringify(input));
    }
    catch (e)
    {
        general.genericError("AndroidFailure:" + e);
    }
}

//AndroidFailure("<%= result %>")

router.post('/SendLockRequest', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("SendLockRequest: " + JSON.stringify(req.body));

        ClearContext();

        //general.genericError("Send Lock Request: " + JSON.stringify(req.body));
        var post_request = req.body;
        var items = post_request.items;
        var outletid = post_request.outletid;
        var mobileno = post_request.mobileno;
        var counter_code = 1;

        //general.genericError("Send Lock Request: " + "Items:" +  JSON.stringify(req.body));

        received_outletid = outletid;

        var otp = GenerateRandomNumber(6);
        var referenceno = mobileno + GenerateRandomNumber(8);

        var lock_data = {
            "items": items,
            "outletid": outletid,
            "mobileno": mobileno,
            "counter_code": counter_code,
            "referenceno": referenceno
        };

        socket.emit("send-lockitem-data-to-server", lock_data, function (lockresult) {
            general.genericError("Send Lock Request - after emitting data");
            if (lockresult != null && lockresult.lockresult != null && lockresult.lockresult.receive_lock_result != null && lockresult.lockresult.receive_lock_result.status === success_status)
            {
                output = { "referenceno": referenceno, "outletid": outletid };
                message_text = "Item locked successfully";
                status_text = success_status;
                context = { lockedreferencedetails: output, message: message_text, status: status_text };
                res.send(context);
                return;
            }
            else
            {
                output = { "referenceno": referenceno, "outletid": outletid };
                message_text = "Items are not available. Please re-order again.";
                status_text = fail_status;
                context = { lockedreferencedetails: output, message: message_text, status: status_text };
                res.send(context);
                return;
            }
        });

    } catch (e)
    {
        general.genericError("api.js :: SendLockRequest: " + e);
    }
});

router.get('/TestEmit/:outletid', function (req, res) {
    try
    {
        var outletid = req.params.outletid;
        var emit_data = { "outletid": outletid };
        socket.emit("send-test-emit-data-to-server", emit_data, function (result) {
            if (result.existsemit)
            {
                general.genericError("Test Emit");
                res.send('success');
                return;
            }

            res.send('failed');
            return;
        });
    }
    catch (e)
    {
    }
});

router.get('/GetLockItemStatus/:mobileno/:outletid/:referenceno', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("GetLockItemStatus: " + JSON.stringify(req.params));

        ClearContext();
        var request = req.params;
        var mobileno = request.mobileno;
        var outletid = request.outletid;
        var referenceno = request.referenceno;

        // read lock item status from firebase
        rootref.child('lockitemstatus').child(referenceno).on('value', function (snapshot) {
            try
            {
                var firebase_status;
                var firebase_mobileno;
                var firebase_outletid;
                var firebase_hqclient;
                var firebase_items;

                snapshot.forEach(function (childSnapshot) {
                    try
                    {
                        var key = childSnapshot.key();
                        var value = childSnapshot.val();

                        switch (key)
                        {
                            case "status":
                                firebase_status = value;
                                break;
                            case "outletid":
                                firebase_outletid = value;
                                break;
                            case "hqclient":
                                firebase_hqclient = value;
                                break;
                            case "mobileno":
                                firebase_mobileno = value;
                                break;
                            case "items":
                                firebase_items = value;
                                break;
                            default:
                                break;
                        };
                    } catch (e)
                    {
                        general.genericError("api.js :: GetLockItemStatus: " + e);
                    }
                });

                general.genericError("Mobile no from Firebase: " + firebase_mobileno + " items: " + firebase_items);
                // Check user typed OTP with saved firebase OTP
                if (mobileno == firebase_mobileno && firebase_outletid == outletid)
                {
                    general.genericError("GetLockItemStatus - Mobile no from Firebase in condition: " + firebase_mobileno);
                    // var item_ref = rootref.child(outlet_id + '/stock_count/' + item_id + '/locked_count');

                    if (outletid == firebase_outletid && firebase_status == success_status)
                    {
                        output = { "items": firebase_items, "outletid": firebase_outletid, "mobileno": firebase_mobileno };
                        message_text = "Item locked successfully";
                        status_text = success_status;
                    }
                    else
                    {
                        output = { "items": firebase_items, "outletid": firebase_outletid, "mobileno": firebase_mobileno };
                        message_text = "Items are not available. Please re-order again.";
                        status_text = fail_status;
                    }

                    context = { lockitemstatus: output, message: message_text, status: status_text };
                }

                res.send(context);
                return;
            } catch (e)
            {
                general.genericError("api.js :: GetLockItemStatus: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: GetLockItemStatus: " + e);
    }
});

router.post('/SendOrderRequest', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("SendOrderRequest: " + JSON.stringify(req.body));

        ClearContext();
        var post_request = req.body;
        var order_details = post_request.orderdetails;
        var payment_mode = post_request.paymentmode;
        var outletid = post_request.outletid;
        var sides = post_request.sides;
        var savings = post_request.savings;
        var mobileno = post_request.mobileno;
        var credit_card_no = post_request.credit_card_no;
        var cardholder_name = post_request.cardholder_name;
        var referenceno;

        var formated_outletid = general.leftPad(outletid, 3);

        //if (current_order_number == 0 || current_order_number == undefined)
        //{
        //    try
        //    {
        //        pg.connect(conString, function (err, client, done) {
        //            try
        //            {
        //                if (err)
        //                {
        //                    handleError('error fetching client from pool' + err);
        //                    message_text = no_data_found;
        //                    status_text = fail_status;
        //                    context = { current_order_number: output, message: message_text, status: status_text };
        //                    res.send(context);
        //                    return;
        //                }

        //                client.query("select count(*) from sales_order where time > DATE 'today'", function (query_err, result) {
        //                    try
        //                    {
        //                        if (query_err)
        //                        {
        //                            handleError('error running query' + query_err);
        //                            message_text = no_data_found;
        //                            status_text = fail_status;
        //                            context = { current_order_number: output, message: message_text, status: status_text };
        //                            res.send(context);
        //                            return;
        //                        }

        //                        // releasing the connection
        //                        done();

        //                        if (result)
        //                        {
        //                            output = result.rows;
        //                            message_text = result.rows.length;
        //                            status_text = success_status;
        //                            current_order_number = parseInt(output[0].count);
        //                            general.genericError("current_order_number 1: " + current_order_number);

        //                        }

        //                    } catch (e)
        //                    {
        //                        general.genericError("api.js :: SendOrderRequest: " + e);
        //                    }

        //                    general.genericError("current_order_number 2: " + current_order_number);

        //                    current_order_number = general.leftPad((current_order_number + 1), 6);

        //                    referenceno = formated_outletid + current_order_number;
        //                    general.genericError("New referenceno: " + referenceno);

        //                    socket.emit('send-order-request-to-server', {
        //                        'order_details': order_details,
        //                        'payment_mode': payment_mode,
        //                        'outletid': outletid,
        //                        'sides': sides,
        //                        'savings': savings,
        //                        'mobileno': mobileno,
        //                        'credit_card_no': credit_card_no,
        //                        'cardholder_name': cardholder_name,
        //                        'referenceno': referenceno
        //                    });

        //                });
        //            } catch (e)
        //            {
        //                general.genericError("api.js :: SendOrderRequest: " + e);
        //            }

        //        });
        //    }
        //    catch (e)
        //    {
        //        general.genericError("api.js :: SendOrderRequest: " + e);
        //    }
        //}
        //else
        //{
        //    general.genericError("current_order_number 3: " + current_order_number);
        //    current_order_number = general.leftPad((parseInt(current_order_number) + 1), 6);

        //    referenceno = formated_outletid + current_order_number;
        //    general.genericError("New referenceno: " + referenceno);

        //    socket.emit('send-order-request-to-server', {
        //        'order_details': order_details,
        //        'payment_mode': payment_mode,
        //        'outletid': outletid,
        //        'sides': sides,
        //        'savings': savings,
        //        'mobileno': mobileno,
        //        'credit_card_no': credit_card_no,
        //        'cardholder_name': cardholder_name,
        //        'referenceno': referenceno
        //    });
        //}

        var referenceno = formated_outletid + GenerateRandomNumber(6);

        var emit_order_data = {
            'order_details': order_details,
            'payment_mode': payment_mode,
            'outletid': outletid,
            'sides': sides,
            'savings': savings,
            'mobileno': mobileno,
            'credit_card_no': credit_card_no,
            'cardholder_name': cardholder_name,
            'referenceno': referenceno
        };

        //socket.emit("send-lockitem-data-to-server", lock_data, function (lockresult) {
        //    general.genericError("Send Lock Request - after emitting data");
        //    if (lockresult != null && lockresult.lockresult != null && lockresult.lockresult.receive_lock_result != null && lockresult.lockresult.receive_lock_result.status === success_status)
        //    {

        socket.emit('send-order-request-to-server', emit_order_data, function (receive_orderdata) {
            if (receive_orderdata != null && receive_orderdata.receive_order_data_client != null && receive_orderdata.receive_order_data_client.output_response_data != null)
            {
                var data = receive_orderdata.receive_order_data_client.output_response_data;
                rootref.child('orderstatus').child(data.referenceno).set({ "orderdata": data.orderdata, "bill_no": data.bill_no, "mobileno": data.mobileno, "outletid": data.outletid, "item_queue": data.item_queue, "status": data.status, "message": data.message });

                if (receive_orderdata.receive_order_data_client.output_response_data.status === success_status)
                {
                    // SendSMS(data.mobileno, data.referenceno);
                    output = { "referenceno": data.referenceno, "outletid": outletid, 'expirydatetime': '2016-05-25T06:30:00.000Z' };
                    message_text = "Order placed successfully";
                    status_text = success_status;
                    context = { orderreferencedetails: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
                else
                {
                    // SendSMS(data.mobileno, "0");
                    output = { "referenceno": data.referenceno, "outletid": outletid, 'expirydatetime': '2016-05-25T06:30:00.000Z' };
                    message_text = "Order placed failed";
                    status_text = fail_status;
                    context = { orderreferencedetails: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
            }
            else
            {
                output = { "referenceno": 0, "outletid": outletid, 'expirydatetime': '2016-05-25T06:30:00.000Z' };
                message_text = "Order placed failed";
                status_text = fail_status;
                context = { orderreferencedetails: output, message: message_text, status: status_text };
                res.send(context);
                return;
            }

        });

        general.genericError("Send Order Request - after emitting data");


        //rootref.child('orderstatus').child(referenceno).on('value', function (snapshot) {
        //    try
        //    {
        //        var firebase_status;
        //        var firebase_orderdata;
        //        var firebase_bill_no;
        //        var firebase_message;
        //        var firebase_mobileno;
        //        var firebase_outletid;
        //        var firebase_reference_bill_no;

        //        snapshot.forEach(function (childSnapshot) {
        //            try
        //            {
        //                var key = childSnapshot.key();
        //                var value = childSnapshot.val();

        //                switch (key)
        //                {
        //                    case "status":
        //                        firebase_status = value;
        //                        break;
        //                    case "orderdata":
        //                        firebase_orderdata = value;
        //                        break;
        //                    case "bill_no":
        //                        firebase_bill_no = value;
        //                        break;
        //                    case "message":
        //                        firebase_message = value;
        //                        break;
        //                    case "mobileno":
        //                        firebase_mobileno = value;
        //                        break;
        //                    case "outletid":
        //                        firebase_outletid = value;
        //                        break;
        //                    default:
        //                        break;
        //                };
        //            } catch (e)
        //            {
        //                general.genericError("api.js :: SendOrderRequest: " + e);
        //            }
        //        });

        //        //general.genericError(JSON.stringify(firebase_orderdata));
        //        // Check user typed OTP with saved firebase OTP
        //        if (mobileno == firebase_mobileno && firebase_outletid == outletid)
        //        {
        //            general.genericError("SendOrderRequest - Mobile no from Firebase in condition: " + firebase_mobileno + "firebase_orderdata.refrenceno_bill_no :" + firebase_orderdata.refrenceno_bill_no);
        //            // var item_ref = rootref.child(outlet_id + '/stock_count/' + item_id + '/locked_count');

        //            if (outletid == firebase_outletid && firebase_status == success_status)
        //            {
        //                // firebase_reference_bill_no
        //                output = { "referenceno": firebase_orderdata.refrenceno_bill_no, "outletid": outletid, 'expirydatetime': '2016-05-25T06:30:00.000Z' };
        //                message_text = "Order placed successfully";
        //                status_text = success_status;
        //            }
        //            else
        //            {
        //                output = { "referenceno": firebase_orderdata.refrenceno_bill_no, "outletid": outletid, 'expirydatetime': '2016-05-25T06:30:00.000Z' };
        //                message_text = "Order not placed";
        //                status_text = fail_status;
        //            }

        //            context = { orderreferencedetails: output, message: message_text, status: status_text };
        //        }

        //        res.send(context);
        //        return;
        //    } catch (e)
        //    {
        //        general.genericError("api.js :: SendOrderRequest: " + e);
        //    }
        //});

        //res.send(context);
        //return;

    } catch (e)
    {
        general.genericError("api.js :: SendOrderRequest: " + e);
    }
});

/*
router.post('/SendOrderRequest', function (req, res) {
    try
    {
        general.genericError("SendOrderRequest: " + JSON.stringify(req.body));

        ClearContext();
        var post_request = req.body;
        var order_details = post_request.orderdetails;
        var payment_mode = post_request.paymentmode;
        var outletid = post_request.outletid;
        var sides = post_request.sides;
        var savings = post_request.savings;
        var mobileno = post_request.mobileno;
        var credit_card_no = post_request.credit_card_no;
        var cardholder_name = post_request.cardholder_name;
        var referenceno;

        var formated_outletid = general.leftPad(outletid, 3);
        current_formatted_date = general.GetFormattedDateDDMMYYYY();

        // json_ordernumber_array = { "outlets": [{ "outletid": "005","ordernumber": 000001, "createddate": '2016-05-11' }, { "outletid": "006","ordernumber": 000001, "createddate": '2016-05-12' }] };

        general.genericError("current_formatted_date: " + current_formatted_date);
        // Connection estabilshed
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    return;
                }

                // Check previous createddate and ordernumber in variables                
                general.genericError("json_ordernumber_array 1: " + JSON.stringify(json_ordernumber_array));
                if (json_ordernumber_array.ordernumbers == null || json_ordernumber_array.ordernumbers == undefined)
                {
                    try
                    {
                        if (err)
                        {
                            handleError('error fetching client from pool' + err);
                            return;
                        }

                        // Check ordernumber row in database for this outlet
                        client.query("select ordernumber, to_char(createddate,'yyyy-MM-dd') createddate from order_number_sequence where outletid=$1"
                        , [outletid], function (query_err, result) {
                            try
                            {
                                if (query_err)
                                {
                                    handleError('SendOrderRequest:: selelct:: error running query' + query_err);
                                    return;
                                }

                                // releasing the connection
                                done();

                                // If Exists the order number, then increase by 1 and update it.
                                if (result.rows.length > 0)
                                {
                                    previous_order_number_createddate = result.rows[0].createddate;
                                    previous_order_number = result.rows[0].ordernumber;

                                    // Increate ordernumber count by 1
                                    current_order_number = general.leftPad((parseInt(previous_order_number + 1)), 6);

                                    if (current_formatted_date != previous_order_number_createddate)
                                    {
                                        previous_order_number_createddate = current_formatted_date;
                                        current_order_number = formated_outletid + general.leftPad((parseInt(1)), 6);
                                    }

                                    current_ordernumber_details = { "outletid": formated_outletid, "ordernumber": current_order_number, "createddate": previous_order_number_createddate };

                                    if (json_ordernumber_array.ordernumbers == null || json_ordernumber_array.ordernumbers == undefined)
                                    {
                                        json_ordernumber_array.ordernumbers = [];
                                        json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                        general.genericError("json_ordernumber_array 2: " + JSON.stringify(json_ordernumber_array));
                                    }
                                    else
                                    {
                                        for (var i = 0; i < json_ordernumber_array.ordernumbers.length; i++)
                                        {
                                            if (json_ordernumber_array.ordernumbers[i].outletid == formated_outletid)
                                            {
                                                console.log("outletid: " + json_ordernumber_array.ordernumbers[i].outletid);
                                                json_ordernumber_array.ordernumbers[i].ordernumber = current_order_number;
                                                break;
                                            }
                                            else
                                            {
                                                json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                            }
                                        }
                                    }

                                    general.genericError("json_ordernumber_array 3: " + JSON.stringify(json_ordernumber_array));
                                    general.genericError("SendOrderRequest:: TEST 1: current_order_number: " + current_order_number);

                                    // Update the ordernumber and createddate                                    
                                    client.query("update order_number_sequence set ordernumber=$1,createddate=$2 where outletid=$3"
                                                , [current_order_number, previous_order_number_createddate, outletid], function (query_err, result) {
                                                    try
                                                    {
                                                        if (query_err)
                                                        {
                                                            handleError('SendOrderRequest:: Update  - error running query' + query_err);
                                                            return;
                                                        }

                                                        // releasing the connection
                                                        done();
                                                    } catch (e)
                                                    {
                                                        general.genericError("api.js :: SendOrderRequest: " + e);
                                                    }

                                                    general.genericError("SendOrderRequest:: TEST 2: current_order_number: " + current_order_number);

                                                    socket.emit('send-order-request-to-server', {
                                                        'order_details': order_details,
                                                        'payment_mode': payment_mode,
                                                        'outletid': outletid,
                                                        'sides': sides,
                                                        'savings': savings,
                                                        'mobileno': mobileno,
                                                        'credit_card_no': credit_card_no,
                                                        'cardholder_name': cardholder_name,
                                                        'referenceno': general.leftPad(current_order_number, 9)
                                                    });

                                                    output = { "referenceno": general.leftPad(current_order_number, 9), "outletid": outletid };
                                                    message_text = "Order sent successfully";
                                                    status_text = success_status;
                                                    context = { orderreferencedetails: output, message: message_text, status: status_text };
                                                    res.send(context);
                                                    return;

                                                });
                                }
                                else
                                {
                                    // If order number not exists then, need to create new order number with outletid
                                    current_order_number = formated_outletid + general.leftPad((parseInt(1)), 6);
                                    previous_order_number_createddate = current_formatted_date;

                                    general.genericError("api.js :: SendOrderRequest: OutletId: " + outletid + " OrderNumber: " + current_order_number + " Date: " + current_formatted_date);

                                    client.query("Insert into order_number_sequence values ($1,$2,$3)", [outletid, current_order_number, current_formatted_date], function (query_err, result) {
                                        try
                                        {
                                            if (query_err)
                                            {
                                                handleError('SendOrderRequest:: Insert :: error running query' + query_err);
                                                return;
                                            }

                                            // releasing the connection
                                            done();


                                            general.genericError("Send Order Request - after emitting data");
                                            general.genericError("SendOrderRequest:: Insert current_order_number: " + current_order_number + " previous_order_number_createddate: " + previous_order_number_createddate);

                                            current_ordernumber_details = { "outletid": formated_outletid, "ordernumber": current_order_number, "createddate": current_formatted_date };

                                            if (json_ordernumber_array.ordernumbers == null || json_ordernumber_array.ordernumbers == undefined)
                                            {
                                                json_ordernumber_array.ordernumbers = [];
                                                json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                            }
                                            else
                                            {
                                                json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                            }

                                            general.genericError("json_ordernumber_array 4: " + JSON.stringify(json_ordernumber_array));

                                            socket.emit('send-order-request-to-server', {
                                                'order_details': order_details,
                                                'payment_mode': payment_mode,
                                                'outletid': outletid,
                                                'sides': sides,
                                                'savings': savings,
                                                'mobileno': mobileno,
                                                'credit_card_no': credit_card_no,
                                                'cardholder_name': cardholder_name,
                                                'referenceno': general.leftPad(current_order_number, 9)
                                            });

                                            output = { "referenceno": general.leftPad(current_order_number, 9), "outletid": outletid };
                                            message_text = "Order sent successfully";
                                            status_text = success_status;
                                            context = { orderreferencedetails: output, message: message_text, status: status_text };
                                            res.send(context);
                                            return;
                                        }
                                        catch (e)
                                        {
                                            general.genericError("api.js :: SendOrderRequest: " + e);
                                        }
                                    });
                                }

                            } catch (e)
                            {
                                general.genericError("api.js :: SendOrderRequest: " + e);
                            }
                        });
                    } catch (e)
                    {
                        general.genericError("api.js :: SendOrderRequest: " + e);
                    }

                }
                else
                {
                    // Check whether the outletid (if new) in json_ordernumber_array
                    var new_outlet_id = 0;

                    for (var i = 0; i < json_ordernumber_array.ordernumbers.length; i++)
                    {
                        if (json_ordernumber_array.ordernumbers[i].outletid == outletid)
                        {
                            previous_order_number_createddate = json_ordernumber_array.ordernumbers[i].createddate;
                            new_outlet_id = json_ordernumber_array.ordernumbers[i].outletid;
                            current_order_number = json_ordernumber_array.ordernumbers[i].ordernumber;
                            console.log("previous_order_number_createddate + Outletid: " + json_ordernumber_array.ordernumbers[i].outletid);
                            break;
                        }
                    }

                    general.genericError("new_outlet_id: " + new_outlet_id);
                    if (new_outlet_id != 0)
                    {
                        // Check the current date and previous createddate
                        if (current_formatted_date == previous_order_number_createddate)
                        {
                            // Increate ordernumber count by 1
                            current_order_number = general.leftPad((parseInt(current_order_number) + 1), 6);

                            // Update the ordernumber and createddate                                    
                            client.query("update order_number_sequence set ordernumber=$1,createddate=$2 where outletid=$3"
                                        , [current_order_number, current_formatted_date, outletid], function (query_err, result) {
                                            try
                                            {
                                                if (query_err)
                                                {
                                                    handleError('SendOrderRequest:: Update 2  - error running query' + query_err);
                                                    return;
                                                }

                                                // releasing the connection
                                                done();
                                            } catch (e)
                                            {
                                                general.genericError("api.js :: SendOrderRequest: " + e);
                                            }

                                            current_ordernumber_details = { "outletid": formated_outletid, "ordernumber": current_order_number, "createddate": current_formatted_date };

                                            if (json_ordernumber_array.ordernumbers == null || json_ordernumber_array.ordernumbers == undefined)
                                            {
                                                json_ordernumber_array.ordernumbers = [];
                                                json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                            }
                                            else
                                            {
                                                for (var i = 0; i < json_ordernumber_array.ordernumbers.length; i++)
                                                {
                                                    if (json_ordernumber_array.ordernumbers[i].outletid == formated_outletid)
                                                    {
                                                        console.log("outletid: " + json_ordernumber_array.ordernumbers[i].outletid);
                                                        json_ordernumber_array.ordernumbers[i].ordernumber = current_order_number;
                                                        break;
                                                    }
                                                    else
                                                    {
                                                        json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                                    }
                                                }
                                            }

                                            general.genericError("json_ordernumber_array 5: " + JSON.stringify(json_ordernumber_array));

                                            general.genericError("SendOrderRequest:: TEST 4: current_order_number: " + current_order_number);
                                            socket.emit('send-order-request-to-server', {
                                                'order_details': order_details,
                                                'payment_mode': payment_mode,
                                                'outletid': outletid,
                                                'sides': sides,
                                                'savings': savings,
                                                'mobileno': mobileno,
                                                'credit_card_no': credit_card_no,
                                                'cardholder_name': cardholder_name,
                                                'referenceno': general.leftPad(current_order_number, 9)
                                            });

                                            output = { "referenceno": general.leftPad(current_order_number, 9), "outletid": outletid };
                                            message_text = "Order sent successfully";
                                            status_text = success_status;
                                            context = { orderreferencedetails: output, message: message_text, status: status_text };
                                            res.send(context);
                                            return;

                                        });
                        }
                        else
                        {
                            // Reset order number
                            current_order_number = formated_outletid + general.leftPad((parseInt(1)), 6);

                            // Update the ordernumber and createddate                                    
                            client.query("update order_number_sequence set ordernumber=$1,createddate=$2 where outletid=$3"
                                        , [current_order_number, current_formatted_date, outletid], function (query_err, result) {
                                            try
                                            {
                                                if (query_err)
                                                {
                                                    handleError('SendOrderRequest:: Update 3  - error running query' + query_err);
                                                    return;
                                                }

                                                // releasing the connection
                                                done();
                                            } catch (e)
                                            {
                                                general.genericError("api.js :: SendOrderRequest: " + e);
                                            }

                                            general.genericError("SendOrderRequest:: TEST 5: current_order_number: " + current_order_number);
                                            socket.emit('send-order-request-to-server', {
                                                'order_details': order_details,
                                                'payment_mode': payment_mode,
                                                'outletid': outletid,
                                                'sides': sides,
                                                'savings': savings,
                                                'mobileno': mobileno,
                                                'credit_card_no': credit_card_no,
                                                'cardholder_name': cardholder_name,
                                                'referenceno': general.leftPad(current_order_number, 9)

                                            });

                                            output = { "referenceno": general.leftPad(current_order_number, 9), "outletid": outletid, 'expirydatetime': '2016-05-25T06:30:00.000Z' };
                                            message_text = "Order sent successfully";
                                            status_text = success_status;
                                            context = { orderreferencedetails: output, message: message_text, status: status_text };
                                            res.send(context);
                                            return;

                                        });
                        }
                    }
                    else
                    {
                        try
                        {
                            if (err)
                            {
                                handleError('error fetching client from pool' + err);
                                return;
                            }

                            // Check ordernumber row in database for this outlet
                            client.query("select ordernumber, to_char(createddate,'yyyy-MM-dd') createddate from order_number_sequence where outletid=$1"
                            , [outletid], function (query_err, result) {
                                try
                                {
                                    if (query_err)
                                    {
                                        handleError('SendOrderRequest:: selelct:: error running query' + query_err);
                                        return;
                                    }

                                    // releasing the connection
                                    done();

                                    // If Exists the order number, then increase by 1 and update it.
                                    if (result.rows.length > 0)
                                    {
                                        previous_order_number_createddate = result.rows[0].createddate;
                                        previous_order_number = result.rows[0].ordernumber;

                                        // Increate ordernumber count by 1
                                        current_order_number = general.leftPad((parseInt(previous_order_number + 1)), 6);

                                        if (current_formatted_date != previous_order_number_createddate)
                                        {
                                            previous_order_number_createddate = current_formatted_date;
                                            current_order_number = formated_outletid + general.leftPad((parseInt(1)), 6);
                                        }

                                        current_ordernumber_details = { "outletid": formated_outletid, "ordernumber": current_order_number, "createddate": previous_order_number_createddate };

                                        if (json_ordernumber_array.ordernumbers == null || json_ordernumber_array.ordernumbers == undefined)
                                        {
                                            json_ordernumber_array.ordernumbers = [];
                                            json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                            general.genericError("json_ordernumber_array 2: " + JSON.stringify(json_ordernumber_array));
                                        }
                                        else
                                        {
                                            for (var i = 0; i < json_ordernumber_array.ordernumbers.length; i++)
                                            {
                                                if (json_ordernumber_array.ordernumbers[i].outletid == formated_outletid)
                                                {
                                                    console.log("outletid: " + json_ordernumber_array.ordernumbers[i].outletid);
                                                    json_ordernumber_array.ordernumbers[i].ordernumber = current_order_number;
                                                    break;
                                                }
                                                else
                                                {
                                                    json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                                }
                                            }
                                        }

                                        general.genericError("json_ordernumber_array 3: " + JSON.stringify(json_ordernumber_array));
                                        general.genericError("SendOrderRequest:: TEST 1: current_order_number: " + current_order_number);

                                        // Update the ordernumber and createddate                                    
                                        client.query("update order_number_sequence set ordernumber=$1,createddate=$2 where outletid=$3"
                                                    , [current_order_number, previous_order_number_createddate, outletid], function (query_err, result) {
                                                        try
                                                        {
                                                            if (query_err)
                                                            {
                                                                handleError('SendOrderRequest:: Update  - error running query' + query_err);
                                                                return;
                                                            }

                                                            // releasing the connection
                                                            done();
                                                        } catch (e)
                                                        {
                                                            general.genericError("api.js :: SendOrderRequest: " + e);
                                                        }

                                                        general.genericError("SendOrderRequest:: TEST 2: current_order_number: " + current_order_number);

                                                        socket.emit('send-order-request-to-server', {
                                                            'order_details': order_details,
                                                            'payment_mode': payment_mode,
                                                            'outletid': outletid,
                                                            'sides': sides,
                                                            'savings': savings,
                                                            'mobileno': mobileno,
                                                            'credit_card_no': credit_card_no,
                                                            'cardholder_name': cardholder_name,
                                                            'referenceno': general.leftPad(current_order_number, 9)
                                                        });

                                                        output = { "referenceno": general.leftPad(current_order_number, 9), "outletid": outletid };
                                                        message_text = "Order sent successfully";
                                                        status_text = success_status;
                                                        context = { orderreferencedetails: output, message: message_text, status: status_text };
                                                        res.send(context);
                                                        return;

                                                    });
                                    }
                                    else
                                    {
                                        // If order number not exists then, need to create new order number with outletid
                                        current_order_number = formated_outletid + general.leftPad((parseInt(1)), 6);
                                        previous_order_number_createddate = current_formatted_date;

                                        general.genericError("api.js :: SendOrderRequest: OutletId: " + outletid + " OrderNumber: " + current_order_number + " Date: " + current_formatted_date);

                                        client.query("Insert into order_number_sequence values ($1,$2,$3)", [outletid, current_order_number, current_formatted_date], function (query_err, result) {
                                            try
                                            {
                                                if (query_err)
                                                {
                                                    handleError('SendOrderRequest:: Insert :: error running query' + query_err);
                                                    return;
                                                }

                                                // releasing the connection
                                                done();


                                                general.genericError("Send Order Request - after emitting data");
                                                general.genericError("SendOrderRequest:: Insert current_order_number: " + current_order_number + " previous_order_number_createddate: " + previous_order_number_createddate);

                                                current_ordernumber_details = { "outletid": formated_outletid, "ordernumber": current_order_number, "createddate": current_formatted_date };

                                                if (json_ordernumber_array.ordernumbers == null || json_ordernumber_array.ordernumbers == undefined)
                                                {
                                                    json_ordernumber_array.ordernumbers = [];
                                                    json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                                }
                                                else
                                                {
                                                    json_ordernumber_array.ordernumbers.push(current_ordernumber_details);
                                                }

                                                general.genericError("json_ordernumber_array 4: " + JSON.stringify(json_ordernumber_array));

                                                socket.emit('send-order-request-to-server', {
                                                    'order_details': order_details,
                                                    'payment_mode': payment_mode,
                                                    'outletid': outletid,
                                                    'sides': sides,
                                                    'savings': savings,
                                                    'mobileno': mobileno,
                                                    'credit_card_no': credit_card_no,
                                                    'cardholder_name': cardholder_name,
                                                    'referenceno': general.leftPad(current_order_number, 9)
                                                });

                                                output = { "referenceno": general.leftPad(current_order_number, 9), "outletid": outletid };
                                                message_text = "Order sent successfully";
                                                status_text = success_status;
                                                context = { orderreferencedetails: output, message: message_text, status: status_text };
                                                res.send(context);
                                                return;
                                            }
                                            catch (e)
                                            {
                                                general.genericError("api.js :: SendOrderRequest: " + e);
                                            }
                                        });
                                    }

                                } catch (e)
                                {
                                    general.genericError("api.js :: SendOrderRequest: " + e);
                                }
                            });
                        } catch (e)
                        {
                            general.genericError("api.js :: SendOrderRequest: " + e);
                        }
                    }


                }
            }
            catch (e)
            {
                general.genericError("api.js :: SendOrderRequest:: " + e);
            }

        });

//    } catch (e)
//    {
//        general.genericError("api.js :: SendOrderRequest: " + e);
//    }
        //});

*/

router.get('/GetOrderStatus/:mobileno/:outletid/:referenceno', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("GetOrderStatus: " + JSON.stringify(req.params));


        ClearContext();
        var request = req.params;
        var mobileno = request.mobileno;
        var outletid = request.outletid;
        var referenceno = request.referenceno;
        //general.genericError("referenceno: " + referenceno);
        // read order status from firebase
        rootref.child('orderstatus').child(referenceno).on('value', function (snapshot) {
            try
            {
                var firebase_status;
                var firebase_orderdata;
                var firebase_bill_no;
                var firebase_message;
                var firebase_mobileno;
                var firebase_outletid;

                snapshot.forEach(function (childSnapshot) {
                    try
                    {
                        var key = childSnapshot.key();
                        var value = childSnapshot.val();

                        switch (key)
                        {
                            case "status":
                                firebase_status = value;
                                break;
                            case "orderdata":
                                firebase_orderdata = value;
                                break;
                            case "bill_no":
                                firebase_bill_no = value;
                                break;
                            case "message":
                                firebase_message = value;
                                break;
                            case "mobileno":
                                firebase_mobileno = value;
                                break;
                            case "outletid":
                                firebase_outletid = value;
                                break;
                            default:
                                break;
                        };
                    } catch (e)
                    {
                        general.genericError("api.js :: GetOrderStatus: " + e);
                    }
                });

                //general.genericError(JSON.stringify(firebase_orderdata));
                // Check user typed OTP with saved firebase OTP
                if (mobileno == firebase_mobileno && firebase_outletid == outletid)
                {
                    general.genericError("GetOrderStatus - Mobile no from Firebase in condition: " + firebase_mobileno);
                    // var item_ref = rootref.child(outlet_id + '/stock_count/' + item_id + '/locked_count');

                    if (outletid == firebase_outletid && firebase_status == success_status)
                    {
                        output = { "Bill_No": firebase_bill_no, "outletid": firebase_outletid, "mobileno": firebase_mobileno };
                        message_text = firebase_message;
                        status_text = success_status;
                    }
                    else
                    {
                        output = { "Bill_No": firebase_bill_no, "outletid": firebase_outletid, "mobileno": firebase_mobileno };
                        message_text = firebase_message;
                        status_text = fail_status;
                    }

                    context = { orderstatus: output, message: message_text, status: status_text };
                }

                res.send(context);
                return;
            } catch (e)
            {
                general.genericError("api.js :: GetOrderStatus: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: GetOrderStatus: " + e);
    }
});

/* SendReleaseLockRequest old functionality start */
/* router.post('/SendReleaseLockRequest', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("SendReleaseLockRequest: " + JSON.stringify(req.body));

        ClearContext();

        // general.genericError("Release Lock Request");
        var post_request = req.body;
        var items = post_request.items;
        var outletid = post_request.outletid;
        var mobileno = post_request.mobileno;
        var counter_code = 1;
        var referenceno = request.referenceno;

        received_outletid = outletid;

        var otp = GenerateRandomNumber(6);
        var referenceno = mobileno + GenerateRandomNumber(8);

        socket.emit("send-releaselockitem-data-to-server", {
            "items": items,
            "outletid": outletid,
            "mobileno": mobileno,
            "counter_code": counter_code,
            'referenceno': referenceno
        });
        general.genericError("Send Release Lock Request - after emitting data");

        output = { "referenceno": referenceno, "outletid": outletid };
        message_text = "Release Lock Items sent successfully";
        status_text = success_status;
        context = { releaselockreferencedetails: output, message: message_text, status: status_text };
        res.send(context);
        return;
    } catch (e)
    {
        general.genericError("api.js :: SendReleaseLockRequest: " + e);
    }
});

*/
/* SendReleaseLockRequest old functionality end */


router.post('/SendReleaseLockRequest', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("SendReleaseLockRequest: " + JSON.stringify(req.body));

        ClearContext();

        var post_request = req.body;
        var items = post_request.items;
        var outletid = post_request.outletid;
        var mobileno = post_request.mobileno;
        var counter_code = 1;
        var referenceno = request.referenceno;

        received_outletid = outletid;

        var otp = GenerateRandomNumber(6);
        var referenceno = mobileno + GenerateRandomNumber(8);

        var release_lock_data = {
            "items": items,
            "outletid": outletid,
            "mobileno": mobileno,
            "counter_code": counter_code,
            'referenceno': referenceno
        };

        socket.emit("send-releaselockitem-data-to-server", release_lock_data, function (receive_releaselock_data) {
            if (receive_releaselock_data != null && receive_releaselock_data.releaselockresult != null && receive_releaselock_data.releaselockresult.releaselockitem_data_client != null)
            {
                var data = receive_releaselock_data.releaselockresult.releaselockitem_data_client;

                if (data.status === success_status)
                {
                    output = { "referenceno": referenceno, "outletid": outletid };
                    message_text = "Release lock items successfully";
                    status_text = success_status;
                    context = { releaselockreferencedetails: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
                else
                {
                    output = { "referenceno": referenceno, "outletid": outletid };
                    message_text = "Release Lock Items failed";
                    status_text = fail_status;
                    context = { releaselockreferencedetails: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
            }
            else
            {
                output = { "referenceno": referenceno, "outletid": outletid };
                message_text = "Release Lock Items failed";
                status_text = fail_status;
                context = { releaselockreferencedetails: output, message: message_text, status: status_text };
                res.send(context);
                return;
            }
        });

        general.genericError("Send Release Lock Request - after emitting data");

    } catch (e)
    {
        general.genericError("api.js :: SendReleaseLockRequest: " + e);
    }
});

router.get('/GetReleaseLockItemStatus/:mobileno/:outletid/:referenceno', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("GetReleaseLockItemStatus: " + JSON.stringify(req.params));

        ClearContext();

        var request = req.params;
        var mobileno = request.mobileno;
        var outletid = request.outletid;
        var referenceno = request.referenceno;

        // read release lock item status from firebase
        rootref.child('releaselockitemstatus').child(referenceno).on('value', function (snapshot) {
            try
            {
                var firebase_status;
                var firebase_mobileno;
                var firebase_outletid;
                var firebase_hqclient;
                var firebase_items;

                snapshot.forEach(function (childSnapshot) {
                    try
                    {
                        var key = childSnapshot.key();
                        var value = childSnapshot.val();

                        switch (key)
                        {
                            case "status":
                                firebase_status = value;
                                break;
                            case "outletid":
                                firebase_outletid = value;
                                break;
                            case "hqclient":
                                firebase_hqclient = value;
                                break;
                            case "mobileno":
                                firebase_mobileno = value;
                                break;
                            case "items":
                                firebase_items = value;
                                break;
                            default:
                                break;
                        };
                    } catch (e)
                    {
                        general.genericError("api.js :: GetReleaseLockItemStatus: " + e);
                    }
                });

                general.genericError("GetReleaseLockItemStatus - Mobile no from Firebase: " + firebase_mobileno + " items: " + firebase_items);
                // Check user typed OTP with saved firebase OTP
                if (mobileno == firebase_mobileno && firebase_outletid == outletid)
                {
                    general.genericError("Mobile no from Firebase in condition: " + firebase_mobileno);
                    // var item_ref = rootref.child(outlet_id + '/stock_count/' + item_id + '/locked_count');

                    if (outletid == firebase_outletid && firebase_status == success_status)
                    {
                        output = { "items": firebase_items, "outletid": firebase_outletid, "mobileno": firebase_mobileno };
                        message_text = "Unlocked item successfully";
                        status_text = success_status;
                    }
                    else
                    {
                        output = { "items": firebase_items, "outletid": firebase_outletid, "mobileno": firebase_mobileno };
                        message_text = "Unlocked item failed";
                        status_text = fail_status;
                    }

                    context = { releaselockitemstatus: output, message: message_text, status: status_text };
                }

                res.send(context);
                return;
            } catch (e)
            {
                general.genericError("api.js :: GetReleaseLockItemStatus: " + e);
            }
        });
    } catch (e)
    {
        general.genericError("api.js :: GetReleaseLockItemStatus: " + e);
    }
});

router.post('/SendActivateOrderRequest', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("SendActivateOrderRequest: " + JSON.stringify(req.body));

        ClearContext();

        general.genericError("Send Activate Order Request");
        var request = req.body;
        var referenceno = request.referenceno;
        var mobileno = request.mobileno;
        var outletid = request.outletid;

        var activate_order_data = {
            "mobileno": mobileno,
            "referenceno": referenceno,
            "outletid": outletid
        };

        socket.emit("send-activate-order-request-data-to-server", activate_order_data, function (receive_activate_order_data) {
            if (receive_activate_order_data != null && receive_activate_order_data.activate_order_result != null && receive_activate_order_data.activate_order_result.activate_order_data_client != null)
            {
                // var data = receive_releaselock_data.releaselockresult.releaselockitem_data_client;
                var data = receive_activate_order_data.activate_order_result.activate_order_data_client;

                if (data.status === success_status)
                {
                    output = { "referenceno": referenceno };
                    message_text = "Order activated successfully";
                    status_text = success_status;
                    context = { activateorder: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
                else
                {
                    output = { "referenceno": referenceno };
                    message_text = "Order activated failed";
                    status_text = fail_status;
                    context = { activateorder: output, message: message_text, status: status_text };
                    res.send(context);
                    return;
                }
            }
            else
            {
                output = { "referenceno": referenceno };
                message_text = "Order activated failed";
                status_text = fail_status;
                context = { activateorder: output, message: message_text, status: status_text };
                res.send(context);
                return;
            }
        });

        general.genericError("Send Activate Order Request - after emitting data");


    } catch (e)
    {
        general.genericError("api.js :: SendActivateOrderRequest: " + e);
    }
});

router.post('/GetStockFromRedis', isAuthenticated, function (req, res) {
    try
    {
        general.genericError("GetStockFromRedis: " + JSON.stringify(req.body));

        ClearContext();

        socket.emit("send-stock-request-data-to-server", {
            "items": items,
            "outletid": outletid,
            "mobileno": mobileno,
            "counter_code": counter_code,
            'referenceno': referenceno
        });

        //output = { "referenceno": referenceno, "outletid": outletid };
        //message_text = "Release Lock Items sent successfully";
        //status_text = success_status;
        //context = { releaselockreferencedetails: output, message: message_text, status: status_text };
        //res.send(context);
        //return;
    } catch (e)
    {
        general.genericError("api.js :: GetStockFromRedis: " + e);
    }
});

router.get('/getlivestock/:outletid', isAuthenticated, function (req, res) {
    try
    {
        // ClearContext();    
        var outletid = req.params.outletid;
        GetLiveStockFromFirebase(outletid);

    } catch (e)
    {
        general.genericError("api.js :: getlivestock: " + e);
    }
});

router.get('/GetFoodItemDetails/:fooditemids', function (req, res) {
    try
    {
        var food_item_heating_flag = '';
        pg.connect(conString, function (err, client, done) {
            try
            {
                var fooditemids = req.params.fooditemids;

                if (err)
                {
                    handleError('GetFoodItemDetails:: error fetching client from pool ' + err);
                    res.send(food_item_heating_flag);
                    return;
                }

                var queryText = 'Select id, heating_required from food_item ft \
                                    where ft.id in (' + fooditemids.join(',') + ')';

                client.query(queryText, food_itemid_data, function (query_err, result) {
                    try
                    {
                        if (query_err)
                        {
                            handleError('GetFoodItemDetails:: error running query' + query_err);
                            res.send(food_item_heating_flag);
                            return;
                        }

                        // releasing the connection
                        done();
                        if (result.rows.length > 0)
                        {
                            food_item_heating_flag = result.rows;
                        }

                        res.send(food_item_heating_flag);
                        return;
                    } catch (e)
                    {
                        general.genericError("api.js :: GetFoodItemDetails: " + e);
                    }
                });
            } catch (e)
            {
                general.genericError("api.js :: GetFoodItemDetails: " + e);
            }
        });
    }
    catch (e)
    {
    }
});

router.get('/payu', function (req, res) {

    var request = require('request'),
        crypto = require('crypto'),
        str = 'taO2Gy|idr001|50|test|anonymous|anonymous@gmail.com|||||||||||CMpSRcXk';

    var hash = crypto.createHash('sha512');
    hash.update(str);
    var value = hash.digest('hex');

    console.log(value);

    var params = {
        'key': 'taO2Gy',
        'txnid': 'idr001',
        'amount': '50',
        'productinfo': 'test',
        'firstname': 'anonymous',
        'email': 'anonymous@gmail.com',
        'phone': '9999999999',
        'surl': 'http://localhost:8080/',
        'furl': 'http://localhost:8080/',
        'curl': 'http://localhost:8080/',
        'hash': value,
        'service_provider': 'payu_paisa'
    };


    request({
        url: "https://test.payu.in/_payment",
        method: "POST",
        json: true,
        body: params
    }, function (err, response, body) {
        if (err)
            console.log('Error : ' + err);
        res.send(body);
    });

});

function validateEmail(email) {
    try
    {
        general.genericError("Email: " + email);
        var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        general.genericError("Valid Status: " + re.test(email));
        return re.test(email);
    }
    catch (e)
    {
        general.genericError("api.js :: validateEmail: " + e);
    }
}

function GetOrderNumberSequence(outlet_id) {
    try
    {
        var newordernumber = 0;
        var formated_outletid = general.leftPad(outlet_id, 3);

        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    return;
                }

                client.query("select * from order_number_sequence where outletid=$1", [outlet_id], function (query_err, result) {
                    try
                    {
                        if (query_err)
                        {
                            handleError('GetOrderNumberSequence:: selelct:: error running query' + query_err);
                            return;
                        }

                        // releasing the connection
                        done();

                        if (result.rows.length > 0)
                        {
                            output = result.rows;
                            previous_order_number = parseInt(output[0].ordernumber);
                            previous_order_number_createddate = output[0].createddate;

                            current_order_number = general.leftPad(parseInt(previous_order_number) + 1, 6);

                            //newordernumber = formated_outletid + current_order_number;
                            //general.genericError("New OrderNumber Select: " + newordernumber);
                        }
                        else
                        {
                            var orderNumber = formated_outletid + general.leftPad(parseInt(1), 6);
                            var formattedDate = general.GetFormattedDateDDMMYYYY();

                            general.genericError("api.js :: GetOrderNumberSequence: OutletId: " + outlet_id + " OrderNumber: " + orderNumber + " Date: " + formattedDate);
                            client.query("Insert into order_number_sequence values ($1,$2,$3)", [outlet_id, orderNumber, formattedDate], function (query_err, result) {
                                try
                                {
                                    if (query_err)
                                    {
                                        handleError('GetOrderNumberSequence:: Insert :: error running query' + query_err);
                                        return;
                                    }

                                    // releasing the connection
                                    done();
                                    previous_order_number = orderNumber;
                                    previous_order_number_createddate = formattedDate;

                                    current_order_number = general.leftPad(parseInt(previous_order_number), 6);

                                    general.genericError("GetOrderNumberSequence:: current_order_number 1: " + current_order_number + " previous_order_number_createddate: " + previous_order_number_createddate);

                                    //newordernumber = formated_outletid + current_order_number;
                                    //general.genericError("New OrderNumber Insert: " + newordernumber);
                                }
                                catch (e)
                                {
                                    general.genericError("api.js :: GetOrderNumberSequence: " + e);
                                }
                            });
                        }

                    } catch (e)
                    {
                        general.genericError("api.js :: GetOrderNumberSequence: " + e);
                    }

                });
            } catch (e)
            {
                general.genericError("api.js :: GetOrderNumberSequence: " + e);
            }

        });
    }
    catch (e)
    {
        general.genericError("api.js :: GetOrderNumberSequence: " + e);
    }
}

function UpdateOrderNumberSequence(outlet_id) {
    try
    {
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('error fetching client from pool' + err);
                    return;
                }

                var formattedDate = general.GetFormattedDateDDMMYYYY();

                client.query("update order_number_sequence set ordernumber=$1,createddate=$2 where outletid=$3"
                    , [current_order_number, formattedDate, outlet_id], function (query_err, result) {
                        try
                        {
                            if (query_err)
                            {
                                handleError('UpdateOrderNumberSequence:: Update - error running query' + query_err);
                                return;
                            }

                            // releasing the connection
                            done();

                        } catch (e)
                        {
                            general.genericError("api.js :: UpdateOrderNumberSequence: " + e);
                        }

                    });
            } catch (e)
            {
                general.genericError("api.js :: UpdateOrderNumberSequence: " + e);
            }

        });

        general.genericError("UpdateOrderNumberSequence:: current_order_number 1: " + current_order_number + " previous_order_number_createddate: " + previous_order_number_createddate);
    }
    catch (e)
    {
        general.genericError("api.js :: UpdateOrderNumberSequence: " + e);
    }
}

// Get live stock from firebase based on barcode
function GetLiveStockFromFirebase(outlet_id) {
    var rootref = new firebase(firebase_connection_outlet);
    var stock_count_node = rootref.child('{}/{}'.format(outlet_id, helper.stock_count_node));
    var item_data = [];
    // Getting the stock data
    stock_count_node.once("value", function (data) {
        var data = data.val();

        // general.genericError("Live Stock Data: " + JSON.stringify(data));
        for (var key in data)
        {
            // ignore if the item is in test mode
            if (isTestModeItem(Number(key)))
            {
                continue;
            }

            var locked_count = data[key].locked_count;
            //totalItems = 0;
            //totalbarcodes = '';
            // If there are no items, just continue
            if (data[key]["item_details"] == undefined)
            {
                continue;
            }
            data[key]["item_details"].map(function (item) {
                //totalItems += item.count;
                item_data.push({
                    food_item_id: key,
                    barcode: item.barcode,
                    count: item.count,
                    timestamp: item.timestamp,
                    locked_count: locked_count
                });
            });

        }

        general.genericError("Item data for live stock count is- " + JSON.stringify(item_data));

        return item_data;
    });
}

function isTestModeItem(item_code) {
    if (item_code >= 9000 && item_code <= 9099)
    {
        return true;
    } else
    {
        return false;
    }

}

function GetMobileAppOutlets() {
    try
    {
        pg.connect(conString, function (err, client, done) {
            try
            {
                if (err)
                {
                    handleError('GetMobileAppOutlets:: error fetching client from pool ' + err);
                    return;
                }

                var queryText = 'select ID from outlet where IsMobileApp=true';

                client.query(queryText, function (query_err, result) {
                    try
                    {
                        if (query_err)
                        {
                            handleError('GetMobileAppOutlets:: error running query' + query_err);
                            return;
                        }

                        // releasing the connection
                        done();
                        if (result.rows.length > 0)
                        {
                            mobileapp_outlets = result.rows;
                        }

                        return;
                    } catch (e)
                    {
                        general.genericError("api.js :: GetMobileAppOutlets: " + e);
                    }
                });
            } catch (e)
            {
                general.genericError("api.js :: GetMobileAppOutlets: " + e);
            }
        });
    }
    catch (e)
    {
        general.genericError("api.js :: GetMobileAppOutlets: " + e);
    }
}

function isAuthenticated(req, res, next) {

    // do any checks you want to in here

    // CHECK THE USER STORED IN SESSION FOR A CUSTOM VARIABLE
    // you can do this however you want with whatever variables you set up
    var outlet_id = 0;

    if (req.method === "POST")
    {
        outlet_id = req.body.outletid;
    }
    else
    {
        outlet_id = req.params.outletid;
    }

    var isActiveMobile = mobileapp_outlets.some(function (el) {
        return el.id === parseInt(outlet_id);
    });

    // if (!isActiveMobile) { return -1; }

    if (isActiveMobile)
        return next();

    // IF A USER ISN'T LOGGED IN, THEN REDIRECT THEM SOMEWHERE
    res.redirect('/');
}

module.exports = router;
