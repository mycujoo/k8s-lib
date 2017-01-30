const k8s = require('k8s')
const fs = require('fs')
const secrets = require('../vault/secrets')
const util = require('../util')
const querystring = require('querystring')

module.exports = (config) => {

    const token = config.token || util.getKubernetesToken()

    if (!token) {
        throw new Error('Failed to set kubernetes token, no token file present or given in environmental variables')
    }

    const api = (version) => {
        return k8s.api({
            endpoint: config.host,
            version: version,
            auth: {
                token: token
            },
            strictSSL: false
        })
    }

    const v1beta1 = '/apis/extensions/v1beta1'
    const v1 = '/api/v1'
    const batch = '/apis/batch/v1'

    const createJob = (namespace, name, image, command, customLabels = {}, restartPolicy = 'Never') => {

        console.log('Creating batchjob', name)

        const labels = Object.assign({}, {
            application: `${name}`,
        }, customLabels)

        return api(batch).post(`namespaces/${namespace}/jobs`, {
            kind: 'Job',
            apiVersion: 'batch/v1',
            metadata: {
                name: name
            },
            spec: {
                template: {
                  spec: {
                    restartPolicy: "Never",
                    containers: [
                      {
                        image: image,
                        command: command,
                        name: name
                      }
                    ],
                    restartPolicy: restartPolicy,
                  },
                  metadata: {
                    labels: labels,
                    name: name
                  }
                }
            }
        })

    }

    const createNamespaceIfNotExist = async (name) => {
        let namespace = null

        try {
            namespace = await api(v1).get(`namespaces/${name}`)
        } catch (err) {
            if (err && err.indexOf('not found') !== -1) {
                console.log(`Creating namespace ${name}`)
                namespace = await api(v1).post(namespaces, {
                    apiVersion:'v1',
                    kind: 'Namespace',
                    metadata: {
                        name: name
                    }
                })
            } else {
                throw err
            }
        }
        return namespace
    }

    const getDeployment = async (namespace, name) => {
        try {
            return await api(v1beta1).get(`namespaces/${namespace}/deployments/${name}`)
        } catch (err) {
            if (err.indexOf('not found') !== -1) {
                return Promise.resolve(false)
            } else {
                throw err
            }
        }
    }

    const getService = async (namespace, name, next) => {
        try {
            return await api(v1).get(`namespaces/${namespace}/services/${name}`)
        } catch (err) {
            if (err.indexOf('not found') !== -1) {
                return Promise.resolve(false)
            } else {
                throw err
            }
        }
    }

    const getIngress = async (namespace, name, next) => {
        try {
            return await api(v1beta1).get(`namespaces/${namespace}/ingresses/${name}`)
        } catch (err) {
            if (err.indexOf('not found') !== -1) {
                return Promise.resolve(false)
            } else {
                throw err
            }
        }
    }

    const getJob = async (namespace, name, next) => {
        try {
            return await api(batch).get(`namespaces/${namespace}/jobs/${name}`)
        } catch (err) {
            if (err.indexOf('not found') !== -1) {
                return Promise.resolve(false)
            } else {
                throw err
            }
        }
    }


    const getJobs = async (namespace, next) => {
        try {
            return await api(batch).get(`namespaces/${namespace}/jobs`)
        } catch (err) {
            if (err.indexOf('not found') !== -1) {
                return Promise.resolve(false)
            } else {
                throw err
            }
        }
    }

    const createService = (namespace, name, body) => {

        console.log('Creating service', name)

        const sessionAffinity = (body.sessionAffinity ? 'ClientIP' : 'None')

        return api(v1).post(`namespaces/${namespace}/services`, {
            kind: 'Service',
            apiVersion: 'v1',
            metadata: {
                name: name
            },
            spec: {
                type: 'NodePort',
                selector: {
                    service: name,
                },
                ports: [ { port: body.port, targetPort: body.port } ],
                sessionAffinity: sessionAffinity
            }
        })

    }

    const deleteService = (namespace, name) => {
        console.log('Deleting service:', name)
        return api(v1).delete(`namespaces/${namespace}/services/${name}`)
    }

    const deleteJob = (namespace, name) => {
        console.log('Deleting job:', name)
        return api(batch).delete(`namespaces/${namespace}/jobs/${name}`)
    }

    const deleteIngress = (namespace, name) => {
        console.log('Deleting ingress rules:', name)
        return api(v1beta1).delete(`namespaces/${namespace}/ingresses/${name}`)
    }

    const deletePods = (namespace, name, options) => {
        console.log('Deleting pods:', name)
        return api(v1).delete(`namespaces/${namespace}/pods` + (options ? '?' + querystring.stringify(options) : ''), {
            kind: "Pod",
            apiVersion: 'v1',
            gracePeriodSeconds: 0
        })
    }

    const deleteReplicaSets = (namespace, name) => {
        console.log('Deleting replicasets:', name)
        return api(v1beta1).delete(`namespaces/${namespace}/replicasets\?labelSelector\=application\=${name}`)
    }

    const deleteDeployment = (namespace, name) => {
        console.log('Deleting deployment:', name)
        return api(v1beta1).delete(`namespaces/${namespace}/deployments/${name}`, {
            orphanDependents: false
        })
    }

    const createDeployment = (namespace, name, body, env) => {

        let deployment = {
            apiVersion: 'extensions/v1beta1',
            kind: 'Deployment',
            metadata: {
                name: `${name}`,
                namespace: namespace
            },
            spec: {
                replicas: body.replicas,
                template: {
                    metadata: {
                        labels: {
                            service: `${name}`,
                            application: `${body.name}`
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: `${body.name}`,
                                image: `${body.image}:${body.tag}`,
                                ports: [ { containerPort: body.port } ],
                                env: env,
                                resources: {
                                    limits: {
                                        cpu: `${body.limits.cpu}`,
                                        memory: `${body.limits.memory}`
                                    },
                                    requests: {
                                        cpu: `${body.limits.cpu}`,
                                        memory: `${body.limits.memory}`
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }

        // set a health check if it was passed in the body
        if ('healthCheck' in body) {

            deployment.spec.template.spec.containers[0].livenessProbe = {
                httpGet: {
                    path: body.healthCheck.path,
                    port: body.healthCheck.port
                },
                initialDelaySeconds: body.healthCheck.initialDelaySeconds || 5,
                timeoutSeconds: body.healthCheck.timeoutSeconds || 1
            }

        }

        return api(v1beta1).post(`namespaces/${namespace}/deployments`, deployment)
    }

    const createIngress = async (namespace, serviceName, application) => {
        // todo add ssl
        let ingress = {
            apiVersion: 'extensions/v1beta1',
            kind: 'Ingress',
            metadata: {
                name: `${serviceName}`,
                namespace: namespace
            },
            spec: {
                backend: {
                    serviceName: serviceName,
                    servicePort: application.port
                }
            }
        }

        if (application.tls) {
            await updateSecret(namespace, 'tls', {
                "tls.crt": await secrets.read('MYCUJOO_SSL_CERTIFICATE'),
                "tls.key": await secrets.read('MYCUJOO_SSL_PRIVATE_KEY')
            })

            ingress.spec = Object.assign({}, ingress.spec, {
                tls: [
                    {
                        secretName: 'tls'
                    }
                ]
            })

            console.log('Enabling TLS for loadbalancer')
        }

        return await api(v1beta1).post(`namespaces/${namespace}/ingresses`, ingress)
    }

    const updateSecret = async (namespace, key, data) => {

        let secret = null

        const secrets = parseSecrets(data)

        try {
            secret = await api(v1).get(`namespaces/${namespace}/secrets/${key}`)
        } catch (err) {
            if (err.indexOf('not found') !== -1) {
                secret = null
            }
        }

        if (secret) {
            const deletedSecret = await api(v1).delete(`namespaces/${namespace}/secrets/${key}`)
        }

        // create secret
        secret = await api(v1).post(`namespaces/${namespace}/secrets`, {
            Kind: 'Secret',
            apiVersion: 'v1',
            metadata: {
                namespace: namespace,
                name: key
            },
            type: 'Opaque',
            data: secrets
        })

        return secret
    }

    const parseSecrets = (secrets) => {
        for (val in secrets) {

            if (typeof secrets[val] !== 'string') {
                throw new Error('Cannot parse secret, only key value pairs are allowed')
            } else {
                secrets[val] = new Buffer(String(secrets[val])).toString('base64').replace(/\r?\n|\r/g, '')
            }
        }

        return secrets
    }

    module.exports = {
        getService,
        getIngress,
        getDeployment,
        getJob,
        getJobs,
        createService,
        deleteService,
        deletePods,
        deleteReplicaSets,
        deleteIngress,
        deleteDeployment,
        deleteJob,
        createDeployment,
        createNamespaceIfNotExist,
        createIngress,
        createJob,
        updateSecret,
        api
    }
}
