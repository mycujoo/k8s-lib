const vault = require('./index')

/**
* Read a secret
*
* @param secret
* @returns {*}
*/
const read = async (key) => {

    await vault.initialise()

    try {
        const secret = await vault.read(`secret/${process.env.VAULT_ENVIRONMENT}/${key}`)
    } catch (err) {
        throw new Error(`Cannot read vault secret ${key}: ${err}`)
    }
    return (secret ? secret.data.value : null)
}

/**
* Write a secret
*
* @param secret
* @returns {*}
*/
const write = async (key) => {

    await vault.initialise()

    try {
        const secret = await vault.write(`secret/${process.env.VAULT_ENVIRONMENT}/${key}`)
    } catch (err) {
        throw new Error(`Cannot write vault secret ${key}`)
    }
    return secret
}

module.exports = {
    read,
    write
}
