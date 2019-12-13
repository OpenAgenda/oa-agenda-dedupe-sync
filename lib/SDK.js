'use strict';

const _ = require('lodash');
const sa = require('superagent');

const parse = res => JSON.parse(res.text);
const nonce = () =>_.random(Math.pow(10, 6));

const API = {
  V1: process.env.OA_API_ENV !== 'development' ? 'https://api.openagenda.com/v1' : 'https://dapi.openagenda.com/frontend_dev.php/v1',
  V2: process.env.OA_API_ENV !== 'development' ? 'https://api.openagenda.com/v2' : 'https://dapi.openagenda.com/v2'
};

if (process.env.OA_API_ENV === 'development') {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
}

module.exports = keys => {
  let accessToken;

  const client = {
    v1: agent.bind(null, API.V1),
    v2: agent.bind(null, API.V2)
  }

  return {
    ...client,
    agendas: agendaUid => ({
      getSettings: getSettings.bind(null, client, agendaUid),
      locations: {
        create: createLocation.bind(null, client, agendaUid),
        patch: patchLocation.bind(null, client, agendaUid)
      },
      events: {
        create: createEvent.bind(null, client, agendaUid),
        update: updateEvent.bind(null, client, agendaUid),
        delete: deleteEvent.bind(null, client, agendaUid)
      }
    })
  }

  async function agent(base, method, res, params = {}) {
    const {
      data,
      batched
    } = {
      data: null,
      batched: false,
      ...params
    };

    const request = sa[method](base + res).accept('json');

    if (method === 'get') {
      return request
        .query({ key: keys.public })
        .then(res => res.body);
    } else {
      return request
        .type('form')
        .field(Object.assign({
          access_token: await _getAccessToken(),
          nonce: nonce(),
          batched: batched || false
        }, data ? {
          data: JSON.stringify(data)
        } : {})).then(parse);
    }
  }

  async function _getAccessToken() {
    if (accessToken) return accessToken;

    try {
      const result = await sa.post(`${API.V1}/requestAccessToken`)
        .type('form')
        .accept('json')
        .send({
          'grant-type': 'authorization_code',
          code: keys.secret
        }).then(parse);

      accessToken = result.access_token;

      setTimeout(() => {
        accessToken = null;
      }, Math.max(parseInt(result.expires_in)*1000 - 2000, 0));

    } catch(e) {
      console.log('could not get access token', e);
      throw e;
    }

    return accessToken;
  }
}

function getSettings(client, agendaUid) {
  return client.v2('get', `/agendas/${agendaUid}/settings`);
}

function updateEvent(client, agendaUid, eventUid, data) {
  return client.v2('post', `/agendas/${agendaUid}/events/${eventUid}`, {
    data
  });
}

function deleteEvent(client, agendaUid, eventUid) {
  return client.v2('patch', `/agendas/${agendaUid}/events/${eventUid}`, {
    data: {
      state: -1
    }
  });
}

function createEvent(client, agendaUid, data) {
  return client.v2('post', `/agendas/${agendaUid}/events`, {
    data
  });
}

function patchLocation(client, agendaUid, uid, data) {
  return client.v1('post', `/locations/${uid}`, { data });
}

function createLocation(client, agendaUid, data) {
  return client.v1('post', '/locations', {
    data: {
      ...data,
      agenda_uid: agendaUid
    }
  });
}
