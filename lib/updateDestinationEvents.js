'use strict';

const _ = require('lodash');
const cleanJSONExportEvent = require('./cleanJSONExportEvent');
const log = require('debug')('updateDestinationEvents');
const VError = require('verror');

module.exports = async (db, client, destinationAgendaUid, options = {}) => {
  const {
    force,
    additionalFields
  } = {
    force: false,
    additionalFields: [],
    ...options
  };

  for (const event of await db.events.fetchAll()) {
    try {
      const matchingLocation = await db.locations.get(event['_locationId']);
      const forceUpdate = force && !event.operation;
      const isCreate = (event.operation === 'create') || (event.operation === 'update' && !event.uid);
      if (isCreate) {
        const result = await client.agendas(destinationAgendaUid).events.create(
          cleanJSONExportEvent(additionalFields, event, matchingLocation)
        );
        await db.events.setUid(event._id, result.event.uid);
        log('event "%s" added', event.slug);
      } else if (event.operation === 'remove' ) {
        await client.agendas(destinationAgendaUid).events.delete(event.uid);
        await db.events.remove(event._id);
        log('event "%s" removed', event.slug);
      } else if (event.operation === 'update' || forceUpdate) {
        await client.agendas(destinationAgendaUid).events.update(
          event.uid,
          cleanJSONExportEvent(additionalFields, event, matchingLocation)
        );
        log('event "%s" updated', event.slug);
      }
      await db.events.clearOperation(event._id);
    } catch (e) {
      log('operation %s failed for event %s: ', event.operation, event._id, _.get(e, 'response.res.text'));
    }
  }
}
