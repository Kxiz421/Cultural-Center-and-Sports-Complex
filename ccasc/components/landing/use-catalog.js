"use client";

import * as React from "react";

/**
 * Package and particular lists for the public landing page.
 *
 * Both lists are read from the anonymous endpoints that serve the same rows the
 * admin Packages and Particulars screens maintain, so the landing page always
 * shows what the coordinators publish. Nothing is hard-coded here: while the
 * request is in flight the sections claim nothing, and when it fails the
 * sections say so instead of showing a stale catalogue.
 *
 * One promise is shared between every section that needs the lists, so the
 * packages and particulars sections trigger a single pair of requests.
 */
let catalogRequest = null;

function requestCatalog() {
  if (!catalogRequest) {
    catalogRequest = Promise.all([
      fetch("/api/public/packages", { cache: "no-store" }).then((response) =>
        response.ok ? response.json() : [],
      ),
      fetch("/api/public/particulars", { cache: "no-store" }).then((response) =>
        response.ok ? response.json() : [],
      ),
    ])
      .then(([packages, particulars]) => ({
        packages: Array.isArray(packages) ? packages : [],
        particulars: Array.isArray(particulars) ? particulars : [],
      }))
      .catch((error) => {
        console.error("Failed to load the public catalog:", error);
        return { packages: [], particulars: [] };
      });
  }

  return catalogRequest;
}

/**
 * @param {object} [seed] the lists the landing page already rendered on the
 *   server, so the first paint carries them and no request is made; without
 *   them the lists are fetched in the browser.
 * @returns {{packages: object[], particulars: object[], loading: boolean}}
 */
export function useLandingCatalog({ packages: initialPackages, particulars: initialParticulars } = {}) {
  const seeded =
    (Array.isArray(initialPackages) && initialPackages.length > 0) ||
    (Array.isArray(initialParticulars) && initialParticulars.length > 0);

  const [state, setState] = React.useState(() => ({
    packages: Array.isArray(initialPackages) ? initialPackages : [],
    particulars: Array.isArray(initialParticulars) ? initialParticulars : [],
    loading: !seeded,
  }));

  React.useEffect(() => {
    if (seeded) return undefined;

    let active = true;

    requestCatalog().then((catalog) => {
      if (active) setState({ ...catalog, loading: false });
    });

    return () => {
      active = false;
    };
  }, [seeded]);

  return state;
}
