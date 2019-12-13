'use strict';

const _ = require('lodash');

module.exports = (events, manualLocationIdField = null) => {
  return events.reduce((locations, event) => {
    const index = _.findIndex(locations, { uid: event.locationUid });
    if (index === -1) {
      locations.push({
        ...event.location,
        manualId: manualLocationIdField ? event.custom[manualLocationIdField] : null
      });
    } else if (manualLocationIdField && event.custom[manualLocationIdField]) {
      locations[index].manualId = event.custom[manualLocationIdField];
    }
    return locations;
  }, []);
}
