const yaml = require('js-yaml');
const fs = require('fs')
const config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));



switch(process.argv[2]) {
    case 'login':
    require('./login')()
    break
  case 'crawl':
    var crawler = require('./crawler')
    crawler(config)
    break
  default:
    console.log("Invalid operation: "+process.argv[2])
  }