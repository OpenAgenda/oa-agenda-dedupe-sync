'use strict';

const levenshtein = require('fast-levenshtein');

module.exports = (name1, name2) => {
  const levensteinDistance = levenshtein.get(name1, name2);

  const percentSimilar = 100 - levensteinDistance * 100 / Math.max(name1.length, name2.length);

  return percentSimilar;
}
