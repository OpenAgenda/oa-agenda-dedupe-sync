'use strict';

const log = require('debug')('listOAEvents');
const sa = require('superagent');

module.exports = async function listOAEvents(agendaUid) {
  let result = [];

  let events;
  let offset = 0;
  const limit = 100;

  while (({ events } = await listEvents(agendaUid, offset, limit)) && events && events.length) {
    result = [...result, ...events];
    log('fetched %s events', result.length);
    offset += limit;
  }

  log('Done with %s events fetched', result.length);

  return result;
};

async function listEvents(agendaUid, offset, limit) {
  const res = await sa.get(`https://openagenda.com/agendas/${agendaUid}/events.json?offset=${offset}&limit=${limit}&oaq[from]=2019-12-10&oaq[to]=2050-01-10`);
  return res.body;
}
