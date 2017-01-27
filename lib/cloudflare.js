const cloudflare = require('cloudflare')
const DNSRecord = cloudflare.DNSRecord

module.exports = (config) => {

    if (typeof config !== 'object' || config.email == '' || config.token == '') {
        throw new Error('A email and token is required for the cloudflare library')
    }

    const client = new cloudflare({
        email: config.email,
        key: config.token
    })

    const getZone = async (name) => {
        const zone = await client.browseZones({name: name})

        if (zone.result.length > 0) {
            return zone.result[0]
        } else {
            return false
        }
    }

    const getDNSrecord = async (zoneId, name) => {
        const record = await client.browseDNS(zoneId, { name: name })

        if (record.result.length > 0) {
            return record.result[0]
        } else {
            return false
        }
    }

    const updateDNSRecord = async (zoneId, name, type, content) => {
        const record = await getDNSrecord(zoneId, name)

        if (!record) {
            console.log('Creating record', name, 'with', content)
            // Create a new dns record
            await client.addDNS(cloudflare.DNSRecord.create({
                zoneId: zoneId,
                name: name,
                type: type,
                content: content
            }))

        } else {
            // update the existing DNS record
            record.content = content
            await client.editDNS(record)
        }

        return record
    }

    const deleteDNSRecord = async (zoneId, name) => {
        const record = await getDNSrecord(zoneId, name)

        if (record) {
            return await client.deleteDNS(record)
        } else {
            throw new Error(`Cannot find DNS record ${name}`)
        }
    }

    return {
        getZone,
        getDNSrecord,
        deleteDNSRecord,
        updateDNSRecord,
        DNSRecord
    }
}
