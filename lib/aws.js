const AWS = require('aws-sdk')

AWS.config.setPromisesDependency(null);

// update AWS configuration
AWS.config.update({
    region: process.env.AWS_REGION
})

const DynamoDB = () => new AWS.DynamoDB()

module.exports = {
    AWS,
    DynamoDB
}
