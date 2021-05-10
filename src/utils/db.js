const AWS = require('aws-sdk');
const {config} = require (`./config`);
const DB = new AWS.DynamoDB.DocumentClient({
    region: config.AWS_REGION,
    apiVersion: '2012-08-10'
});

const tableName = config.TABLE_NAME;

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
            ReturnValues: "UPDATED_NEW"
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
}

const catcher = (err, data) => err ? err : data;

