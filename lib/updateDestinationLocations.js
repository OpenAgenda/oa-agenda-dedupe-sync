'use strict';

const _ = require('lodash');
const log = require('debug')('updateDestinationLocations');

const patchableFields = [
  'name',
  'address',
  'postalCode',
  'department',
  'region',
  'insee',
  'latitude',
  'longitude',
  'timezone',
  'extId'
];

const format = (l, patched) => ({
  ...(patched ? _.pick(l, patched) : l),
  extId: l._id,
  country: l.country.code,
  postal_code: l.postalCode
});

module.exports = async (db, client, destinationAgendaUid, force = false) => {
  for (const location of await db.locations.fetchAll()) {
    const forceUpdate = force && !location.operation;
    if (location.operation==='create') {
      const payload = format(location);
      const { uid: locationUid } = await client
        .agendas(destinationAgendaUid)
        .locations
        .create(payload);
      await db.locations.setUid(location._id, locationUid);
      log('location "%s" created', location.name);
    } else if (location.operation==='update' || forceUpdate) {
      const payload = format(location, patchableFields);
      await client
        .agendas(destinationAgendaUid)
        .locations
        .patch(location.uid, payload);
      log('location "%s" updated', location.name);
    }
    await db.locations.clearOperation(location._id);
  }
}
