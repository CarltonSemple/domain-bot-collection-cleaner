'use-strict';

const discovery = require('./discovery');

var log = console.log;

var main = () => {
    let environmentID = process.env.DISCOVERY_ENVIRONMENT_ID;
    let collectionID = process.env.DISCOVERY_COLLECTION_ID;
    discovery.getNewestUploadDates(environmentID, collectionID)
        .catch(rejectVal => {
            log('error getNewestUploadDates: ', rejectVal);
        })
        .then(latestRepoDates => {
            log('Latest Upload Dates per Repository: ', latestRepoDates);
            discovery.getExpiredDocumentIDs(environmentID, collectionID, latestRepoDates)
                .catch(rejectVal => {
                    log('error getExpiredDocumentIDs: ' + rejectVal);
                })
                .then(expiredDocIDs => {
                    log('expired documents: ', expiredDocIDs);
                    try {
                        discovery.deleteDocuments(environmentID, collectionID, expiredDocIDs);
                    } catch (err) {
                        log('error deleting documents: ' + err);
                    }
                });
        });

    discovery.deleteInvalidDocuments(environmentID, collectionID);

    // separately, because this technically doesn't rely on the above and 
    // will catch documents deleted above by the next run

    discovery.getAllDocumentIDs(environmentID, collectionID)
        .catch(rejectVal => {
            log('getAllDocumentIDs err: ', rejectVal);
        })
        .then(docIDsSet => {
            //log(docIDsSet);
            discovery.getAllTrainingData(environmentID, collectionID)
                .catch(rejectVal => {
                    log('getAllTrainingData err: ', rejectVal);
                })
                .then(queries => {
                    log(queries.length + ' training queries');
                    discovery.deleteQueryExamplesWithMissingDocuments(environmentID, collectionID, queries, docIDsSet);
                });
        });
};

main();