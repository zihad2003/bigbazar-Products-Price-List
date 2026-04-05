const https = require('https');

const options = {
    hostname: 'dgdjjyxjnpzqqofdqxdp.supabase.co',
    path: '/rest/v1/products?select=*',
    method: 'GET',
    headers: {
        'apikey': 'sb_publishable_cjsjwayzjMDQLS98ra5gtA_H0jqjXbg',
        'Authorization': 'Bearer sb_publishable_cjsjwayzjMDQLS98ra5gtA_H0jqjXbg'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
