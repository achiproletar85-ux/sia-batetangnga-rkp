const http = require('http');

http.get('http://localhost:5500/dokumen-desa.html', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    if (data.includes('tableTemplatesBody') && data.includes('dokumen-desa.js')) {
      console.log('✅ dokumen-desa.html has tableTemplatesBody container and script');
    }
  });
}).on('error', err => console.error('Error:', err.message));
