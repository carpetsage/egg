import fs from 'fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import path from 'path';

import { MockMethod } from 'vite-plugin-mock';

function loadFile(filename) {
  return fs.readFileSync(path.join(__dirname, filename), { encoding: 'ascii' });
}

function fileResponse(filename: string) {
  return (req: IncomingMessage, res: ServerResponse) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(loadFile(filename));
  };
}

let counter = 0;

export default [
  {
    url: '/api/ei/coop_status',
    method: 'post',
    rawResponse: (req, res) => {
      // Cycle through two responses.
      const filename = `coop_status_${counter % 2}.txt`;
      counter++;
      fileResponse(filename)(req, res);
    },
  },
  {
    url: '/api/ei/first_contact',
    method: 'post',
    rawResponse: fileResponse('first_contact.txt'),
  },
  {
    url: '/api/ei/query_coop',
    method: 'post',
    rawResponse: fileResponse('query_coop.txt'),
  },
] as MockMethod[];
