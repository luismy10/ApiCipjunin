var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'SysSoftIntegra Server Web',
    description: 'The websocket server for the SysSoftIntegra project.',
    script: 'D:\\node js\\Node.js, Express & MySQL Tutorial - Build a Simple FullStack App\\server\\app.js'
});

// Listen for the 'install' event, which indicates the
// process is available as a service.
svc.on('install', function() {
    svc.start();
});

// install the service
svc.install();