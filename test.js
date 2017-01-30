const secrets = require('./vault/secrets')

!async function() {
    const bla = await secrets.read('production/RDS_HOST')
    console.log(bla)
}()
