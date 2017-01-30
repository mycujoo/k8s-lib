const aws = require('aws-sdk')

aws.config.setPromisesDependency(null);

// update AWS configuration
aws.config.update({
    region: process.env.AWS_REGION
})

const DynamoDB = () => new aws.DynamoDB()

module.exports = {
    aws,
    DynamoDB
}
