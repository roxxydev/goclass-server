'use strict';

const Hapi = require('hapi');
const Good = require('good');

const server = new Hapi.Server();

const userValidation = require('./user_validation');
const apiResponse = require('./api_response');
const dbRedis = require('./db_redis');

server.connection({ port: 3000 });
server.app.alias = 'GoClass';

server.method('user.registration.validate', userValidation.validateRegistration);

server.route({
	method: 'POST',
	path: '/auth/user',
	handler: function (request, reply) {
        let user = request.payload;
        
        // validate user registration details
        server.methods.user.registration.validate(user, function(err, result) {
            if (err) {
                let response = apiResponse.constructApiResponse( err.error_code, err.error_message);
                server.log('error', '/user/register ' + response);
                reply(response);
            } else {
                let registeredUser = result;
                reply(apiResponse.constructApiResponse( 201, registeredUser.name + ' registered' ));
            }
        });
	}
});

server.route({
	method: 'POST',
	path: '/user/register',
	handler: function (request, reply) {
        let user = request.payload;
        
        // validate user registration details
        server.methods.user.registration.validate(user, function(err, result) {
            if (err) {
                let response = apiResponse.constructApiResponse( err.error_code, err.error_message);
                server.log('error', '/user/register ' + response);
                reply(response);
            } else {
                let userDetails = result;
                dbRedis.writeUserDetails(userDetails);
                reply(apiResponse.constructApiResponse( 201, userDetails.name + ' registered' ));
            }
        });
	}
});

server.route({
   method: 'GET',
   path: '/user/{email}',
   handler: function (request, reply) {
        let userEmail = encodeURIComponent(request.params.email);
        dbRedis.getUserDetails(decodeURIComponent(userEmail), function(err, obj) {
            if (err) {
                server.log('error', '/user/' + request.params.email + " " + err);
                reply(apiResponse.getUnexpectedApiError());
            } else if (obj == null) {
                reply(apiResponse.getUserNonExistentError());
            } else {
                reply(JSON.stringify(obj));
            }
        });
   } 
});

server.register({
    register: Good,
    options: {
        reporters: [{
            reporter: require('good-console'),
            events: {
                response: '*',
                log: '*'
            }
        }]
    }
}, (err) => {

    if (err) {
        throw err; // something bad happened loading the plugin
    }

    server.start((err) => {

        if (err) {
           throw err;
        }
        server.log('info', 'server running at: ' + server.info.uri);
    });
});