const https = require('https');

const productId = '15a915a6-2920-4b00-95d0-c1c67a78e69f';
const apiKey = 'sb_publishable_cjsjwayzjMDQLS98ra5gtA_H0jqjXbg';

const data = JSON.stringify({
    available_sizes: [
        { name: '26', is_available: true },
        { name: '28', is_available: true },
        { name: '30', is_available: true },
        { name: '32', is_available: true },
        { name: '34', is_available: true },
        { name: '36', is_available: true }
    ],
    available_colors: [
        { name: 'Purple', is_available: true, hex: '#800080' },
        { name: 'Maroon', is_available: true, hex: '#800000' },
        { name: 'Peach', is_available: true, hex: '#FFDAB9' },
        { name: 'Green', is_available: true, hex: '#008000' },
        { name: 'Yellow', is_available: true, hex: '#FFFF00' }
    ]
});

const options = {
    hostname: 'dgdjjyxjnpzqqofdqxdp.supabase.co',
    path: `/rest/v1/products?id=eq.${productId}`,
    method: 'PATCH',
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (d) => { process.stdout.write(d); });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
