const fs = require('fs');
const yaml = require('js-yaml');

const prdPath = './.gm/prd.yml';
const prd = yaml.load(fs.readFileSync(prdPath, 'utf8'));

prd[0].status = 'completed';

const updatedYaml = yaml.dump(prd, { lineWidth: -1 });
fs.writeFileSync(prdPath, updatedYaml);

console.log('PRD updated: rs-learn-static-verification marked completed');
