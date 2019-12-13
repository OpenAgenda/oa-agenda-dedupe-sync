'use strict';

const fs = require('fs');
const prompts = require('prompts');

const config = {
  mailgunUser: null,
  mailgunPassword: null,
  reportRecipients: null,
  publicKey: null,
  secretKey: null,
  originAgendaUid: null,
  destinationAgendaUid: null,
  extendedFieldsToCopy: null,
  forceEventUpdates: null,
  forceLocationUpdates: null,
  dedupeDistanceThreshold: null,
  dedupeCertaintyThreshold: null,
  dedupeSimilarityThreshold: null,
  manualLocationIdField: null,
  logNamespaces: null
};

if (['production', 'development'].includes(process.env.NODE_ENV)) {
  Object.assign(
    config,
    JSON.parse(fs.readFileSync(__dirname + '/' + (process.env.NODE_ENV === 'production' ? '../prod.json' : '../dev.json')))
  );
}

module.exports = async () => {
  return Object.assign(config, await prompts([{
    type: 'text',
    name: 'mailgunUser',
    message: 'maigun user to be used for report send'
  }, {
    type: 'text',
    name: 'mailgunPassword',
    message: 'mailgun password to be used for report send'
  }, {
    type: 'text',
    name: 'reportRecipients',
    message: 'comma-separated list of recipients report is sent to'
  }, {
    type: 'text',
    name: 'publicKey',
    message: 'Public OA account key'
  }, {
    type: 'text',
    name: 'secretKey',
    message: 'Secret OA account key'
  }, {
    type: 'number',
    name: 'originAgendaUid',
    message: 'Origin agenda'
  }, {
    type: 'number',
    name: 'destinationAgendaUid',
    message: 'Destination agenda'
  }, {
    type: 'text',
    name: 'extendedFieldsToCopy',
    message: 'Specify additional fields to account for in copy',
    format: v => v.split(',')
  }, {
    type: 'number',
    name: 'dedupeDistanceThreshold',
    message: 'Specify distance within which duplicate locations are evaluated',
    initial: 100
  }, {
    type: 'number',
    name: 'dedupeCertaintyThreshold',
    message: 'Specify similarity percentage above which duplicate location is identified',
    initial: 80
  }, {
    type: 'number',
    name: 'dedupeSimilarityThreshold',
    message: 'Specify similarity percentage above which duplicate location is shown for manual decision. If value is above certainty, it will never match.',
    initial: 100
  }, {
    type: 'text',
    name: 'manualLocationIdField',
    message: 'Event field used in source to force identifying location duplicates',
    initial: 'uniquelocationid'
  }, {
    type: 'confirm',
    name: 'forceLocationUpdates',
    message: 'Force location updates?',
    initial: false
  }, {
    type: 'confirm',
    name: 'forceEventUpdates',
    message: 'Force event updates?',
    initial: false
  }, {
    type: 'multiselect',
    name: 'logNamespaces',
    message: 'Display logs',
    initial: ['run'],
    choices: [{
      title: 'Nothing',
      value: false
    },{
      title: 'Main run',
      value: 'run'
    }, {
      title: 'Fetching of data',
      value: 'listOAEvents'
    }, {
      title: 'Update of local locations store',
      value: 'updateLocationsDb'
    }, {
      title: 'Update of local event store',
      value: 'updateEventsDb'
    }, {
      title: 'Update of destination locations',
      value: 'updateDestinationLocations'
    }, {
      title: 'Update of destination events',
      value: 'updateDestinationEvents'
    }, {
      title: 'Generate location source data from events',
      value: 'extractLocationsFromEvents'
    }, {
      title: 'Store',
      value: 'Store'
    }, {
      title: 'Everything',
      value: '*'
    }],
  }].filter(p => config[p.name]===null)));
}
