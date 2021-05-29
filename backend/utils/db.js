const AWS = require('aws-sdk');
const {config} = require (`../config`);
const { getLogger } = require('./logger')
const logger = getLogger("server")
const DB = new AWS.DynamoDB.DocumentClient({
    region: config.AWS_REGION,
    apiVersion: '2012-08-10'
});
const uuid = require('uuid');

const tableName = config.TABLE_NAME;
console.log(tableName)
console.log(config.IS_TESTNET)

module.exports = {
    update: async function (props = {}) {
        const { Key, data } = props
        const expressionValues = {}
        Object.entries(data).forEach(([column, value]) => expressionValues[`:${column}`] = value)
        const updateExpression = "SET " + Object.keys(data).map(column => `${column} = :${column}`).join(",")
        const params = {
            TableName: tableName,
            Key,
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionValues,
            ReturnValues: "ALL_NEW"
        }
        return await DB.update(params, catcher).promise()
    },

    query: async function (props = {}) {
        const params = { TableName: tableName, ...props };
        return await DB.query(params, catcher).promise()
    },

    scan: async function (props = {}) {
        const params = { TableName: tableName, ...props };
        return await new Promise((resolve, reject) => {
            DB.scan(params, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
        });
    },

    appendToList: async function appendToList(props = {}) {
        const { list, newRecord, columnName, Key, max } = props
        const records = list && Object.keys(list).length > 0 ? list : []

        if (records.length >= max) records.pop()
        records.unshift({
            data: newRecord,
            timestamp: +new Date()
        })
        const obj = {}
        obj[columnName] = records;

        if (records.length !== 0) {
            const data = await this.update({
                Key,
                data: obj
            })
            return { Key, status: "ok", data }
        } else {
            return {
                Key, status: "error",
                error: `Records length can't be 0`
            }
        }
    },

    delete: async function (props = {}) {
        const params = { TableName: tableName, ...props };
        return await DB.delete(params, catcher).promise()
    },

    getOrders: async function(status) {
        const ExpressionAttributeValues = {":pk": 'order'}
        let FilterExpression = "pk = :pk"
        if (status) {
            ExpressionAttributeValues[":status"] = status
            FilterExpression += " and status_ = :status"
        }
        const data = await this.scan({
            FilterExpression,
            ExpressionAttributeValues
        })
        if (data["Items"]?.length === 0) {
            logger.warn("No active orders found in database")
            return false
        }
        return data["Items"]
    },

    getOrder: async function(uuid) {
        const data = await this.query({
            KeyConditionExpression: "pk = :pk and uuid_ = :uuid",
            ExpressionAttributeValues: {
                ":pk": 'order',
                ":uuid": uuid
            }
        })
        if (data["Items"]?.length === 0) {
            logger.warn("No order found by uuid " + uuid)
            return false
        }
        return data["Items"][0]
    },

    deleteOrder: async function(uuid) {
        return await this.delete({
            Key: {
                "pk": "order",
                "uuid_": uuid
            }
        })
    },

    updateOrder: async function(uuid, data) {
        return await this.update({
            Key: { "pk": "order", "uuid_": uuid },
            data
        })
    },

    createOrder: async function(data) {
        const response = await this.update({
          Key: { "pk": "order", "uuid_": uuid.v4() },
          data
        })
        return response
    },
    
    createBot: async function(data) {
        const response = await this.update({
            Key: { "pk": "bot", "uuid_": uuid.v4() },
            data
        })
        return response
    },

    getBot: async function(uuid) {
        const data = await this.query({
            KeyConditionExpression: "pk = :pk and uuid_ = :uuid",
            ExpressionAttributeValues: {
                ":pk": 'bot',
                ":uuid": uuid
            }
        })
        if (data["Items"]?.length === 0) {
            logger.warn("No bot found by uuid " + uuid)
            return false
        }
        return data["Items"][0]
    },

    getBotOrders: async function(botId) {
        const data = await this.query({
            KeyConditionExpression: "pk = :pk and botId = :botId and status_ <> :status",
            ExpressionAttributeValues: {
                ":pk": 'order',
                ":botId": botId,
                ":status": 'completed'
            }
        })
        if (data["Items"]?.length === 0) {
            logger.warn("No orders found for bot: " + botId)
            return false
        }
        return data["Items"]
    }
}

const catcher = (err, data) => {
    if (err) logger.error(err);
    return err ? err : data
}

