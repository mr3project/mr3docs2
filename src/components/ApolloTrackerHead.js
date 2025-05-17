import React from 'react';
import Head from '@docusaurus/Head';

export default function ApolloTrackerHead() {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <Head>
      <script>
        {`
          function initApollo() {
            var n = Math.random().toString(36).substring(7);
            var o = document.createElement("script");
            o.src = "https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=" + n;
            o.async = true;
            o.defer = true;
            o.onload = function () {
              window.trackingFunctions.onLoad({
                appId: "6827f14d452e7a00218daf1b"
              });
            };
            document.head.appendChild(o);
          }
          initApollo();
        `}
      </script>
    </Head>
  );
}

