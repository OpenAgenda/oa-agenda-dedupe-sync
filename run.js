'use strict';

const _ = require('lodash');
const fs = require('fs');
const debug = require('debug');
const extractLocationsFromEvents = require('./lib/extractLocationsFromEvents');
const listOAEvents = require('./lib/listOAEvents');
const loadConfiguration = require('./lib/loadConfiguration');
const Store = require('./lib/Store');
const SDK = require('./lib/SDK');
const sendReport = require('./lib/sendReport');
const updateDestinationEvents = require('./lib/updateDestinationEvents');
const updateDestinationLocations = require('./lib/updateDestinationLocations');
const updateEventsDb = require('./lib/updateEventsDb');
const updateLocationsDb = require('./lib/updateLocationsDb');

const log = debug('run');
const defaultLogNamespaces = [
  'run',
  'listOAEvents',
  'updateLocationsDb',
  'updateEventsDb',
  'updateDestinationLocations',
  'updateDestinationEvents',
  'extractLocationsFromEvents',
  'Store'
];

(async () => {
  try {
    const {
      mailgunUser,
      mailgunPassword,
      reportRecipients,
      publicKey,
      secretKey,
      originAgendaUid,
      destinationAgendaUid,
      extendedFieldsToCopy,
      dedupeDistanceThreshold,
      dedupeCertaintyThreshold,
      dedupeSimilarityThreshold,
      manualLocationIdField,
      forceLocationUpdates,
      forceEventUpdates,
      logNamespaces
    } = await loadConfiguration();

    if (logNamespaces && !logNamespaces.includes(false)) {
      debug.enable((logNamespaces.length ? logNamespaces : defaultLogNamespaces).join(','));
    }

    const client = SDK({
      public: publicKey,
      secret: secretKey
    });

    const db = Store(schemaName => `/var/tmp/agendas.${destinationAgendaUid}.${schemaName}.db`);

    log('fetching source agenda additional field configuration');
    const additionalFields = await client.agendas(destinationAgendaUid)
      .getSettings()
      .then(settings => settings
        .form.filter(f => extendedFieldsToCopy.includes(f.field))
      );

    log('feching events');
    const originEvents = await listOAEvents(originAgendaUid);
    log('fetched %s events', originEvents.length);

    const originLocations = extractLocationsFromEvents(originEvents, manualLocationIdField);

    log('extracted %s locations', originLocations.length);

    log('updating locations: %j', await updateLocationsDb(db, originLocations, userConfirmsDupes));
    log('updating events: %j', await updateEventsDb(db, originEvents));

    log('applying creates and updates on locations of destination agenda');
    await updateDestinationLocations(db, client, destinationAgendaUid, forceLocationUpdates);

    log('applying creates and updates on events of destination agenda');
    await updateDestinationEvents(db, client, destinationAgendaUid, {
      force: forceEventUpdates,
      additionalFields
    });

    log('generating csv report');
    const report = await db.generateCSVReport();

    log('sending report');
    await sendReport({
      user: mailgunUser,
      pass: mailgunPassword
    }, reportRecipients, report);

    log('done!');
  } catch (e) {
    console.log(e);
  }

  process.exit();
})();


async function userConfirmsDupes(location, neighbor, distance) {
  return prompts({
    type: 'confirm',
    initial: true,
    message: `${location.name}
A neighbor (${distance} meters) has a similar name: "${neighbor.name}".
Is it a duplicate?`
  });
}
