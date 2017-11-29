'use-strict';

var getDate = () => {
    let date = new Date();
    return date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
};

var getTodaysDate = () => {
    let date = new Date();
    return date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
};

var olderDate = (startDate, daysInPast) => {
    let timestamp = startDate.getTime() - (daysInPast * 24 * 60 * 60 * 1000);
    return new Date(timestamp);
};

// dateFromString accepts a date in YYYY-MM-DD (month: 1-12)
// returns a Date object (month: 0-11)
var dateFromString = (dateString) => {
    let stringPieces = dateString.split('-');
    let fYear = parseInt(stringPieces[0]);
    let fMonth = parseInt(stringPieces[1]) - 1;
    let fDay = parseInt(stringPieces[2]);
    let date = new Date();
    date.setFullYear(fYear);
    date.setMonth(fMonth);
    date.setDate(fDay);
    return date;
};

var dateToString = (date) => {
    return date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();    
};

module.exports = {
    getDate: getDate,
    dateFromString: dateFromString,
    dateToString: dateToString,
    olderDate: olderDate
};