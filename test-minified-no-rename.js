!function (a, b) {
  function c(d) {
    return a
      .map(function (e) {
        return e * d;
      })
      .filter(function (f) {
        return f > b;
      });
  }
  var g = function (h) {
    return c(h).reduce(function (i, j) {
      return i + j;
    }, 0);
  };
  console.log(g([1, 2, 3, 4, 5], 2));
};
