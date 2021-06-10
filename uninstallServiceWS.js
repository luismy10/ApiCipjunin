var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'SysSoftIntegra Server Web',
    description: 'The websocket server for the SysSoftIntegra project.',
    script: 'D:\\node js\\Node.js, Express & MySQL Tutorial - Build a Simple FullStack App\\server\\app.js'
});

// Listen for the 'uninstall' event so we know when it is done.
svc.on('uninstall', function() {
    console.log('Uninstall complete.');
    console.log('The service exists: ', svc.exists);

});

// Uninstall the service.
svc.uninstall();