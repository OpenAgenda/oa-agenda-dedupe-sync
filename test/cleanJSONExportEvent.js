'use strict';

const fs = require('fs');
const should = require('should');
const cleanJSONExportEvent = require('../lib/cleanJSONExportEvent');
const fixtures = {
  additionalFields: require('./fixtures/additionalFields.json'),
  event: require('./fixtures/event.json')
};

describe('cleanJSONExportEvent', () => {

  it('converts JSON-format event into event understood by API', () => {

    const clean = cleanJSONExportEvent(fixtures.additionalFields, fixtures.event, { uid: 123 });

    clean.should.eql({
      slug: 'retour-d-iralnde-avec-morvan-massif-trio',
      title: {
        fr: "Retour d'Irlande avec Morvan Massif trio"
      },
      description: {
        fr: "Retour d'Irlande avec Morvan Massif trio"
      },
      conditions: {
        fr: 'Entrée : 5 €'
      },
      longDescription: {},
      keywords: {
        fr: [
          'AMTCN',
          'Nevers',
          'Eduens',
          'Dominique Forges',
          'Musique Traditionelle'
        ]
      },
      accessibility: [
        'mi'
      ],
      timings: [{
        begin: "2019-11-29T19:30:00.000Z",
        end: "2019-11-29T21:00:00.000Z"
      }],
      'public-vise': [4],
      thematique: [5],
      evenement: 15,
      image: {
        url: 'https://cibul.s3.amazonaws.com/event_retour-d-iralnde-avec-morvan-massif-trio_408881.jpg'
      },
      locationUid: 123
    });

  });

});
