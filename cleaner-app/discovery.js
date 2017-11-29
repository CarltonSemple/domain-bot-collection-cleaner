'use-strict';

const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const request = require('request');
const utils = require('./util');

var log = console.log;

var username = process.env.DISCOVERY_USERNAME;
var password = process.env.DISCOVERY_PASSWORD;
var apiVersionDate = '2017-09-01';

var watsonDiscovery = new DiscoveryV1({
    username: username,
    password: password,
    version_date: apiVersionDate
});

var makeRepoKey = (repositoryAccount, repositoryName) => {
    return repositoryAccount + '-' + repositoryName;
};

var deleteDocuments = (environmentID, collectionID, documentIDsArray) => {
    return new Promise(function(resolve, reject) {
        for (let i = 0; i < documentIDsArray.length; i++) {
            let documentID = documentIDsArray[i];
            let opts = {
                method: 'DELETE',
                url: 'https://gateway.watsonplatform.net/discovery/api/v1/environments/' 
                + environmentID + '/collections/' 
                + collectionID + '/documents/'
                + documentID,
                qs: {
                    version: apiVersionDate,
                },
                headers: {
                    authorization: 'Basic ' + new Buffer(username + ':' + password).toString('base64'),
                    'content-type': 'application/json'
                }
            };
            request(opts, function(error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    //body = JSON.parse(body);
                    //resolve(body);
                }
            });
        }
    });
};

var deleteInvalidDocuments = (environmentID, collectionID) => {
    getInvalidDocumentIDsArray(environmentID, collectionID)
        .catch(rejectVal => {
            log('error getInvalidDocumentIDs: ', rejectVal);
        })
        .then(docIDs => {
            log('deleting invalid documents: ', docIDs);
            deleteDocuments(environmentID, collectionID, docIDs)
                .catch(rejectVal => {
                    log('deleteDocuments err: ', rejectVal);
                })
                .then(response => {});
        });
};

var deleteQueryExamplesWithMissingDocuments = (environmentID, collectionID, queries, docIDsSet) => {
    for(let i = 0; i < queries.length; i++) {
        let examplesList = queries[i].examples;
        for(let e = 0; e < examplesList.length; e++) {
            let example = examplesList[e];
            if(!docIDsSet.has(example.document_id)) {
                log('collection does not have document ', example.document_id);
                // delete example
                deleteQueryExample(environmentID, collectionID, queries[i].query_id, example.document_id)
                    .catch(rejectVal => {
                        log('deleteQueryExample error: ' + rejectVal);
                    })
                    .then(responseBody => {
                        log('deleteQueryExample response: ' + responseBody);
                    });
            }
        }
    }
};

var deleteQueryExample = (environmentID, collectionID, queryID, documentID) => {
    return new Promise(function(resolve, reject) {
        var opts = {
            method: 'DELETE',
            url: 'https://gateway.watsonplatform.net/discovery/api/v1/environments/' + environmentID 
            + '/collections/' + collectionID + '/training_data/'
            + queryID + '/examples/' 
            + documentID,
            qs: {
                version: apiVersionDate,
            },
            headers: {
                authorization: 'Basic ' + new Buffer(username + ':' + password).toString('base64'),
                'content-type': 'application/json'
            }
        };
        request(opts, function(error, response, body) {
            if (error) {
                //log(error);
                //throw new Error(error);
                reject(error);
            } else {
                body = JSON.parse(body);
                resolve(body);
            }
        });
    });
};

var getAllDocumentIDsSet = (environmentID, collectionID) => {
    return new Promise(function(resolve, reject) {
        request(makeQueryAllOptions(environmentID, collectionID), function(error, response, body) {
            if (error) {
                log(error);
                //throw new Error(error);
                reject(error);
            } else {
                body = JSON.parse(body);
                let docIDSet = new Set();
                for (let i = 0; i < body.results.length; i++) {
                    let document = body.results[i];
                    docIDSet.add(document.id);
                }
                resolve(docIDSet);
            }
        });
    });
};

var getAllTrainingData = (environmentID, collectionID) => {
    return new Promise(function(resolve, reject) {
        var opts = {
            method: 'GET',
            url: 'https://gateway.watsonplatform.net/discovery/api/v1/environments/' + environmentID + '/collections/' + collectionID + '/training_data',
            qs: {
                version: apiVersionDate,
            },
            headers: {
                authorization: 'Basic ' + new Buffer(username + ':' + password).toString('base64'),
                'content-type': 'application/json'
            }
        };
        request(opts, function(error, response, body) {
            if (error) {
                log(error);
                //throw new Error(error);
                reject(error);
            } else {
                body = JSON.parse(body);
                resolve(body.queries);
            }
        });
    });
};

// latestRepoDates: dictionary of key: repoOwner-repoName, val: date (YYYY-MM-DD)
var getExpiredDocumentIDs = (environmentID, collectionID, latestRepoDates) => {
    return new Promise(function(resolve, reject) {
        request(makeQueryAllOptions(environmentID, collectionID), function(error, response, body) {
            if (error) {
                log(error);
                //throw new Error(error);
                reject(error);
            } else {
                body = JSON.parse(body);
                let docIDlist = [];
                for (let i = 0; i < body.results.length; i++) {
                    let document = body.results[i];
                    //log(document.id + ': ' + document.metadata.uploadDate);
                    //log(document.metadata);
                    let docMetadata = document.metadata;
                    if (docMetadata.repositoryAccount && docMetadata.repositoryName) {
                        if (docMetadata.repositoryAccount == 'stackexchange') {
                            continue;
                        }
                        let repoKey = makeRepoKey(docMetadata.repositoryAccount, docMetadata.repositoryName);
                        if (document.metadata.uploadDate) {
                            if (isOlderThanDaysAllowed(latestRepoDates, repoKey, document.metadata.uploadDate, 2)) {
                                docIDlist.push(document.id);
                            }
                        } else {
                            log('uploadDate not found for doc ' + document.id);
                        }
                    } else {
                        //log(document.id + ' doesnt have all of the necessary metadata. ignoring');                    
                    }
                }
                resolve(docIDlist);
            }
        });
    });
};

var getInvalidDocumentIDsArray = (environmentID, collectionID) => {
    return new Promise(function(resolve, reject) {
        request(makeQueryAllOptions(environmentID, collectionID), function(error, response, body) {
            if (error) {
                log(error);
                //throw new Error(error);
                reject(error);
            } else {
                body = JSON.parse(body);
                let docIDlist = [];
                for (let i = 0; i < body.results.length; i++) {
                    let document = body.results[i];
                    let docMetadata = document.metadata;
                    if (!(docMetadata.repositoryAccount && docMetadata.repositoryName)) {
                        //log(document.id + ' doesnt have all of the necessary metadata: ' + JSON.stringify(docMetadata));
                        docIDlist.push(document.id);
                    }
                }
                resolve(docIDlist);
            }
        });
    });
};

// returns a map of 
// key: repoOwner-repoName 
// value: date (YYYY-MM-DD)
var getNewestUploadDates = (environmentID, collectionID) => {
    return new Promise(function(resolve, reject) {
        request(makeQueryAllOptions(environmentID, collectionID), function(error, response, body) {
            if (error) {
                log(error);
                throw new Error(error);
            }
            body = JSON.parse(body);
            let newestDates = new Map();

            for (let i = 0; i < body.results.length; i++) {
                let document = body.results[i];
                let docMetadata = document.metadata;
                if (docMetadata.repositoryAccount && docMetadata.repositoryName && docMetadata.uploadDate) {
                    // update the newest date for this repository if the document date is newer than what the map contains
                    let repoKey = makeRepoKey(docMetadata.repositoryAccount, docMetadata.repositoryName);
                    if (newestDates.has(repoKey)) {
                        let latestSoFar = utils.dateFromString(newestDates.get(repoKey));
                        let docDate = utils.dateFromString(docMetadata.uploadDate);
                        if (docDate > latestSoFar) {
                            newestDates.set(repoKey, docMetadata.uploadDate);
                        }
                    } else {
                        newestDates.set(repoKey, docMetadata.uploadDate);
                    }
                } else {
                    //log(document.id + ' doesnt have all of the necessary metadata. ignoring');
                }
            }
            resolve(newestDates);
        });
    });
};

var isOlderThanDaysAllowed = (latestRepoDates, repoKey, uploadDateString, daysAllowed) => {
    if (latestRepoDates.has(repoKey)) {
        let latestDate = utils.dateFromString(latestRepoDates.get(repoKey));
        let olderDate = utils.olderDate(latestDate, daysAllowed);
        let docDate = utils.dateFromString(uploadDateString);
        //log(uploadDateString + ' is older than ' + utils.dateToString(olderDate));
        return docDate < olderDate;
    } else {
        log('isOlderThanDaysAllowed: repository not found in latestRepoDates');
    }
    return false;
};

var makeQueryAllOptions = (environmentID, collectionID) => {
    return {
        method: 'GET',
        url: 'https://gateway.watsonplatform.net/discovery/api/v1/environments/' + environmentID + '/collections/' + collectionID + '/query',
        qs: {
            version: apiVersionDate,
            count: 10000,
            passages: 'true',
            highlight: 'true',
            return: 'metadata',
            natural_language_query: ''
        },
        headers: {
            authorization: 'Basic ' + new Buffer(username + ':' + password).toString('base64'),
            'content-type': 'application/json'
        }
    };
};

module.exports = {
    deleteDocuments: deleteDocuments,
    deleteInvalidDocuments: deleteInvalidDocuments,
    deleteQueryExamplesWithMissingDocuments: deleteQueryExamplesWithMissingDocuments,
    getAllDocumentIDs: getAllDocumentIDsSet,
    getAllTrainingData: getAllTrainingData,
    getExpiredDocumentIDs: getExpiredDocumentIDs,
    getNewestUploadDates: getNewestUploadDates
};