const aws = require('./lib/aws')
const cloudflare = require('./lib/cloudflare')
const k8s = require('./lib/k8s')
const secrets = require('./lib/secrets')
const util = require('./lib/util')
const vault = require('./lib/vault')

module.exports = {
    aws,
    cloudflare,
    k8s,
    secrets,
    util,
    vault
}
