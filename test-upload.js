// test-upload.js
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function run() {
  const form = new FormData();
  form.append('file', Buffer.from('hello world'), { filename: 'test.txt', contentType: 'text/plain' });

  try {
    const res = await fetch('http://localhost:8080/api/upload/resume', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    console.log(res.status, await res.text());
  } catch(e) {
    console.error(e);
  }
}
run();
