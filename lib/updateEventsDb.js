'use strict';

const _ = require('lodash');
const log = require('debug')('updateEventsDb');

module.exports = async (db, originEvents) => {
  log('there are %s events in source', originEvents.length);
  const counts = {
    creates: 0,
    updates: 0,
    deletes: 0,
    nothing: 0
  };
  for (const event of await db.events.fetchAll()) {
    if (!_.find(originEvents, { uid: event.origin.uid })) {
      await db.events.markForRemove(event._id);
      counts.deletes++;
    }
  }
  for (const originEvent of originEvents) {
    let match = null;
    if (match = await db.events.findOneByOriginUid(originEvent.uid)) {
      if (match.updatedAt !== originEvent.updatedAt) {
        await db.events.update(match._id, originEvent);
        log(originEvent.slug, 'updated');
        counts.updates++;
      } else {
        log(originEvent.slug, 'pass');
        counts.nothing++;
      }
    } else {
      await db.events.create(originEvent);
      log(originEvent.slug, 'created');
      counts.creates++;
    }
  }
  return counts;
}
