'use strict';

const log = require('debug')('updateDestinationLocations');

const format = l => ({
  ...l,
  extId: l._id,
  country: l.country.code,
  postal_code: l.postalCode
});

module.exports = async (db, client, destinationAgendaUid, force = false) => {
  for (const location of await db.locations.fetchAll()) {
    const payload = format(location);
    const forceUpdate = force && !location.operation;
    if (location.operation==='create') {
      const { uid: locationUid } = await client
        .agendas(destinationAgendaUid)
        .locations
        .create(payload);
      await db.locations.setUid(location._id, locationUid);
      log('location "%s" created', location.name);
    } else if (location.operation==='update' || forceUpdate) {
      await client
        .agendas(destinationAgendaUid)
        .locations
        .patch(location.uid, payload);
      log('location "%s" updated', location.name);
    }
    await db.locations.clearOperation(location._id);
  }
}
