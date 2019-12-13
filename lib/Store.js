'use strict';

const _ = require('lodash');
const csv = require('fast-csv');
const log = require('debug')('Store');
const crypto = require('crypto');
const Datastore = require('nedb');
const { promisify } = require('util');
const VError = require('verror');

const distance = require('./distance');
const nameSameness = require('./nameSameness');

module.exports = storeNameFn => {
  const store = createSchemas(storeNameFn, ['events', 'locations']);

  return {
    locations: {
      fetchAll: store.locations.find.bind(null, {}),
      get: _id => store.locations.findOne({ _id }),
      findOneByOriginUid: uid => findLocationsBy(store, 'origin.uid', uid).then(r => _.first(r)),
      findOneByMatch: findLocationByMatch.bind(null, store),
      findOneByManualId: manualId => findLocationsBy(store, 'manualId', manualId).then(r => _.first(r)),
      appendOrigin: appendLocationOrigin.bind(null, store),
      hasChanged: locationHasChanged.bind(null, store),
      create: createLocation.bind(null, store),
      update: updateLocation.bind(null, store),
      merge: mergeLocation.bind(null, store),
      clearOperation: unsetValue.bind(null, store, 'locations', 'operation'),
      clear: store.locations.clear,
      setUid: setLocationUid.bind(null, store)
    },
    events: {
      fetchAll: store.events.find.bind(null, {}),
      findOneByOriginUid: uid => findEventsBy(store, 'origin.uid', uid).then(r => _.first(r)),
      update: updateEvent.bind(null, store),
      remove: removeEvent.bind(null, store),
      create: createEvent.bind(null, store),
      markForRemove: markEventForRemove.bind(null, store),
      clear: store.events.clear,
      setUid: setEventUid.bind(null, store),
      clearOperation: unsetValue.bind(null, store, 'events', 'operation'),
    },
    generateCSVReport: generateCSVReport.bind(null, store)
  }
}

async function generateCSVReport(store, filename) {
  const locations = await store.locations.find({});

  const rows = [];

  for (const location of locations) {
    const row = {
      name: location.name,
      address: location.address,
      city: location.city,
      postalCode: location.postalCode,
      destAgendaLocationUid: location.uid,
      manualDedupeId: location.manualId,
      editDedupeId: ''
    };

    if (!location.manualId) {
      const event = await store.events.findOne({
        _locationId: location._id
      });
      if (!event) continue;
      row.editDedupeId = originAgendaBaseURL(event.canonicalUrl) + '/events/' + event.origin.slug + '/tagcat';
    }

    rows.push(row);
  }

  return csv.writeToString(rows, {
    headers: true,
    delimiter: ','
  });
}

function originAgendaBaseURL(url) {
  const parts = url.split('/');
  parts.pop();
  parts.pop();
  return parts.join('/');
}

function unsetValue(store, schema, field, _id) {
  return store[schema].update({ _id }, {
    $unset: { [field]: true }
  });
}

async function updateEvent(store, _id, data) {
  const event = await getEvent(store, _id, { throw: true });
  return store.events.update({ _id }, await cleanEventOriginData(store, event.uid, data, 'update'));
}

async function markEventForRemove(store, _id) {
  const event = await getEvent(store, _id, { throw: true });
  if (event.uid) {
    return store.events.update({ _id }, {
      $set: {
        operation: 'remove'
      }
    });
  } else {
    return removeEvent(store, _id);
  }
}

function removeEvent(store, _id) {
  return store.events.remove({ _id });
}

async function createEvent(store, data) {
  try {
    const clean = await cleanEventOriginData(store, null, data, 'create');
    return store.events.insert(clean);
  } catch (e) {
    throw new VError(e, 'failed to insert event %s in local store', data.uid);
  }
}

async function cleanEventOriginData(store, uid = null, data, operation) {
  const location = _.first(await findLocationsBy(store, 'origin.uid', data.locationUid));

  if (!location) {
    throw new Error('no matching location found in local store');
  }

  return {
    uid,
    ..._.omit(data, [
      'uid',
      'locationUid',
      'location',
      'district',
      'city',
      'postalCode',
      'address',
      'locationName',
      'department',
      'latitude',
      'longitude'
    ]),
    _locationId: location._id,
    origin: _.pick(data, ['uid', 'slug']),
    operation
  }
}

function createLocation(store, l) {
  return store.locations.insert({
    ..._.omit(l, ['uid', 'createdAt', 'updatedAt']),
    origin: [_.pick(l, ['uid', 'name'])],
    hash: hash(l),
    operation: 'create',
  });
}

async function locationHasChanged(store, _id, l) {
  const location = await getLocation(store, _id, { throw: true });

  return location.hash !== hash(l);
}

function hash(data) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
}

async function getLocation(store, _id, options = {}) {
  const location = await store.locations.findOne({ _id });
  if (options.throw && !location) {
    throw new Error('location not found');
  }
  return location;
}

async function mergeLocation(store, location, mergeIn) {
  log('merging location %s in location %s', location._id, mergeIn._id);

  const eventsToUpdate = await findEventsBy(store, '_locationId', location._id);

  log('found %s events impacted by location merge', eventsToUpdate.length);

  for (const event of eventsToUpdate) {
    await store.events.update({ _id: event._id }, {
      $set: {
        _locationId: mergeIn._id,
        operation: event.uid ? 'update' : 'create'
      }
    });
  }

  if (location.uid) {
    log('location %s is marked as merged', location._id);
    await updateLocation(store, location._id, {
      name: location.name + ' - dédoublonné dans - ' + mergeIn.uid,
      origin: []
    });
  }

  return updateLocation(store, mergeIn._id, {
    ...mergeIn,
    origin: mergeIn.origin.concat(location.origin)
  });
}

async function updateLocation(store, _id, l) {
  const location = await getLocation(store, _id, { throw: true });
  return store.locations.update({ _id }, {
    ...location,
    ..._.omit(l, ['uid']),
    hash: hash(l),
    operation: location.operation || 'update'
  });
}

async function setLocationUid(store, _id, uid) {
  const location = await getLocation(store, _id, { throw: true });
  return store.locations.update({ _id }, {
    ...location,
    uid
  });
}

async function getEvent(store, _id, options = {}) {
  const event = await store.events.findOne({ _id });
  if (options.throw && !event) {
    throw new Error('event not found');
  }

  return event;
}

async function setEventUid(store, _id, uid) {
  const event = await getEvent(store, _id, { throw: true });
  return store.events.update({ _id }, {
    ...event,
    uid
  });
}

async function appendLocationOrigin(store, _id, location) {
  const storedLocation = await getLocation(store, _id, { throw: true });
  return store.locations.update({ _id }, {
    $push: {
      origin: _.pick(location, ['uid', 'name'])
    },
    $set: {
      operation: storedLocation.operation || 'appendOrigin'
    }
  }, {});
}

async function findLocationByMatch(store, location, { neighborhood, nameIsSame, nameIsSimilar, confirmDupes }) {
  const neighbors = (
    await store.locations.find({})
  ).filter(l => distance(l, location) <= neighborhood);

  for (const neighbor of neighbors) {
    const sameness = nameSameness(neighbor.name, location.name);
    if (sameness>nameIsSame) {
      return neighbor;
    } else if (sameness>nameIsSimilar && await confirmDupes(location, neighbor, distance(neighbor, location))) {
      return neighbor;
    }
  }

  return null;
}

async function findLocationsBy(store, field, value) {
  return store.locations.find({
    [field]: value
  });
}

async function findEventsBy(store, field, value) {
  return store.events.find({
    [field]: value
  });
}

function createSchemas(storeNameFn, schemas) {
  const store = {};
  return schemas.reduce((methodsBySchema, schema) => {
    store[schema] = new Datastore({
      filename: storeNameFn(schema),
      autoload: true
    });

    return {
      ...methodsBySchema,
      [schema]: {
        ...['insert', 'find', 'findOne', 'update', 'remove'].reduce((methods, name) => ({
          ...methods,
          [name]: promisify(store[schema][name].bind(store[schema]))
        }), {}),
        clear: clear.bind(null, store, schema)
      }
    }
  }, {});
}

async function clear(store, schema) {
  const filename = store[schema].filename;

  if (filename) {
    await promisify(fs.unlink)(filename);
  }

  store[schema] = new Datastore({ filename });

  store[schema].loadDatabase();
}
