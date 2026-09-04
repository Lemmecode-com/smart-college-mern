const fs=require('fs');
const p='tests/exam/step8-security.test.js';
const W=(s)=>fs.appendFileSync(p,s+'\n','utf8');
fs.writeFileSync(p,'','utf8');
