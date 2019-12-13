'use strict';

const _ = require('lodash');
const geolib = require('geolib');

module.exports = (location1, location2) => geolib.getDistance(
  _.pick(location1, ['latitude', 'longitude']),
  _.pick(location2, ['latitude', 'longitude'])
);
