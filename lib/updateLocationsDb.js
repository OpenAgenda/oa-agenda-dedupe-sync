'use strict';

const _ = require('lodash');
const log = require('debug')('updateLocationsDb');
const VError = require('verror');

module.exports = async (db, originLocations, {
  dedupeDistanceThreshold,
  dedupeCertaintyThreshold,
  dedupeSimilarityThreshold,
  userConfirmsDupes
}) => {
  log('there are %s locations in source', originLocations.length);
  const counts = {
    creates: 0,
    updates: 0,
    dedupes: 0,
    nothing: 0
  };
  for (const originLocation of originLocations) {
    try {
      let match = null;
      const localLocation = await db.locations.findOneByOriginUid(originLocation.uid);

      if (localLocation) {
        const isMainRef = localLocation.origin[0].uid === originLocation.uid;
        const shouldUpdate = isMainRef && await db.locations.hasChanged(localLocation._id, originLocation);
        const manualIdMatchingLocation = await getByExclusiveManualId(db, originLocation, localLocation);

        if (manualIdMatchingLocation) {
          await db.locations.merge(localLocation, manualIdMatchingLocation);
        } else if (shouldUpdate) {
          log(originLocation.name, 'updating');
          await db.locations.update(localLocation._id, originLocation);
          counts.updates += 1;
        } else {
          log(originLocation.name, 'is already referenced', isMainRef ? 'and has not changed' : 'as a dupe');
          counts.nothing += 1;
        }
      } else if (match = await db.locations.findOneByMatch(originLocation, {
        neighborhood: dedupeDistanceThreshold,
        nameIsSame: dedupeCertaintyThreshold,
        nameIsSimilar: dedupeSimilarityThreshold,
        confirmDupes: userConfirmsDupes
      })) {
        log(originLocation.name, 'found match, adding origin location uid');
        await db.locations.appendOrigin(match._id, originLocation);
        counts.dedupes += 1;
      } else {
        log(originLocation.name, 'no match found, creating');
        await db.locations.create(originLocation);
        counts.creates += 1;
      }
    } catch (e) {
      throw new VError(e, 'could not process location %s', originLocation.uid);
    }
  }
  return counts;
}


async function getByExclusiveManualId(db, originLocation, localLocation = null)  {
  if (!originLocation.manualId) {
    return null;
  }

  const match = await db.locations.findOneByManualId(originLocation.manualId);

  if (!match) {
    return null;
  }

  return match._id === localLocation._id ? null : match;
}
