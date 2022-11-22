var https = require('https');
const fs = require('fs');
const data = fs.readFileSync('config.json', 'utf-8');
const GIST_ID      = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

return new Promise((resolve, reject) => {
  const postData = JSON.stringify({files:{"config.json":{content:data}}});
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/gists/${GIST_ID}`,
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'fijimunkii'
    }
  };
  const req = https.request(options, async (res) => {
    let resBody = [];
    res.on('data', d => resBody.push(d));
    res.on('end', () => {
      if (res.statusCode !== 200) {
        reject(Buffer.from(resBody).toString('utf8'));
      }
      resolve();
    });
  });
  req.on('error', reject);
  req.write(postData);
  req.end();
});
