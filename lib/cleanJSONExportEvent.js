'use strict';

const _ = require('lodash');

const isoFields = [
  'slug',
  'title',
  'description',
  'conditions',
  'longDescription',
  'keywords'
];

module.exports = (additionalFields, data, matchingLocation = null) => {

  const cleanStandardData = _.pick(data, isoFields);

  // additional values are given in tagGroups in JSON export
  const cleanAdditionalValues = data.tagGroups
    .map(g => ({
      ...g,
      field: _.find(additionalFields, { field: g.slug })
    }))
    .filter(g => !!g.field)
    .map(g => ({ ...g, value: g.tags.map(t => parseInt(t.schemaOptionId.split('.').pop())) }))
    .reduce((additionalValues, g) => ({
      ...additionalValues,
      [g.slug]: g.field.fieldType === 'radio' ? _.first(g.value) : g.value
    }), {});

  // image is provided as a link in the JSON export
  const image = data.image ? {
    url: data.image
  } : null;

  // image credits are provided as a flat value in JSON export
  if (data.imageCredits) {
    image.credits = data.imageCredits;
  }

  const accessibility = data.accessibility.reduce((acc, field) => ({
    ...acc,
    [field]: true
  }), {});

  return {
    ...cleanStandardData,
    ...cleanAdditionalValues,
    image,
    accessibility,
    locationUid: matchingLocation ? matchingLocation.uid : null,
    timings: data.timings.map(t => ({ begin: t.start, end: t.end }))
  }
}
