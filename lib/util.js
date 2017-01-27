const Joi = require('joi')
const fs = require('fs')

// retrieve a k8s token from a file
const getKubernetesToken = (token_file = '/var/run/secrets/kubernetes.io/serviceaccount/token') => {
    return fs.existsSync(token_file)
        ? new Buffer(fs.readFileSync(token_file)).toString().replace(/\r?\n|\r/g, "")
        : null
}

// small helper function to get the status code of a URL (used in health checking)
const getHTTPstatusCode = (url) => {
    return new Promise((resolve, reject) => {
        // select http or https module, depending on reqested url
        const lib = url.startsWith('https') ? require('https') : require('http')
        const request = lib.get(url, (response) => {
            // handle http errors
            if (response.statusCode) {
                resolve(response.statusCode)
            }
        })
        // handle connection errors of the request
        request.on('error', (err) => reject(err))
    })
}

module.exports = {
    getHTTPstatusCode,
    getKubernetesToken
}
