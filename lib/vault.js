const vaultLib = require('node-vault')({
    apiVersion: 'v1', // default
    endpoint: process.env.VAULT_ADDRESS,
    token:  process.env.VAULT_TOKEN // optional client token; can be fetched after valid initialization of the server
})

const vault = {
    initialised: false,

    read: (key) => vaultLib.read(key),
    write: (key, value) => vaultLib.write(key, value),

    // connect to vault to ensure the used token is valid
    initialise: async () => {
        if (this.initialised) {
            return true
        }

        try {
            await vaultLib.auths()
            console.log('Authenticated to vault using token based credentials')
            this.initialised = true
        } catch (err) {
            console.error('Vault authentication failed', err)
            process.exit(1)
        }
    }
}

module.exports = vault
