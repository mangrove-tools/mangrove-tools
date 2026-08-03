(function initializeMangroveAnalytics(root, document) {
  "use strict";

  var PRODUCTION_HOSTNAME = "mangrovetools.com";
  var MEASUREMENT_ID = "G-E20401V5WB";

  if (!root.location || root.location.hostname !== PRODUCTION_HOSTNAME) {
    return;
  }

  root.dataLayer = root.dataLayer || [];
  root.gtag = function gtag() {
    root.dataLayer.push(arguments);
  };

  var tag = document.createElement("script");
  tag.async = true;
  tag.src =
    "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(tag);

  root.gtag("js", new Date());
  root.gtag("config", MEASUREMENT_ID);
})(window, document);
